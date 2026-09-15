import { textBlockSchema } from '../text-block-schema';
import 'server-only';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { type TextFont, type TextInspection, type TextPreview } from '../pro-types';
import { isDocumentFont } from '../document-font-registry.mjs';
import { isPdfTextSize } from '../pdf-text-size.mjs';
import { ApiError } from './http';
import { MAX_PREVIEW_WIDTH } from '../pdf-preview.mjs';
const edit = z
  .object({
    id: z.string().regex(/^\d+:\d+(?::[a-f\d-]{36})?$/),
    copy: textBlockSchema.optional(),
    original: z.string().max(10000),
    text: z.string().max(2000),
    font: z.custom<TextFont>((value) => value === 'original' || isDocumentFont(value)),
    size: z.number().refine(isPdfTextSize, 'Choose a valid positive text size.'),
    color: z.string().regex(/^#[\da-f]{6}$/i),
    preservePaint: z.boolean().optional(),
    offset: z
      .object({
        x: z.number().finite().min(-100000).max(100000),
        y: z.number().finite().min(-100000).max(100000),
      })
      .strict()
      .optional(),
  })
  .strict();
export const proJob = z.discriminatedUnion('operation', [
  z
    .object({ operation: z.literal('inspect'), page: z.number().int().min(0).max(99).optional() })
    .strict(),
  z.object({ operation: z.literal('info') }).strict(),
  z.object({ operation: z.literal('edit'), changes: z.array(edit).min(1).max(5000) }).strict(),
  z
    .object({
      operation: z.literal('preview'),
      pixelWidth: z.number().int().min(1).max(MAX_PREVIEW_WIDTH).optional(),
      partial: z.boolean().optional(),
      changes: z.array(edit).max(5000),
      page: z.number().int().min(0).max(99),
      rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
    })
    .strict(),
  z.object({ operation: z.literal('protect'), password: z.string().min(8).max(64) }).strict(),
]);
export type ProJob = z.infer<typeof proJob>;
let running = 0;
export function runProPdf(
  bytes: Uint8Array,
  job: ProJob,
  signal?: AbortSignal,
): Promise<TextInspection | TextPreview | { pageCount: number } | { bytes: string }> {
  if (running >= 2)
    throw new ApiError(429, 'The PDF service is busy. Please try again in a moment.');
  if (signal?.aborted) throw new ApiError(499, 'Processing cancelled.');
  running++;
  return new Promise((resolve, reject) => {
    // Separate process with no account/payment secrets, bounded output, concurrency and lifetime.
    const child = spawn(
      process.execPath,
      ['--max-old-space-size=256', path.join(process.cwd(), 'scripts/pro-pdf-worker.mjs')],
      {
        env: { LANG: 'C.UTF-8', NODE_ENV: 'production', TMPDIR: tmpdir() },
        stdio: ['pipe', 'pipe', 'ignore'],
      },
    );
    let finished = false,
      size = 0;
    const chunks: Buffer[] = [];
    const finish = (
      error?: Error,
      result?: TextInspection | TextPreview | { pageCount: number } | { bytes: string },
    ) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      running--;
      child.kill('SIGKILL');
      if (error) reject(error);
      else resolve(result!);
    };
    const abort = () => finish(new ApiError(499, 'Processing cancelled.'));
    const timer = setTimeout(
      () => finish(new ApiError(422, 'This PDF took too long to process. Try a smaller document.')),
      30_000,
    );
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 42 * 1024 * 1024) finish(new ApiError(422, 'The PDF output is too large.'));
      else chunks.push(chunk);
    });
    child.on('error', () => finish(new ApiError(503, 'The PDF service could not start.')));
    child.stdin.on('error', () => finish(new ApiError(422, 'This PDF could not be processed.')));
    child.on('close', (code) => {
      if (finished) return;
      try {
        const result = JSON.parse(Buffer.concat(chunks).toString());
        if (result.error || code !== 0)
          finish(new ApiError(422, result.error || 'This PDF could not be processed.'));
        else finish(undefined, result);
      } catch {
        finish(new ApiError(422, 'This PDF could not be processed.'));
      }
    });
    child.stdin.end(JSON.stringify({ bytes: Buffer.from(bytes).toString('base64'), job }));
  });
}

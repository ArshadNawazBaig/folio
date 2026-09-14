import { z } from 'zod';
import type { TextPreview } from './pro-types';
export const remoteTools = [
  'translate-pdf',
  'pdf-to-word',
  'pdf-to-excel',
  'pdf-to-powerpoint',
] as const;
export type RemoteTool = (typeof remoteTools)[number];
export const languageOptions = [
  ['ar', 'Arabic'],
  ['zh-Hans', 'Chinese'],
  ['nl', 'Dutch'],
  ['en', 'English'],
  ['fr', 'French'],
  ['de', 'German'],
  ['hi', 'Hindi'],
  ['it', 'Italian'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['pt', 'Portuguese'],
  ['es', 'Spanish'],
  ['tr', 'Turkish'],
  ['ur', 'Urdu'],
].map(([value, label]) => ({ value, label }));
export const remoteOptions = z
  .object({
    tool: z.enum(remoteTools),
    source: z.string().max(16).default('auto'),
    target: z.string().max(16).default('es'),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.tool === 'translate-pdf' &&
      (!languageOptions.some((l) => l.value === v.target) ||
        (v.source !== 'auto' && !languageOptions.some((l) => l.value === v.source)) ||
        v.source === v.target)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Choose different supported source and target languages.',
      });
  });
export type RemoteOptions = z.infer<typeof remoteOptions>;
export const outputFormats = {
  'translate-pdf': { extension: 'pdf', mime: 'application/pdf', label: 'PDF' },
  'pdf-to-word': {
    extension: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word',
  },
  'pdf-to-excel': {
    extension: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Excel',
  },
  'pdf-to-powerpoint': {
    extension: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    label: 'PowerPoint',
  },
} as const;
export type RemoteResult = {
  artifact: string;
  filename: string;
  size: number;
  pages: number;
  expiresAt: number;
  tool: RemoteTool;
  source?: string;
  target?: string;
  preview?: TextPreview;
};
export const REMOTE_MAX_INPUT = 10 * 1024 * 1024;
export const REMOTE_MAX_OUTPUT = 20 * 1024 * 1024;
export const REMOTE_MAX_ARTIFACT_BODY = 30 * 1024 * 1024;

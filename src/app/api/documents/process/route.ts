import { remoteOptions, outputFormats, REMOTE_MAX_INPUT } from '@/lib/remote-types';
import { boundedBody, ApiError, apiError } from '@/lib/server/http';
import { processRemotePdf, remoteReady } from '@/lib/server/document-providers';
import { sealResult } from '@/lib/server/result-artifact';
import { claimRemoteProcessing } from '@/lib/server/public-limit';
import { runProPdf } from '@/lib/server/pro-pdf';
import { assertServiceAvailable } from '@/lib/server/platform';
export const runtime = 'nodejs';
export const maxDuration = 180;
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    await assertServiceAvailable();
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
      throw new ApiError(400, 'Choose a PDF to process.');
    const body = await boundedBody(request, 12 * 1024 * 1024);
    const form = await new Response(body, {
      headers: { 'Content-Type': request.headers.get('content-type')! },
    }).formData();
    const options = remoteOptions.safeParse(JSON.parse(String(form.get('options'))));
    const file = form.get('file');
    if (!options.success)
      throw new ApiError(
        400,
        'Choose supported processing settings and different source and target languages.',
      );
    if (!(file instanceof File) || !file.size || file.size > REMOTE_MAX_INPUT)
      throw new ApiError(400, 'Choose a PDF smaller than 10 MB.');
    if (!remoteReady(options.data.tool))
      throw new ApiError(
        503,
        'This document service is not connected yet. Your original PDF is unchanged.',
      );
    release = claimRemoteProcessing();
    const info = await runProPdf(
      new Uint8Array(await file.arrayBuffer()),
      { operation: 'info' },
      request.signal,
    );
    if (!('pageCount' in info)) throw new ApiError(422, 'The PDF could not be opened.');
    if (options.data.tool === 'translate-pdf' && info.pageCount > 20)
      throw new ApiError(
        422,
        'Translation supports up to 20 pages at a time. Split your PDF first.',
      );
    const pdfFile = new File([await file.arrayBuffer()], 'document.pdf', {
      type: 'application/pdf',
    });
    const output = await processRemotePdf(pdfFile, options.data, request.signal);
    let pages = info.pageCount,
      preview;
    if (options.data.tool === 'translate-pdf') {
      const translated = await runProPdf(output, { operation: 'info' }, request.signal);
      if (!('pageCount' in translated))
        throw new ApiError(502, 'The translated PDF could not be opened.');
      pages = translated.pageCount;
      const image = await runProPdf(
        output,
        { operation: 'preview', changes: [], page: 0 },
        request.signal,
      );
      if (!('preview' in image))
        throw new ApiError(502, 'The translated preview could not be prepared.');
      preview = image;
    }
    const name =
      file.name
        .replace(/\.pdf$/i, '')
        .replace(/[^\p{L}\p{N} ._-]/gu, '')
        .trim()
        .slice(0, 120) || 'document';
    const filename = `${name}-${options.data.tool === 'translate-pdf' ? options.data.target : 'converted'}.${outputFormats[options.data.tool].extension}`;
    const result = sealResult(output, { tool: options.data.tool, filename, pages });
    return Response.json(
      {
        ...result,
        source: options.data.source,
        target: options.data.target,
        ...(preview ? { preview } : {}),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  } finally {
    release?.();
  }
}

import { z } from 'zod';
import { openResult } from '@/lib/server/result-artifact';
import { ApiError, apiError, boundedBody } from '@/lib/server/http';
import { runProPdf } from '@/lib/server/pro-pdf';
import { assertServiceAvailable } from '@/lib/server/platform';
import { publicLimit } from '@/lib/server/public-limit';
import { REMOTE_MAX_ARTIFACT_BODY } from '@/lib/remote-types';
export const runtime = 'nodejs';
export const maxDuration = 45;
export async function POST(request: Request) {
  try {
    await assertServiceAvailable();
    publicLimit('preview');
    const parsed = z
      .object({
        artifact: z.string().max(REMOTE_MAX_ARTIFACT_BODY),
        page: z.number().int().min(0).max(99),
      })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, REMOTE_MAX_ARTIFACT_BODY)).toString()));
    if (!parsed.success) throw new ApiError(400, 'Choose a prepared PDF and valid preview page.');
    const result = openResult(parsed.data.artifact);
    if (result.tool !== 'translate-pdf')
      throw new ApiError(400, 'Only translated PDFs have a document preview.');
    const preview = await runProPdf(
      result.bytes,
      { operation: 'preview', changes: [], page: parsed.data.page },
      request.signal,
    );
    if (!('preview' in preview)) throw new ApiError(502, 'The document could not be previewed.');
    return Response.json(preview);
  } catch (error) {
    return apiError(error);
  }
}

import { z } from 'zod';
import { authorizeToolDownload } from '@/lib/server/tool-download';
import { assertServiceAvailable } from '@/lib/server/platform';
import { openResult } from '@/lib/server/result-artifact';
import { ApiError, apiError, boundedBody } from '@/lib/server/http';
import { REMOTE_MAX_ARTIFACT_BODY, outputFormats } from '@/lib/remote-types';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    await assertServiceAvailable();
    await authorizeToolDownload(request);
    const parsed = z
      .object({ artifact: z.string().max(REMOTE_MAX_ARTIFACT_BODY) })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, REMOTE_MAX_ARTIFACT_BODY)).toString()));
    if (!parsed.success) throw new ApiError(400, 'Choose a prepared document to download.');
    const result = openResult(parsed.data.artifact);
    return new Response(result.bytes, {
      headers: {
        'Content-Type': outputFormats[result.tool].mime,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

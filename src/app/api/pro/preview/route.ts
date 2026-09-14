import { apiError, ApiError } from '@/lib/server/http';
import { readProUpload } from '@/lib/server/pro-upload';
import { runProPdf } from '@/lib/server/pro-pdf';
import { publicLimit } from '@/lib/server/public-limit';
import { assertServiceAvailable } from '@/lib/server/platform';
export const runtime = 'nodejs';
export const maxDuration = 45;
export async function POST(request: Request) {
  try {
    await assertServiceAvailable();
    publicLimit('preview');
    const { file, job } = await readProUpload(request);
    if (job.operation !== 'inspect' && job.operation !== 'preview')
      throw new ApiError(400, 'Use the download action to export a finished PDF.');
    const result = await runProPdf(new Uint8Array(await file.arrayBuffer()), job, request.signal);
    if ('bytes' in result) throw new ApiError(500, 'The preview could not be prepared.');
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}

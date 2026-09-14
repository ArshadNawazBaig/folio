import { apiError, ApiError } from '@/lib/server/http';
import { readProUpload } from '@/lib/server/pro-upload';
import { runProPdf } from '@/lib/server/pro-pdf';
import { publicLimit } from '@/lib/server/public-limit';
import { assertServiceAvailable } from '@/lib/server/platform';
export const runtime = 'nodejs';
export const maxDuration = 45;
export async function POST(request: Request) {
  const started = performance.now();
  try {
    await assertServiceAvailable();
    const available = performance.now();
    publicLimit('preview');
    const { file, job } = await readProUpload(request);
    if (job.operation !== 'inspect' && job.operation !== 'preview')
      throw new ApiError(400, 'Use the download action to export a finished PDF.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = performance.now();
    const result = await runProPdf(bytes, job, request.signal);
    if ('bytes' in result) throw new ApiError(500, 'The preview could not be prepared.');
    return Response.json(result, {
      headers: {
        'Server-Timing': `settings;dur=${(available - started).toFixed(1)}, upload;dur=${(uploaded - available).toFixed(1)}, pdf;dur=${(performance.now() - uploaded).toFixed(1)}`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

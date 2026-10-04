import { authorizeToolDownload } from '@/lib/server/tool-download';
import { apiError, ApiError } from '@/lib/server/http';
import { runProPdf } from '@/lib/server/pro-pdf';
import { readProUpload } from '@/lib/server/pro-upload';
import { assertServiceAvailable } from '@/lib/server/platform';
export const runtime = 'nodejs';
export const maxDuration = 45;
export async function POST(request: Request) {
  try {
    await assertServiceAvailable();
    await authorizeToolDownload(request);
    const { file, job } = await readProUpload(request);
    if (job.operation !== 'edit' && job.operation !== 'protect')
      throw new ApiError(400, 'Choose a PDF download operation.');
    const result = await runProPdf(new Uint8Array(await file.arrayBuffer()), job, request.signal);
    if ('bytes' in result)
      return new Response(Buffer.from(result.bytes, 'base64'), {
        headers: {
          'Content-Type': 'application/pdf',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': 'attachment; filename="folio.pdf"',
        },
      });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}

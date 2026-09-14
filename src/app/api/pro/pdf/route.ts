import { requireUser } from '@/lib/server/auth';
import { consumeProRequest } from '@/lib/server/billing';
import { apiError, ApiError } from '@/lib/server/http';
import { runProPdf } from '@/lib/server/pro-pdf';
import { readProUpload } from '@/lib/server/pro-upload';
import { assertServiceAvailable } from '@/lib/server/platform';
export const runtime = 'nodejs';
export const maxDuration = 45;
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    await assertServiceAvailable();
    await consumeProRequest(user.id);
    const { file, job } = await readProUpload(request);
    if (job.operation !== 'edit' && job.operation !== 'protect')
      throw new ApiError(400, 'Choose a PDF download operation.');
    const result = await runProPdf(new Uint8Array(await file.arrayBuffer()), job, request.signal);
    if ('bytes' in result)
      return new Response(Buffer.from(result.bytes, 'base64'), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="folio-pro.pdf"',
        },
      });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}

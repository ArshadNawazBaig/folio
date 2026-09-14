import { createSample } from '@/lib/sample';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { proJob, runProPdf } from '@/lib/server/pro-pdf';
export const runtime = 'nodejs';
export const maxDuration = 45;
// Demo accepts edits to the application's fixed sample only; never arbitrary PDF bytes.
export async function GET() {
  return new Response(Buffer.from(await createSample()), {
    headers: { 'Content-Type': 'application/pdf' },
  });
}
export async function POST(request: Request) {
  try {
    const parsed = proJob.safeParse(JSON.parse((await boundedBody(request, 32 * 1024)).toString()));
    if (
      !parsed.success ||
      parsed.data.operation === 'protect' ||
      (parsed.data.operation === 'edit' && parsed.data.changes.length > 30)
    )
      throw new ApiError(400, 'The demo supports up to 30 text changes to the sample PDF.');
    const result = await runProPdf(await createSample(), parsed.data, request.signal);
    return 'bytes' in result
      ? new Response(Buffer.from(result.bytes, 'base64'), {
          headers: { 'Content-Type': 'application/pdf' },
        })
      : Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}

import 'server-only';
import { ApiError, boundedBody } from './http';
import { proJob } from './pro-pdf';
export async function readProUpload(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    throw new ApiError(400, 'Send a PDF file and its processing settings.');
  const body = await boundedBody(request, 12 * 1024 * 1024);
  const form = await new Response(body, {
    headers: { 'content-type': request.headers.get('content-type')! },
  })
    .formData()
    .catch(() => {
      throw new ApiError(400, 'The PDF upload could not be read.');
    });
  const file = form.get('file');
  if (!(file instanceof File) || file.size > 10 * 1024 * 1024)
    throw new ApiError(400, 'Choose a PDF smaller than 10 MB.');
  let settings: unknown;
  try {
    settings = JSON.parse(String(form.get('job')));
  } catch {
    throw new ApiError(400, 'The requested PDF settings are invalid.');
  }
  const job = proJob.safeParse(settings);
  if (!job.success) throw new ApiError(400, 'The requested PDF settings are invalid.');
  return { file, job: job.data };
}

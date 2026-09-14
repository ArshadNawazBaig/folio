import { z } from 'zod';
import { adminDb } from '@/lib/server/auth';
import { apiError, boundedBody, ApiError } from '@/lib/server/http';
import { publicLimit } from '@/lib/server/public-limit';
import { workspaceIdentity, workspaceResponse, workspaceError } from '@/lib/server/workspaces';
import { CLOUD_BUCKET, CLOUD_FILE_LIMIT, pdfName } from '@/lib/cloud-types';
export async function POST(request: Request) {
  let cookie: string | null = null;
  try {
    publicLimit('workspace', 30);
    const identity = await workspaceIdentity(request, true);
    cookie = identity.cookie;
    const parsed = z
      .object({
        id: z.uuid(),
        name: z.string().min(1).max(255),
        size: z.number().int().min(1).max(CLOUD_FILE_LIMIT),
      })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, 2048)).toString()));
    if (!parsed.success) throw new ApiError(400, 'Choose a PDF of up to 50 MB.');
    const { data: file, error } = await adminDb().rpc('reserve_editor_workspace', {
      actor: identity.actor,
      guest: identity.guest,
      file_id: parsed.data.id,
      file_name: pdfName(parsed.data.name),
      file_size: parsed.data.size,
    });
    workspaceError(error);
    if (file.status === 'ready')
      return workspaceResponse(request, { id: file.id, ready: true }, identity.cookie);
    const signed = await adminDb()
      .storage.from(CLOUD_BUCKET)
      .createSignedUploadUrl(file.object_path);
    if (signed.error) throw new ApiError(503, 'Storage could not start this upload. Please retry.');
    return workspaceResponse(
      request,
      { id: file.id, ready: false, uploadUrl: signed.data.signedUrl },
      identity.cookie,
      201,
    );
  } catch (error) {
    const response = apiError(error);
    return workspaceResponse(request, await response.json(), cookie, response.status);
  }
}

import { z } from 'zod';
import { adminDb, requireUser } from '@/lib/server/auth';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { cloudError, cloudFields, ownedCloudDocument } from '@/lib/server/cloud-storage';
import { CLOUD_BUCKET, pdfName } from '@/lib/cloud-types';
type Context = { params: Promise<{ id: string }> };
async function owner(request: Request, context: Context) {
  const user = await requireUser(request);
  const parsed = z.uuid().safeParse((await context.params).id);
  if (!parsed.success) throw new ApiError(404, 'This file is not available in your account.');
  return { user, file: await ownedCloudDocument(user.id, parsed.data) };
}
export async function GET(request: Request, context: Context) {
  try {
    const { file } = await owner(request, context);
    if (file.status !== 'ready') throw new ApiError(409, 'This upload is not complete yet.');
    return Response.json({
      name: file.name,
      path: file.object_path,
      workspace: file.workspace || null,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { user, file } = await owner(request, context);
    const parsed = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('finish') }).strict(),
        z.object({ action: z.literal('rename'), name: z.string().trim().min(1).max(160) }).strict(),
      ])
      .safeParse(JSON.parse((await boundedBody(request, 2048)).toString()));
    if (!parsed.success) throw new ApiError(400, 'Choose a valid file action and name.');
    if (file.status === 'deleting')
      throw new ApiError(409, 'This file is being removed. Please finish removing it.');
    if (parsed.data.action === 'finish') {
      const { data, error } = await adminDb().storage.from(CLOUD_BUCKET).info(file.object_path);
      if (error || !data)
        throw new ApiError(
          409,
          'The PDF has not finished uploading. Please retry or remove this upload.',
        );
      if (data.size !== file.size || data.contentType !== 'application/pdf')
        throw new ApiError(
          409,
          'The uploaded file does not match this PDF. Remove the upload and try again.',
        );
    }
    const { data, error } = await adminDb()
      .from('cloud_documents')
      .update({
        ...(parsed.data.action === 'rename'
          ? { name: pdfName(parsed.data.name), workspace_revision: file.workspace_revision + 1 }
          : { status: 'ready' }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', file.id)
      .eq('user_id', user.id)
      .neq('status', 'deleting')
      .eq('workspace_revision', file.workspace_revision)
      .select(cloudFields)
      .maybeSingle();
    cloudError(error);
    if (!data) throw new ApiError(409, 'This file changed. Refresh your files and try again.');
    return Response.json(data);
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { user, file } = await owner(request, context);
    const db = adminDb();
    const marked = await db
      .from('cloud_documents')
      .update({ status: 'deleting' })
      .eq('id', file.id)
      .eq('user_id', user.id);
    cloudError(marked.error);
    const removed = await db.storage.from(CLOUD_BUCKET).remove([file.object_path]);
    if (removed.error)
      throw new ApiError(503, 'This file could not be fully removed. Please retry removing it.');
    const deleted = await db
      .from('cloud_documents')
      .delete()
      .eq('id', file.id)
      .eq('user_id', user.id);
    cloudError(deleted.error);
    return Response.json({ removed: true });
  } catch (error) {
    return apiError(error);
  }
}

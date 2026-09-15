import { z } from 'zod';
import { adminDb, requireUser } from '@/lib/server/auth';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { cloudError, cloudFields } from '@/lib/server/cloud-storage';
import { CLOUD_FILE_LIMIT, CLOUD_FILE_COUNT, pdfName } from '@/lib/cloud-types';
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const offset = Number(new URL(request.url).searchParams.get('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new ApiError(400, 'Choose a valid file page.');
    const { data, error } = await adminDb()
      .from('cloud_documents')
      .select(cloudFields)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + CLOUD_FILE_COUNT - 1);
    cloudError(error);
    const storage = await adminDb().rpc('account_storage_status', { actor: user.id });
    if (storage.error)
      throw new ApiError(
        503,
        'Storage limits are not ready. Please ask support to complete the storage setup.',
      );
    return Response.json({
      files: data,
      nextOffset: data?.length === CLOUD_FILE_COUNT ? offset + CLOUD_FILE_COUNT : null,
      storageLimit: storage.data.limit,
      storage: storage.data,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const parsed = z
      .object({
        name: z.string().trim().min(1).max(255),
        size: z.number().int().min(1).max(CLOUD_FILE_LIMIT),
      })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, 2048)).toString()));
    if (!parsed.success) throw new ApiError(400, 'Choose a PDF of up to 50 MB.');
    const { data, error } = await adminDb().rpc('reserve_cloud_document', {
      actor: user.id,
      file_name: pdfName(parsed.data.name),
      file_size: parsed.data.size,
    });
    cloudError(error);
    return Response.json({ id: data.id, path: data.object_path }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

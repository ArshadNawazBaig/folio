import 'server-only';
import { adminDb } from './auth';
import { ApiError } from './http';
export const cloudFields =
  'id,name,size,status,created_at,updated_at,workspace_revision,workspace_size';
export function cloudError(error: { message: string } | null) {
  if (!error) return;
  if (error.message.includes('storage_limit'))
    throw new ApiError(
      409,
      'Your cloud storage is full. Remove a file or incomplete upload to make room. Each upload needs 50 MB of free space.',
    );
  if (/cloud_documents|reserve_cloud_document|schema cache/i.test(error.message))
    throw new ApiError(503, 'Cloud storage is not ready yet. Please try again later.');
  throw new ApiError(503, 'Your cloud files could not be updated. Please try again.');
}
export async function ownedCloudDocument(userId: string, id: string) {
  const { data, error } = await adminDb()
    .from('cloud_documents')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  cloudError(error);
  if (!data) throw new ApiError(404, 'This file is not available in your account.');
  return data;
}

import { z } from 'zod';
import { adminDb } from '@/lib/server/auth';
import { apiError, boundedBody, ApiError } from '@/lib/server/http';
import { publicLimit } from '@/lib/server/public-limit';
import { workspaceIdentity, workspaceResponse, workspaceError } from '@/lib/server/workspaces';
import {
  CLOUD_BUCKET,
  CLOUD_FILE_LIMIT,
  CLOUD_FILE_COUNT,
  FREE_STORAGE_LIMIT,
  type CloudDocument,
  pdfName,
} from '@/lib/cloud-types';
import { fileFilters } from '@/lib/server/pagination';
import { cloudFields } from '@/lib/server/cloud-storage';
export async function GET(request: Request) {
  let cookie: string | null = null;
  try {
    const { page, q, sort, pageSize } = fileFilters(new URL(request.url).searchParams);
    const identity = await workspaceIdentity(request, true);
    cookie = identity.cookie;
    // List only this browser's unclaimed files. Account files use the account API.
    let files: CloudDocument[] = [];
    if (identity.guest) {
      const { data, error } = await adminDb()
        .from('cloud_documents')
        .select(`${cloudFields},expires_at`)
        .is('user_id', null)
        .eq('guest_hash', identity.guest)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })
        .limit(CLOUD_FILE_COUNT);
      workspaceError(error);
      files = (data || []).map((file) => ({ ...file, guest: true }));
    }
    const used = files.reduce((total, file) => total + file.size + (file.workspace_size || 0), 0);
    const filtered = files
      .filter((file) => file.name.toLowerCase().includes(q.toLowerCase()))
      .sort(
        (a, b) =>
          (sort === 'name'
            ? a.name.localeCompare(b.name)
            : sort === 'size'
              ? b.size - a.size
              : Date.parse(b.updated_at) - Date.parse(a.updated_at)) || a.id.localeCompare(b.id),
      );
    return workspaceResponse(
      request,
      {
        files: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
        readyCount: files.filter((file) => file.status === 'ready').length,
        storage: {
          used,
          limit: FREE_STORAGE_LIMIT,
          available: Math.max(0, FREE_STORAGE_LIMIT - used),
          full: used >= FREE_STORAGE_LIMIT || files.length >= CLOUD_FILE_COUNT,
          recovery: [],
        },
      },
      cookie,
    );
  } catch (error) {
    const response = apiError(error);
    return workspaceResponse(request, await response.json(), cookie, response.status);
  }
}
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

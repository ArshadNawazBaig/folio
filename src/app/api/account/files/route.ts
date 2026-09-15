import { z } from 'zod';
import { adminDb, requireUser } from '@/lib/server/auth';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { cloudError, cloudFields } from '@/lib/server/cloud-storage';
import { CLOUD_FILE_LIMIT, pdfName } from '@/lib/cloud-types';
import { MAX_PAGE } from '@/lib/pagination.mjs';
import { fileFilters, pageRange, readPage } from '@/lib/server/pagination';
import { workspaceIdentity } from '@/lib/server/workspaces';
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const params = new URL(request.url).searchParams;
    const { page, q, sort, pageSize } = fileFilters(params);
    const offset = params.has('offset')
      ? Number(params.get('offset'))
      : pageRange(page, pageSize)[0];
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_PAGE * pageSize)
      throw new ApiError(400, 'Choose a valid file page.');
    const identity =
      request.headers.get('x-folio-workspace') === '1' ? await workspaceIdentity(request) : null;
    // Both identities are server-verified UUID/hex values, never posted owner IDs.
    const owners = `user_id.eq.${user.id}${
      identity?.guest
        ? `,and(user_id.is.null,guest_hash.eq.${identity.guest},expires_at.gt.${new Date().toISOString()})`
        : ''
    }`;
    const db = adminDb();
    let query = db
      .from('cloud_documents')
      .select(`${cloudFields},user_id,expires_at`, { count: 'exact' })
      .or(owners);
    if (q) query = query.ilike('name', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
    query = query
      .order(sort === 'name' ? 'name' : sort === 'size' ? 'size' : 'updated_at', {
        ascending: sort === 'name',
      })
      .order('id');
    const [listed, ready, storage] = await Promise.all([
      readPage(query, page, pageSize, offset),
      db
        .from('cloud_documents')
        .select('id', { count: 'exact' })
        .or(owners)
        .eq('status', 'ready')
        .limit(0),
      db.rpc('account_storage_status', { actor: user.id }),
    ]);
    cloudError(listed.error);
    cloudError(ready.error);
    if (storage.error)
      throw new ApiError(
        503,
        'Storage limits are not ready. Please ask support to complete the storage setup.',
      );
    return Response.json(
      {
        files: (listed.data || []).map(({ user_id, ...file }) => ({
          ...file,
          guest: user_id === null,
        })),
        total: listed.count || 0,
        readyCount: ready.count || 0,
        nextOffset: offset + pageSize < (listed.count || 0) ? offset + pageSize : null,
        storageLimit: storage.data.limit,
        storage: storage.data,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
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

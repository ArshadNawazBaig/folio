import { z } from 'zod';
import { requireAdmin } from '@/lib/server/platform';
import { adminDb } from '@/lib/server/auth';
import { apiError, ApiError } from '@/lib/server/http';
import { blogDatabaseError } from '@/lib/server/blog';
import { readPage, requestedPage, requestedPageSize } from '@/lib/server/pagination';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'Post not found.');
    const query = new URL(request.url).searchParams;
    const page = requestedPage(query),
      pageSize = requestedPageSize(query);
    const { data, error, count } = await readPage(
      adminDb()
        .from('blog_revisions')
        .select('id,version,draft,created_at', { count: 'exact' })
        .eq('post_id', id)
        .order('version', { ascending: false }),
      page,
      pageSize,
    );
    blogDatabaseError(error);
    return Response.json(
      { revisions: data || [], total: count || 0 },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

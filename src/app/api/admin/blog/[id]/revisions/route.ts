import { z } from 'zod';
import { requireAdmin } from '@/lib/server/platform';
import { adminDb } from '@/lib/server/auth';
import { apiError, ApiError } from '@/lib/server/http';
import { blogDatabaseError } from '@/lib/server/blog';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'Post not found.');
    const { data, error } = await adminDb()
      .from('blog_revisions')
      .select('id,version,draft,created_at')
      .eq('post_id', id)
      .order('version', { ascending: false })
      .limit(30);
    blogDatabaseError(error);
    return Response.json(
      { revisions: data || [] },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

import { z } from 'zod';
import { requireUser, adminDb } from '@/lib/server/auth';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { blogDatabaseError } from '@/lib/server/blog';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'Post not found.');
    const user = request.headers.has('authorization') ? await requireUser(request) : null;
    const db = adminDb();
    const { data, error } = await db
      .from('blog_posts')
      .select('like_count')
      .eq('id', id)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .maybeSingle();
    blogDatabaseError(error);
    if (!data) throw new ApiError(404, 'Post not found.');
    let liked = false;
    if (user) {
      const own = await db
        .from('blog_likes')
        .select('post_id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      blogDatabaseError(own.error);
      liked = !!own.data;
    }
    return Response.json(
      { count: data.like_count, liked },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const parsed = z
      .object({ liked: z.boolean() })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, 512)).toString()));
    if (!parsed.success || !z.uuid().safeParse(id).success)
      throw new ApiError(400, 'Choose a valid post.');
    const { data, error } = await adminDb().rpc('blog_set_like', {
      actor: user.id,
      target_post: id,
      liked: parsed.data.liked,
    });
    blogDatabaseError(error);
    return Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error);
  }
}

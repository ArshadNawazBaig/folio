import { z } from 'zod';
import { adminDb } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/platform';
import { ApiError, apiError, boundedBody } from '@/lib/server/http';
import { adminPostFields, blogDatabaseError } from '@/lib/server/blog';
import { blogDraftSchema, publicationError } from '@/lib/blog';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'Post not found.');
    const { data, error } = await adminDb()
      .from('blog_posts')
      .select(adminPostFields)
      .eq('id', id)
      .maybeSingle();
    blogDatabaseError(error);
    if (!data) throw new ApiError(404, 'Post not found.');
    return Response.json({ post: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const parsed = z
      .object({
        version: z.number().int().min(1),
        draft: blogDraftSchema,
        operation: z.enum(['save', 'publish', 'unpublish', 'trash', 'restore']).default('save'),
        publishAt: z.iso.datetime({ offset: true }).nullable().optional(),
      })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, 768 * 1024)).toString()));
    if (!z.uuid().safeParse(id).success || !parsed.success)
      throw new ApiError(400, 'Review the post fields, links, and content before saving.');
    const { draft, version, operation, publishAt } = parsed.data;
    if (operation === 'publish') {
      const message = publicationError(draft);
      if (message) throw new ApiError(400, message);
    }
    const { data, error } = await adminDb().rpc('blog_save', {
      actor: actor.id,
      post_id: id,
      expected_version: version,
      draft_value: draft,
      operation,
      publish_time: publishAt || null,
    });
    blogDatabaseError(error);
    return Response.json({ post: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error);
  }
}

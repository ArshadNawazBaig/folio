import { z } from 'zod';
import { adminDb } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/platform';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { adminPostFields, blogDatabaseError } from '@/lib/server/blog';
import { blankDraft } from '@/lib/blog';
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const parsed = z
      .object({
        page: z.coerce.number().int().min(1).max(10000).default(1),
        q: z.string().max(120).default(''),
        status: z.enum(['all', 'draft', 'published', 'scheduled', 'trashed']).default('all'),
      })
      .safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new ApiError(400, 'Choose valid post filters.');
    const { page, q, status } = parsed.data;
    let query = adminDb()
      .from('blog_posts')
      .select(adminPostFields, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .order('id')
      .range((page - 1) * 15, page * 15 - 1);
    if (status === 'all') query = query.neq('status', 'trashed');
    else query = query.eq('status', status === 'scheduled' ? 'published' : status);
    if (status === 'scheduled') query = query.gt('published_at', new Date().toISOString());
    if (status === 'published') query = query.lte('published_at', new Date().toISOString());
    if (q) query = query.ilike('draft->>title', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
    const { data, error, count } = await query;
    blogDatabaseError(error);
    return Response.json(
      {
        posts: (data || []).map(({ draft, ...post }) => {
          const { content: _content, ...summary } = draft;
          return { ...post, draft: summary };
        }),
        total: count || 0,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const { id, sourceId } = z
      .object({ id: z.uuid(), sourceId: z.uuid().optional() })
      .strict()
      .parse(JSON.parse((await boundedBody(request, 1024)).toString()));
    let draft = blankDraft(`untitled-${id.slice(0, 8)}`);
    if (sourceId) {
      const { data, error } = await adminDb()
        .from('blog_posts')
        .select('draft')
        .eq('id', sourceId)
        .maybeSingle();
      blogDatabaseError(error);
      if (!data) throw new ApiError(404, 'The source post is not available.');
      draft = {
        ...data.draft,
        title: `${data.draft.title || 'Untitled'} (copy)`.slice(0, 180),
        slug: `${data.draft.slug.slice(0, 105)}-${id.slice(0, 8)}`,
        featured: false,
      };
    }
    const { data, error } = await adminDb().rpc('blog_save', {
      actor: actor.id,
      post_id: id,
      expected_version: 0,
      draft_value: draft,
    });
    blogDatabaseError(error);
    return Response.json(
      { post: data },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(new ApiError(400, 'Choose a valid post.'));
    return apiError(error);
  }
}

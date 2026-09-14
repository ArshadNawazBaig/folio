import 'server-only';
import { cache } from 'react';
import { adminDb, authReady } from './auth';
import { ApiError } from './http';
import { blogDraftSchema, readingMinutes, type PublicPost } from '../blog';

export function blogDatabaseError(error: { message?: string; code?: string } | null) {
  if (!error) return;
  const msg = error.message || '';
  if (error.code === '23505')
    throw new ApiError(
      409,
      'This web address is already used by another post. Choose a different slug.',
    );
  if (msg.includes('blog_conflict'))
    throw new ApiError(
      409,
      'This post changed in another tab. Your edits are still here. Reload the saved version before continuing.',
    );
  if (msg.includes('blog_missing')) throw new ApiError(404, 'This post is not available.');
  if (/admin_required|blog_forbidden/.test(msg))
    throw new ApiError(403, 'You do not have permission to change this post.');
  if (msg.includes('blog_trashed'))
    throw new ApiError(409, 'Restore this post from Trash before editing.');
  if (msg.includes('blog_invalid'))
    throw new ApiError(400, 'Review the post details before saving.');
  throw new ApiError(
    503,
    'Blog storage is unavailable. Check the connection and apply migration 009_blog.sql.',
  );
}
export const adminPostFields =
  'id,draft,status,version,published_version,published_at,public_slug,created_at,updated_at,like_count';
type PublicRow = {
  id: string;
  published: unknown;
  published_at: string;
  published_updated_at: string;
  like_count: number;
};
function publicPost(row: PublicRow): PublicPost {
  const draft = blogDraftSchema.parse(row.published);
  return {
    ...draft,
    id: row.id,
    publishedAt: row.published_at,
    updatedAt: row.published_updated_at,
    likes: row.like_count,
    minutes: readingMinutes(draft.content),
  };
}
const publicFields = 'id,published,published_at,published_updated_at,like_count';
export async function publicPosts(page = 1, query = '', category = '') {
  if (!authReady()) return { posts: [] as PublicPost[], total: 0, unavailable: false };
  let request = adminDb()
    .from('blog_posts')
    .select(publicFields, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .order('id')
    .range((page - 1) * 12, page * 12 - 1);
  // Avoid PostgREST filter interpolation; this value is a single ilike parameter.
  if (query) request = request.ilike('published->>title', `%${query.replace(/[\\%_]/g, '\\$&')}%`);
  if (category) request = request.eq('published->>category', category);
  const { data, count, error } = await request;
  if (error) return { posts: [] as PublicPost[], total: 0, unavailable: true };
  return { posts: (data || []).map(publicPost), total: count || 0, unavailable: false };
}
export const publicPostBySlug = cache(async (slug: string): Promise<PublicPost | null> => {
  if (!authReady()) return null;
  const { data, error } = await adminDb()
    .from('blog_posts')
    .select(publicFields)
    .eq('public_slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  blogDatabaseError(error);
  return data ? publicPost(data) : null;
});
export async function blogSitemap() {
  if (!authReady()) return [];
  const rows: { public_slug: string; published_updated_at: string }[] = [];
  for (let offset = 0; offset < 45000; offset += 1000) {
    const { data, error } = await adminDb()
      .from('blog_posts')
      .select('public_slug,published_updated_at')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('id')
      .range(offset, offset + 999);
    blogDatabaseError(error);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

import { publicPosts } from '@/lib/server/blog';
import { guides } from '@/lib/guides';
import { isIndexable, siteUrl } from '@/lib/seo';
import { publicationFeed } from '@/lib/publication-feeds';

export async function GET() {
  const { posts, unavailable } = await publicPosts(1, '', '', 50);
  // A temporary database outage must not look like a successful empty feed to subscribers.
  if (unavailable)
    return new Response('The feed is temporarily unavailable. Please try again shortly.', {
      status: 503,
      headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' },
    });
  const entries = [
    ...guides.map((guide) => ({ ...guide, path: `/guides/${guide.slug}` })),
    ...posts.map((post) => ({
      title: post.title,
      description: post.excerpt,
      path: `/blog/${post.slug}`,
      category: post.category,
      published: post.publishedAt,
      updated: post.updatedAt,
    })),
  ];
  return new Response(publicationFeed(siteUrl, entries), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300',
      ...(!isIndexable ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
    },
  });
}

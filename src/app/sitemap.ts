import type { MetadataRoute } from 'next';
import { isIndexable, siteUrl } from '@/lib/seo';
import { serverTools } from '@/lib/server/tool-catalog';
import { connection } from 'next/server';
import { guides } from '@/lib/guides';
import { blogSitemap } from '@/lib/server/blog';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const tools = serverTools();
  if (!isIndexable) return [];
  const posts = await blogSitemap().catch(() => []);
  return [
    ...[
      '',
      '/tools',
      '/convert',
      '/forms',
      '/guides',
      '/blog',
      '/about',
      '/privacy',
      '/pricing',
    ].map((path) => ({
      url: `${siteUrl}${path || '/'}`,
    })),
    ...tools.filter((t) => t.available).map((t) => ({ url: `${siteUrl}/${t.slug}` })),
    ...guides.map((g) => ({ url: `${siteUrl}/guides/${g.slug}`, lastModified: g.updated })),
    ...posts.map((p) => ({
      url: `${siteUrl}/blog/${p.public_slug}`,
      lastModified: p.published_updated_at,
    })),
  ];
}

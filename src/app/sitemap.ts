import type { MetadataRoute } from 'next';
import { isIndexable, siteUrl } from '@/lib/seo';
import { serverTools } from '@/lib/server/tool-catalog';
import { connection } from 'next/server';
import { guides } from '@/lib/guides';
import { blogSitemap } from '@/lib/server/blog';
import { sitemapImage } from '@/lib/publication-feeds';
import { locales, languagePath, languageAlternates, translatedPaths } from '@/lib/i18n/config';
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
      '/terms',
      '/security',
      '/pricing',
    ].map((path) => ({
      url: `${siteUrl}${path || '/'}`,
      alternates: { languages: languageAlternates(path || '/', siteUrl) },
    })),
    ...tools
      .filter((t) => t.available)
      .map((t) => ({
        url: `${siteUrl}/${t.slug}`,
        alternates: { languages: languageAlternates(`/${t.slug}`, siteUrl) },
      })),
    ...locales
      .filter((locale) => locale !== 'en')
      .flatMap((locale) =>
        translatedPaths
          .filter((path) => !tools.some((tool) => path === `/${tool.slug}` && !tool.available))
          .map((path) => ({
            url: `${siteUrl}${languagePath(locale, path)}`,
            alternates: { languages: languageAlternates(path, siteUrl) },
          })),
      ),
    ...guides.map((g) => ({
      url: `${siteUrl}/guides/${g.slug}`,
      lastModified: g.updated,
      alternates: { languages: languageAlternates(`/guides/${g.slug}`, siteUrl) },
    })),
    ...posts.map((p) => ({
      url: `${siteUrl}/blog/${p.public_slug}`,
      lastModified: p.published_updated_at,
      images: sitemapImage(p.cover),
    })),
  ];
}

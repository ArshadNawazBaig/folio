import { FREE_LAUNCH } from '@/lib/access-policy';
import type { MetadataRoute } from 'next';
import { isIndexable, siteUrl } from '@/lib/seo';
import { serverTools } from '@/lib/server/tool-catalog';
import { connection } from 'next/server';
import { guides } from '@/lib/guides';
import { guideEdition } from '@/lib/guide-edition';
import { blogSitemap } from '@/lib/server/blog';
import { sitemapImage } from '@/lib/publication-feeds';
import { toolExamples } from '@/lib/tool-examples';
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
      ...(!FREE_LAUNCH ? ['/pricing'] : []),
    ].map((path) => ({
      url: `${siteUrl}${path || '/'}`,
      alternates: { languages: languageAlternates(path || '/', siteUrl) },
    })),
    ...tools
      .filter((t) => t.available)
      .map((t) => ({
        url: `${siteUrl}/${t.slug}`,
        lastModified: toolExamples[t.slug]?.updated,
        alternates: { languages: languageAlternates(`/${t.slug}`, siteUrl) },
      })),
    ...locales
      .filter((locale) => locale !== 'en')
      .flatMap((locale) =>
        translatedPaths
          .filter((path) => !FREE_LAUNCH || path !== '/pricing')
          .filter((path) => !tools.some((tool) => path === `/${tool.slug}` && !tool.available))
          .map((path) => ({
            url: `${siteUrl}${languagePath(locale, path)}`,
            alternates: { languages: languageAlternates(path, siteUrl) },
          })),
      ),
    ...guides.map((g) => ({
      url: `${siteUrl}/guides/${g.slug}`,
      lastModified: guideEdition(g).updated,
      alternates: { languages: languageAlternates(`/guides/${g.slug}`, siteUrl) },
    })),
    ...posts.map((p) => ({
      url: `${siteUrl}/blog/${p.public_slug}`,
      lastModified: p.published_updated_at,
      images: sitemapImage(p.cover),
    })),
  ];
}

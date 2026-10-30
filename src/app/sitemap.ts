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
import { toolContentUpdated } from '@/lib/tool-edition';
import { locales, languagePath, languageAlternates, translatedPaths } from '@/lib/i18n/config';

// Actual content revisions, including their translations. Never use the request
// or build date: unchanged pages must not appear freshly edited on every crawl.
const pageUpdates: Record<string, string> = {
  '/': '2026-10-15',
  '/tools': '2026-10-15',
  '/convert': '2026-10-15',
  '/forms': '2026-10-15',
  '/about': '2026-10-15',
  '/privacy': '2026-10-30',
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const tools = serverTools();
  if (!isIndexable) return [];
  const posts = await blogSitemap().catch(() => []);
  const guidesByPath = new Map(guides.map((guide) => [`/guides/${guide.slug}`, guide]));
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
      lastModified: pageUpdates[path || '/'],
      alternates: { languages: languageAlternates(path || '/', siteUrl) },
    })),
    ...tools
      .filter((t) => t.available)
      .map((t) => ({
        url: `${siteUrl}/${t.slug}`,
        lastModified: [toolContentUpdated(t.slug), toolExamples[t.slug]?.updated]
          .filter(Boolean)
          .sort()
          .at(-1),
        alternates: { languages: languageAlternates(`/${t.slug}`, siteUrl) },
      })),
    ...locales
      .filter((locale) => locale !== 'en')
      .flatMap((locale) =>
        translatedPaths
          .filter((path) => !FREE_LAUNCH || path !== '/pricing')
          .filter((path) => !tools.some((tool) => path === `/${tool.slug}` && !tool.available))
          .map((path) => {
            const guide = guidesByPath.get(path);
            return {
              url: `${siteUrl}${languagePath(locale, path)}`,
              lastModified:
                pageUpdates[path] ??
                toolContentUpdated(path.slice(1), locale) ??
                (guide ? guideEdition(guide, locale).updated : undefined),
              alternates: { languages: languageAlternates(path, siteUrl) },
            };
          }),
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

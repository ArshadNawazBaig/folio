import type { MetadataRoute } from 'next';
import { isIndexable, siteUrl } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) return { rules: { userAgent: '*', disallow: '/' } };
  // Workspaces return noindex. Keep them crawlable so crawlers can read that directive.
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

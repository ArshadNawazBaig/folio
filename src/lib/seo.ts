import type { Metadata } from 'next';
import { seoConfiguration } from './site-config';

export const { siteUrl, isIndexable } = seoConfiguration(process.env);
export const brand = 'Folio';
export function pageMetadata(
  title: string,
  description: string,
  path: string,
  index = true,
): Metadata {
  const image = `/og?title=${encodeURIComponent(title)}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: isIndexable && index, follow: isIndexable && index },
    ...(isIndexable && index
      ? {
          other: {
            googlebot:
              'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          },
        }
      : {}),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: brand,
      title: `${title} | Folio`,
      description,
      url: path,
      images: [{ url: image, width: 1200, height: 630, alt: `${title} — Folio PDF tools` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Folio`,
      description,
      images: [image],
    },
  };
}
export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: brand,
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
  };
}
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

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
    alternates: { canonical: path, types: { 'application/rss+xml': '/feed.xml' } },
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
    logo: { '@type': 'ImageObject', url: `${siteUrl}/icon-512.png`, width: 512, height: 512 },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${siteUrl}/support`,
    },
  };
}
/** Directory variants stay crawlable even when search/filter results should not be indexed. */
export function listingMetadata(
  title: string,
  description: string,
  path: string,
  page: number,
  index = true,
): Metadata {
  return {
    ...pageMetadata(
      page > 1 ? `${title} — Page ${page}` : title,
      page > 1 ? `Page ${page}. ${description}` : description,
      path,
      index,
    ),
    robots: { index: isIndexable && index, follow: isIndexable },
  };
}

export function collectionSchema(
  name: string,
  path: string,
  items: { name: string; path: string }[],
  offset = 0,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${siteUrl}${path}#collection`,
    name,
    url: `${siteUrl}${path}`,
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: offset + i + 1,
        name: item.name,
        url: `${siteUrl}${item.path}`,
      })),
    },
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

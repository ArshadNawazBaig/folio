import type { Metadata } from 'next';

const configured = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const parsed = new URL(configured);
export const siteUrl = parsed.origin;
export const isIndexable =
  process.env.NEXT_PUBLIC_INDEXABLE === 'true' &&
  parsed.protocol === 'https:' &&
  !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
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

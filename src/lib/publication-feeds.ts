export type FeedEntry = {
  title: string;
  description: string;
  path: string;
  published: string;
  updated: string;
  category: string;
};

// XML 1.0 excludes most control characters, even inside escaped text.
function xml(value: string) {
  return (
    value
      // oxlint-disable-next-line no-control-regex -- Strip characters forbidden in XML 1.0.
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  );
}

/** The public feed contains excerpts, never draft bodies or private document records. */
export function publicationFeed(origin: string, entries: FeedEntry[], now = new Date()) {
  const visible = entries
    .filter((entry) => Date.parse(entry.published) <= now.getTime())
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
    .slice(0, 50);
  const changed = visible.map((entry) => Date.parse(entry.updated)).filter(Number.isFinite);
  const lastBuildDate = changed.length
    ? `<lastBuildDate>${new Date(Math.max(...changed)).toUTCString()}</lastBuildDate>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Folio — PDF guides and articles</title>
<link>${xml(origin)}/blog</link>
<description>Practical PDF tutorials, document workflows, and product guides from Folio.</description>
<language>en</language>
<atom:link href="${xml(origin)}/feed.xml" rel="self" type="application/rss+xml"/>
${lastBuildDate}
${visible
  .map((entry) => {
    const url = xml(new URL(entry.path, origin).href);
    return `<item>
<title>${xml(entry.title)}</title>
<link>${url}</link>
<guid isPermaLink="true">${url}</guid>
<description>${xml(entry.description)}</description>
<category>${xml(entry.category)}</category>
<pubDate>${new Date(entry.published).toUTCString()}</pubDate>
</item>`;
  })
  .join('\n')}
</channel>
</rss>\n`;
}

/** Index durable public images only; signed/private storage URLs must never enter a sitemap. */
export function sitemapImage(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      /\/storage\/v1\/(?:object|render\/image)\/(?!public\/)/i.test(url.pathname) ||
      [...url.searchParams.keys()].some((key) => /token|signature|credential|secret/i.test(key))
    )
      return [];
    // Next's sitemap serializer interpolates image locations without XML escaping.
    return [xml(url.href)];
  } catch {
    return [];
  }
}

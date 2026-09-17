import { blogText, safeBlogUrl, type RichNode } from './blog';

export function articleHeadings(content: RichNode) {
  const headings: { id: string; text: string }[] = [];
  function visit(node: RichNode, key: string) {
    if (node.type === 'heading' && Number(node.attrs?.level) === 2) {
      const text = blogText(node).trim();
      if (text) headings.push({ id: `section-${key}`, text });
    }
    node.content?.forEach((child, i) => visit(child, `${key}-${i}`));
  }
  visit(content, 'article');
  return headings;
}

/** Recommend only tools explicitly linked in the article, on this site's origin. */
export function articleToolSlugs(content: RichNode, origin: string) {
  const slugs = new Set<string>();
  function visit(node: RichNode) {
    for (const mark of node.marks || []) {
      const href = mark.type === 'link' && safeBlogUrl(mark.attrs?.href);
      if (!href) continue;
      const url = new URL(href, origin);
      if (url.origin === origin && /^\/[a-z0-9-]+\/?$/.test(url.pathname))
        slugs.add(url.pathname.replace(/^\/|\/$/g, ''));
    }
    node.content?.forEach(visit);
  }
  visit(content);
  return [...slugs];
}

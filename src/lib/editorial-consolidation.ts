// One maintained article for each of these repeated tutorials. Old URLs remain
// useful through permanent redirects; their CMS records and revisions are retained.
export const consolidatedArticles: Record<string, string> = {
  'create-invoice-free-invoice-generator': '/guides/create-professional-invoice-online',
  'how-to-edit-original-text-in-a-pdf': '/guides/why-cant-i-edit-pdf-text',
  'how-to-reduce-pdf-file-size': '/guides/why-your-pdf-wont-get-smaller',
  'how-to-edit-pdf-on-phone': '/guides/how-to-edit-a-pdf-on-mobile',
  'how-to-make-a-signature-online': '/guides/create-transparent-signature-png',
  'how-to-create-fill-and-sign-pdf-forms': '/guides/fillable-pdf-vs-flattened-pdf',
  'how-to-merge-and-organize-pdf-files': '/guides/how-to-merge-and-split-pdfs',
  'free-pdf-editor-add-text-fill-sign': '/guides/how-to-edit-a-pdf',
  'free-pdf-tool-online-guide': '/blog/choose-a-free-pdf-editor',
};

export const consolidatedSlugs = Object.keys(consolidatedArticles);
export const consolidatedSlugFilter = `(${consolidatedSlugs.join(',')})`;

export function editorialHref(href: string): string {
  const match = href.match(/^\/blog\/([^/?#]+)([?#].*)?$/);
  if (!match || !Object.hasOwn(consolidatedArticles, match[1])) return href;
  // Old article heading fragments do not identify headings in the retained guide.
  const query = match[2]?.startsWith('?') ? match[2].split('#')[0] : '';
  return consolidatedArticles[match[1]] + query;
}

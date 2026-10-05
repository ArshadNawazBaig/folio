// Identical labels in different languages (for example Spanish and Portuguese)
// are valid. Flag competing metadata only within the same document language.
export function metadataKey(language, value) {
  return JSON.stringify([language.toLowerCase(), value]);
}

export function languageAlternateIssues(pages) {
  const issues = [];
  const byUrl = new Map(pages.map((page) => [new URL(page.url).href, page]));
  for (const page of pages) {
    const alternates = page.languages ?? {};
    if (!Object.keys(alternates).length) continue;
    if (alternates[page.language] !== page.url)
      issues.push(`${page.url}: hreflang must include its own language and URL.`);
    for (const [language, url] of Object.entries(alternates)) {
      const target = byUrl.get(url);
      if (!target) {
        issues.push(`${page.url}: hreflang ${language} points outside the audited pages (${url}).`);
        continue;
      }
      if (language !== 'x-default' && language.split('-')[0] !== target.language.split('-')[0])
        issues.push(`${page.url}: hreflang ${language} points to a ${target.language} page.`);
      if (target.languages?.[page.language] !== page.url)
        issues.push(`${page.url}: hreflang ${language} has no reciprocal ${page.language} link.`);
    }
  }
  return [...new Set(issues)];
}

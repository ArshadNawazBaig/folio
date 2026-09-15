import { writeFile } from 'node:fs/promises';

const input = process.argv[2];
if (!input || !/^https?:\/\//.test(input)) {
  console.error('Usage: npm run seo:audit -- https://your-domain.example [report.json]');
  process.exit(1);
}
const origin = new URL(input).origin;
const issues = [];
const pages = [];
const decode = (value) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1].toLowerCase(),
      decode(match[2] ?? match[3]),
    ]),
  );
const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => attributes(match[0]));
async function get(path) {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error(`Off-site URL in sitemap: ${url.href}`);
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'FolioSEOAudit/1.0', Accept: 'text/html,application/xml,text/plain' },
  });
  return { response, html: await response.text() };
}
function check(condition, message) {
  if (!condition) issues.push(message);
}
try {
  const robots = await get('/robots.txt');
  check(robots.response.status === 200, 'robots.txt must return HTTP 200.');
  check(!/^Disallow:\s*\/\s*$/im.test(robots.html), 'robots.txt blocks the entire site.');
  check(
    robots.html.includes(`Sitemap: ${origin}/sitemap.xml`),
    'robots.txt must reference the canonical sitemap.',
  );
  const sitemap = await get('/sitemap.xml');
  check(sitemap.response.status === 200, 'sitemap.xml must return HTTP 200.');
  const urls = [...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decode(match[1]));
  check(urls.length > 0, 'The sitemap is empty.');
  check(new Set(urls).size === urls.length, 'The sitemap contains duplicate URLs.');
  check(urls.length <= 50000, 'Split this sitemap before it exceeds 50,000 URLs.');
  const titles = new Map();
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        try {
          const parsed = new URL(url);
          check(
            !/^\/(?:api|workspace|documents|account|dashboard|admin|auth|support|maintenance)(?:\/|$)/.test(
              parsed.pathname,
            ),
            `Private URL appears in sitemap: ${url}`,
          );
          const { response, html } = await get(url);
          const meta = tags(html, 'meta');
          const canonical = tags(html, 'link').find((tag) => tag.rel === 'canonical')?.href;
          const title = decode(html.match(/<title>([^<]*)<\/title>/i)?.[1] || '');
          const description = meta.find((tag) => tag.name === 'description')?.content;
          const robots = [
            response.headers.get('x-robots-tag') || '',
            ...meta
              .filter((tag) => ['robots', 'googlebot'].includes(tag.name))
              .map((tag) => tag.content || ''),
          ].join(',');
          check(response.status === 200, `${url}: HTTP ${response.status}.`);
          check(!/noindex/i.test(robots), `${url}: indexing is disabled.`);
          check(!!title, `${url}: missing title.`);
          check(!titles.has(title), `${url}: title duplicates ${titles.get(title)}.`);
          titles.set(title, url);
          check(!!description, `${url}: missing description.`);
          check(
            !!canonical && new URL(canonical, origin).href === parsed.href,
            `${url}: canonical does not match this sitemap URL (${canonical}).`,
          );
          check(
            (html.match(/<h1\b/gi) || []).length === 1,
            `${url}: expected one primary heading.`,
          );
          check(
            meta.some((tag) => tag.property === 'og:image'),
            `${url}: missing Open Graph image.`,
          );
          check(
            meta.some((tag) => tag.name === 'twitter:card'),
            `${url}: missing social card metadata.`,
          );
          for (const match of html.matchAll(
            /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
          ))
            JSON.parse(match[1]);
          pages.push({ url, status: response.status, title, canonical });
        } catch (error) {
          issues.push(`${url}: ${error.message}`);
        }
      }
    }),
  );
  for (const path of ['/workspace', '/dashboard', '/account', '/admin', '/support']) {
    const { response, html } = await get(path);
    check(
      /noindex/i.test(response.headers.get('x-robots-tag') || ''),
      `${path}: missing private-route noindex header.`,
    );
    check(
      tags(html, 'meta').some((tag) => tag.name === 'robots' && /noindex/.test(tag.content || '')),
      `${path}: missing private-route noindex metadata.`,
    );
  }
  const missing = await get('/folio-seo-audit-missing-page');
  check(missing.response.status === 404, 'Unknown routes must return HTTP 404.');
} catch (error) {
  issues.push(error.message);
}
const report = {
  origin,
  checkedAt: new Date().toISOString(),
  passed: issues.length === 0,
  pagesChecked: pages.length,
  issues,
  pages: pages.sort((a, b) => a.url.localeCompare(b.url)),
};
if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    { origin, passed: report.passed, pagesChecked: report.pagesChecked, issues },
    null,
    2,
  ),
);
if (!report.passed) process.exitCode = 1;

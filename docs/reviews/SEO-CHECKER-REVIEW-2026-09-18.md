# Review of the external SEO report — September 18, 2026

Site: https://thebestfreepdf.com. Checker: https://geoseochecker.com/audit/thebestfreepdf.com.

The owner's screenshots show a mixture of technical warnings and an AI-visibility checklist.
The checker's public report fetched during this review instead shows **84/100, zero critical
issues and 11 warnings**, with a last-crawled date of September 17. A different scan time or view
may explain the difference. Its underlying fetch logs are not available, so the reason for each
discrepancy cannot be established.

## Confirmed gaps addressed

- Added `/feed.xml`, an RSS 2.0 feed of published blog excerpts and guides, capped at 50 recent
  items. It uses actual publication/update dates and excludes draft and future articles. A blog
  database outage returns 503 instead of a misleading empty feed. Public pages expose an RSS
  discovery link in their head and footer.
- Extended the existing sitemap with public blog cover images. There is no need for a separate
  image-sitemap file. Signed/private storage URLs are excluded. Image query strings are escaped
  explicitly because this installed Next.js version interpolates image locations into XML.
- Added FAQPage data to the shared FAQ component, sourced from the exact visible questions and
  answers. Existing Organization/WebSite/Article/BlogPosting/BreadcrumbList/CollectionPage data
  remains. Google no longer displays FAQ rich results; this is descriptive markup, not a ranking
  or rich-result promise.
- Published `/.well-known/security.txt` with the existing private support form as its contact,
  a security-reporting page, a fixed September 1, 2027 expiry, and a `/security.txt` redirect.
  Review the contact before that expiry. No email address, reward, response SLA, or testing
  authorization was invented.
- Added a linked `/terms` page explaining current document use, storage, paid exports, checkout,
  renewal, cancellation and support. It does not invent a refund guarantee, governing jurisdiction,
  registered business identity or limitation-of-liability clause. It is not a jurisdiction-specific
  legal compliance assessment. Future business policies should be reflected in this page.
- Added a Content Security Policy compatible with statically generated Next.js pages. It restricts
  scripts to this origin, connections to this origin and configured Supabase, permits local/blob
  workers, fonts and WebAssembly needed by the PDF editor, and blocks objects, frames and inline
  event handlers. Published images may use HTTPS sources. Development alone permits general eval
  and websocket development connections. Production still permits inline script blocks required
  by current React hydration: this is **not a strict nonce-based XSS policy**. Switching to nonces
  would require dynamic rendering and nonce handling throughout the app.

## Warnings that did not reproduce or are not applicable

| Report item                                                                                   | Evidence or decision                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing JSON-LD                                                                               | The live homepage already served Organization and WebSite JSON-LD before changes. Tool, guide and article pages also have structured data. FAQPage itself was absent and has now been added.                                            |
| Contact and author/team links missing                                                         | The homepage footer already linked `/support` and `/about`. The About page describes Folio's editorial role; guides/blogs link to it. Do not invent author qualifications to satisfy a detector.                                        |
| Numbered lists missing                                                                        | Tool pages contain ordered instructions; guides have numbered section navigation. A homepage-only check is not a site-wide finding.                                                                                                     |
| Publication dates and author bylines absent                                                   | Guides and posts already render editorial attribution and `<time datetime>` dates. A tools homepage has no artificial publication date.                                                                                                 |
| Tables, definition lists, quotations, takeaway/conclusion blocks or question headings missing | These are content formats, not mandatory elements for every page. Use them where they improve the actual content; do not add filler or irrelevant citations to pass a checklist.                                                        |
| www/non-www resolve differently                                                               | HTTP and HTTPS for both hostnames all resolved to `https://thebestfreepdf.com/`, HTTP 200 from Vercel. Earlier stale DNS routing to Lemon Squeezy could have affected a past scan, but this cannot be confirmed from the public report. |
| No responsive CSS                                                                             | The loaded CSS includes media queries. Mobile browser checks cover overflow and accessibility.                                                                                                                                          |
| HTTP/1.1 only                                                                                 | A direct HTTP/2 request returned `HTTP/2 200`; Lighthouse also recorded `h2` for assets/API requests. A checker using an HTTP/1.1 client cannot infer lack of server HTTP/2 support.                                                    |
| CSS/JS minification and image aspect ratios                                                   | Independent Lighthouse checks passed all three. A line-length heuristic is not reliable evidence that a production bundle is unminified.                                                                                                |
| Modern images                                                                                 | Homepage artwork is inline SVG, which does not need raster conversion. Blog covers already use responsive Next.js optimization for supported public sources.                                                                            |
| Keyword and SERP-length warnings                                                              | Homepage title/H1/description already describe free PDF tools and distinguish paid original-text downloads. Character counts are not hard Google limits; avoid keyword stuffing or deceptive free claims.                               |
| llms.txt, llms-full.txt, .well-known/ai.txt                                                   | Not required for Google Search or its AI features. No artificial files were added to imply ranking improvements. Google's documented discovery controls remain HTML, robots, sitemaps and supported metadata.                           |
| News/video sitemaps                                                                           | Folio is not a news publication and currently has no indexable hosted video collection. Do not generate empty or fictional sitemaps.                                                                                                    |
| ads.txt                                                                                       | Folio currently has no advertising integration or authorized ad inventory sellers. No seller IDs should be fabricated.                                                                                                                  |

## Email DNS requires owner information

Public TXT lookup found Google verification but no SPF record. SPF is email-sender authentication,
not an HTML SEO setting. The owner has been asked which provider sends mail from this domain.
Do not guess a Google Workspace/Microsoft/other provider include, or publish `v=spf1 -all` until
the domain's sending use is confirmed. No DNS records were changed.

## Independent performance measurement

A new mobile Lighthouse run against production, before this patch, at 20:00 UTC on September 17
(September 18 in Pakistan) measured:

| Category/metric          | Result  |
| ------------------------ | ------- |
| Performance              | 83/100  |
| SEO                      | 100/100 |
| Accessibility            | 100/100 |
| Best practices           | 100/100 |
| First contentful paint   | 1.4 s   |
| Largest contentful paint | 2.9 s   |
| Total blocking time      | 200 ms  |
| Speed index              | 12.3 s  |

The screenshot's 0/100 performance score did not reproduce. Performance still has room for
improvement, particularly visual completion and unused shared CSS/JS. A previous run was 94;
neither single result is field Core Web Vitals or a ranking measurement. Raw report:
`/tmp/folio-seo-checker-lighthouse.json`. Do not promise 100 performance or first-place rankings.

## Validation

- Nine focused unit tests, eight SEO/blog browser tests, lint, TypeScript, and the production build
  passed. Five additional browser tests against the production build exercised CSP enforcement,
  inline text editing, saving, payment gating, pointer zoom, duplicated-page edits, and sharp
  long-page previews after refresh. Workspace storage in these tests is intercepted locally;
  no customer files or purchases were used.
- Deployed as `dpl_FhTTWJBtVhrZ19ELPYn1QUAbNHEW`, alias
  `https://folio-cjzsz1778-arshadnawazbaigs-projects.vercel.app`, on the production domain
  `https://thebestfreepdf.com`.
- The expanded production audit passed for **55 pages with no reported issues**. RSS, sitemap and
  security.txt returned HTTP 200 with their expected content types. Independent XML parsing
  confirmed a feed with 16 published entries and a sitemap with six public blog images.
- Production mobile checks in Chromium and WebKit passed on the homepage, terms, security and
  blog listing: no JavaScript errors, CSP violations, horizontal overflow, or broken eager images.
  FAQ data and RSS head links were present. This verifies the deployment, not Google's indexing,
  rich-result eligibility or the external checker's next score.
- Raw results: `/tmp/folio-seo-checker-deployed-audit.json`,
  `/tmp/folio-seo-checker-browser.json`, and `/tmp/folio-terms-mobile.png`.

## Sources

- [Google: optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google Search documentation updates, including FAQ removal](https://developers.google.com/search/updates)
- [Google image sitemap guidance](https://developers.google.com/search/docs/appearance/google-images)
- [Google sitemap overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [RFC 9116: security.txt](https://www.rfc-editor.org/rfc/rfc9116.html)
- [RSS 2.0 specification](https://www.rssboard.org/rss-specification)
- Installed Next.js 16.3.5 guides: route handlers, metadata, sitemap, headers, content security policy.

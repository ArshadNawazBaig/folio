# SEO implementation and launch setup

## Current search review — October 5, 2026

### Full tool catalog scope

The owner's follow-up explicitly includes every tool, not only the initial PDF priorities.
The implementation covers **all 28 tool routes**. PDF translation and the three Office
converters were removed at the owner’s request because their external processing is paid.
Their English and translated URLs return 404, all discovery links and SEO targets are
removed, and the old processing endpoint returns 410 without contacting providers.

Every tool has a task-specific title and concise search description. The homepage links
directly to every available tool in six translated groups. This makes QR codes, short links,
invoices and image tools discoverable without interacting with filters. Related-tool links
now connect useful workflows: QR codes to short links, image conversion to compression,
and invoices to signatures and QR codes.

The [keyword map](SEO-KEYWORD-MAP.csv) now contains **189 distinct query candidates**, including
destinations for all 28 tools. The earlier map covered only 12 tool destinations. These are
product-fit search targets, not measured demand, keyword difficulty or achieved rankings.
No keyword meta tags or duplicate pages were created for these variations.

The requested “free online pdf editor no sign up” query targets the existing `/edit-pdf`
page. Its English search title, description and practical example now explain editing and
downloading as a guest, with the 100 MB private storage allowance and 24-hour expiry stated.

| Group                        | Tools covered                                                                                                              | Example query targets                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| PDF editing and organization | Editor, original-text editor, merge, split, compress, organize, rotate, crop, watermark, page numbers, password protection | edit PDF text online free; add page numbers after cover; watermark selected PDF pages |
| PDF and image conversion     | PDF to JPG, PNG and text; images, JPG and PNG to PDF; merge images                                                         | PDF to PNG 300 DPI; screenshots to PDF; extract selectable text                       |
| Images                       | Image compression, image enhancement, JPG to WebP, WebP to JPG                                                             | compress image to 20 KB; batch WebP to JPG; adjust photo brightness                   |
| Signatures and forms         | Signature generator, PDF signing, fillable form builder                                                                    | transparent signature PNG; sign PDF online free; create fillable PDF                  |
| Invoices                     | Invoice generator                                                                                                          | free invoice generator; invoice maker with logo; freelance invoice PDF                |
| Links and QR codes           | URL shortener, QR code generator                                                                                           | custom short link free; editable short URL; Wi-Fi QR code; QR code SVG download       |

Measure each group's pages separately in Search Console; a PDF-only query filter would hide
progress on the other tools. For example, compare queries matching
`(invoice|qr|shorten|webp|image|photo|signature)` as well as PDF queries, and inspect the actual
landing pages. Groups overlap, so do not add their totals together as if they were exclusive.
Use the same date, country and device filters for each comparison.

Expand examples and seek relevant editorial mentions across all six groups as evidence
develops. Existing invoice, signature, image compression, QR and short-link blog articles
already provide supporting content; improve those before producing similar articles.
Preserve actual limits: image enhancement is not AI upscaling, merged images become PDF
pages rather than a collage, short links require an account, and scans need OCR elsewhere.
The [Google title guidance](https://developers.google.com/search/docs/appearance/title-link)
and [link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
support clear page identities and crawlable links; they do not promise rankings.

### Audit evidence and indexing follow-up

The owner confirms Search Console is connected and is the dashboard used to check traffic.
On October 5, the owner inspected the homepage and reported **“URL is on Google”**. The homepage
is therefore confirmed indexed by that report. The owner also supplied seven performance CSVs,
analyzed privately on October 5. The chart covers September 16–October 3, despite the “Last 28
days” filter label. Mobile editing is the strongest visible task cluster; the mobile guide is
the most visible page. Global query and page exports do not establish their exact pairing.
Tool-page URL Inspection states have not been supplied. **The live HTTP audit cannot tell us
how many pages Google has indexed or why impressions are low.** The September 26 entry in this repository
records an earlier owner-reported baseline of 9 clicks and 45 impressions in seven days; it is
not a current measurement. A public `site:` search returned no results during this review,
which is not a substitute for Search Console URL Inspection.

The production crawl checked **676 sitemap URLs plus one blog pagination URL**. All returned
200, had self-canonical URLs and indexable directives, and had discoverable internal links.
Robots and sitemap were accessible, private routes returned noindex, and the missing-page
probe returned 404. HTTP and www redirected to the preferred HTTPS apex. Sample requests
using a Googlebot user agent also succeeded; this does not establish access from Google's
actual crawler infrastructure. The 676 sitemap URLs consist of 71 English pages and 55 pages
in each of 11 other languages. Full pre-change evidence was written to
`/tmp/pdf-seo-live-audit.json` during the review.

The old audit reported 34 issues: 11 real duplicate descriptions between a translated
homepage and its editor, and 23 identical titles across different languages. Shared words
such as Spanish/Portuguese tool names are not an error merely because they match. The audit
now compares metadata within each language and validates self-referencing and reciprocal
hreflang destinations. Its JSON output includes descriptions, language groups and request
durations; durations are local observations, not Core Web Vitals.

### Changes prepared in this checkout

- Every English tool page now includes an original practical example with settings, an output
  check and accurate limitations. Five new fictional practice files support the instructions.
  The [current strategy](SEO-KEYWORD-PLAN.md) and [28-tool research CSV](SEO-COMPETITOR-RESEARCH.csv)
  record October 5 competitor observations, priorities and a free four-week promotion plan.
- English tool sitemap entries use the actual update date of their practical example. The
  date is editorial data and does not change on each request or leak to unchanged translations.
- `npm run seo:opportunities -- export.zip --help` documents the offline Search Console
  CSV/ZIP analyzer. It identifies review candidates from supplied observations and keeps
  query and page tables separate. The owner's real exports were analyzed locally; the raw
  data, JSON analysis and HTML report remain outside the repository.
- The existing English mobile guide now includes Android/iPhone steps, original-text editing,
  a fictional practice file and download troubleshooting. Its visible date, Article metadata,
  sitemap and feed reflect the revision. Unchanged translations keep their reviewed edition.
- The homepage explicitly identifies the free online PDF toolkit in its visible headline,
  preserving the existing design and translating the headline in all supported languages.
- Homepage metadata and WebPage structured data share the same description, including the
  translated pages. Editor descriptions are now distinct from homepage descriptions.
- Home/tool reading links, tool privacy links, guide table links, guide breadcrumbs and
  guide collections point to the selected language's real URLs.
- The original-text editor search title now states that it is free.
- Browser coverage checks the distinct descriptions in all 12 languages and checks
  English, German and Japanese discovery without JavaScript at a mobile viewport.
- An existing missing-page heading spacing bug and a stale paid-download test expectation
  were corrected while running the SEO regression suite.

These are local changes until deployed. They fix observable issues; they do not establish
that those issues caused the low traffic or promise a position in Google.

### Establish the actual bottleneck first

1. In Search Console, record the **Pages** indexed/not-indexed counts and leading exclusion
   reasons. In **Sitemaps**, confirm the submitted `sitemap.xml` has status **Success** and
   inspect its last-read date. A submission alone is not evidence of indexing.
2. Inspect `/`, `/edit-pdf`, `/edit-pdf-text`, `/merge-pdf` and `/signature-generator`.
   Record last crawl, indexing permission and Google-selected canonical. If a page is
   excluded, use **Test live URL** and compare the fetched HTML with the actual page.
3. Address the reported reason: robots/noindex/5xx failures need technical fixes;
   unexpected canonicals need duplicate-content analysis; “Discovered” or “Crawled —
   currently not indexed” needs a review of discovery, distinct usefulness and Google’s
   chosen pages. Do not delete translations or redirect articles based only on guesswork.
4. Preserve the supplied performance baseline and add a Queries export filtered to the mobile
   guide URL. The supplied global tables cannot be joined into query/page pairs. Keep date,
   search-type, country and device filters consistent for follow-up comparisons. Missing
   queries cannot be classified as branded, nonbranded or owner traffic. Page-level impressions
   also use different aggregation from chart totals; do not add all tables together.
5. Use Search Console as the organic-search baseline, as confirmed by the owner. It does not
   count all visits or completed downloads. The live apex runs on Railway, while
   `RootDocument` mounts Vercel Analytics only when `VERCEL=1`; that separate instrumentation
   gap does not explain the owner's Search Console figures.

Latest validation: production build (727 static pages), TypeScript, lint and all 20 SEO/blog/
retired-tool browser checks passed. Browser coverage includes all 28 examples in the initial
HTML, every linked practice download, mobile/desktop accessibility, and an actual JPG export
below 20 KB using the published practice image. A focused PDF export test confirms the new
rotation and cover-skipping numbering examples produce the stated results. Earlier SEO,
internationalization and provider-removal unit checks are recorded in this task's history.
No deployment, outreach or Search Console indexing request was made during this change.

Fast-ranking follow-up validation: four offline CSV/ZIP analysis tests using synthetic fixtures
and the sitemap browser check passed, followed by lint, TypeScript and a fresh 727-page
production build. The analyzer subsequently processed the owner's real exports. Live checks still found the old tool directory and no
new practical examples on the two sampled pages; production publishing approval is pending.

Performance-export follow-up validation: 17 SEO/internationalization/content-discovery unit
checks and five browser checks passed, along with lint, TypeScript and a new 727-page
production build. The browser checks cover initial HTML, the revised guide's date/schema/
sitemap, its practice download, phone layout/accessibility and unchanged German content/date.
The private HTML report was also checked at desktop and mobile widths with no external
requests. Current HTTP/www redirects and the guide's HTTPS canonical were verified; the
historical HTTP performance row did not reproduce a current redirect problem. These checks
do not establish real-device behavior or a ranking change. The release is still local.

### Search growth priorities

The [current all-tool strategy](SEO-KEYWORD-PLAN.md) supersedes the earlier PDF-only
promotion order. It includes the dated 28-tool competitor evidence, every tool's supporting
query, a free four-week work schedule, three demonstration drafts and individual resource
outreach copy. No outreach has been sent.

The supplied performance data changes the first priority to mobile PDF editing. Start with
the revised guide and its practice task. Preserve the early QR-code result and observe the
compression troubleshooting guide; their small samples do not establish repeatable wins.
Image compression, transparent signature PNGs, cover-skipping numbering and PDF-to-PNG at
300 DPI remain secondary demonstrations based on product fit. All 28 tools retain their own
examples and remain in the plan; missing rows do not prove a tool is unindexed.

Use current Search Console data to choose subsequent work. Homepage indexing and a dated
performance baseline are available; individual tool URL Inspection states remain unknown. Reassess weekly and
compare equal periods. Keep all supporting queries on their relevant existing pages rather
than creating repetitive landing pages. The PDF compressor performs structural optimization;
the image compressor's KB targets must not be advertised as PDF compression features.

**Current pricing overrides historical notes below:** all available tools and downloads are
free under the current launch policy. Earlier instructions about paid original-text exports
describe an older release and must not be used as current product copy.

## International languages — October 3, 2026

The language selector offers English, German, French, Dutch, Spanish, Italian, Portuguese, Swedish, Norwegian Bokmål, Danish, Japanese and Korean. English keeps its existing URLs. The other languages use `/de`, `/fr`, `/nl`, `/es`, `/it`, `/pt`, `/sv`, `/nb`, `/da`, `/ja` and `/ko`.

Each language includes the homepage, tool directories, all 28 tool landing pages, forms, pricing, 17 guides, about, privacy, terms, security, and the blog interface. Headings, descriptions, instructions, FAQs, forms, tool controls, and download controls use the selected language. Private dashboard, account, support, and maintenance routes have localized URLs. The PDF workspace and invoice editor keep their existing private URLs and translate their controls using the saved language preference. User-entered text, uploaded documents, and CMS-authored blog articles retain their original content; the blog navigation and surrounding interface are translated. Removed translation and Office-conversion URLs return 404 and are absent from the sitemap.

Translated public pages have its own canonical, translated search/social copy, server-rendered HTML language, and language-tagged structured data. Equivalent pages have reciprocal language and regional `hreflang` links, an English `x-default`, and sitemap entries. Region tags share a language URL; there are no duplicate country-only pages. Visitors choose their language through crawlable links, with no IP-based or browser-language redirects. The browser remembers an explicit choice in `folio-language` local storage. Later unprefixed visits to translated routes return to the saved language, preserving queries and fragments; choosing English explicitly resets that preference. Private editors retain their URLs and use the selected interface language without resetting navigation or sending language changes to the homepage. Search crawlers without a saved choice still receive each URL’s original server-rendered content. This follows [Google’s multilingual-site guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).

The initial market coverage is a targeting plan, not a verified ranking of advertising payouts:

| Language                       | Markets covered by regional alternates                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| English                        | United States, United Kingdom, Canada, Australia, New Zealand, Ireland, Singapore                    |
| German                         | Germany, Austria, Switzerland                                                                        |
| French                         | France, Canada, Belgium, Switzerland                                                                 |
| Dutch                          | Netherlands, Belgium                                                                                 |
| Swedish / Norwegian / Danish   | Sweden, Norway, Denmark                                                                              |
| Japanese / Korean              | Japan, South Korea                                                                                   |
| Spanish / Italian / Portuguese | Spain and Spanish-speaking US audiences; Italy and Italian-speaking Switzerland; Portugal and Brazil |

Start country-level measurement with the US, UK, Canada, Australia, Germany and Switzerland, then compare the other supported markets using actual organic visits, completed document tasks, and revenue per thousand page views. Language support improves accessibility and provides search landing pages; it does not establish which countries pay this site most. [Google AdSense](https://adsense.google.com/start/) explains that revenue depends on advertiser demand, visitor location, content, devices, seasonality and ad formats. No site-specific AdSense country report was available for this implementation.

After deploying, check the production sitemap, inspect a translated homepage and tool URL in Search Console, and compare 28-day Search Console reports by country, page, query and device. Pair those with country-level AdSense page RPM and total revenue if ads are configured. Prioritize further native-language guides using the countries and tasks that show real demand; review translations with native speakers as traffic grows. Indexing, ranking and revenue improvements have not been measured by the local checks.

Implementation: `src/lib/i18n/config.ts` defines locale/region coverage and the translated route allowlist; `src/lib/i18n/messages` holds processing dictionaries and `src/lib/i18n/site-messages` holds shared page translations; `src/lib/i18n/dashboard-messages` holds private dashboard translations; `src/lib/i18n/feature-messages` covers the remaining pages, guides, and editor controls. New feature copy was drafted with machine translation and needs editorial review by native speakers. Translation runs locally from checked-in dictionaries; user documents are not sent to a translation service for interface localization. English and international routes share `HomePageContent`, `DirectoryPageContent`, `ToolPageContent`, the resource pages in `src/components/pages`, `Header`, and `Footer`. Every language uses the same markup, CSS, full tool catalog, search, filters, preview, and content sections. The navbar has no Open editor button. Dashboard routes share `DashboardPage` and `UserDashboard`; their language selector preserves the current tab, and sign-in returns to the selected language. These private routes stay noindex and out of the sitemap and public hreflang alternates. Thin language routes in `src/app/(international)` supply translated text to these components. `src/app/(english)` preserves all previous public URLs. Separate root layouts keep the correct HTML language without making static pages dynamic. Transfers between the private editor and translated tools use a single-use browser handoff, valid for five minutes, deleted when consumed; expired abandoned handoffs are removed on the next transfer.

Validation: `npm run test:i18n` covers language navigation, rendered metadata without JavaScript, all translated URLs, the sitemap, mobile accessibility, PDF output and editor file transfer, plus the existing SEO browser checks. The suite also checks rendered layout parity, translated filters, stored language preferences, reloads, new tabs, explicit switching back to English, and navigation through translated resources and private editors. `tests/expanded-i18n.spec.ts` checks server-rendered copy across all languages, remaining English UI text, and layout parity on the expanded pages. Dictionary completeness and URL mapping are covered by `tests/i18n.test.ts`. Dashboard language switching, account return paths, guest file continuity and mobile controls are covered by `tests/dashboard-i18n.spec.ts` under `npm run test:auth`.

## Latest review — September 18, 2026

See the [keyword and content plan](SEO-KEYWORD-PLAN.md) and [keyword map](SEO-KEYWORD-MAP.csv) for the requested broad PDF/editor searches, additional task queries, preferred landing pages, sourced comparison guide and Search Console measurement plan.

See [the external-checker review](reviews/SEO-CHECKER-REVIEW-2026-09-18.md) for verified findings, RSS discovery, sitemap images, matching FAQ markup, service terms, security reporting, and CSP. It separates actual gaps from checklist items that do not apply. SPF DNS configuration still requires the domain's email-provider information. Review the security contact before `security.txt` expires on September 1, 2027.

See [the September 17 SEO review](reviews/SEO-AUDIT-2026-09-17.md) for the preceding changes, checks, and search priorities. The owner now has a Search Console domain property and has submitted the sitemap; its reported fetch failure still needs the expanded Google error/live-inspection result. Earlier “verification pending” entries below are historical.

Run `npm run test:seo` for local browser coverage and `npm run seo:audit -- https://thebestfreepdf.com /tmp/folio-seo-report.json` after deployment. The audit follows pagination, checks duplicate descriptions and orphan pages, and verifies search/social icon assets, RSS discovery, CSP and the security contact's expiry in addition to the original checks.

## Implemented

1. Next.js App Router serves server-rendered content for the homepage, directories, tool pages, pricing, guides, and informational pages. Local tool pages and guides are prerendered; pricing and service availability are read at request time. Public content and links are present without JavaScript. Pricing includes the agreed $1 USD introductory week and $25 USD monthly renewal in server-rendered content and metadata; Lemon Squeezy availability loads separately. No misleading free Pro offer is embedded in structured data.
2. Every public route has a unique title, description, absolute canonical URL, Open Graph metadata, and a Twitter summary card. Social images are generated at `/og?title=…` as PNGs.
3. Available tool pages contain visible task-specific instructions, limitations, FAQs, and relevant internal links. The content is not hidden in an editor canvas.
4. JSON-LD describes the website, available SoftwareApplication tools, BreadcrumbLists, and guide Articles. Free tools have a zero-price offer; Pro tools omit offers until authoritative pricing is available. There are no fabricated reviews, ratings, customers, or awards. Structured data is escaped before being embedded.
5. `/sitemap.xml` lists only ready public routes when production indexing is explicitly enabled. Guide modification dates come from content dates; other pages do not invent update dates on each request.
6. `/robots.txt` prevents indexing of development/preview deployments. Production allows public crawling and lists the sitemap.
7. `/workspace`, `/documents`, `/dashboard`, `/account`, `/admin`, `/support`, `/maintenance`, and `/auth/callback` have noindex/nofollow metadata and X-Robots-Tag headers. API routes also have noindex headers. Private routes use no-store response headers and stay out of the sitemap. No user document contents are server-rendered. Noindex routes remain crawlable so crawlers can read their directives; robots.txt is not an access control.
8. Unconnected translation and Office conversion pages use noindex/nofollow and stay out of the sitemap until the associated tools work.
9. Legacy `/pdf-editor` and `/pdf-forms` URLs redirect permanently to their canonical replacements. Unknown routes return actual 404 responses.
10. The site uses a semantic main region, a single primary heading per public page, descriptive links, accessible controls, responsive layouts, reduced-motion handling, locally hosted fonts with swap, and original SVG artwork. PDF engines are loaded only for document workflows.
11. Static icons and a web manifest identify the product. Search Console verification can be configured through an environment variable.

## Production configuration

The public deployment uses `https://thebestfreepdf.com`. Production indexing is enabled through `NEXT_PUBLIC_INDEXABLE=true`; Preview has a separate false value. The code also rejects indexing in Vercel preview/development environments even if that flag is accidentally enabled. Noncanonical Vercel deployment aliases receive noindex headers on application pages. Local development stays noindex.

The initial live audit found `Disallow: /`, noindex on public pages, and an empty sitemap. The production deployment has been rebuilt with public indexing enabled. Future changes to the domain or indexing environment variables also require a rebuild.

## Search Console setup

1. Open [Google Search Console](https://search.google.com/search-console/welcome) using the Google account that should own the property.
2. Add a **Domain property** for `thebestfreepdf.com` and publish Google’s exact TXT verification record in the domain’s DNS settings. Alternatively, add a **URL-prefix** property for `https://thebestfreepdf.com/` and use the HTML-tag steps below.
3. For a URL-prefix property, choose **HTML tag** verification. Copy only the `content` value from the supplied `google-site-verification` meta tag into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel's Production environment.
4. Rebuild/deploy, then click **Verify** in Search Console. The token hook is implemented; account ownership cannot be verified without your Google account. No verification token has been supplied yet.
5. In **Sitemaps**, submit `https://thebestfreepdf.com/sitemap.xml`.
6. Use URL Inspection for the homepage and a few priority tool/guide pages. Inspect the live URL and request indexing where appropriate. Submission is a discovery request, not a ranking guarantee.
7. Monitor Page indexing, Search performance, and Core Web Vitals. Investigate excluded canonical pages, server errors, or failed sitemap fetches before publishing more content.

## Changing to a custom domain

The preferred domain is `https://thebestfreepdf.com`. DNS and HTTPS are working, and `www` permanently redirects to the apex with paths and query strings preserved. Production metadata, sitemap, social URLs and checkout return links use the new origin. Legacy public Vercel URLs redirect permanently; legacy private sessions and APIs stay reachable during the transition. See [the domain migration record](CUSTOM-DOMAIN.md) for verification and service setup.

- Choose the real domain and set `NEXT_PUBLIC_SITE_URL` to its HTTPS origin.
- Set `NEXT_PUBLIC_INDEXABLE=true` only for the production build. Leave it false for previews. Build again after either variable changes.
- Configure the hosting provider's preferred-domain redirect (for example www to the apex domain), HTTPS, and CDN caching. The configured preference is the apex domain.
- Verify the deployed canonical URLs, sitemap, robots rules, social cards, response codes, and security headers. Confirm the host is not adding a conflicting noindex header.
- Verify the new property in Search Console and submit its sitemap. Keep the old property while the change is processed; use permanent redirects and updated canonical URLs consistently.
- Review visible capability descriptions when enabling new processing providers. Update availability, metadata, and sitemap inclusion together.
- Validate structured data using the relevant search engine validators. SoftwareApplication eligibility depends on Google's current required fields. Paid tools intentionally do not publish a made-up zero-price offer or invented ratings. Valid Schema.org markup does not guarantee a Google rich result.
- Measure Core Web Vitals on the actual deployment and monitor real-user data when enough traffic is available. Local automated checks cannot establish production field performance or search ranking.

## Ongoing work

Publish useful guides based on actual user questions; keep conversion limits and tool behavior accurate; monitor indexing and broken links; measure production performance; earn relevant links through the usefulness of the product. Technical SEO prepares pages for discovery but does not guarantee rankings or immediate indexing.

## Crawlable navigation and content

- `/tools` and `/convert` use server-rendered pagination with real links, ten records by default, and the existing custom per-page selector. Search and category filters use GET URLs and remain usable without JavaScript. Filtered and alternate-page-size lists are noindex; ordinary paginated pages have their own canonical URLs.
- Task-specific titles describe all 29 catalogue tools. Image and QR tools no longer inherit an incorrect “Free PDF Tool” suffix. The layout adds the Folio brand once.
- Ten guides cover choosing an editor, text-editing troubleshooting and current, supported workflows. Publication and update dates are separate, and the visible update date matches Article markup. Guides link to tools; matching tool pages link back to the guides. Each guide has a table of contents with section links.
- Homepage WebSite and Organization entities share stable IDs. Article publishers and blog editorial authors use the appropriate entity type. No fake reviews, ratings, customer numbers, or rankings are added.
- Expensive tool/workspace navigation does not preload processing bundles from marketing links before someone chooses a tool. Article content and navigation remain server rendered.

## Deployment regression check

Run against the preferred public origin after deploying:

```sh
npm run seo:audit -- https://thebestfreepdf.com /tmp/folio-seo-report.json
```

The command checks robots, a nonempty sitemap, canonical URLs, response codes, distinct titles, descriptions, one H1 per public page, social metadata, parsable JSON-LD, private-route noindex protection, and real 404 responses. It exits unsuccessfully when those checks fail. This checks technical readiness, not Google's actual index or rankings.

The final production audit on September 15, 2026 passed for **48 public sitemap URLs with no reported issues**, on deployment `dpl_HMitSoEnVwP9CRVhyPYthQJr75eL`. Unit and browser checks, lint, type checking, and the production build passed. Browser coverage includes navigation without JavaScript, directory pagination and search, guide links, blog rendering, and mobile layout/accessibility checks. Search Console ownership verification and sitemap submission are still pending; no Google ranking or index-coverage result has been verified.

The September 15, 2026 mobile Lighthouse runs recorded these before/after results on the public homepage:

| Lab measurement          | Before | After |
| ------------------------ | ------ | ----- |
| SEO score                | 66     | 100   |
| Performance score        | 84     | 95    |
| Speed Index              | 9.4 s  | 2.8 s |
| Total Blocking Time      | 150 ms | 60 ms |
| Largest Contentful Paint | 3.0 s  | 2.9 s |

The baseline blocked indexing and loaded approximately 292 KiB of unused JavaScript. These are individual lab runs, not ranking measurements or a Core Web Vitals field assessment. Lab scores vary with network and machine conditions; use Search Console's field data to assess real visitor experience over time.

## Initial search priorities

### Free PDF search focus — September 17, 2026

The homepage now introduces the actual free PDF workflows, with direct links to six working tools. `/edit-pdf` targets “free PDF editor online” specifically for added text, annotations, signatures, forms, and page changes. Visible copy and FAQs distinguish those free downloads from paid original-text exports. No entitlement or pricing rules were changed. Avoid describing the entire product as completely free.

`/guides/choose-a-free-pdf-editor` addresses “best free PDF editor” as a decision guide: export charges, annotation versus replacement, signatures, limitations, privacy, and checking the exported result. It identifies Folio as the author and does not invent competitor tests or declare Folio the best. The guide is linked from the homepage, editor, relevant tool pages, guide index, and sitemap.

| Search intent                                | Primary page                       | Supporting page                        |
| -------------------------------------------- | ---------------------------------- | -------------------------------------- |
| Free PDF tools online                        | `/`                                | `/tools`                               |
| Free PDF editor online; add text to PDF free | `/edit-pdf`                        | `/guides/how-to-edit-a-pdf`            |
| Best free PDF editor; choosing a free editor | `/guides/choose-a-free-pdf-editor` | `/edit-pdf`                            |
| Merge PDF free; combine PDF files            | `/merge-pdf`                       | `/guides/how-to-merge-and-split-pdfs`  |
| Split PDF free; extract PDF pages            | `/split-pdf`                       | `/guides/how-to-merge-and-split-pdfs`  |
| Sign PDF online free                         | `/sign-pdf`                        | `/guides/how-to-sign-a-pdf`            |
| Free PDF to JPG / PNG converter              | `/pdf-to-jpg`, `/pdf-to-png`       | `/guides/how-to-convert-pdf-to-images` |

A search-results spot check showed that the “best free PDF editor” phrase often surfaces editorial comparison articles. This is an intent observation, not a measured keyword difficulty, search-volume estimate, or a record of Folio’s Google position. Avoid duplicate “best”, “free”, and “online” landing pages for the same editor.

After Search Console verification, record an initial 28-day baseline: indexed canonical pages, non-brand impressions and clicks, CTR, and average position grouped by the above queries and destination pages. Compare successive periods using the same country and device filters. Use actual queries to improve relevant pages; do not treat a Lighthouse score or a sitemap submission as ranking evidence. Useful product demonstrations and original guides can be shared with relevant communities or reviewers by the owner. No outreach or purchased links are part of this implementation.

Deployed September 17, 2026 as `dpl_HQs9Ddb2zyztqGhHDfEAubY8yvxz`. The production SEO audit passed for **49 public sitemap URLs with no reported issues**. Six SEO/access unit checks, three existing browser tests, lint, type checking, and the isolated production build passed. Desktop/mobile review and live mobile checks covered the homepage, editor landing page, and new guide. The owner confirmed Search Console is not yet verified; verification, submission, and actual Google performance measurement remain pending.

| User question                                     | Useful destination                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| Edit existing text in a PDF                       | `/edit-pdf-text` and `/guides/how-to-edit-a-pdf`                     |
| Add text, annotations, or a signature             | `/edit-pdf`, `/sign-pdf`, `/guides/how-to-sign-a-pdf`                |
| Merge or extract selected PDF pages               | `/merge-pdf`, `/split-pdf`, `/guides/how-to-merge-and-split-pdfs`    |
| PDF to PNG/JPG at a chosen resolution             | `/pdf-to-png`, `/pdf-to-jpg`, `/guides/how-to-convert-pdf-to-images` |
| Combine photos or receipts into a PDF             | `/image-to-pdf`, `/guides/how-to-combine-images-into-pdf`            |
| Create fillable forms or flatten a completed form | `/create-pdf-form`, `/guides/fillable-pdf-vs-flattened-pdf`          |
| PDF compression did not reduce file size          | `/compress-pdf`, `/guides/why-your-pdf-wont-get-smaller`             |

These are intent-based priorities, not researched search-volume or difficulty estimates. Start measuring impressions and clicks for these specific tasks before evaluating broad terms such as “PDF editor.” Update useful content from actual support questions and observed searches. Do not create duplicate city, language, or keyword pages that offer the same content. Unconnected Office conversion and translation routes remain noindex until they work.

## Custom-domain deployment verification — September 17, 2026

Deployment `dpl_FxE9XR4CyT9KuGtzqpEMwvGQKoAX` uses `https://thebestfreepdf.com`. The live audit passed for **49 public sitemap URLs with zero issues**. Public pages no longer receive the previous noncanonical-host noindex header. `www` and legacy public Vercel URLs redirect permanently; private legacy sessions and APIs stay reachable and noindex. Guest save/refresh smoke checks passed on the new origin. The existing Lemon Squeezy webhook uses the new domain. Supabase’s application callback allowlist/Site URL still need the owner’s update; see [CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md).

## Reference documentation

- [Next.js metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google SoftwareApplication structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Crawlable pagination](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)
- [Useful content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Page experience and rankings](https://developers.google.com/search/docs/appearance/page-experience)

## Pricing and maintenance

`/pricing` uses server-rendered current catalog values in visible content, FAQs, and metadata. Admin publication updates these without rebuilding. Public tool pages avoid embedding fixed Pro prices. Maintenance rewrites public requests with status 503 and `Retry-After: 300`; account, support, admin recovery, and billing callbacks remain reachable. Temporary outages should not be cached as permanent missing pages. Domain/indexability environment variables still require a rebuild.

## Configured document services

The home page, directory, converter directory, remote tool pages, and sitemap read current server capabilities. Unconfigured translation and Office tools stay noindex and out of the sitemap. With their credentials present they advertise Pro downloads and get indexable server-rendered content. Capability checks reflect configuration, not successful provider authentication; verify the services before launch. Local tools remain prerendered. Google login callbacks and all account/admin/document APIs remain private and noindex.

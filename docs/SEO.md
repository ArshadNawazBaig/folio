# SEO implementation and launch setup

## Latest review — September 18, 2026

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
9. Legacy `/pdf-editor`, `/pdf-forms`, and `/translate-pdf-page` URLs redirect permanently to their canonical replacements. Unknown routes return actual 404 responses.
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

# SEO implementation and launch setup

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

The public deployment uses `https://folio-pdf-kappa.vercel.app`. Production indexing is enabled through `NEXT_PUBLIC_INDEXABLE=true`; Preview has a separate false value. The code also rejects indexing in Vercel preview/development environments even if that flag is accidentally enabled. Noncanonical Vercel deployment aliases receive noindex headers on application pages. Local development stays noindex.

The initial live audit found `Disallow: /`, noindex on public pages, and an empty sitemap. The production deployment has been rebuilt with public indexing enabled. Future changes to the domain or indexing environment variables also require a rebuild.

## Search Console setup

1. Open [Google Search Console](https://search.google.com/search-console/welcome) using the Google account that should own the property.
2. Add a **URL-prefix** property for `https://folio-pdf-kappa.vercel.app/`. A Domain property requires control of DNS, so use that option only for your own custom domain.
3. Choose **HTML tag** verification. Copy only the `content` value from the supplied `google-site-verification` meta tag into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel's Production environment.
4. Rebuild/deploy, then click **Verify** in Search Console. The token hook is implemented; account ownership cannot be verified without your Google account. No verification token has been supplied yet.
5. In **Sitemaps**, submit `https://folio-pdf-kappa.vercel.app/sitemap.xml`.
6. Use URL Inspection for the homepage and a few priority tool/guide pages. Inspect the live URL and request indexing where appropriate. Submission is a discovery request, not a ranking guarantee.
7. Monitor Page indexing, Search performance, and Core Web Vitals. Investigate excluded canonical pages, server errors, or failed sitemap fetches before publishing more content.

## Changing to a custom domain

- Choose the real domain and set `NEXT_PUBLIC_SITE_URL` to its HTTPS origin.
- Set `NEXT_PUBLIC_INDEXABLE=true` only for the production build. Leave it false for previews. Build again after either variable changes.
- Configure the hosting provider's preferred-domain redirect (for example www to the apex domain), HTTPS, and CDN caching. The app cannot choose this policy until the domain is known.
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
- Eight guides cover current, supported workflows. Publication and update dates are separate, and the visible update date matches Article markup. Guides link to tools; matching tool pages link back to the guides. Each guide has a table of contents with section links.
- Homepage WebSite and Organization entities share stable IDs. Article publishers and blog editorial authors use the appropriate entity type. No fake reviews, ratings, customer numbers, or rankings are added.
- Expensive tool/workspace navigation does not preload processing bundles from marketing links before someone chooses a tool. Article content and navigation remain server rendered.

## Deployment regression check

Run against the preferred public origin after deploying:

```sh
npm run seo:audit -- https://folio-pdf-kappa.vercel.app /tmp/folio-seo-report.json
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

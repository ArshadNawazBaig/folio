# SEO implementation and launch setup

## Implemented

1. Next.js App Router serves server-rendered content for the homepage, directories, tool pages, pricing, guides, and informational pages. Local tool pages and guides are prerendered; pricing and service availability are read at request time. Public content and links are present without JavaScript. Pricing includes the agreed $1 USD introductory week and $25 USD monthly renewal in server-rendered content and metadata; Stripe availability loads separately. No misleading free Pro offer is embedded in structured data.
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

## Before making production indexable

- Choose the real domain and set `NEXT_PUBLIC_SITE_URL` to its HTTPS origin.
- Set `NEXT_PUBLIC_INDEXABLE=true` only for the production build. Leave it false for previews. Build again after either variable changes.
- Configure the hosting provider's preferred-domain redirect (for example www to the apex domain), HTTPS, and CDN caching. The app cannot choose this policy until the domain is known.
- Verify the deployed canonical URLs, sitemap, robots rules, social cards, response codes, and security headers. Confirm the host is not adding a conflicting noindex header.
- Verify domain ownership in Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml`. The code includes the configuration hook; no account verification or submission has been performed.
- Review visible capability descriptions when enabling new processing providers. Update availability, metadata, and sitemap inclusion together.
- Validate structured data using the relevant search engine validators. SoftwareApplication markup without real reviews may not qualify for Google's software rich result; no ratings are invented to meet eligibility. FAQ rich results are not promised.
- Measure Core Web Vitals on the actual deployment and monitor real-user data when enough traffic is available. Local automated checks cannot establish production field performance or search ranking.

## Ongoing work

Publish useful guides based on actual user questions; keep conversion limits and tool behavior accurate; monitor indexing and broken links; measure production performance; earn relevant links through the usefulness of the product. Technical SEO prepares pages for discovery but does not guarantee rankings or immediate indexing.

## Reference documentation

- [Next.js metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google SoftwareApplication structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)

## Pricing and maintenance

`/pricing` uses server-rendered current catalog values in visible content, FAQs, and metadata. Admin publication updates these without rebuilding. Public tool pages avoid embedding fixed Pro prices. Maintenance rewrites public requests with status 503 and `Retry-After: 300`; account, support, admin recovery, and billing callbacks remain reachable. Temporary outages should not be cached as permanent missing pages. Domain/indexability environment variables still require a rebuild.

## Configured document services

The home page, directory, converter directory, remote tool pages, and sitemap read current server capabilities. Unconfigured translation and Office tools stay noindex and out of the sitemap. With their credentials present they advertise Pro downloads and get indexable server-rendered content. Capability checks reflect configuration, not successful provider authentication; verify the services before launch. Local tools remain prerendered. Google login callbacks and all account/admin/document APIs remain private and noindex.

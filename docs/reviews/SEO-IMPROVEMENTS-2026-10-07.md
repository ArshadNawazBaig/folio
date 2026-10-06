# Folio: evidence-led SEO improvements

Work date: October 7, 2026 (Asia/Karachi). Measurements below use their recorded UTC timestamps. Scope: the remaining gaps in the October 6 audit, with safe repository changes authorized. This report supplements the original audit; it does not retroactively change its live-site findings. A read-only Railway status check confirmed that the active production deployment still dates from October 4, 2026.

The useful target is closing specific, verifiable gaps. E-E-A-T, AEO and GEO have no universal score that a code change can make 100/100. Local SEO remains inapplicable to this worldwide toolkit. Search visibility, independent recognition and field performance require evidence beyond this repository. Google recommends clear authorship and evidence of how content was produced, including testing methodology; these improvements follow that approach. [Google: helpful, reliable content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Changes prepared

- **Mobile guide:** corrected the missing “Open in editor” step, added two real application screenshots, and verified that the practice annotation survives an actual PDF download and reopening. Captions identify Chromium mobile emulation and the local storage fixture. They do not claim physical-device testing. English revision: October 7; reviewed translations retain their own content and dates.
- **Compression guide:** added two original downloadable PDFs with identical five-line contents but different PDF object storage. The actual compression engine returned 1,275 bytes from the 1,811-byte source, and retained the original 1,271-byte efficiently stored source. The generator checks page count, A4 dimensions, all five text lines, and byte equality when the original is retained. The guide explains the method and its limits; these files do not represent typical customer savings.
- **Editorial transparency:** added the worked-example verification policy to About in all twelve languages. Corrected translated AboutPage structured-data URLs and language identifiers.
- **Internal links:** articles now recommend practical guides based on their topic and linked tools. Curated priorities connect mobile, editing, compression and page-organization articles to the appropriate existing guides. No new competing keyword pages were created.
- **Accessibility:** homepage preview toolbar accessible names now contain their visible labels, addressing the live Lighthouse label/name mismatch observation.
- **Tool loading:** each landing page selects its own interactive tool through a client-side dynamic-import boundary while keeping initial controls, headings, facts and instructions server-rendered. Dropdown and pagination code loads after file selection. The upload button stays disabled until its event handler is ready, preventing a selection from being lost during loading. Heavy processing engines continue to run only when needed.
- **CMS correction prepared:** `CMS-TRANSLATION-CORRECTION-2026-10-07.json` contains the already-reviewed translation article revision from `content/blog/starter-posts.ts`. It states that Folio does not translate documents and directs readers to a separate provider. This is a review payload; the published database article has not been changed. Preserve its existing URL, image attribution and original publication date, and reconcile any newer editorial edits before publishing.

## Performance evidence

Lighthouse 13.5.0, mobile emulation with simulated throttling. These are laboratory samples, not field measurements or estimates of ranking. Local and production measurements have different environments and must not be compared as a release improvement. Lighthouse's SEO category covers only its own automated checks. [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).

| Live page               | Performance | Accessibility | Best practices | Lighthouse SEO |   LCP |    TBT | CLS |
| ----------------------- | ----------: | ------------: | -------------: | -------------: | ----: | -----: | --: |
| Homepage                |          95 |           100 |            100 |            100 | 2.1 s | 180 ms |   0 |
| PDF editor landing page |          79 |           100 |            100 |            100 | 3.9 s | 210 ms |   0 |
| Mobile editing guide    |          94 |           100 |            100 |            100 | 2.5 s | 180 ms |   0 |

These runs measured the existing live release. They do not validate the new code in production. Fresh field INP remains unknown; lab TBT is not an INP measurement. Field Core Web Vitals should be assessed at the 75th percentile using sufficient real-user data. [Web Vitals](https://web.dev/articles/vitals).

The comparable local editor measurements used production builds on the same machine and port, with the same Lighthouse configuration. Build and browser-test processes had finished before each measured run.

| Implementation                   | Performance | Initial script transfer |   LCP |    TBT | CLS |
| -------------------------------- | ----------: | ----------------------: | ----: | -----: | --: |
| Baseline (`b716730`), one run    |          86 |           422,230 bytes | 3.8 s | 110 ms |   0 |
| Intermediate tool split, one run |          84 |           291,217 bytes | 3.4 s | 290 ms |   0 |
| Final implementation, run 1      |          92 |           216,557 bytes | 3.3 s | 100 ms |   0 |
| Final implementation, run 2      |          92 |           216,557 bytes | 3.3 s | 100 ms |   0 |

The final version transfers **48.7% less initial JavaScript**, saving 205,673 bytes (about 201 KiB). Unused JavaScript fell from approximately 167 KiB to 24 KiB. The intermediate result is retained because splitting alone did not improve the total score; deferring the unused dropdown library was also necessary. Two matching final runs support this local result, but one baseline and two final samples do not establish a production trend.

Local accessibility and best-practices scores were 100. Its Lighthouse SEO score is 66 because the local build intentionally blocks indexing with `noindex`; it uses localhost canonical URLs. Production was measured separately above. The local editor still has about one second of initial document response time and a simulated LCP of 3.3 seconds. Further response-time investigation should inspect hosting and the settings/maintenance lookup without weakening its existing fail-closed behavior. No field Core Web Vitals pass is claimed.

## Validation

- The final production build passed (727 generated pages), along with standalone TypeScript checking, lint and `git diff --check`.
- 13 focused unit tests passed, covering metadata policy, catalog/search coverage, translation coverage, related-content selection and audit rules.
- Six SEO browser tests passed: complete catalog discovery, practical examples, unique homepage metadata across languages, translated search pages, public discovery and the revised mobile guide.
- All 15 native-tool browser tests plus one standalone signature test passed. They exercise real image/PDF exports, QR scanning, page order, batch pagination, malformed inputs, cancellation and mobile accessibility. File-picker tests now use the visible upload button, so selection happens after hydration.
- 21 additional checks of the local production build passed with JavaScript disabled: twelve localized About pages, eight tool-entry states and the compression evidence table. The short-link tool correctly renders its existing account-loading state; the other seven render their controls or invoice launch link. Local metadata uses its intentionally non-indexable localhost configuration.
- The mobile capture script exercised file selection, editor handoff, annotation, cloud-save fixture, mobile download and reopening the exported PDF. The downloaded text contains “Reviewed on my phone.” Screenshots were visually inspected.
- The compression generator checked both actual outputs against the source text, page geometry and original-byte fallback.
- The existing editorial validation command passed for the CMS correction payload; it performed no database writes.

Reproduce the examples with `npx tsx scripts/generate-compression-example.ts`. For the mobile capture, first run `node scripts/test-blog-server.mjs` in one terminal, then `npx tsx scripts/capture-mobile-guide-example.ts` in another. These commands regenerate the checked-in evidence and assets; exact output bytes may change with PDF metadata.

Raw Lighthouse JSON/HTML and command logs are retained under `/tmp/folio-seo-improvements-2026-10-07` and `/tmp/folio-seo-improvements-*.log`. Compact results are checked into `SEO-PERFORMANCE-EVIDENCE-2026-10-07.json`, `SEO-LOCAL-CHECKS-2026-10-07.json`, `src/lib/compression-example.json` and `src/lib/mobile-guide-example.json`.

## Remaining acceptance criteria

| Area                             | Evidence needed before considering the gap closed                                                                                                                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical and on-page SEO        | Publish the reviewed release, repeat the full live crawl, verify unique translated homepage/editor descriptions, canonical/hreflang links, sitemap responses and current tool availability. Keep intentional temporary redirects; investigate the extra HTTP/www edge hop in hosting configuration. |
| Content, AEO and GEO consistency | Publish the corrected CMS translation article separately. Verify the new mobile/compression examples and related-reading links in production. Obtain page-and-query GSC data before consolidating overlapping articles.                                                                             |
| E-E-A-T                          | Publish the real operator name and public contact once supplied. Add only verifiable experience and independent references. No invented person, credentials, reviews, awards or endorsements.                                                                                                       |
| Performance                      | Repeat lab checks after deployment and assess real-user LCP, INP and CLS when enough observations exist.                                                                                                                                                                                            |
| Internal linking                 | Confirm the complete live crawl has no broken contextual links or sitemap orphans after release.                                                                                                                                                                                                    |
| Task completion                  | Choose and configure an appropriate analytics service before measuring tool starts, successful downloads and failures. The GSC export measures search exposure and clicks, not successful document work.                                                                                            |
| Search outcomes                  | Compare a fresh, equally scoped 28-day GSC export against a comparable prior period. The supplied export has 19 daily rows and cannot supply a full historical baseline by assumption.                                                                                                              |
| Local SEO                        | N/A unless the business begins providing a real local service.                                                                                                                                                                                                                                      |

Independent authority and AI citations cannot be created honestly through schema markup or a score change. Relevant mentions should come from people using and evaluating the product. No outreach, tracking integration, deployment or live CMS mutation was performed during this work.

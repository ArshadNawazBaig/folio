# Performance and Vercel usage

## Active CPU follow-up — 30 September 2026

Reviewed [Vercel's usage guidance](https://vercel.com/docs/pricing/manage-and-optimize-usage) after the team reached 75% of its four-hour Active CPU allowance. The previous bundle reductions are already committed; this pass removes repeated runtime work.

- **Browser text previews:** inspection and rendering previously raced the local PDF worker against a server upload after 350 ms. A healthy browser now completes the job locally. An unavailable or failed worker falls back immediately; a stuck startup or job is terminated after eight seconds before falling back. Cancellation prevents a superseded edit from uploading. This reduces duplicate uploads and PDF worker executions, with a possible eight-second wait on a stalled browser. Paid exports retain their existing server authorization.
- **Password-protection validation:** request `info` instead of `inspect`. The same PDF engine checks file validity, page limits, encryption, signatures, and XFA support, then returns only the page count. It no longer extracts all text blocks and fonts just to open the download gate.
- **Static tool pages:** `/translate-pdf`, `/pdf-to-word`, `/pdf-to-excel`, and `/pdf-to-powerpoint` now render at build time. Their availability and metadata depend on deployment configuration, like the already-static capabilities endpoint. Rebuild after provider configuration changes. The maintenance proxy still checks requests, and processing endpoints still validate availability and access.

Regression checks cover healthy local jobs slower than 350 ms, worker failures and timeouts, cancellation without uploads, server fallback, and cached previews. The browser workflow asserts zero requests to `/api/pro/preview` when local processing works. Password setup checks the lightweight response and rejects damaged and over-limit PDFs; public previews still cannot export edited or protected PDFs. `check:bundles` also verifies that all four provider pages are prerendered.

Validation passed: 15 focused unit/server tests, 13 browser scenarios against local account fixtures, lint, production build, and isolated PDF worker checks. A local production smoke check returned `x-nextjs-cache: HIT` and `s-maxage=31536000` for all four provider pages; `/api/pro/preview` remained `private, no-store`.

```sh
npx tsx --test tests/preview-fallback.test.ts tests/request-retry.test.ts tests/remote.test.ts tests/server-routes.test.ts tests/seo.test.ts
npm run test:tools -- tests/interactive-preview.spec.ts tests/workspace-network.spec.ts tests/text-activation.spec.ts tests/platform.spec.ts --workers=1
FOLIO_TEST_OUTPUT=performance npm run build
npm run check:bundles -- .next-performance
```

The alert is team-wide and does not identify a hot route. After deployment, filter Vercel Usage to this project and compare Active CPU, invocation counts, errors, and cache hits over comparable traffic windows, especially `/api/pro/preview` and the four tool pages. Prefer CPU per invocation over total CPU alone. These code checks do not measure production savings or reset usage already consumed. If invocations remain unexpectedly high, review request sources and firewall controls using the dashboard before changing traffic rules.

## Vercel usage improvements — 30 September 2026

Measured using production builds on the same local machine. These are the sums of files in each Next.js output trace, not Vercel's billed storage or a measurement of production CPU savings. Vercel's Linux dependencies and function grouping can change the deployed totals.

| Server route             |    Before |     After |
| ------------------------ | --------: | --------: |
| `/api/documents/export`  | 69.36 MiB |  2.23 MiB |
| `/api/pro/preview`       | 69.52 MiB | 45.43 MiB |
| `/api/documents/process` | 69.86 MiB | 45.77 MiB |
| `/tools`                 |  2.92 MiB |  2.59 MiB |

- Include the PDF worker only in the five routes that run it. Package the Node runtime files instead of unused browser builds, maps, declarations, and development sources.
- Keep provider availability checks separate from the provider SDK and encrypted-document processing modules used by paid conversions.
- Prerender `/api/capabilities`, whose public flags depend only on deployment environment variables. Rebuild after changing provider configuration. Its route response is cacheable; private account and document endpoints remain `private, no-store`.
- Cache the public announcement for 30 seconds at the CDN, and share generated social preview images for one day. Announcement failures remain uncached. These public responses do not include user or document data.
- Coalesce simultaneous settings lookups within each function instance, retaining the existing three-second expiry, explicit admin invalidation, and fail-closed maintenance behavior. Do not extend these TTLs to improve benchmark scores.

Run `FOLIO_TEST_OUTPUT=performance npm run build`, then `npm run check:bundles -- .next-performance`. The bundle check copies only traced worker dependencies into a temporary directory outside the repository and verifies inspection, PNG preview, subset-font completion, text export, and password protection. It also verifies that prepared downloads do not carry PDFium and that capabilities are prerendered.

The [Vercel storage metric](https://vercel.com/docs/deployment-storage) includes function bundles in retained deployments. Smaller new builds reduce future storage; review project deployment retention separately to reduce historical storage while keeping the rollback history you need. Production CPU and origin-transfer improvements must be measured after deployment using the per-route usage breakdown.

## Homepage measurements

Verified on 28 September 2026 using Lighthouse 13.5.0 against an isolated production build. These are local lab measurements, not a deployed PageSpeed Insights result.

| Category         | Mobile | Desktop |
| ---------------- | -----: | ------: |
| Performance      |     98 |     100 |
| Accessibility    |    100 |     100 |
| Best practices   |    100 |     100 |
| SEO              |    100 |     100 |
| Agentic browsing |    100 |     100 |

| Metric                   | Mobile | Desktop |
| ------------------------ | -----: | ------: |
| First Contentful Paint   |  1.5 s |   0.4 s |
| Largest Contentful Paint |  2.3 s |   0.6 s |
| Speed Index              |  2.5 s |   0.9 s |
| Total Blocking Time      |  50 ms |    0 ms |
| Cumulative Layout Shift  |  0.001 |       0 |

## Changes

- Keep common design tokens, navigation, dialogs, and page introductions in `globals.css`. Load `features.css` through tool, content, account, dashboard, and workspace layouts. Turbopack's graph CSS chunking keeps unrelated editor modules out of the homepage's initial requests.
- Prerender the public homepage with five-minute revalidation. Account state remains client-specific, and the maintenance proxy still runs on requests.
- Pass shared, cached tool summaries to the header and homepage. Full article and FAQ data stays on the server. Render the search dialog's results and refresh capabilities when search opens.
- Load the account SDK when restoring an existing account or starting sign-in. New visitors can browse and use guest requests without downloading it. Preserve the existing session storage key, PKCE flow, account refresh, and cross-tab sign-in behavior.
- Preload the main Manrope font; let the decorative serif load when used. Both original font families remain available.
- Animate skeletons with transforms and honor reduced-motion preferences.
- Fetch only maintenance settings in the public request gate. Preserve its three-second freshness and fail-closed behavior; pricing is no longer queried for every uncached public request.
- Include Vercel Analytics on Vercel deployments. Its unavailable local endpoint no longer produces a console error in self-hosted builds.

The live baseline audit flagged about 46 KiB of unused CSS and 73 KiB of unused JavaScript. The final local build no longer triggers the unused-CSS warning, and estimated unused JavaScript is about 25 KiB. The environments differ, so their performance scores should not be treated as a controlled before/after comparison.

## Remaining limits

Mobile performance is **98, not 100** in the final run. The remaining diagnostics include render-blocking route CSS, framework JavaScript, and compatibility polyfills. Next/React code and browser compatibility have not been removed just to clear diagnostic labels. The maintenance lookup's network latency also contributes to the initial response time.

Inlining all CSS was tested and rejected: it removed the stylesheet-request diagnostic but increased the HTML payload and performed worse overall in the mobile audit. The final configuration retains small, cacheable stylesheets.

The local audit does not exercise Vercel's production analytics endpoint or CDN. After deployment, run PageSpeed Insights on the canonical URL in both modes. Compare several runs and their metrics: network, server, and CPU conditions affect [Lighthouse scores](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring). For further work, use the actual LCP trace and Google's [LCP optimization guidance](https://web.dev/articles/optimize-lcp), especially document response time and the critical font/CSS path.

## Reproduce

Keep the audit output separate from the development server's `.next` directory:

```sh
FOLIO_TEST_OUTPUT=performance NEXT_PUBLIC_SITE_URL=https://thebestfreepdf.com NEXT_PUBLIC_INDEXABLE=true npm run build
FOLIO_TEST_OUTPUT=performance NEXT_PUBLIC_SITE_URL=https://thebestfreepdf.com NEXT_PUBLIC_INDEXABLE=true PORT=3104 npm run start
```

In another terminal, run the default mobile profile and desktop profile sequentially, with no concurrent builds or browser tests. Set `CHROME_PATH` if Chrome is not automatically detected.

```sh
mkdir -p test-results/performance
npx --yes lighthouse@13.5.0 http://localhost:3104/ --chrome-flags='--headless --no-sandbox' --output=json --output=html --output-path=test-results/performance/mobile-final
npx --yes lighthouse@13.5.0 http://localhost:3104/ --preset=desktop --chrome-flags='--headless --no-sandbox' --output=json --output=html --output-path=test-results/performance/desktop-final
```

The generated HTML/JSON reports are ignored by Git. Keep the usual production environment configuration for the build; do not disable the maintenance gate or change throttling to improve scores.

## Regression coverage

- Production build, lint, TypeScript, and 127 unit tests.
- Responsive design coverage at desktop, mobile, and narrow mobile widths, including tools, editor, dashboard, admin, search, and upload behavior.
- Existing account restoration, Google PKCE, callback errors, profile access, cloud downloads, guest expiry, and cross-tab sign-in without losing unsaved PDF edits.
- File and support skeletons, reduced motion, loading/error transitions, and mobile layouts.
- Production route smoke checks and keyboard-accessible tool search.

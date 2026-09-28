# Homepage performance

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

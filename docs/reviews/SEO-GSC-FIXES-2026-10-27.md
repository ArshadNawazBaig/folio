# Search Console diagnosis and fixes — October 27, 2026

The site already appears in Google. The supplied September 27–October 24 Web search export records **1,297 impressions, 15 clicks, 1.16% CTR and approximately 41 average position**. The evidence supports a low-visibility problem, not a sitewide failure to index. These changes address observed URL and content defects; they do not establish why every page ranks where it does or promise a ranking increase.

## Evidence and scope

Inputs: `Chart.csv`, `Pages.csv`, `Queries.csv`, `Countries.csv`, `Devices.csv`, `Filters.csv` and `Search appearance.csv` from the owner's Search Console export. Chart, Countries and Devices reconcile to the totals above. Pages has 170 rows and 1,358 impressions; Queries has 362 disclosed rows, 695 impressions and no disclosed clicks. These exports use different aggregation and omit some query data. Do not sum them or infer query-to-page relationships from separate tables.

| Period                 | Clicks | Impressions | Approximate average position |
| ---------------------- | -----: | ----------: | ---------------------------: |
| September 27–October 3 |      5 |          42 |                         26.8 |
| October 4–10           |      4 |         136 |                         34.1 |
| October 11–17          |      5 |         696 |                         48.1 |
| October 18–24          |      1 |         423 |                         32.9 |

The final week has fewer impressions and a better average position. A changing mix of queries can produce that pattern; this is not proof of a penalty. The exports do not provide current URL Inspection status, Google-selected canonicals, manual actions, crawl logs or field Core Web Vitals.

Read-only live samples on October 26 UTC / October 27 Pakistan time found:

- Public homepage, editor, selected guides, translated tools and published articles return HTTP 200, indexable metadata and expected canonical URLs.
- `robots.txt` allows public crawling; the sitemap contains 679 URLs. A sitemap count is not Google's indexed-page count.
- Selected missing pages and missing articles return 404 with noindex. Private workspace pages remain intentionally excluded from search.
- Translated blog copies display English article content and canonicalize to the English article, but internal links still promote the translated copies. **26 exported page URLs, accounting for 167 impressions and zero clicks**, use this pattern.

These were targeted checks, not a full crawl of all 679 URLs.

## Implemented changes

1. **One canonical URL for English CMS articles.** Article links and language switching now use `/blog/<slug>`. Existing language-prefixed article URLs permanently redirect with HTTP 308 after confirming that the article is published. Missing, draft and scheduled posts remain 404. The lookup stays request-time so publication changes do not leave stale cached redirects or 404s. Translated guides, tools and blog listing pages retain their language-specific URLs. The reader's saved interface-language preference remains available.
2. **Task-relevant internal links.** Signing, form building and the existing fill/sign and signature articles now prioritize the matching guides for adding text, completing forms, flattening, signing and creating a transparent signature image.
3. **Correct translated mobile instructions.** All 11 translated mobile guides now include the required “Open in editor” action between choosing a PDF and using the editor toolbar. Existing localized button wording is reused. Their revision date is October 26 UTC; the unchanged English edition retains October 7.
4. **Accurate translated guide sitemap dates.** Localized guide entries now include their actual edition's last-modified date. Dates are not generated from build or request time.

Consistent internal links, canonicals and redirects follow [Google's canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls). This consolidates duplicate URL signals; it is not evidence that duplicates caused all low rankings.

## Validation and release

Passed: TypeScript, lint, 24 focused unit tests, six distinct browser scenarios and the optimized production build (727 generated static pages). Browser coverage includes all 11 legacy article redirects, draft/scheduled/missing article 404s, canonical links without JavaScript, saved-language navigation without redirect loops, translated guide discovery, sitemap/private-route rules and the revised mobile guide. The initial mobile-date assertion used the local date instead of UTC; it was corrected and the affected scenarios passed on rerun. Formatting and diff checks passed.

The changes must be deployed before Google can encounter them. Railway CLI authentication was unavailable during preparation (`Unauthorized`); no production release or Search Console submission has been made. A Railway plugin is available but was not connected at completion.

After deployment:

1. Run `npm run seo:audit -- https://thebestfreepdf.com /tmp/folio-seo-post-release.json`.
2. Check a former localized article URL returns 308 to its English URL, the destination returns 200, and missing/draft articles still return 404.
3. Verify a translated mobile guide and its sitemap date, plus public indexing and private noindex protection.
4. In Search Console, inspect the canonical URLs of the three changed articles and the translated mobile pages. Check Google's selected canonical and last crawl; request indexing for materially changed pages. Confirm the existing sitemap submission. [Google's recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) explains the required account access and why repeated submissions do not accelerate crawling.

## What to measure next

Use page-filtered query exports for these existing pages before changing their titles or merging content:

| Page                                       | Exported impressions | Clicks | Average position |
| ------------------------------------------ | -------------------: | -----: | ---------------: |
| `/blog/free-pdf-editor-add-text-fill-sign` |                  123 |      0 |            44.24 |
| `/blog/how-to-make-a-signature-online`     |                  118 |      0 |            67.90 |
| `/guides/how-to-edit-a-pdf-on-mobile`      |                   66 |      0 |            37.52 |
| `/guides/merge-pdfs-different-page-sizes`  |                   32 |      0 |            23.75 |
| `/guides/why-your-pdf-wont-get-smaller`    |                   23 |      0 |             8.83 |

Compare an equal 28-day period after deployment and recrawling, keeping search type, country and device filters consistent. Review nonbranded query exposure and completed tool tasks rather than only the sitewide average. Small samples do not establish a snippet problem or justify deleting useful pages.

The English mobile and compression guides already contain original examples and practical instructions. Broad keyword rewrites or more near-duplicate articles are not supported by this export. Native-language editorial review, useful demonstrations and relevant editorial mentions remain ongoing work; no paid links, fabricated reviews or automatic ranking submissions were added. Google notes that SEO effects may take weeks or longer and are not guaranteed in its [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

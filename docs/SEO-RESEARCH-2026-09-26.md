# Folio search opportunity research

Research date: September 26, 2026. Website: https://thebestfreepdf.com. Audience confirmed by the owner: English-speaking users worldwide.

## Baseline and what it means

The owner reports that the site is indexed and received **9 clicks from 45 impressions in seven days**. The calculated CTR is **20%**. Exact dates, filters, positions and query/page breakdowns were not supplied; these are owner-reported totals, not a connected Search Console export. This sample is too small to diagnose an individual page or estimate future traffic. Increase relevant impressions while monitoring whether the traffic completes useful document tasks. Separate branded queries from generic searches before judging the CTR.

The live technical audit before this change checked 58 public pages and reported no issues within its checks. HTTP and www requests resolved to the canonical HTTPS apex; robots.txt and the XML sitemap returned 200. This establishes accessibility to our checker, not Google indexing of every URL or ranking eligibility.

## Research method and limits

- Tried an English, US-localized Google results request with personalization disabled. Google returned an unusual-traffic challenge; no Google positions were collected and the challenge was not bypassed.
- Used accessible web-search results to investigate eight task-specific query groups listed below. Result ordering is not a reproducible Google ranking for any country. Search snippets identify candidate competitors and intent; their marketing and performance claims are not adopted as facts.
- Checked candidate promises against Folio's current implementation and working standalone tools. Excluded unavailable OCR, HEIC conversion, guaranteed file-size targets and free original-text PDF exports.
- No Keyword Planner, Ahrefs, Semrush or Search Console query export is connected. **Search volume, organic keyword difficulty, backlink strength and current Folio positions are unknown.** Specific phrases can still be competitive or have little demand. The priority numbers below are an editorial judgment based on product fit and the usefulness of an original example, not measured “low competition.”

Google recommends original, useful content that fully answers a reader's task: [helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). If Keyword Planner is used later, its [competition metric measures advertisers](https://support.google.com/google-ads/answer/3022575?hl=en-uk), not organic ranking difficulty.

## Prioritized candidates

| Priority | Primary keyword                       | Intent and evidence                                                                                                                                                                  | Folio destination and response                                                                                                                                    |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | merge PDFs with different page sizes  | Results include specific merge guides alongside adjacent rotation/resize pages. Hypothesis: a working A4/Letter example can answer the preservation question more concretely.        | `/guides/merge-pdfs-different-page-sizes`: two downloadable originals, expected dimensions, portrait/landscape instructions, explanation of resizing vs. merging. |
| 1        | extract nonconsecutive pages from PDF | Both established providers and focused extraction tools appear. This is not an uncontested term; custom order and printed-page-number confusion give the guide a specific purpose.   | `/guides/extract-nonconsecutive-pdf-pages`: six-page sample, range/result table, custom ordering and duplicate handling.                                          |
| 1        | split PDF into separate files ZIP     | Dedicated tools directly satisfy this intent. Target as a section of the extraction guide rather than another near-duplicate page.                                                   | Same extraction guide, explaining individual PDFs, source-position filenames and ZIP sorting.                                                                     |
| 1        | PDF bigger after compression          | Results contain focused troubleshooting articles. Useful for users who try a compressor and get no saving; no evidence of low difficulty or volume.                                  | Improve `/guides/why-your-pdf-wont-get-smaller` with the actual larger-file behavior and upload-limit decisions.                                                  |
| 2        | combine receipt photos into one PDF   | Receipt-specific tools and general image converters appear. Strong feature fit, but the workflow requires readable source photos and supported formats.                              | Expand `/guides/how-to-combine-images-into-pdf` with a receipt-packet workflow, ordering, A4/fit choice and HEIC/OCR limits.                                      |
| 2        | PDF to PNG 300 DPI                    | Several exact-intent tool pages appear; this looks competitive within the narrow topic. Target because Folio has working resolution and density metadata, not because it looks easy. | `/pdf-to-png` for the tool query; the existing image-export guide for instructions, pixel dimensions and resolution choices.                                      |
| 2        | combine JPG PNG WEBP into one PDF     | Many general image-to-PDF tools directly support it. Supporting variation only; no standalone landing page.                                                                          | Existing image-combination guide and `/image-to-pdf`.                                                                                                             |

The eighth searched query, **extract PDF pages in custom order**, supports the nonconsecutive-page cluster. The [keyword map](SEO-KEYWORD-MAP.csv) adds 22 candidates, for 100 unique queries total. Instructional and tool queries have a preferred destination, while natural cross-links connect them. Broad targets such as “PDF editor,” “free PDF” and “online PDF” remain long-term subjects; this update does not retarget the homepage again.

## Search-result evidence

These were observed in accessible search results on the research date. They are examples of matching or adjacent pages, not claims that those domains hold the top Google positions. Folio's new instructions and PDFs were authored from its own code and workflow, not copied from these pages.

| Search query                                                | Example results observed                                                                                                                                                                                                                                                        | Interpretation                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| merge portrait and landscape pdf without changing page size | [PDFwix mixed-size guide](https://www.pdfwix.com/guide/merge-pdf-with-different-page-sizes), [PDFgear orientation guide](https://www.pdfgear.com/pdf-editor-reader/how-to-make-pdf-landscape.htm), [Khallas resize tool](https://www.khallas.app/en/resize-pdf-pages)           | Preservation, rotation and normalization are different user tasks; explain them clearly.                 |
| extract non consecutive pages from pdf                      | [Adobe extraction documentation](https://helpx.adobe.com/acrobat/desktop/edit-documents/organize-pages/extract-pages.html), [UtilitySmith extraction](https://www.utilitysmith.com/extract-pages-from-pdf), [PDFwix extraction](https://www.pdfwix.com/extract-pages)           | Established and focused competitors; not a verified easy query.                                          |
| extract pdf pages in custom order                           | [WuTools extraction](https://wutools.com/pdf/extract-pdf-pages), [Pixohub extraction](https://www.pixohub.com/extract-pdf-pages), [PDFToucan extraction](https://pdftoucan.com/extract-pdf-pages)                                                                               | Exact behavior and a checkable output matter more than generic merge/split prose.                        |
| split pdf into separate files zip                           | [PDFQuietly split](https://pdfquietly.com/pdf/split-into-files), [Bindery split](https://binderypdf.com/split-pdf), [RunWebTools split](https://www.runwebtools.com/pdf-split)                                                                                                  | Tool intent; link directly to the working output setting.                                                |
| why pdf file gets bigger after compression                  | [PDFSomething explanation](https://pdfsomething.com/blog/why-compressed-pdfs-get-bigger), [ToolsNow explanation](https://www.toolsnow.net/blog/why-compressing-a-pdf-can-make-it-bigger/), [Frisket explanation](https://frisket.robomiri.com/blog/compressing-made-pdf-bigger) | Troubleshooting intent; explain Folio's actual behavior without adopting unsupported compression claims. |
| combine receipt photos into one pdf                         | [ReceiptCaker](https://www.receiptcaker.com/tools/combine-receipts-pdf), [Mello JPG-to-PDF](https://mello.tools/tools/jpg-to-pdf), [Toolumina image-to-PDF](https://www.toolumina.com/image-to-pdf)                                                                             | Use-case content has distinct relevance, but dedicated competitors already exist.                        |
| pdf to png 300 dpi                                          | [PDFtoPNG 300 DPI](https://pdftopng.co/pdf-to-png-300dpi), [GoPDFConverter](https://gopdfconverter.com/tools/pdf-to-png/), [Amba PDF-to-PNG](https://amba.tools/pdf-to-png)                                                                                                     | Multiple exact-intent pages; secondary priority pending demand and ranking data.                         |
| combine jpg png webp into one pdf                           | [FluidConvert](https://fluidconvert.com/tools/pdf/image-to-pdf), [FreeMyTask](https://freemytask.com/pdf/images-to-pdf/), [Toolbox365](https://www.toolbox365.net/tools/img-to-pdf/)                                                                                            | Supporting phrase for the existing page; avoid duplicating the same tool.                                |

## Implemented work

- Two complete guides with short direct answers, step-by-step workflows, expected-result tables and original downloadable PDFs. Synthetic source documents are generated by `node scripts/generate-guide-samples.mjs`; they contain no customer data.
- Existing compression, PDF-to-image and image-to-PDF guides expanded around the researched tasks. Their URLs remain stable, with modification dates changed only for edited articles.
- Merge, split, PNG and image-to-PDF FAQs now answer the corresponding task questions; visible FAQ content and structured data use the existing shared source. PNG search description mentions the actual 300 DPI capability.
- The general merge/split guide links to both new examples. The related-reading system connects the guides to their tools, and the existing sitemap, RSS and article metadata include them automatically.
- Guide tables support ordinary row labels without forcing a redundant link in every row. Existing comparison-table links remain intact. Practice PDFs return an X-Robots-Tag: noindex header so the fictional contents stay out of standalone search results.
- Actual 300 DPI export testing found a floating-point rounding edge: a landscape Letter page exported at 3301 × 2550 instead of 3300 × 2550. Corrected the canvas sizing tolerance and added an export regression test.
- No fabricated ratings, keyword-stuffed headings, doorway pages, unsupported “best” claims or artificial link-building campaigns.

## Next 28 days: measure demand before expanding

1. In Search Console, use the canonical domain property and Web search. Inspect each new guide and request indexing once if needed. A submitted sitemap or successful live test does not prove indexing.
2. Export Queries, Pages, Countries and Devices for the last 28 days; keep the reported seven-day 9/45 total separately so different periods are not compared as if identical. Save exports privately; they are not public content.
3. Track branded queries containing `folio` or the exact domain separately. Review ambiguous “the best free pdf” searches separately too, because the phrase resembles the domain. Query totals may omit anonymized searches and need not sum to the property's total.
4. Review the new page groups weekly. Record clicks, impressions, CTR and average position, without treating one day's position as a stable rank. Countries are a reporting dimension: do not create country pages for identical English workflows.
5. After comparable 28-day periods, strengthen the page/query pairs that show demand. For queries around positions 8–30, check whether the page fully answers the task and whether the snippet describes the result. Low impressions alone cannot distinguish low demand from low rankings or incomplete indexing. Export candidate volume estimates from Keyword Planner if available; validate organic competition separately.
6. If a page is indexed but has little visibility, seek a relevant editorial mention for its useful demonstration: for example, an administrative-workflow resource could cite the mixed-size sample or a bookkeeping tutorial could reference the receipt workflow. Offer the resource only where it helps the reader. No outreach was sent, no placement was bought, and no backlink is claimed.
7. Keep the next content batch small and guided by the observed queries. Do not publish twenty variants of the same tool merely to cover the remaining terms in the map.

Use Google's [Performance report documentation](https://support.google.com/webmasters/answer/7576553?hl=en) for metric definitions and query/page/country/device views. No ranking improvement or traffic increase has been established by this code change; Google chooses whether and where to show the pages.

## Validation and publication

Local checks completed:

- Production build, lint, TypeScript and formatting passed.
- Nine SEO, feed and content-discovery unit checks passed; eight existing SEO/blog browser tests passed.
- Five changed guides passed desktop (1440 px) and mobile (390 px) layout checks and 20 total main-content accessibility scans across Chromium and WebKit. The two new guides also rendered their instructions and sample links without JavaScript at 320 px in WebKit.
- Actual merge and extraction downloads were inspected in both browser engines: mixed page dimensions/order were retained, selection 6, 2-3 produced Appendix/Summary/Budget, and each ZIP member contained the intended single page.
- WebKit's corrected landscape PNG export measured 3300 × 2550 pixels with 300 DPI metadata. The new Chromium portrait PNG regression check measured 2550 × 3300 at 300 DPI; the existing JPG/ZIP regression also passed.
- All three local sample URLs returned application/pdf, HTTP 200 and X-Robots-Tag: noindex. Reviewed rendered guide and sample-preview screenshots.

Published to https://thebestfreepdf.com in Vercel deployment `dpl_DSD1oSFaTSHBZqqj1BooMxqy5SN3` (READY).

- Live SEO audit passed for **60 public pages**, with no issues within its checks. Report: `/tmp/folio-seo-after-2026-09-26.json` (local verification artifact).
- Both new guides returned HTTP 200, the correct HTTPS canonical and indexable metadata. Live mobile Chromium and WebKit checks passed with JavaScript disabled; instructions and sample links were present without horizontal page overflow.
- All three public PDFs returned valid PDF bytes and noindex headers. Both new guide URLs were confirmed in the live sitemap and RSS feed.

These checks confirm implementation and publication, not Google indexing of the new pages or improved rankings. No Search Console account action was performed.

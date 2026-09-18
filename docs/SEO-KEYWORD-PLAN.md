# Folio keyword and content plan

Prepared September 18, 2026 for https://thebestfreepdf.com. Target audience: English-language searches across countries; use Search Console country and device filters to refine this once real impressions accumulate.

## Objective and evidence

Earn relevant visits for free PDF workflows and editor comparisons, then convert those visits into successful document downloads. Broader phrases such as “PDF editor” and “best PDF editor” are long-term targets, not promised positions. This plan contains no invented search volumes, difficulty scores, backlinks, or current rankings.

The [keyword map](SEO-KEYWORD-MAP.csv) includes all nine requested searches plus task-specific variations. Each query has one preferred existing URL. Related searches can share a page; there is no need for separate “best,” “top,” and “the best” pages offering the same content. The priority labels describe the order of work, not measured competition or a ranking deadline.

A search-results spot check on September 18 found editorial comparisons among results for “best free PDF editor” and “best PDF editor,” including TechRadar and PCWorld. This is an observation about search intent, not a reproducible Google ranking report for a particular location. Google explains that its language systems can match relevant variations without repeating every phrase in the copy: [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide). Titles should describe the page clearly and avoid repeated keyword variants: [title guidance](https://developers.google.com/search/docs/appearance/title-link).

## Requested keywords and primary pages

| Requested search    | Primary page                       | Approach                                                                |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| free pdf            | `/`                                | Free PDF toolkit, clear task navigation, links to useful tools.         |
| pdf editor          | `/edit-pdf`                        | Immediate access to the editor, instructions, free-download boundaries. |
| best free pdf       | `/guides/choose-a-free-pdf-editor` | Compare free features and the task each option serves.                  |
| best pdf editor     | `/guides/choose-a-free-pdf-editor` | Help readers choose using actual features, limits and platforms.        |
| the best pdf editor | `/guides/choose-a-free-pdf-editor` | Same intent as “best PDF editor”; no duplicate landing page.            |
| top pdf editor      | `/guides/choose-a-free-pdf-editor` | Source-linked comparison and a repeatable evaluation checklist.         |
| best pdf            | `/guides/choose-a-free-pdf-editor` | Exploratory broad query; verify the intended task from real traffic.    |
| the best pdf        | `/guides/choose-a-free-pdf-editor` | Exploratory; some searchers may be looking for another brand.           |
| top pdf             | `/guides/choose-a-free-pdf-editor` | Exploratory; prioritize more specific editor or tool searches first.    |

## Implemented content

- Expanded the existing editor-choice guide into a five-option comparison: Folio, Sejda Online, PDF24 Creator, PDFgear for Mac, and Adobe Acrobat Online. It discloses Folio authorship, cites each publisher, identifies the product/platform, and distinguishes paid features. It does not claim hands-on benchmarking or award a fabricated “best overall” badge.
- Added `/guides/how-to-add-text-to-a-pdf`: a complete annotation workflow, positioning advice, free export conditions, form/signature alternatives, and draft recovery.
- Added `/guides/how-to-edit-a-pdf-on-mobile`: iPhone/Android browser workflow, toolbar and panel controls, save/download distinction, and document-size limitations.
- Linked all three guides from the homepage. The guide directory, related-reading links, Article metadata, sitemap and RSS include the new material.
- Expanded the editor FAQ to address watermark-free annotation downloads and browser use across desktop and mobile. The shared FAQ component keeps visible answers and structured data aligned.
- Added accessible comparison tables, short takeaways and ordered instructions to the guide template. The comparison remains readable as HTML without JavaScript.

Folio must not imply every original-text edit exports for free. Free editor searches lead to free additions, annotations, signatures, forms and page changes; the paid download boundary is stated before use. Scanned-text searches lead to troubleshooting, not an unavailable OCR service. Compression content describes structural optimization without guaranteeing a percentage, a target file size or image downsampling.

## Publication and validation

Published September 18, 2026 to https://thebestfreepdf.com in Vercel deployment `dpl_EnMHokh7j9YBESxqq2Liw88EuE1p`.

- Production build, TypeScript, lint and formatting checks passed.
- Six SEO/content-discovery unit tests and eight existing SEO browser tests passed.
- Reviewed the homepage, editor landing page, guide directory and three changed guides at desktop and mobile widths in Chromium and WebKit. Checked the homepage and comparison at 320 px without JavaScript, plus horizontal scrolling of the comparison table.
- Automated accessibility checks found no violations in the checked main content: all six pages in Chromium and the three articles in WebKit.
- The live SEO audit checked 57 public pages and reported no issues within its checks. Both new guides appear in the live sitemap and RSS feed.

These checks confirm publishing and technical discoverability, not Google indexing, rankings or traffic gains.

## Work sequence and measurement

### Establish a baseline

Use the existing Search Console domain property. Check the sitemap and inspect `/`, `/edit-pdf`, and the three priority guide URLs. Record Google's selected canonical and any crawl/indexing failure. Request indexing for changed priority pages where appropriate; submitting a sitemap does not force indexing or rankings.

Export Search performance for the last 28 days by **query and page**, with clicks, impressions, CTR and average position. Save the country and device filters used. Treat an empty report as insufficient data, not proof that a keyword has no demand. Average position is an aggregate, not a fixed rank.

Suggested Search Console query groups (custom regular-expression filter):

```text
Broad PDF discovery: ^(free pdf|best free pdf|best pdf|the best pdf|top pdf)$
Editor discovery: ^(best |the best |top |free |online )*pdf editor( online| free| no watermark| without signup)?$
Task searches: (add text|type on|write on|merge|combine|split|extract pages|compress|sign|signature|rotate|reorder|iphone|android)
Brand review: (folio|thebestfreepdf|the best free pdf)
```

Run groups separately; they can overlap. Review brand queries manually because other products also use “Folio.” Do not infer traffic to this app from another product's AI Overview or branded result.

### First 30 days: discovery and task completion

Confirm the new pages are discoverable, titles and snippets describe their actual content, and mobile visitors can upload, edit and download. Review query/page pairs weekly. Where users land on the wrong page, strengthen the relevant internal link and clarify that page's purpose. Fix failed document workflows before expanding acquisition.

### Days 31–60: improve pages that have evidence

Use impressions and user questions to choose revisions. For example, add an actual tested mobile walkthrough if phone queries appear, or a document-specific example when text-editing limitations generate support questions. Improve a page with relevant impressions and weak CTR by making its title/description more precise; do not make a free claim that the product cannot satisfy. Review comparison-source changes monthly.

### Days 61–90: original evidence and relevant references

Prepare public, synthetic PDFs for repeatable tests of layout, export quality, large files and mobile interaction. Publish measurements only after running them, with the files, method, device and limitations. A video should demonstrate a real workflow, with a transcript; create video metadata only when that video exists.

The owner can share useful guides and sample documents with relevant educators, independent reviewers and developer communities, following each community's rules. Seek editorial mentions earned through useful work. Avoid bought links, automated comments, bulk directory submissions and invented testimonials. No outreach messages or paid campaigns were sent as part of this change.

## Review dashboard

Compare successive 28-day periods using consistent filters:

| Metric                               | What to check                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Indexed canonical priority pages     | Whether Google can discover and retain the intended pages.                                                             |
| Non-brand clicks and impressions     | Whether useful task and comparison searches are growing.                                                               |
| Query-to-page mapping                | Whether the right tool/guide earns impressions for each intent.                                                        |
| CTR by query, device and position    | Whether the snippet answers the searcher's question.                                                                   |
| Completed document tasks             | Whether acquired visitors actually receive a useful result; configure first-party measurement before reporting a rate. |
| Support and failed-download patterns | Whether a promise in the search snippet mismatches the product.                                                        |

No Search Console performance export or document-conversion analytics was available for this plan. These are measurement instructions, not claims of improvements already achieved. Country targeting and additional content should follow the resulting evidence.

## Comparison sources

Reviewed September 18, 2026. Provider claims are summarized, not adopted as independent performance findings.

- [Sejda Online PDF Editor](https://www.sejda.com/pdf-editor): existing-text editing, free task/file limits and upload expiry.
- [PDF24 Creator](https://tools.pdf24.org/en/creator): free Windows desktop tools, offline processing and OCR.
- [PDFgear for Mac](https://www.pdfgear.com/pdfgear-for-mac/): free Mac editing features and local/connected feature distinction.
- [Adobe Acrobat Online PDF Editor](https://www.adobe.com/acrobat/online/pdf-editor.html): free markup, account use and existing-text editing boundary.
- Folio's current code and tool-access policy: free additions and annotations; paid original-text downloads; private guest drafts with 100 MB storage and 24-hour expiry.

Review external comparisons by October 18, 2026, or sooner if a provider changes its product. Update the article's modification date only when its content is actually revised.

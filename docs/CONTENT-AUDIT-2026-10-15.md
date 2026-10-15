# Content review — October 15, 2026

The review covered all 28 available tool pages, 17 guides, 18 published blog posts, and the public directories, homepage and trust/support pages. It improved 23 tool pages, four English guides and eight existing published articles. Useful existing material was retained. The work preserves routes and the established layout; it is not a design rebuild.

This is an editorial and implementation audit, not evidence that Google classified particular pages as “low value.” No such classification was available, and this review does not establish ranking effects from Search Console data. Better content cannot guarantee rankings. The criteria were accuracy, a clear reader task, useful instructions, distinct purposes, examples and limitations, consistent with Google's [helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [spam policies](https://developers.google.com/search/docs/essentials/spam-policies), checked during this review. No credentials, measurements, independent product tests or results were invented.

## Findings and changes

The main problems were vague instructions, missing output decisions, overlapping articles and factual drift between live content and the product. Three published articles still advertised removed Office conversion or translation features. Other corrections clarify invoice exports that use the server, standalone text-editor saving, watermark limitations, form naming and the current signature dialog.

Instructions were checked against the PDF/image processors, editor controls, signature composer, invoice export conditions and support endpoints. Existing fictional samples, measured compression evidence and mobile screenshots were retained with their stated limitations. Comparison claims were checked against linked publisher sources; the review does not present that check as a competitive benchmark.

## Tool inventory

Paths below are relative to the site root. Twenty-two pages use English improvements in [tool-edition.ts](../src/lib/tool-edition.ts); the invoice correction brings the improved total to 23. Shared factual corrections also appear in [tools.ts](../src/lib/tools.ts).

| Routes                                                                                        | Review outcome                                                                                                               |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/edit-pdf`, `/edit-pdf-text`                                                                 | Distinguish additions from original-text changes; explain blocks, scans, limits, saving and export checks.                   |
| `/merge-pdf`, `/split-pdf`                                                                    | Specify input order, complete pages, range syntax, selection order and direct/ZIP outputs.                                   |
| `/compress-pdf`                                                                               | Explain structural optimization, unchanged results and alternatives for an upload limit.                                     |
| `/rotate-pdf`, `/organize-pdf`                                                                | Explain saved rotation, page operations, originals and unchanged printed numbering.                                          |
| `/watermark-pdf`, `/page-numbers`, `/crop-pdf`                                                | Explain exact controls, selection examples, output placement and content-removal limitations.                                |
| `/pdf-to-jpg`, `/pdf-to-png`, `/pdf-to-text`                                                  | Distinguish pixels from text, resolution from quality, output limits and lost interactivity.                                 |
| `/sign-pdf`, `/create-pdf-form`                                                               | Clarify visual signatures, supported fields, unique names, flattening and recipient checks.                                  |
| `/jpg-to-webp`, `/webp-to-jpg`, `/enhance-image`                                              | Add format/dimension decisions, transparency and animation behavior, and realistic adjustment limits.                        |
| `/jpg-to-pdf`, `/png-to-pdf`, `/merge-images`                                                 | Explain one image per page, A4/fitted sizes, orientation, tall screenshots and unsupported collage output.                   |
| `/create-qr-code`                                                                             | Explain static destinations, quiet borders, print testing and format choice.                                                 |
| `/invoice-generator`                                                                          | Correct local/server export disclosure: custom colors, payment QR codes and custom footers also trigger server processing.   |
| `/protect-pdf`, `/image-to-pdf`, `/signature-generator`, `/compress-images`, `/url-shortener` | Retained: existing specific controls, limits, examples, troubleshooting and privacy explanations already answer their tasks. |

## Guide inventory

All paths use `/guides/`. Four substantial English revisions retain the previous translated editions through the existing edition mechanism.

| Slug                                                                  | Outcome and reason                                                                             |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `how-to-merge-and-split-pdfs`                                         | Revised: workflow decision table, four-page sample exercise and output diagnosis.              |
| `fillable-pdf-vs-flattened-pdf`                                       | Revised: actual flattening control, interactive/completed comparison and sample-form exercise. |
| `how-to-sign-a-pdf`                                                   | Revised: method selection, precise placement steps, troubleshooting and saving distinctions.   |
| `how-to-password-protect-a-pdf`                                       | Revised: supported inputs, 64 UTF-8 byte limit, XFA restriction and password verification.     |
| `create-professional-invoice-online`                                  | Retained: detailed controls, worked arithmetic and draft workflow.                             |
| `create-transparent-signature-png`                                    | Retained: method-specific guidance and image troubleshooting.                                  |
| `does-folio-upload-pdf-files`                                         | Retained: explicit local, cloud and server-processing distinctions.                            |
| `choose-a-free-pdf-editor`                                            | Retained: attributed comparison, disclosed methodology and sample evaluation checklist.        |
| `how-to-edit-a-pdf`, `how-to-add-text-to-a-pdf`                       | Retained: distinct original-text/addition tasks and practical instructions.                    |
| `how-to-edit-a-pdf-on-mobile`                                         | Retained: screenshots, control guidance and qualified browser evidence.                        |
| `why-cant-i-edit-pdf-text`                                            | Retained: scan, font and text-block diagnostics.                                               |
| `extract-nonconsecutive-pdf-pages`, `merge-pdfs-different-page-sizes` | Retained: downloadable samples and explicit expected results.                                  |
| `why-your-pdf-wont-get-smaller`                                       | Retained: measured example and honest optimization limits.                                     |
| `how-to-convert-pdf-to-images`, `how-to-combine-images-into-pdf`      | Retained: resolution/page-size choices, checks and conversion limitations.                     |

## Published blog inventory and application

All 18 live posts and 15 source articles were read. Eight existing posts were updated through the version-checked `blog_save` RPC after comparing the current public content, draft and expected version. Previous revisions remain available. URLs, bylines, covers, featured settings and original publication dates were preserved. The eight resulting public URLs were HTTP-verified after application.

| Updated `/blog/` slug                          | Correction                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `create-invoice-free-invoice-generator`        | Invoice server-processing exceptions.                                         |
| `free-pdf-editor-add-text-fill-sign`           | Internal field names versus accessible names.                                 |
| `free-pdf-tool-online-guide`                   | Removed unavailable Office/translation claims.                                |
| `how-to-create-fill-and-sign-pdf-forms`        | Current Draw, Type and Image signing controls.                                |
| `how-to-edit-original-text-in-a-pdf`           | Distinct diagnosis of uneditable text, scans, fonts and blocks.               |
| `how-to-edit-pdf-original-text`                | Distinct find-and-replace workflow with literal, substring and case behavior. |
| `how-to-prepare-and-review-pdf-translation`    | Preparation/review using a separate translation service.                      |
| `pdf-conversion-guide-choose-the-right-format` | Available formats, WebP inputs, direct/ZIP output and limits.                 |

Ten retained posts cover the first freelance invoice, target-size image compression, QR creation, phone editing, basic PDF text editing, signature generation, merge/organization, PDF compression, URL shortening and document review/sharing. Their complete per-slug inventory and rationale are in the [blog review README](../content/blog/README.md#october-15-2026-content-review). The [before/after bundle](../content/blog/content-review-2026-10-15.json) and [applied receipt](../content/blog/content-review-applied-2026-10-15.json) record the exact eight changes and resulting versions. File-based tool, guide and hub changes are separate from these live database updates.

## Directories, trust pages and languages

The homepage and `/tools` now explain concrete tasks. `/convert` adds output/quality choices; `/forms` explains interactive versus completed copies. `/about` identifies ownership and editorial purpose; `/support` gives useful report details and the actual signed-in reply process; `/privacy` corrects invoice processing. `/guides`, `/blog`, `/security` and `/terms` retained useful existing navigation or relevant explanations.

The 45 shared strings and factual corrections are covered across all 12 supported language dictionaries, including English. Incorrect translations of “Match case” were corrected. This does **not** mean all expanded articles were newly translated: deeper tool and guide revisions are English editions, while other languages retain their existing translated bodies and dates. Edition handling avoids inserting English paragraphs into localized pages.

## Validation

- TypeScript and lint passed.
- Targeted suites passed 26 tests: 17 SEO/content/blog tests and nine internationalization tests.
- A separate 36-test PDF/content/engine run passed, covering merge/extraction, interactive/flattened fields and encryption. It overlaps the content tests above; these counts must not be added as distinct coverage.
- Source validation passed for all 15 article sources.
- A JavaScript-disabled crawl covered 55 primary routes, each returning HTTP 200 with one H1, and 673 linked public targets with no broken anchors. One development-server response for `/ko/convert` was transient; two immediate retries returned 200. All four revised guides rendered their new editions.
- Chromium mobile checks covered 16 pages: German, French, Dutch and Spanish versions of forms, conversion, About and Support. All returned 200, with no newly untranslated visible strings, page errors, broken local fragments or horizontal document overflow at 390 × 844.
- The production build passed. All 33 SEO and expanded-language browser checks passed across the final run and targeted reruns. The checks caught a mobile upload button below the first screen, which was fixed by shortening the introduction. Existing assertions were updated for revised headings, dates and intentional language-edition differences.

Both new sample exercises were also executed: the selection/merge produced the advertised four pages in order; the Project inquiry form retained values in its interactive export and displayed them with no form fields in its flattened export.

## Release status

The eight database-backed article updates are live and were checked through public production URLs. Application-source changes are saved in this workspace and require the normal site deployment to reach production. No application deployment or Git commit was performed.

These checks support the content and implementation findings. They do not measure subsequent Google crawling, indexing or ranking changes.

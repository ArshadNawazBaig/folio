# Mobile PDF editing article: editorial notes

Prepared September 28, 2026. Article ID: `fa48b3ab-2458-4da1-b98b-517e8bbde111`. Slug: `how-to-edit-pdf-on-phone`.

## Reader intent and keyword coverage

The four requested searches describe one practical task, so they are addressed in one complete article rather than four substantially overlapping pages:

| Requested keyword                   | How the article answers it                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| how to edit pdf in phone            | Direct opening answer, task comparison, and the browser editing walkthrough.                        |
| how to edit a file on my phone      | FAQ explaining file extensions, appropriate editors, and editing the source before exporting a PDF. |
| how do i edit a pdf on my phone     | Main steps, separate iPhone and Android sections, free-editing FAQ, and download troubleshooting.   |
| how to edit a pdf document on phone | Existing-text versus annotation guidance, forms, scans, and the no-install FAQ.                     |

The title, SEO title, description, slug, headings, and tags use natural variations. Awkward exact-match phrases are not forced into sentences. No search-volume, keyword-difficulty, ranking, traffic, or rich-result estimates are invented. Google's [people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) informed the approach; neither supports a promise of ranking.

The existing `how-to-edit-pdf-text` article remains the general text-editing guide. This article adds phone-specific attachment selection, keyboard and toolbar constraints, iPhone/Android saving, and checking the actual attachment. It is not a rewritten copy of that article.

## Original writing and factual sources

The prose, school-form example, task comparison, troubleshooting advice, and checklists were written for this article. The example is illustrative, not a claimed customer story. No competitor article was used as a writing template. An external plagiarism-database scan was not performed, so a verified zero-similarity score is not claimed.

Primary sources support the platform-specific statements, with links placed beside the relevant content:

- [Apple: Preview on iPhone](https://support.apple.com/en-euro/guide/iphone/iph7239ea3b5/ios) — PDF form filling and annotation. Availability is conditional; instructions do not assume every iPhone has the same version or controls.
- [Apple: finding downloads](https://support.apple.com/en-au/102440) — Files/Downloads and Safari's download list. The article distinguishes a browser download from a folder explicitly chosen in the share sheet.
- [Google: Android Chrome downloads](https://support.google.com/chrome/answer/95759?co=GENIE.Platform%3DAndroid&hl=en) — the browser's Downloads list and sharing downloaded files.
- [Google: annotate PDFs in Drive on Android](https://support.google.com/drive/answer/13207179?hl=en) — freehand annotations and saving a separate copy. The article does not imply that these controls replace original PDF text.
- [Priscilla Du Preez: person using a smartphone](https://unsplash.com/photos/person-using-smartphone-BjhUu6BpUZA) — freely available Unsplash cover, visually inspected and credited. It is a contextual photograph, not a Folio screenshot.

Source explanations are paraphrased; no source passage is quoted. Product instructions are grounded in this repository, not inferred from another PDF editor.

## Product checks

| Implementation or policy                                                                                       | Claims checked                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/upload.tsx`, `src/components/editor-toolbar.tsx`                                               | Choose a file; Add Text, Edit Text, Sign; mobile toolbar behavior.                                                                                     |
| `src/components/editor.tsx`, `src/components/download-ready.tsx`                                               | Export action, ready dialog, Download file, optional Share file, preview fallback, retained file after canceled sharing.                               |
| `docs/TOOL-ACCESS.md`, `src/lib/tool-access.ts`                                                                | Free annotations, visual signatures and forms; premium downloads for actual original-text changes; no Folio watermark for free outputs.                |
| `src/app/(public)/privacy/page.tsx`                                                                            | Main-editor private cloud uploads; guest expiry; server processing; separate handling for standalone signatures and images.                            |
| `src/lib/tools.ts`, `src/lib/signature.ts`                                                                     | Fill & sign route; separate transparent PNG generator; no standalone OCR promise.                                                                      |
| `tests/mobile-download.spec.ts`, `tests/mobile-tool-download.spec.ts`, `tests/mobile-account-download.spec.ts` | Prior task's emulated iPhone WebKit, Android Chromium, and desktop download coverage. This does not establish physical-phone or live-provider testing. |

The article does not promise lossless layout retention, arbitrary scan editing, secure redaction through visual covers, verified digital signatures, free original-text export, or an offline/no-upload PDF editor. A downloaded copy is explicitly distinguished from a saved cloud workspace.

## Delivery

`mobile-pdf-editing-article.md` is the full review copy. `starter-posts.ts` contains the CMS import source, excerpt, byline, tags, category, SEO metadata, and cover credit. The existing blog renderer supplies heading navigation, canonical metadata, and BlogPosting structured data. No extra schema or duplicate public page is needed.

Use `--only how-to-edit-pdf-on-phone` with the existing importer. Draft import is limited to this article; existing edited posts are not overwritten. Publication remains a separate editorial action in the blog dashboard. Sitemap and feed inclusion follow publication status.

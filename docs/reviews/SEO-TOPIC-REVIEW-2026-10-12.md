# Folio topic review — October 12, 2026

## Evidence and scope

This applies the supplied [Julian Goldie / Koray interview](https://www.youtube.com/watch?v=Af9rvlVPQCQ)
to the existing product. The interview was reviewed through its published transcript and
YouTube chapters, not direct video playback. Competitor evidence below is a fresh inventory
of public sitemap entries, not a ranking report, traffic estimate or feature test.

Fetched each site's robots.txt, then its advertised sitemap or `/sitemap.xml` when none
was advertised. All eight selected XML URL sets returned HTTP 200. Counted `<url><loc>`
entries, not alternate-language links nested inside those entries. Counts include translated
URLs, articles and non-tool pages; they are not comparable counts of distinct topics.
No competitor copy was imported. The dated machine-readable record is
[SEO-SITEMAP-INVENTORY-2026-10-12.csv](./SEO-SITEMAP-INVENTORY-2026-10-12.csv).

| Site                                               | Sitemap entries | Representative task URLs present in the inventory                                                                                                                  |
| -------------------------------------------------- | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [PDF24](https://tools.pdf24.org/sitemap.xml)       |           4,988 | `/en/edit-pdf`, `/en/pdf-to-png`, `/en/create-invoice`, `/en/generate-qr-code`                                                                                     |
| [iLovePDF](https://www.ilovepdf.com/sitemap.xml)   |           1,415 | `/edit-pdf`, `/organize-pdf`, `/pdf_to_jpg`                                                                                                                        |
| [Smallpdf](https://smallpdf.com/sitemap.xml)       |           5,260 | `/edit-pdf`, `/pdf-to-png`, `/extract-pdf-pages`                                                                                                                   |
| [Sejda](https://www.sejda.com/sitemap.xml)         |           1,396 | `/pdf-editor`, `/extract-text-from-pdf`, `/split-pdf-down-the-middle`                                                                                              |
| [PDFgear](https://www.pdfgear.com/sitemap.xml)     |           2,012 | `/edit-pdf-text/`, `/pdf-to-png/`, `/compress-pdf-to-100kb/`                                                                                                       |
| [PDF Candy](https://pdfcandy.com/sitemap.xml)      |           2,702 | `/add-text-to-pdf.html`, `/edit-pdf-text.html`, `/extract-images.html`                                                                                             |
| [iLoveIMG](https://www.iloveimg.com/sitemap.xml)   |           1,622 | `/compress-image`, `/photo-editor`, `/convert-to-jpg`                                                                                                              |
| [TinyPNG → Tinify](https://tinify.com/sitemap.xml) |             197 | TinyPNG's robots.txt advertises Tinify's sitemap, which includes `/blog` and CDN documentation. This is adjacent commercial content, not a tool-topic gap to copy. |

Sejda's separate blog sitemap was not fetched. PDF24 and Smallpdf exceeded the initial
5 MB download cap; a second request retrieved the complete XML within a 40 MB cap.
Raw inventory remains in `/tmp/folio-competitor-sitemaps.json` on the research machine.
These sitemap URLs can be fetched again; counts will change.

## Query placement and implemented changes

The [existing keyword map](../SEO-KEYWORD-MAP.csv) already assigns 189 candidates across
all 28 tool URLs. This review adds decisions about where to answer a question, rather than
creating another page for each wording variation. Questions below are editorial candidates,
not newly measured search demand. The previous Search Console export remains the stronger
prioritization evidence where available; its separate query and page tables do not establish
a query-to-page pairing.

| Question or intent                                             | Best destination and format                                          | Decision in this change                                                                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Which PDF editing control should I use?                        | `/guides/how-to-edit-a-pdf#section-1`, decision table                | Implemented: distinguish new text, original text, form fields, signing, pages and scans.                                                         |
| How do I add a note and verify it?                             | Same guide, steps plus practice packet                               | Implemented: exact budget-page exercise and downloaded-file checks. Link to the existing detailed add-text guide.                                |
| Why can I not select the original words?                       | `/guides/why-cant-i-edit-pdf-text`, existing troubleshooting article | Added a contextual link from the revised editing guide; keep the separate diagnosis page.                                                        |
| How do I edit on Android or iPhone?                            | `/guides/how-to-edit-a-pdf-on-mobile`, existing platform steps       | Preserve its October 7 revision and link from the broader editing guide. Avoid another mobile landing page.                                      |
| PNG or JPG for a PDF page?                                     | `/guides/how-to-convert-pdf-to-images#section-1`, comparison table   | Implemented: image format, text extraction and retaining PDF interactivity are explicit choices.                                                 |
| How large is a 300 DPI PNG?                                    | Same guide, resolution table and landscape example                   | Implemented: check 3300 × 2550 pixels using the supplied 11 × 8.5 inch sample. Preserve the portrait table.                                      |
| Why is a converted image blurry or too large?                  | Same guide, troubleshooting table                                    | Implemented: source quality, encoding artifacts, pixel limits, batch size and compression next steps.                                            |
| Which guide covers my task?                                    | `/guides`, topic navigation and grouped article links                | Implemented across all languages: editing, organization, conversion, forms/signing, privacy and other tasks. All 17 guides remain linked once.   |
| Mixed-size merging, page extraction and page numbering         | Existing tool examples and organization guides                       | Keep distinct working tools and reusable practice files. No extra thin variant pages.                                                            |
| Signatures, invoices, image settings, QR codes and short links | Existing dedicated tools, examples and related links                 | Retain coverage in the 28-tool map. Off-site demonstrations can explain specific outputs; directory size is not evidence to add unrelated tools. |
| Extract embedded images or split a scanned spread in half      | Not supported by Folio's current image-export/page-split tools       | Product gap, not a keyword to claim. Whole-page rendering and page extraction remain described accurately.                                       |
| OCR, guaranteed 100 KB PDF compression or AI reconstruction    | No matching Folio capability                                         | Keep limitations visible. Do not create landing pages promising these results.                                                                   |

Both revised articles are English editions dated October 12. Existing translated articles
retain their reviewed content and dates. Canonical article URLs are unchanged, and the
existing edition logic supplies the matching article metadata, feed and English sitemap
dates. The directory reorganization alone does not refresh article dates.

## Disposition of the interview's other ideas

- **Working controls and clear attributes:** the preceding layout changes cover all 28
  tools. The main upload control and truthful free/sign-in/processing information come
  before supporting copy; browser checks cover key entry controls.
- **Answer format and topical structure:** the tables, steps, examples and guide groups
  above implement these ideas. No fixed word-position or extra-page percentage is assumed.
- **Originality:** examples use Folio's actual controls and fictional practice files.
  Competitor inventories identify possible questions; they are not source text to paraphrase.
- **Free tools:** Folio already has them. Content now makes the choice and expected output
  clearer; adding unrelated utilities would need a product case.
- **Repurposing, hooks, legitimate mentions and useful links:** ready-to-edit scripts,
  captions, a community answer and an editorial pitch are in the
  [promotion pack](../SEO-PROMOTION-PACK.md). They have not been posted or sent.
- **Content pacing and waiting:** ship this bounded revision, record the release date and
  compare complete periods. Do not mass-publish articles or keep rewriting titles from
  daily low-volume fluctuations. No arbitrary seven-month folder wait is scheduled.
- **Domain, HTML/CSS fingerprints, AI detectors and patents/leaks:** no domain move,
  cosmetic code obfuscation or unsupported scoring rule. Changes address observed product
  usability and content gaps. The interview's numerical outcomes are not Folio forecasts.
- **Aged Reddit accounts and repeated claims across domains:** no accounts, votes,
  fabricated endorsements or manufactured consensus. Disclose the Folio connection when
  publishing a community answer, and let recipients decide whether to mention or link it.

This is consistent with [Google Search Essentials](https://developers.google.com/search/docs/essentials)
and its [generative-content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content):
useful, accurate content and accessible links are the implementation basis. The research
does not establish a causal ranking benefit for any particular layout or content format.

## Measurement after release

Record the actual deployment date here: **not deployed during this work**. Monitor the two
revised English guides, `/guides`, `/edit-pdf`, `/edit-pdf-text`, `/pdf-to-png`, `/pdf-to-jpg`
and the mobile guide; keep unchanged pages as context, not a randomized control group.

Use equal, complete 28-day Search Console periods with matching device, country and search
type filters. Export queries with each page filter active. Compare clicks, impressions,
CTR and position together, and note other releases. The existing `seo:opportunities` command
accepts supplied CSV/ZIP exports; no new authenticated export was available here. A rise or
fall after publication alone does not isolate the cause.

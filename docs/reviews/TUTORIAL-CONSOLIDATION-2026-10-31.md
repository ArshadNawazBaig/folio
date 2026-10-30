# Tutorial consolidation and example verification — October 31, 2026

The two gaps identified in the first AdSense review are addressed in the local release: nine repeated blog tutorials now have one maintained destination, and all 17 guides and 28 tool pages have concrete practice material. Ten retained blog articles have separate exercises with different reader outcomes. The application and generated downloads require deployment together; no live CMS write or deletion was performed.

My revised editorial assessment is **9/10**, reflecting clearer task separation and stronger first-party evidence. This is not Google's rating or a prediction of acceptance. The practice data is explicitly fictional, and the verification is described as product checking rather than an independent benchmark or a credential claim.

## Consolidated routes

Every entry below returns a permanent HTTP 308 redirect. All 108 English/localized old URLs were checked. Localized old URLs go to the corresponding translated guide, or to the English task-selection article when the retained destination is an untranslated blog article.

| Old `/blog/` slug                       | Maintained destination                       |
| --------------------------------------- | -------------------------------------------- |
| `create-invoice-free-invoice-generator` | `/guides/create-professional-invoice-online` |
| `how-to-edit-original-text-in-a-pdf`    | `/guides/why-cant-i-edit-pdf-text`           |
| `how-to-reduce-pdf-file-size`           | `/guides/why-your-pdf-wont-get-smaller`      |
| `how-to-edit-pdf-on-phone`              | `/guides/how-to-edit-a-pdf-on-mobile`        |
| `how-to-make-a-signature-online`        | `/guides/create-transparent-signature-png`   |
| `how-to-create-fill-and-sign-pdf-forms` | `/guides/fillable-pdf-vs-flattened-pdf`      |
| `how-to-merge-and-organize-pdf-files`   | `/guides/how-to-merge-and-split-pdfs`        |
| `free-pdf-editor-add-text-fill-sign`    | `/guides/how-to-edit-a-pdf`                  |
| `free-pdf-tool-online-guide`            | `/blog/choose-a-free-pdf-editor`             |

The registry drives redirects, public-query exclusions, internal article-link normalization, and importer exclusions. Filtering happens before pagination and counting, so archived records do not create short/empty public pages or incorrect page totals. Feeds and the sitemap use the same exclusion. A real PostgreSQL fixture verifies that the public library excludes a consolidated article while its CMS record remains intact.

The fifteen starter sources remain in `starterPostArchive`; eight remain active in `starterPosts`. The other two retained public blog articles are database-authored. Historical source copies and revision receipts were preserved. No author, cover, publication date, or unpublished draft was overwritten. Restoring a consolidated article requires removing its registry entry and deliberately reviewing its purpose against the maintained destination; the CMS history is still available.

## Distinct purposes in the retained library

Guides provide maintained procedures, diagnosis, settings, and output choices. Their worked cases now include a repeatable input, explicit actions, a checked result or diagnostic observation, a failure interpretation, and relevant file-handling information. Existing practice sections were replaced where a new version superseded the same exercise, rather than appending a second walkthrough of it. The two already-expanded Add Text and Image to PDF tutorials retain their detailed exercises.

| Retained blog article                                 | Its specific exercise                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `choose-a-free-pdf-editor`                            | Plan the operations and verification for a four-page upload packet; individual controls stay in the guides.                                      |
| `first-freelance-invoice-with-free-invoice-generator` | Reconcile an invoice and deposit, then draft the client handoff against that exact finished PDF.                                                 |
| `how-to-edit-pdf-text`                                | Correct only one venue on page 1, leaving later pages unchanged.                                                                                 |
| `how-to-edit-pdf-original-text`                       | Replace three full venue labels while retaining the near-match `Archive: Room 40`.                                                               |
| `how-to-compress-images-to-target-size`               | Meet a 20,000-byte ceiling and separately check the resulting pixel dimensions and readability.                                                  |
| `how-to-create-a-qr-code-for-a-link`                  | Decode a direct-PDF QR and then test the physical print and destination.                                                                         |
| `how-to-shorten-a-url`                                | Change an account-owned short link's destination while reusing its saved QR, then delete the practice link. No shared live alias is invented.    |
| `pdf-conversion-guide-choose-the-right-format`        | Compare preserved page appearance with extracted wording from the same source.                                                                   |
| `how-to-prepare-and-review-pdf-translation`           | Complete a four-row human-review worksheet without losing the numbers 4 and 40. No translated output or translation certification is fabricated. |
| `pdf-editor-online-review-share`                      | Add a decision-seeking comment while keeping the original wording unchanged.                                                                     |

The examples extend the CMS article body through an explicit source component. They do not silently replace edited CMS prose. Update dates and reading time include this additional published material; original publication dates remain unchanged. Guide translation logic was separated from client translation helpers so the new editorial bodies do not have to load with ordinary client UI translation functions.

## Practice material and limits

There are **38 new downloadable artifacts** under `public/samples/tutorials/`: fictional inputs, checked PDFs, page images, image-format outputs, a transparent signature PNG, QR files, an invoice draft/PDF pair, text extractions, and a blank translation-review worksheet. Existing practice files and the three outputs from the first review remain available. [Evidence records](../../src/lib/tutorial-evidence.json) identify the files, hashes, settings/checks, and measured browser outputs.

- PDF output checks cover page order, dimensions, rotation, selected text, retained near-matches, form values/field counts, the review comment, and opening-password behavior.
- The three-page diagnostic separates visible text, image-only text, and an image with an invisible text layer. Copyable words are explicitly not treated as proof of editable visible artwork.
- The browser-generated receipt example returned 19,968 bytes at 811 × 608 pixels for a 20 KB JPG target. These are measurements of that supplied file, not predictions for other images or browser encoders.
- Real browser downloads verify JPG/WebP formats, transparent-to-white conversion, typed-signature transparency, brightness adjustment, and page-image dimensions. The QR PNG was decoded back to its exact public practice-PDF URL.
- The public practice password is `Practice-only-42`, prominently labeled as a demonstration value. It must not be reused for real documents. Visual signatures are fictional and do not contain a digital certificate or verify identity.
- Twenty-seven tool examples have generated comparison downloads. The URL shortener instead has a concrete account exercise with two public practice destinations and explicit positive/negative checks, because a fabricated pre-existing live alias would be misleading.

All twelve languages now offer localized practice introductions, input/output links, and concrete checks on tool and guide pages. Downloaded documents intentionally contain English fictional text, which the localized introduction explains. Existing translated guide bodies remain in their own language; this is not a claim that every expanded English procedural paragraph received native-speaker review. English exercises include the fuller step-by-step cases and failure explanations.

## Verification

The final production build passed with the public origin and indexing enabled. TypeScript and lint passed. Forty-six distinct targeted unit/server checks passed across the completed runs, including PostgreSQL publication/pagination behavior, content discovery, translation coverage, artifact hashes, PDF behavior, and the selective-replacement case. Twenty-seven distinct browser checks passed across the final runs: the twenty SEO checks, three earlier AdSense checks, and four new tutorial/reading checks. Repeated runs are not counted as additional coverage.

The final local crawl covered **670 publication URLs**, all HTTP 200, with one H1 each, no broken same-page fragments, no duplicate IDs, and no advertising scripts. It also checked the 108 permanent legacy redirects. All 38 generated files download with the existing sample-file `noindex` header. [The crawl and redirect record](TUTORIAL-VERIFICATION-2026-10-31.json) records each route.

Browser checks covered the changed comparisons at a narrow viewport in English, French, and Japanese, including accessibility analysis. Representative signed, replaced-text, and invisible-layer PDFs were rendered and visually reviewed. The journal's loading boundary was removed after a JavaScript-disabled check showed a permanent skeleton instead of the article list; a regression check now verifies visible journal content without JavaScript.

Two test-harness adjustments were needed: the local PostgREST fixture now understands the exclusion filter, and sample MIME checks accept the new JSON/TXT downloads. JSON import attributes make the new evidence module usable in the Playwright ESM runner. The production conversion engine itself was not changed.

To regenerate after changing a source, setting, or engine:

```sh
npx tsx scripts/generate-tutorial-evidence.ts
# With a local production server running on port 3012:
node scripts/generate-browser-tutorial-evidence.mjs
npx tsx --test tests/tutorial-content.test.ts
```

The browser generator permits only localhost. Both generators use fictional data and the actual application engines/controls. Regeneration can change PDF metadata or browser-encoded bytes; rerun the documented checks and commit the new evidence alongside the files. Before resubmitting to AdSense, deploy the application and practice files together, then verify the retained pages, redirects, readable blog listing, and downloads on the public domain.

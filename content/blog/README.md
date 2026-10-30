# Folio editorial articles

`starter-posts.ts` retains fifteen original article sources in `starterPostArchive`. The active `starterPosts` export contains eight articles after the October 31 consolidation. Consolidated sources remain available for history and are excluded from imports. Each has a title, excerpt, category, tags, SEO metadata, rich editor content, descriptive cover alt text, and a cover credit. Most covers are credited Unsplash photographs; the invoice article has its own original AI-generated image. Tool instructions were checked against this application. Translation and Office conversion sections state that these tools are not offered by Folio. The translation article covers file preparation and reviewing work from a separate translator or service.

The QR code and URL shortener guides include practical examples, FAQs, links to the relevant tools, and primary-source references. Their search intent and product checks are recorded in [the editorial research notes](qr-and-url-research.md). They are prepared for draft review; publishing remains an explicit editorial action. Review and publish both together if retaining their cross-links.

The signature generator article covers choosing a signature method, creating a transparent PNG, sizing it for a document, using it in PDFs, Word and Google Docs, troubleshooting, and privacy. Read the complete [article preview](signature-generator-article.md) and [editorial notes](signature-research.md). The Markdown preview is a review copy; the rich content in `starter-posts.ts` is the import source. Its blog slug is `how-to-make-a-signature-online`. Its public blog URL now permanently redirects to `/guides/create-transparent-signature-png`; the source is archived.

The image compressor article explains target KB limits, pixel dimensions, JPG/PNG/WebP choices, quality checks, batch downloads, troubleshooting, and local processing. Read the complete [article preview](image-compressor-article.md) and [editorial notes](image-compressor-research.md). Its blog slug is `how-to-compress-images-to-target-size`; its tool is `/compress-images`.

The mobile PDF article answers the requested phone-editing searches with iPhone and Android steps, original-text versus annotation guidance, form filling, downloads, troubleshooting, and storage details. Read the complete [article preview](mobile-pdf-editing-article.md) and [editorial notes](mobile-pdf-editing-research.md). Its archived blog slug is `how-to-edit-pdf-on-phone`, which now permanently redirects to `/guides/how-to-edit-a-pdf-on-mobile`.

Three further articles cover the requested free PDF keywords with separate practical purposes: [choosing a free PDF tool online](free-pdf-tool-online-article.md), [using a free PDF editor for text, forms, and signatures](free-pdf-editor-article.md), and [reviewing and sharing with a PDF editor online](pdf-editor-online-review-article.md). The [research notes](free-pdf-articles-research.md) map the keywords to each article, document product checks, and list primary sources. The review/share article remains active; the two general walkthroughs are now consolidated into the maintained editor guide and task-selection article.

October 5 removal: the conversion, translation, and free-tools article sources no longer advertise the removed tools. Apply these copy corrections through `/admin/blog` to any already-published versions when releasing the removal; the importer intentionally does not overwrite existing posts.

The source is a backup for an explicit import, not a runtime fallback. After import, manage the live posts through `/admin/blog`; edits there remain authoritative. Existing posts, edited drafts, and trashed posts are never overwritten by the importer.

## October 31 consolidation and worked examples

Nine repeated public blog URLs now redirect to one maintained article per task. The registry in `src/lib/editorial-consolidation.ts` also excludes them from the public listing, homepage selection, feed, sitemap, and future seeding. The CMS records and their revisions are retained; this release does not delete or overwrite them. The active public library contains ten distinct blog articles, including two database-authored articles outside the eight active starter sources.

Reader exercises are maintained in `src/lib/tutorial-exercises.ts` and rendered after the CMS article body. The CMS remains the source for the article prose, cover, author, and original publication date. Update timestamps and reading time account for the source-maintained exercise. Editing an article does not silently replace its CMS body. Generated downloads and their recorded checks are in `src/lib/tutorial-evidence.json` and `public/samples/tutorials/`.

Deploy the application and practice files together; no live CMS mutation or separate unpublish step is required. See the [follow-up review](../../docs/reviews/TUTORIAL-CONSOLIDATION-2026-10-31.md) for the route map, verification, and rollback instructions.

## October 15, 2026 content review

The review read all fifteen source articles and all eighteen currently published database articles. Word count was recorded as an inventory aid, not used as a quality score. Existing worked examples, specific instructions, troubleshooting, privacy distinctions, and honest limitations were retained where they answered the reader's task.

Three published articles still advertised Office conversion or translation features removed from the application. Their corrected source copies had not reached the database because the importer intentionally preserves existing posts. The review also found outdated conversion output/input details, an outdated signature instruction, imprecise form-accessibility wording, and an invoice privacy explanation that omitted server processing triggered by custom options.

Two database-authored text-editing articles repeated the basic correction workflow already covered by `how-to-edit-pdf-text`. Their revised copy in `live-content-revisions.ts` gives them separate purposes: diagnosing uneditable text, and safely replacing repeated wording. Existing article URLs, bylines, cover images, featured settings, and original publication dates are retained.

`content-review-2026-10-15.json` is the reviewable before/after bundle for eight existing posts. It records the observed row version, original publication dates, changed fields, and proposed full draft. It is not a runtime override or a seed file. Apply only through the existing `blog_save` revision mechanism after re-reading and matching the expected version, original public content, and current draft. A concurrent edit or a different unpublished draft must stop that entry. Passing a null `publish_time` preserves the original publication date; the update date records the correction. No new posts are created by this review.

Applied October 15, 2026: all eight corrections were saved with `blog_save`, archived revisions, and optimistic version checks. Their public production pages were then verified for HTTP 200, updated titles/content, preserved original dates, and removal of unavailable-tool links. The [application receipt](content-review-applied-2026-10-15.json) records the resulting versions and update times. The before/after bundle is historical evidence; its original versions must not be reapplied.

| Published article slug                                | Review outcome                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `create-invoice-free-invoice-generator`               | Correct Classic/Minimal server-processing exceptions; retain the invoice example and handoff workflow.                               |
| `first-freelance-invoice-with-free-invoice-generator` | Retain: worked deposit arithmetic, specific item descriptions, backup and handoff guidance.                                          |
| `free-pdf-editor-add-text-fill-sign`                  | Distinguish internal field names from accessible names and explain checks beyond adding fields.                                      |
| `free-pdf-tool-online-guide`                          | Remove the stale live claim about Office conversion and translation; synchronize the Markdown preview.                               |
| `how-to-compress-images-to-target-size`               | Retain: target-byte behavior, dimensions, format tradeoffs, limits, privacy and troubleshooting.                                     |
| `how-to-create-a-qr-code-for-a-link`                  | Retain: destination access, static/editable links, quiet zone, print testing and limitations.                                        |
| `how-to-create-fill-and-sign-pdf-forms`               | Update signing instructions to the current Draw, Type and Image dialog.                                                              |
| `how-to-edit-original-text-in-a-pdf`                  | Replace overlapping general instructions with a symptom-based diagnosis of scans, OCR layers, fonts, limits and text blocks.         |
| `how-to-edit-pdf-on-phone`                            | Retain: iPhone/Android save paths, tool distinctions, mobile troubleshooting and cloud-saving disclosure.                            |
| `how-to-edit-pdf-original-text`                       | Replace overlapping general instructions with a find-and-replace workflow, literal/substring/case matching, counts and verification. |
| `how-to-edit-pdf-text`                                | Retain as the focused basic correction walkthrough.                                                                                  |
| `how-to-make-a-signature-online`                      | Retain: method selection, transparent PNG handling, sizing, privacy and recipient requirements.                                      |
| `how-to-merge-and-organize-pdf-files`                 | Retain: ordering, physical-page ranges, limits, form/signature caveats and final review.                                             |
| `how-to-prepare-and-review-pdf-translation`           | Replace removed in-app translation instructions with preparation and review for a separate translator.                               |
| `how-to-reduce-pdf-file-size`                         | Retain: structural optimization limits, a clearly hypothetical size example, and readable-output checks.                             |
| `how-to-shorten-a-url`                                | Retain: account limits, aliases, destination changes, QR behavior, access permissions and analytics limits.                          |
| `pdf-conversion-guide-choose-the-right-format`        | Correct Office availability, WebP input, direct single-image downloads, batch limits and description.                                |
| `pdf-editor-online-review-share`                      | Retain: concrete review comments, file-version handoff, comment-reader checks and privacy.                                           |

The related trust-page review replaced the vague About introduction with concrete tasks and editorial context, expanded Support with useful report details and the actual reply process, and corrected the invoice processing disclosure on Privacy. Security and Terms already supplied concise, relevant instructions and were retained. No unsupported credentials, security guarantees, performance results, or search-ranking promises were added.

Implementation checks included `tool-processor.tsx` (formats, direct/ZIP output and limits), `pro-text-editor.tsx` (upload, search behavior and text limits), `signature-dialog.tsx`, `invoice-generator.tsx` plus `invoiceProFeatures`, `support-panel.tsx`, and the versioned `blog_save` mutation. External reference checks used the existing primary sources: [W3C PDF form naming](https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF12), [W3C OCR guidance](https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF7), [DENSO WAVE QR margins](https://www.qrcode.com/en/howto/code.html), [Apple's iPhone Preview guide](https://support.apple.com/en-euro/guide/iphone/iph7239ea3b5/ios), and [GOV.UK invoice details](https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include). No legal policy expansion was attempted.

The invoice generator article follows a first freelance invoice from an approved project to a checked PDF and a client email. It includes clearer item descriptions, a new deposit example, all 12 free design choices, draft backups, and FAQs. Read the [article preview](invoice-generator-article.md) and [editorial notes](invoice-generator-research.md). Its blog slug is `first-freelance-invoice-with-free-invoice-generator`. It complements the existing `/guides/create-professional-invoice-online` walkthrough with a client-handoff focus.

From the project root:

```sh
npx tsx scripts/seed-blog-posts.ts --check
npx tsx scripts/seed-blog-posts.ts --drafts
# Publish all eligible, unchanged imported drafts when ready:
npx tsx scripts/seed-blog-posts.ts --publish

# Work only with the image compressor article:
npx tsx scripts/seed-blog-posts.ts --check --only how-to-compress-images-to-target-size
npx tsx scripts/seed-blog-posts.ts --drafts --only how-to-compress-images-to-target-size

# Work only with the invoice generator article:
npx tsx scripts/seed-blog-posts.ts --check --only first-freelance-invoice-with-free-invoice-generator
npx tsx scripts/seed-blog-posts.ts --drafts --only first-freelance-invoice-with-free-invoice-generator

# Work only with the active review/share article:
npx tsx scripts/seed-blog-posts.ts --drafts --only pdf-editor-online-review-share
```

The check command validates content and internal links without connecting to Supabase. Write commands use the existing environment configuration and require migration `009_blog.sql`. When the project has one super admin, that account is used for the import audit trail. For multiple admins, set `FOLIO_BLOG_ACTOR_ID` to an existing, active super admin UUID for the command. No new account or privilege is created.

Covers come from the free Unsplash photo pages linked inside the articles, not Unsplash+, or from original assets in `content/blog/assets`. The importer converts them to optimized WebP files in the public `folio-blog` bucket, separate from private PDF storage. Files use stable paths, and the importer does not replace existing media. Retain the relevant cover credits when editing the articles. The invoice cover and its generation prompt are saved in [assets/first-freelance-invoice-cover.md](assets/first-freelance-invoice-cover.md).

| Article                                                            | Cover photographer | Unsplash source                                                                                                                   |
| ------------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| How to Edit PDF Text Without Rebuilding Your Document              | Kelly Sikkema      | [Notebook and pen](https://unsplash.com/photos/photo-of-a-paper-and-pen-Hrh1E3T8nQc)                                              |
| How to Merge and Organize PDFs into a Clear, Professional Document | Estée Janssens     | [Planner and pens](https://unsplash.com/photos/white-printing-paper-and-blue-pen-NzukYmIQOps)                                     |
| How to Reduce PDF File Size While Keeping Your Pages Readable      | Isaac Smith        | [Graph, ruler, and pens](https://unsplash.com/photos/line-graph-with-ruler-and-pens-6EnTPvPPL6I)                                  |
| How to Create, Fill, and Sign a PDF Form                           | Sarah Elizabeth    | [Writing at a meeting](https://unsplash.com/photos/person-holding-pen-writing-on-paper-O3gOgPB4sRU)                               |
| PDF Conversion Guide: Choose the Right Format for Your Next Task   | nicoll camacho     | [Laptop and notebook](https://unsplash.com/photos/laptop-notebook-and-pen-on-a-desk--Z8cI1gs4zk)                                  |
| How to Prepare and Review a PDF Translation                        | Eugenia Pan’kiv    | [Globe on books](https://unsplash.com/photos/blue-and-yellow-desk-globe-on-yellow-and-white-books-xSofsfb5Hco)                    |
| How to Create a QR Code for a Link That People Can Actually Use    | Marielle Ursua     | [Phone scanning a QR code](https://unsplash.com/photos/a-person-using-a-laptop-computer-with-a-qr-code-on-the-screen-v9bLIYP20xw) |
| How to Shorten a URL: Free Links, Custom Aliases, and QR Codes     | Christin Hume      | [Working on a laptop](https://unsplash.com/photos/person-using-laptop-computer-Hcfwew744z4)                                       |
| How to Make a Signature Online That Looks Right in Your Documents  | Kelly Sikkema      | [Notebook and pen](https://unsplash.com/photos/photo-of-a-paper-and-pen-Hrh1E3T8nQc)                                              |
| How to Compress Images to a File Size Limit Without Guessing       | Christin Hume      | [Working on a laptop](https://unsplash.com/photos/person-using-laptop-computer-Hcfwew744z4)                                       |
| How to Edit a PDF on Your Phone: iPhone and Android                | Priscilla Du Preez | [Person using a smartphone](https://unsplash.com/photos/person-using-smartphone-BjhUu6BpUZA)                                      |
| Free PDF Tool Online: Choose the Right Tool for Your Task          | Estée Janssens     | [Planner and pens](https://unsplash.com/photos/white-printing-paper-and-blue-pen-NzukYmIQOps)                                     |
| Free PDF Editor: Add Text, Fill Forms, and Sign a PDF              | Kelly Sikkema      | [Notebook and pen](https://unsplash.com/photos/photo-of-a-paper-and-pen-Hrh1E3T8nQc)                                              |
| PDF Editor Online: Prepare a Document for Review and Sharing       | Sarah Elizabeth    | [Writing at a meeting](https://unsplash.com/photos/person-holding-pen-writing-on-paper-O3gOgPB4sRU)                               |

The October 4, 2026 free-access review updated the published articles and these source copies. All available tools and downloads are free, with 1 GB of private storage per account. Paid-plan comparisons and pricing links have been removed from current articles. Research notes document earlier checks and are not the current access policy.

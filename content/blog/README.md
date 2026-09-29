# Folio editorial articles

`starter-posts.ts` contains fifteen original, complete articles for the public blog. Each has a title, excerpt, category, tags, SEO metadata, rich editor content, descriptive cover alt text, and a cover credit. Most covers are credited Unsplash photographs; the invoice article has its own original AI-generated image. Tool instructions were checked against this application. Translation and Office conversion sections explain that their services must be connected before processing is available.

The QR code and URL shortener guides include practical examples, FAQs, links to the relevant tools, and primary-source references. Their search intent and product checks are recorded in [the editorial research notes](qr-and-url-research.md). They are prepared for draft review; publishing remains an explicit editorial action. Review and publish both together if retaining their cross-links.

The signature generator article covers choosing a signature method, creating a transparent PNG, sizing it for a document, using it in PDFs, Word and Google Docs, troubleshooting, and privacy. Read the complete [article preview](signature-generator-article.md) and [editorial notes](signature-research.md). The Markdown preview is a review copy; the rich content in `starter-posts.ts` is the import source. Its blog slug is `how-to-make-a-signature-online`. The existing `/guides/create-transparent-signature-png` page remains a separate tool walkthrough.

The image compressor article explains target KB limits, pixel dimensions, JPG/PNG/WebP choices, quality checks, batch downloads, troubleshooting, and local processing. Read the complete [article preview](image-compressor-article.md) and [editorial notes](image-compressor-research.md). Its blog slug is `how-to-compress-images-to-target-size`; its tool is `/compress-images`.

The mobile PDF article answers the requested phone-editing searches with iPhone and Android steps, original-text versus annotation guidance, form filling, downloads, troubleshooting, and storage details. Read the complete [article preview](mobile-pdf-editing-article.md) and [editorial notes](mobile-pdf-editing-research.md). Its blog slug is `how-to-edit-pdf-on-phone`.

Three further articles cover the requested free PDF keywords with separate practical purposes: [choosing a free PDF tool online](free-pdf-tool-online-article.md), [using a free PDF editor for text, forms, and signatures](free-pdf-editor-article.md), and [reviewing and sharing with a PDF editor online](pdf-editor-online-review-article.md). The [research notes](free-pdf-articles-research.md) map the keywords to each article, document product checks, and list primary sources. These are private drafts for editorial review; each can be published independently.

The source is a backup for an explicit import, not a runtime fallback. After import, manage the live posts through `/admin/blog`; edits there remain authoritative. Existing posts, edited drafts, and trashed posts are never overwritten by the importer.

The invoice generator article follows a first freelance invoice from an approved project to a checked PDF and a client email. It includes clearer item descriptions, a new deposit example, free and Pro design choices, draft backups, and FAQs. Read the [article preview](invoice-generator-article.md) and [editorial notes](invoice-generator-research.md). Its blog slug is `first-freelance-invoice-with-free-invoice-generator`. It complements the existing `/guides/create-professional-invoice-online` walkthrough with a client-handoff focus.

From the project root:

```sh
npx tsx scripts/seed-blog-posts.ts --check
npx tsx scripts/seed-blog-posts.ts --drafts
# Publish all eligible, unchanged imported drafts when ready:
npx tsx scripts/seed-blog-posts.ts --publish

# Work only with the image compressor article:
npx tsx scripts/seed-blog-posts.ts --check --only how-to-compress-images-to-target-size
npx tsx scripts/seed-blog-posts.ts --drafts --only how-to-compress-images-to-target-size

# Work only with the mobile PDF editing article:
npx tsx scripts/seed-blog-posts.ts --check --only how-to-edit-pdf-on-phone
npx tsx scripts/seed-blog-posts.ts --drafts --only how-to-edit-pdf-on-phone

# Work only with the invoice generator article:
npx tsx scripts/seed-blog-posts.ts --check --only first-freelance-invoice-with-free-invoice-generator
npx tsx scripts/seed-blog-posts.ts --drafts --only first-freelance-invoice-with-free-invoice-generator

# Import only the three free PDF articles as private drafts:
npx tsx scripts/seed-blog-posts.ts --drafts --only free-pdf-tool-online-guide
npx tsx scripts/seed-blog-posts.ts --drafts --only free-pdf-editor-add-text-fill-sign
npx tsx scripts/seed-blog-posts.ts --drafts --only pdf-editor-online-review-share

# Work only with the signature article:
npx tsx scripts/seed-blog-posts.ts --check --only how-to-make-a-signature-online
npx tsx scripts/seed-blog-posts.ts --drafts --only how-to-make-a-signature-online
# When ready to publish that article:
npx tsx scripts/seed-blog-posts.ts --publish --only how-to-make-a-signature-online
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

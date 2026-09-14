# Folio editorial articles

`starter-posts.ts` contains six original, complete guides for the public blog. Each has a title, excerpt, category, tags, SEO metadata, rich editor content, descriptive cover alt text, and a linked Unsplash photograph credit. Tool instructions were checked against this application. Translation and Office conversion sections explain that their services must be connected before processing is available.

The source is a backup for an explicit import, not a runtime fallback. After import, manage the live posts through `/admin/blog`; edits there remain authoritative. Existing posts, edited drafts, and trashed posts are never overwritten by the importer.

From the project root:

```sh
npx tsx scripts/seed-blog-posts.ts --check
npx tsx scripts/seed-blog-posts.ts --drafts
# Publish the six imported articles when ready:
npx tsx scripts/seed-blog-posts.ts --publish
```

The check command validates content and internal links without connecting to Supabase. Write commands use the existing environment configuration and require migration `009_blog.sql`. When the project has one super admin, that account is used for the import audit trail. For multiple admins, set `FOLIO_BLOG_ACTOR_ID` to an existing, active super admin UUID for the command. No new account or privilege is created.

Covers come from the free Unsplash photo pages linked inside the articles, not Unsplash+. The importer converts them to optimized WebP files in the public `folio-blog` bucket, separate from private PDF storage. Files use stable paths, and the importer does not replace existing media. Retain the photo credits when editing the articles.

| Article                                                            | Cover photographer | Unsplash source                                                                                                |
| ------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| How to Edit PDF Text Without Rebuilding Your Document              | Kelly Sikkema      | [Notebook and pen](https://unsplash.com/photos/photo-of-a-paper-and-pen-Hrh1E3T8nQc)                           |
| How to Merge and Organize PDFs into a Clear, Professional Document | Estée Janssens     | [Planner and pens](https://unsplash.com/photos/white-printing-paper-and-blue-pen-NzukYmIQOps)                  |
| How to Reduce PDF File Size While Keeping Your Pages Readable      | Isaac Smith        | [Graph, ruler, and pens](https://unsplash.com/photos/line-graph-with-ruler-and-pens-6EnTPvPPL6I)               |
| How to Create, Fill, and Sign a PDF Form                           | Sarah Elizabeth    | [Writing at a meeting](https://unsplash.com/photos/person-holding-pen-writing-on-paper-O3gOgPB4sRU)            |
| PDF Conversion Guide: Choose the Right Format for Your Next Task   | nicoll camacho     | [Laptop and notebook](https://unsplash.com/photos/laptop-notebook-and-pen-on-a-desk--Z8cI1gs4zk)               |
| How to Prepare and Review a PDF Translation                        | Eugenia Pan’kiv    | [Globe on books](https://unsplash.com/photos/blue-and-yellow-desk-globe-on-yellow-and-white-books-xSofsfb5Hco) |

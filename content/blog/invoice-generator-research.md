# Invoice generator blog: editorial notes

Prepared on 29 September 2026.

## Article and purpose

- Title: **How to Create Your First Freelance Invoice (With an Example)**.
- Blog slug: `first-freelance-invoice-with-free-invoice-generator`.
- Editorial ID: `fa48b3ab-2458-4da1-b98b-517e8bbde115`.
- Audience: a freelancer preparing a first invoice after completing an agreed project.
- Search intent: free invoice generator, first freelance invoice, invoice example, invoice PDF.
- Review copy: [invoice-generator-article.md](invoice-generator-article.md).
- CMS import source: the corresponding entry in `starter-posts.ts`.

This is a new blog article, not a copy of the existing invoice guide. Its focus is turning an agreement into readable charges and handing the finished PDF to a client. Original material includes three before-and-after item descriptions, a fictional USD 1,470 project with a USD 450 received deposit and USD 1,020 balance, a matching client email, and a final-file checklist. The existing guide remains the detailed reference for tax and discount calculations and library behavior.

The title, excerpt, headings, and metadata describe that purpose without repeating keywords mechanically. The article links to the invoice generator, current pricing, and the separate guide. The existing CMS supplies canonical metadata, the table of contents, BlogPosting data, sitemap/feed inclusion, and related tools after publication. Drafts are not indexable articles.

All prose was composed for this article. The cover is an original AI-generated editorial image with its own credit. No plagiarism-database scan, search-volume measurement, ranking position, or guaranteed traffic result is claimed.

## Product checks

Checked against `src/components/invoice-generator.tsx`, `src/lib/invoice.ts`, `src/lib/invoice-designs.ts`, and `src/lib/server/invoices.ts`:

- Dedicated editor sections: Details, Items, Payment & notes, Design; mobile Live preview.
- Classic and Minimal are free; 10 additional designs require Pro export.
- Logo and preset colors are free. Custom color, payment QR code, custom footer, and account saving require Pro.
- The free-version export leaves the working draft unchanged.
- The fictional example was run through `invoiceTotals`: subtotal/total 147000, received payment 45000, balance 102000 in USD minor units.
- Changing currency does not convert prices. Tax supports one invoice-level rate and taxable/exempt items.
- The invoice number is entered by the user, with no central number reservation.
- Free PDFs are created on the device; Pro PDFs are processed by Folio. Only explicit account saving puts the invoice in the private library.
- File → Draft backup and File → Import draft use JSON. Unsaved free work is held in the current tab.
- Mobile file delivery offers Download file or Share file when the PDF is ready.
- No automated invoicing email, reminders, payment verification, or customer-open tracking is promised.

## Primary sources and attribution

- [Google Search Central: creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Used as an editorial quality check: answer a reader's task with original examples and accurate product details. No prescribed SEO word count or ranking promise.
- [GOV.UK: what invoices must include](https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include). The article links this as a jurisdiction-specific example of supply-date and business-type requirements, not as universal advice. No tax rate is recommended.
- [Original invoice cover](assets/first-freelance-invoice-cover.webp), created with the built-in image generation tool. It replaces the reused notebook photograph and depicts an illustrative workspace, not a product screenshot. See [the generation prompt](assets/first-freelance-invoice-cover.md).

## CMS workflow

Validate and import only this article using the commands in [README.md](README.md). The import creates a private draft and preserves existing edited or published posts. Review the draft at `/admin/blog/fa48b3ab-2458-4da1-b98b-517e8bbde115`; publication makes it available at `/blog/first-freelance-invoice-with-free-invoice-generator` through the existing blog system. No application deployment is required for CMS publication.

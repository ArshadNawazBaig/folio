# Folio

A document application built with Next.js 16 App Router, React 19, and TypeScript. Public pages have server-rendered HTML and metadata. Local tool pages are prerendered; service-dependent pages and pricing use current server configuration. Free document tools run locally in the browser; Folio Pro adds server processing with Lemon Squeezy subscriptions and Supabase accounts.

See [docs/SETUP.md](docs/SETUP.md) to connect Google login, assign the super admin, enable Lemon Squeezy, and configure translation/conversion providers. Run `npm run check:setup` to see which credentials are still missing.

## Run locally

Requires Node.js 22.22 or newer in the Node 22 line (or a supported newer LTS) and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. The dependency installation copies the matching PDF.js worker, fonts, CMaps, and WASM assets into `public/pdfjs`. `npm run assets` repeats this step if needed.

For the production server:

```sh
npm run build
npm start
```

## Available workflows

- Edit PDFs with new text, highlights, rectangles, ellipses, horizontal lines, cross/check marks, freehand drawings, typed signatures, and JPG/PNG images.
- Add PDF comments and clickable website/email link areas. Comment text supports Unicode; a PDF reader with comment support can open the notes.
- Use Eraser to remove added items or cover an area visually. Covers do not remove underlying PDF content and are not secure redaction.
- Select, move, resize, duplicate, delete, undo, and redo annotations. Search source text and navigate matching pages.
- Reorder, rotate, duplicate, delete, and insert blank pages. Rotate annotated pages after exporting and reopening to preserve their alignment.
- Merge PDFs; extract selected pages; split into individual PDFs in a ZIP.
- Optimize PDF object streams without downsampling. Report when the original is already smaller.
- Add text watermarks, page numbers, and visible page crops.
- Export pages to JPG/PNG in a ZIP and extract selectable text into a TXT file.
- Combine JPG/PNG images into fitted or A4 PDF pages.
- Fill supported existing form fields. Create text fields and checkboxes, mark them required, and export fillable or flattened copies.
- Start from three original fillable form templates.
- Save edited PDF copies to private Supabase Storage, reopen them across devices, and manage them in the dashboard. Older browser drafts can be moved to cloud storage.

The source file on the user's device stays unchanged. Free document processing runs in the browser; opening a PDF in the editor automatically uploads it to private storage for refresh recovery. Files can be handed from the editor to another tool in memory.

The editor toolbar exposes Move, Undo/Redo, Add Text, Edit Text, Eraser, Highlight, Pencil, Image, Ellipse, Cross, Check, Sign, Annotations, Links, More tools, Page layout, and Manage pages. Custom menus provide shape/signature choices, form fields, annotation review, and page operations. Move pans the page; added items remain draggable. Arrow keys navigate toolbar buttons and menus. The toolbar scrolls horizontally on narrow screens. Edit Text hands the current PDF and its annotations to the existing original-text workspace; premium downloads retain their server payment checks.

## Folio Pro

- Replace or delete existing PDF text objects, with replacement font, size, and color controls.
- Search 1,817 Google Font families for original-text edits, added text, and signatures, with available weights and italics. Fonts load on demand and are embedded in exported PDFs; choices survive cloud save and refresh. See [document font setup and caching](docs/document-fonts.md).
- Find and replace text across pages, undo/redo changes, preview the resulting PDF, and download it.
- Add an AES-256 opening password to a PDF.
- Translate PDFs with Google Cloud Translation and convert to Word, Excel, and PowerPoint with ConvertAPI when configured. Prepare without sign-in; download with Pro.
- Sign in with Google or email links, subscribe through Lemon Squeezy Checkout, and manage billing through Lemon Squeezy's portal.
- Enforce paid access and processing quotas on the server using verified accounts and signed subscription webhooks.

Try the real text engine without configuration at [localhost:3000/edit-pdf-text?demo=1](http://localhost:3000/edit-pdf-text?demo=1). The sample can be exported for free. Anyone can also inspect and preview their own PDF text edits without signing in. Payment is requested only when downloading a PDF with Pro changes or password protection. Existing free tools and their downloads remain free. Pro uploads are explicitly initiated and processed in memory, without automatically saving a cloud copy.

**Initial pricing: $1 USD for the first 7 days, then $25 USD/month automatically, or $25 USD/month starting immediately.** The introductory offer is available once per account. Cancel before the introductory week ends to avoid the monthly charge. Pro access requires the introductory payment to be confirmed; a free/unpaid Lemon Squeezy trial does not unlock it.

The main editor’s **Edit Text** button edits supported original text directly on the page, with automatic previews and shared undo/redo. Added text can also be typed on the page. Use **Ctrl/⌘ + mouse wheel** or a trackpad pinch to zoom from 50% to 300%; ordinary scrolling still moves through the page. Original-text changes are combined with page operations, annotations, and forms on export. Payment is requested only when downloading a document containing premium changes.

The main editor uploads each opened PDF once and automatically saves its edit instructions. Refreshing restores the document, annotations, original-text changes, forms, page order, and current page. Guest workspaces use a private browser-session cookie and expire after 24 hours. Guests can manage all their files at `/dashboard` with 100 MB of private storage. Signing in transfers all unexpired guest files that fit into the account, without copying the PDFs or losing edits. Apply [migration 006](supabase/migrations/006_editor_autosave.sql) and [migration 011](supabase/migrations/011_guest_dashboard.sql), including the migrations between them, to enable this flow; existing Supabase environment variables are sufficient. Wait for “All changes saved” before refreshing. See [DASHBOARD.md](docs/DASHBOARD.md) for limits and scheduled guest cleanup. Standalone text/translation/conversion tools keep their separate checkout recovery behavior.

## Super admin and support

Open [localhost:3000/admin](http://localhost:3000/admin). Without credentials it is an explicitly labeled preview with disabled mutations. After Supabase setup and server-side role assignment, it manages real users, courtesy Pro access, subscriptions, pricing, maintenance, announcements, support conversations, and an audit log. Publishing pricing verifies existing Lemon Squeezy variants and saves an immutable application pricing version; existing subscriptions keep their purchased terms.

Guests and signed-in customers can open [localhost:3000/dashboard](http://localhost:3000/dashboard) with private cloud PDFs, billing, profile settings, and support. Apply [migration 004](supabase/migrations/004_cloud_documents.sql) , [migration 005](supabase/migrations/005_cloud_recovery.sql), and [migration 006](supabase/migrations/006_editor_autosave.sql) in Supabase to enable the private file library and checkout recovery. The editor automatically saves private workspaces, and existing browser drafts can be imported. See [docs/DASHBOARD.md](docs/DASHBOARD.md) for setup, limits, and verification.

Open [localhost:3000/support](http://localhost:3000/support) for customer inquiries and replies. Messages are stored in Supabase and replies appear in the app; email notifications are not implemented.

Follow [docs/ADMIN.md](docs/ADMIN.md) to apply migration 003 and provision your first super admin. No default admin password or client-side role switch is provided.

The super admin **Blog posts** workspace at `/admin/blog` includes a rich post editor, cloud autosave, previews, revisions, publishing/scheduling, and Trash. Readers can find published articles at `/blog` and sign in to like them. Apply [migration 009](supabase/migrations/009_blog.sql) after the earlier migrations; see [docs/BLOG.md](docs/BLOG.md) for setup and editorial workflows.

**Purchases are disabled until your accounts, keys, webhook, database migrations, and matching Lemon Squeezy prices are configured.** No live payment has been tested. See [docs/BILLING.md](docs/BILLING.md) for the complete setup and verification workflow.

## Current boundaries

Translation and PDF-to-Word, Excel, and PowerPoint have implemented provider integrations and download recovery. Their service credentials have not been connected here. Unconfigured services keep processing disabled, allow original previews, and are excluded from indexing and the sitemap. See the setup guide for provider limits and connected verification.

OCR, Office-to-PDF, automatic paragraph reflow, certificate signatures, password removal, and secure redaction are not implemented. Cropping and text deletion are **not secure redaction**. Visual signatures do not create digital certificates. Replacement text supports Latin characters with original, standard PDF, or selected Google fonts; unsupported characters generate an actionable error. The source PDF can contain other scripts.

Pro edits supported top-level, unclipped text objects. Scanned, outlined, nested, and certain specially rendered text are skipped. It preserves object placement and uses the selected replacement font; it does not promise original embedded-font matching or automatic layout reflow. Encrypted, digitally signed, and XFA documents are rejected by the Pro engine. Pro files are limited to 10 MB and 100 pages, with 500 Pro download requests per day and 20 per minute per account. Anonymous inspection and image previews have separate instance limits.

Image and PDF batches accept up to 20 files, 50 MB per file, and 150 MB total. The editor supports up to 500 pages. Raster export is limited to 200 pages and 25 million pixels per rendered page. These are guardrails for local memory, not a promise that every device can handle those sizes.

## SEO configuration

See [docs/SEO.md](docs/SEO.md). Set the following at **build time** for the production domain:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-real-domain.com
NEXT_PUBLIC_INDEXABLE=true
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-optional-token
```

Keep indexing disabled on previews and local builds. Changing these values requires rebuilding because public routes and metadata are prerendered. No real production domain has been supplied or connected.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run build
npm run test:e2e
npm run test:auth
npm run test:design
```

See [docs/DESIGN.md](docs/DESIGN.md) for shared interface patterns and the desktop/mobile design checks.

Engine tests validate exported content, forms, page order, crop boundaries, rotations, ranges, ZIP files, actual text replacement/deletion, and password encryption. Billing tests run the SQL migration in PostgreSQL via PGlite and check paid coverage, role restrictions, quotas, and webhook event ordering. Browser tests cover free workflows, user-file preview and download gating, draft recovery, admin preview, support errors, responsive layouts, accessibility, and server-rendered SEO. Server-route tests use real PostgreSQL with mocked Supabase transport to verify role checks, support ownership, account controls, and maintenance recovery. E2E tests run against a production build at port 3000; the unconfigured-billing tests expect no payment/account environment variables. The isolated Google browser suite exercises the real Supabase client with simulated OAuth responses, including PKCE, admin routing, cancellation, expiry, and sign-out. Connected services still require the verification in the setup guide.

The lint configuration permits App Router metadata exports. React's blanket synchronous-effect warning is disabled because the document interfaces synchronize external PDF rendering, browser storage, and responsive measurements; hook-order checks remain enabled.

## Structure

- `src/app/(public)`: marketing, tool landing pages, forms, guides, and privacy information.
- `src/app/(workspace)`: noindex editor, local document library, and super admin dashboard.
- `src/components`: application and document UI.
- `src/lib/pdf-engine.ts`: document mutations and exports, isolated from the UI.
- `src/workers/pdf.worker.ts`: background worker for PDF mutations.
- `src/lib/pdf-viewer.ts`: lazy PDF.js loading and local worker setup.
- `src/lib/storage.ts`: read-only legacy draft access and migration cleanup; temporary tool handoff stays in memory.
- `src/lib/tools.ts`: tool capabilities, page content, and availability.
- `src/lib/seo.ts`: central metadata, canonical origin, and indexing configuration.
- `src/app/api`: account access, Lemon Squeezy billing/webhooks, and protected Pro processing routes.
- `scripts/pdf-text-engine.mjs`: PDFium text-object editing and password encryption.
- `src/lib/server`: verified identity, billing, bounded requests, and child-process execution.
- `supabase/migrations`: billing, admin roles, account controls, pricing versions, support, settings, audit records, and atomic quotas. Apply migrations in number order.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current architecture and proposed scaling work. The application has not been load-tested for one million concurrent users.

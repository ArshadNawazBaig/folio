# Invoice generator

**Free launch:** all available tools and options are currently free; signed-in accounts receive 1 GB and guest workspaces receive 100 MB. The pricing distinctions below describe the retained paid-mode implementation. Apply migrations 016 and 017 before deploying this release; see [FREE-LAUNCH.md](FREE-LAUNCH.md).

Public tool page: `/invoice-generator`. Dedicated editor: `/invoice-editor`. Original guide: `/guides/create-professional-invoice-online`. Dashboard library: `/dashboard?view=invoices`.

The public page introduces the tool and links to the full-screen editor. The editor has its own header, toolbar, independently scrollable editing and preview panels, and a persistent PDF download bar. The File menu groups duplicate, import, draft backup, and saved invoices. Currency, discount, tax, and paper size use the shared Folio dropdowns; currency also supports search. Phones switch between editing and preview. It does not include the public navigation, article, or footer. Saved invoice links use `/invoice-editor?invoice=<id>`; previous `/invoice-generator?invoice=<id>` links redirect there. The editor returns noindex and private cache headers.

## Features and access

Free: Classic and Minimal PDFs with five preset colors, no watermark, logo upload, 24 currencies, 50 items, fractional quantities/rates, row duplication/reordering, tax exemptions, inclusive/exclusive tax, fixed/percentage discounts, shipping, deposits, payment instructions and links, notes, terms, A4/Letter, and JSON draft import/export. Free PDFs are generated in the browser without an account.

Pro: 10 PDF designs — Studio, Editorial, Executive, Ledger, Atelier, Horizon, Blueprint, Meridian, Statement, and Monogram — custom colors, payment QR codes, repeated custom footers, and a private library of 200 invoices. Designs can be previewed before purchase. The free-version export removes premium options from an exported copy while preserving the working draft.

This is an invoice authoring tool. It does not send email, process payments, verify bank details, synchronize payment status, reserve unique invoice numbers, convert exchange rates, or determine tax obligations. It supports one invoice tax rate, not compound taxes or several rates on one invoice.

The shared catalog in `src/lib/invoice-designs.ts` defines each design’s header, page decoration, item table, balance treatment, and heading typography. The gallery thumbnails, HTML preview, PDF renderer, validation, and Pro gating use that catalog. Serif designs embed the heading font in their PDFs; page decorations repeat on continuation pages. Light custom colors retain their decorative color, with readable text colors chosen separately. Existing Classic, Minimal, Studio, and Editorial draft IDs remain supported.

## Enable saved invoices

1. Apply missing prerequisite migrations through `013_short_links.sql`, then apply `015_invoices.sql` in the existing Supabase project. The numeric gap is intentional; this feature does not require migration 014.
2. Keep the existing Supabase variables and billing configuration. No new API provider, credential, container, or service is required for invoices.
3. Deploy the application. Next.js file tracing includes the fonts used by the premium PDF endpoint.
4. Verify free and premium downloads plus Pro save/reopen/update/delete. Confirm another account cannot access a saved invoice.

No production migration or deployment is performed by these code changes or the build.

## Storage and billing

Invoice content is not automatically written to browser storage or the account library. Unsaved work stays in the tab. Downloaded JSON and PDF files remain on the device. In-app links, New, Try a sample, and Import draft use Folio's confirmation modal when a draft has unsaved changes. Keep editing, Escape, and Close preserve the draft. Download draft backup returns to the editor and prepares an editable copy without continuing the pending action. A confirmed exit follows the originally selected link; new-tab links and downloads do not interrupt the draft. Tab closing and reloading retain the browser's required leave warning where supported.

Pro PDF requests send invoice content to the server for in-memory generation without creating records. `/api/invoices/export` authenticates the user and calls the existing `consume_pro_request` entitlement/quota function. Client flags and checkout return URLs cannot grant server export access. The free export function rejects premium options.

Only **Save to account** creates or updates a record containing the full editable document, normalized logo, a small listing summary, timestamps, and a revision. The SQL save function verifies ownership, suspension, account deletion, and current paid/courtesy access under an account lock. An outdated revision returns a conflict. List requests return summaries rather than full logos/documents.

Expired Pro accounts can read/delete existing drafts and download local backups or free-style PDFs. New saves, updates, and premium PDFs require current access. Account deletion cascades to invoices. Records remain until deleted. The 200-invoice limit is separate from PDF file-storage allowances.

## Calculation policy

Money uses scaled integer arithmetic, rounded half up to the currency minor unit. Quantities/rates accept four decimal places. JPY/KRW use zero-decimal amounts; KWD/BHD/OMR use three; other supported currencies use two.

1. Multiply quantity by rate and round each line to minor units.
2. Discount the items subtotal. Allocate the discount proportionally, distributing leftover minor units by largest remainder and then line order.
3. Calculate tax per taxable discounted line. Exclusive mode adds `base × rate / 100`; inclusive mode extracts `base × rate / (100 + rate)` without adding it again.
4. Add shipping separately, optionally using the same tax treatment. Item discounts do not reduce shipping.
5. Subtract manually entered payments. Show overpayment credit instead of a negative balance.

Invalid rates, excessive discounts, missing business/customer names, empty descriptions, zero quantities, and due dates before issue dates prevent finished PDF export. Partial drafts can be backed up or saved. A QR code requires an HTTPS payment link.

## Bounds and PDF output

Requests/drafts are capped at 600 KB. Logos accept PNG/JPG/WebP up to 5 MB and 25 megapixels, normalized locally to a PNG with longest edge at most 512 pixels and a capped data URL. The PDF renderer checks raster dimensions before decoding imported logo bytes. SVG/remote-image URLs are not accepted.

PDFs embed subsetted Liberation fonts and have selectable text, wrapped descriptions, continuation headers, page numbers, and automatic pagination. Unsupported characters produce an error instead of disappearing. The HTML preview is a layout guide; PDF pagination and exact font metrics can differ. Users should check the exported PDF.

Do not capture invoice request/response bodies in hosting or APM logs: they may include customer addresses and bank instructions. Free creation loads website/font assets but does not upload invoice content. Mobile downloads use the shared fresh-gesture save/share panel.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run test:invoice
FOLIO_TEST_OUTPUT=performance npm run build
```

The invoice browser suite uses port 3107 and `.next-auth-tests`; run it sequentially with other suites using that directory. It covers desktop Chromium, Android Chromium, iPhone WebKit, real PDF downloads, draft round-tripping, premium previews/free fallback, account saves/reopening/deletion, accessibility, and the guide. Browser account transport is mocked; the server harness separately runs actual handlers and the SQL migration in PostgreSQL with simulated Supabase transport.

Calculation/PDF tests inspect real PDF text and page bounds, long invoices, rounding, overpayments, tax exemptions, malicious input, and free-tier enforcement. Physical OS share sheets, live billing, and production persistence still require deployment checks.

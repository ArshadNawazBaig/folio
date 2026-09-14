# Vercel deployment

Folio is deployed at **https://folio-pdf-kappa.vercel.app** in the
`arshadnawazbaigs-projects/folio-pdf` Vercel project. This is a testing deployment:
Lemon Squeezy remains in test mode and search indexing is disabled.

## Build and redeploy

The project uses Node.js 22, `npm ci`, and `npm run build`. PDF.js browser assets
are generated during installation/build. `next.config.ts` includes the PDF worker,
PDFium WASM engine, and replacement fonts in the server function bundles.
Functions run in Seoul (`icn1`), alongside this project's Supabase database, to
avoid sending database requests between the US and Asia during interactive editing.

Text previews process changed objects instead of inspecting every page again and
use native lossless PNG encoding. Preparing a selected text box skips replacement
font parsing, and font libraries load only when needed. The editor keeps up to four prepared
backgrounds (8 MB of encoded image data) in the current document's memory so repeat
selections can work without another request. The preview endpoint's `Server-Timing`
header separates settings lookup, upload parsing, and PDF processing durations.
Autosave reuses the canonical form of immutable source inspection data, instead
of sorting every extracted text block on each keystroke. Editable state and
freshly recovered snapshots are still compared in full when confirming a save.
The editor prepares text on the visible source page as the PDF opens. Inspected
page IDs are saved with the workspace, including pages without editable text;
older snapshots without that field remain full-document inspections. Visiting a
new page prepares that page only. Off-screen thumbnails render when scrolled into
view, and preparing text never disables the rest of the toolbar.

Clicking a text block prepares its clean background in a dedicated browser worker
using the same PDFium implementation as server previews. The engine starts loading
when a supported PDF opens; its source bytes are transferred once, and selections
send only their preview settings. The worker returns lossless PNG pixels and rejects
PDF export operations. It is terminated when the document closes or changes, with
no persistent browser file storage. Server previews take over if browser rendering
is unavailable, fails, or has not completed after 350 ms. Authenticated downloads
continue through the existing server export flow. `npm run assets` also prepares
the publicly served PDFium WASM file required by the browser worker.

From this linked workspace, deploy the current files with:

```sh
npx vercel deploy --prod --scope arshadnawazbaigs-projects
```

The `--prod` flag updates the stable Vercel URL; it does not turn on live payments
or search indexing. The project is also connected to `ArshadNawazBaig/folio` on
GitHub. Commit and push changes when using Git-based deployments.

`.vercelignore` excludes local environment files, test output, build caches, and
dependencies from source uploads. `.vercel` and `.env.local` are ignored by Git.
The CLI can create `.env.local` with a Vercel OIDC token; do not commit it.

## Connected services

- Supabase public configuration and server credentials are configured in Vercel.
  Server secrets do not use the `NEXT_PUBLIC_` prefix.
- Supabase's Site URL is the stable URL above. Its redirect allowlist includes
  `https://folio-pdf-kappa.vercel.app/auth/callback**` for the application's callback
  query parameters. The existing localhost redirect remains available.
- The Lemon Squeezy **test** webhook now points to
  `https://folio-pdf-kappa.vercel.app/api/billing/webhook`.
- `NEXT_PUBLIC_SITE_URL` uses the stable URL and `NEXT_PUBLIC_INDEXABLE=false`.
  Translation and Office conversions remain disabled until their separate
  provider credentials and `DOCUMENT_RESULT_KEY` are configured.

Changes to build-time public environment variables require a redeployment. For a
custom domain, update the site URL, Supabase callback allowlist, and billing webhook
before verifying the sign-in and checkout journeys on that domain.

## Current hosting limits

Vercel Functions have a [4.5 MB request/response payload limit](https://vercel.com/docs/functions/limitations).
PDF uploads to the private file library go directly to Supabase Storage, so they
do not pass through that function limit. However, original-text processing,
password protection, large preview responses, and editor snapshots still pass
through API routes. Requests or responses exceeding Vercel's limit can fail even
when they fit the application's larger limits. Supporting those cases requires
storage references/direct result downloads or a separate PDF processing service;
raising `maxDuration` or a Next.js body limit does not resolve this restriction.

The deployment does not schedule `scripts/cleanup-guest-workspaces.mjs` or add
distributed processing limits. Configure those operations before a public launch.
See [SETUP.md](SETUP.md) for the remaining launch checks.

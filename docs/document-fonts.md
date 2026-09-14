# Document fonts

The editor offers 1,817 Google Font families with Latin support, plus the existing PDF fonts and the original embedded font. The remaining families in the installed Next.js catalog do not advertise Latin support and are excluded while replacement text is limited to Latin. Adding a family does not add complex-script shaping or OCR.

`next/font/google` continues to serve the application interface fonts. Document fonts use a separate on-demand service, so builds do not download the full catalog. No API key or new environment variable is required.

## Loading and export

- The custom picker searches paginated metadata (24 families at a time), with popular fonts first. Weight and italic choices reflect the selected family's available styles. Hovering or navigating to a family loads one debounced preview. Selecting a font waits for it to load before changing the document.
- `/api/fonts` serves catalog metadata. `/api/fonts/file` serves the selected static TrueType face. Only known family, weight, and style combinations are accepted. Requests to Google contain font metadata; document text is never sent to the font provider.
- The browser and both PDF engines use the same TrueType instance. Original-text export uses PDFium; added text/signatures use PDF-lib with fontkit subsetting. Font references are persisted in workspace snapshots and restored after refresh.
- Missing glyphs produce an error instead of silently exporting boxes. Existing original-font preservation and missing-character matching remain in place. Unsupported font files or unavailable downloads leave the current font selected.

## Caching and deployment

Successful font responses support public HTTP caching. Private account/document API responses keep their existing cache policy. The server caches font binaries in the OS temporary directory (`folio-document-fonts-v1`), with a 128 MB disk target, 32 MB memory limit, an 8 MB per-face limit, and a seven-day lifetime. Each process limits concurrent downloads to four. The browser limits font requests to two at once and evicts unused preview faces after 64 entries; active document fonts stay loaded.

The deployment needs writable temporary storage and outbound access to `fonts.googleapis.com` and `fonts.gstatic.com`. The binary download path only accepts the provider's static TTF URLs, rejects redirects, and bounds response size and duration. Font-load failures can be retried. A CDN can cache successful font responses across instances; the temporary cache is local to each instance. At large scale, move the binary cache to shared object storage/CDN rather than enlarging per-instance caches.

Google may revise a font upstream after cached copies expire. Exported PDFs embed their font data; editable workspaces store family/style references. Version-pinned font assets would be needed for archival guarantees that a reopened workspace always uses the identical historical font revision.

## Catalog updates and checks

Run `node scripts/update-font-catalog.mjs` after deliberately upgrading Next.js to regenerate metadata, then format `src/lib/document-font-catalog.json`. This reads the installed Next.js catalog and does not download fonts. Review new families and available styles before deploying.

`tests/document-fonts.test.ts` exercises validation, persistence, PDFium edits, and PDF-lib embedding with real Lora, Roboto, and Pacifico faces. Those integration checks need provider access on an empty cache. `tests/document-fonts.spec.ts` covers lazy loading, keyboard search, error recovery, desktop/mobile sizing, refresh, and downloaded output using synthetic PDFs and mock workspace storage.

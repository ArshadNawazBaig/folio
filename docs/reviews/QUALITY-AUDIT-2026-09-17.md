# Tool quality audit — 17 September 2026

Scope: all 29 advertised Folio tool routes, their shared processing engines, and the account, storage, billing, editor recovery and responsive UI paths they depend on. Passing these checks does not establish that every possible PDF or every browser is supported.

## Fixes

- Preserve Wi-Fi/password validation errors instead of turning every password-related message into a locked-PDF warning.
- Give shared dropdown triggers an explicit accessible name, including the directory page-size selector before hydration completes.
- Keep inspected text geometry usable when optional PDF.js font/text extraction fails. The matching-font fallback can still prepare an editable text box; it no longer reports a false geometry/preview failure.
- Expose the watermark color setting and invalidate old output whenever it changes.
- Reject empty/multiline watermarks, nonpositive sizes, invalid opacity/colors and invalid page-number starts instead of silently substituting defaults.
- Stop canceled image exports from publishing a result after asynchronous packaging finishes. Each operation retains its own abort signal.
- Cancel file inspection/image preparation, reject empty files, disable the shared upload input while busy, and expose cancellation during initial file preparation.
- Avoid adding unused Helvetica font resources during crop, rotation and lossless compression.
- Return a specific processing-settings error for malformed multipart job JSON.
- Update older tests for the current premium-download explanation, sign-in flow and leave-editor confirmation. Support failure tests now inject a deterministic service failure rather than depending on missing credentials.

## Coverage

| Tools                                              | Output and behavior checked                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit PDF, PDF text editor, Organize PDF            | Original and added text, subset/matching fonts, painted/clipped/grouped text, colors, copy/paste, movement, zoom, undo, page operations, export permissions, saved edits and refresh recovery. Includes the supplied resume reproduction without adding it to the repository. |
| Fill & sign, Create a PDF form                     | Drawn, typed and image signatures; font loading; form field values, dropdowns, read-only fields, editable/flattened exports and duplicate-name validation.                                                                                                                    |
| Protect PDF                                        | Actual encrypted output in engine tests, password validation, and authenticated download enforcement.                                                                                                                                                                         |
| Merge PDF, Split PDF                               | Exported page counts, ordering, selected ranges, separate-page ZIP files and invalid input recovery.                                                                                                                                                                          |
| Rotate PDF, Crop PDF, Page numbers, Watermark PDF  | Output rotation/crop bounds, selected-page numbering, text content, watermark color, invalid settings and result invalidation.                                                                                                                                                |
| Compress PDF                                       | Structural/lossless optimization, original fallback when no reduction is achieved, and no unused font injection. This does not downsample scanned images.                                                                                                                     |
| PDF to JPG, PDF to PNG                             | Actual image bytes, dimensions, page order, ZIP contents, 300-DPI metadata, previews and cancellation during final packaging.                                                                                                                                                 |
| PDF to text                                        | Page order and readable text export; no-text pages explain the OCR requirement and cannot produce an empty download.                                                                                                                                                          |
| Image to PDF, JPG to PDF, PNG to PDF, Merge Images | Shared PDF output engine, ordered pages, fit-to-image sizes, WEBP input, JPEG orientation and output previews.                                                                                                                                                                |
| JPG to WEBP, WEBP to JPG                           | Export magic bytes, dimensions, orientation, transparency-to-white JPEG output, invalid images and retry.                                                                                                                                                                     |
| Compress Images, Enhance Image                     | Output size/original fallback, dimensions, actual pixel changes, batch pagination, duplicate filenames and stale-result clearing. Enhancement is tonal adjustment/sharpening, not super-resolution.                                                                           |
| Create QR Code                                     | Independent QR decoding, URL/Wi-Fi content, escaped network names, contrast validation, missing-password recovery, PNG/SVG output and mobile accessibility.                                                                                                                   |
| Translate PDF, PDF to Word/Excel/PowerPoint        | Disconnected-service behavior, document previews, download gating, provider-adapter/error/ownership tests using mocked transport. Actual provider output is **not verified**.                                                                                                 |

Storage/account tests use local Supabase and OAuth fixtures, and billing tests use provider fixtures. The PDF/image processing engines run for real. These tests do not prove live Google OAuth configuration, a real paid checkout, external provider conversion fidelity or production load capacity.

## Repeatable checks

```sh
npm test
npm run test:tools
npm run test:auth
npm run test:design
npm run test:blog
npm run lint
npm run typecheck
npm run build
```

Run the browser suites sequentially: they share isolated port 3001 and `.next-auth-tests`. `test:tools` uses local service fixtures, leaving the normal dev server/build output alone. `FOLIO_REPRO_PDF` optionally points to the private resume used by the reproduction test; do not commit that PDF. Do not build into `.next-auth-tests` while its test server is running.

## Remaining release limits

1. The production capabilities endpoint reports translation and the three Office conversions as unavailable. Configure CloudConvert (or the supported ConvertAPI alternative), Google Cloud document translation and `DOCUMENT_RESULT_KEY`, then test real outputs. See [processing services](../PROCESSING-SERVICES.md).
2. Large server-processed exports, preview fallbacks and workspace snapshots still require transport changes. Vercel documents a [4.5 MB request/response payload limit](https://vercel.com/docs/functions/limitations#request-body-size), smaller than some application limits. Source-library uploads already go directly to private storage; this does not solve every processing/snapshot request. See [hosting limits](../VERCEL.md#current-hosting-limits).
3. Production guest cleanup scheduling and distributed processing/rate limits are not established by this audit. Live OAuth, paid checkout/webhooks, cross-browser testing and concurrent-load tests remain release checks.
4. The competitor's complete 37-tool catalogue is not implemented. OCR/transcription/media and additional document-format tools must not be represented as working features. See [coverage review](TOOL-COVERAGE.md).
5. The new custom domain still needs DNS/HTTPS cutover checks. This audit uses the existing Vercel production domain; see [custom-domain setup](../CUSTOM-DOMAIN.md).

## Results

- Unit suite after fixes: 100 passed.
- Account and guest browser suite: 36 passed.
- Main tool browser suite: 116 passed, including the private resume reproduction.
- Final native-tool run: 14 passed, including two additional text-export/request-validation cases. Twelve of these repeat cases from the main run after the final styling changes.
- Design suite: all four cases passed (three in the initial run, one after updating its obsolete sign-in entry point). All tool pages were checked at desktop and mobile widths.
- Public blog suite: three passed.
- Total: 161 distinct Chromium browser checks passed; this is not Safari/Firefox certification or a load test.
- All 29 live tool landing pages returned HTTP 200 with one H1. The public billing endpoint reported the $1 USD trial and $25 USD monthly plans as ready; no purchase was made.
- Lint, TypeScript, whitespace checks and the production build passed.
- Deployed to production as `dpl_7FEoiwgz38byZsh3s5oZYF45KCXV` (`https://folio-btbwd8h5y-arshadnawazbaigs-projects.vercel.app`). Verified through `https://folio-pdf-kappa.vercel.app`.
- Live checks passed: directory accessibility, Wi-Fi validation and independent QR decoding, server PDF text inspection, watermark validation/color in the downloaded PDF, mobile watermark layout, and PNG dimensions/print resolution.
- A fresh synthetic guest PDF uploaded to real private storage, retained original-text edits and added text after save/refresh, and remained editable. Cleanup returned HTTP 200. No existing customer document was changed and no payment was made.
- The live text activation measurement was 82 ms on that small synthetic PDF. This is one smoke measurement, not a general latency benchmark. The first live smoke run hit its default five-second initial-preview timeout; the subsequent run used the same 30-second browser allowance as other live actions and passed. Cold-load performance on large files and slow connections remains unmeasured.
- The final live capabilities check still reported all four external conversion/translation tools unavailable. No uncaught browser errors occurred in the completed smoke flow.

# Tool coverage and quality review

Reviewed 2026-09-15. Source: [TheBestPDF tool directory](https://thebestpdf.com/).

## Method and limits

Opened all 37 tool pages linked from the supplied directory in Chromium, recording visible descriptions, file input types and stated limits. Also attempted synthetic PDF uploads in merge, split, Word and OCR workflows and inspected the QR entry. No customer documents were sent, no account was created, and no purchase was made. These observations verify public flows and advertised capabilities, not paid output quality. No claim that Folio produces better results is justified until matched files are exported and measured through both products.

## Coverage before this change

| Competitor tool                                             | Public stated limit                                          | Folio baseline                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| [Edit PDF](https://thebestpdf.com/edit-pdf)                 | Size up to 100 MB                                            | Available: inline text, annotations, forms and page tools   |
| [PDF to Word](https://thebestpdf.com/pdf-to-word)           | Size up to 100 MB                                            | ConvertAPI adapter; credentials missing                     |
| [PDF to PNG](https://thebestpdf.com/pdf-to-png)             | Size up to 100 MB                                            | Available; add true result preview and single-image output  |
| [PDF to RTF](https://thebestpdf.com/pdf-to-rtf)             | Size up to 100 MB                                            | Missing                                                     |
| [PDF to JPG](https://thebestpdf.com/pdf-to-jpg)             | Size up to 100 MB                                            | Available; add true result preview and 300 DPI              |
| [JPG to WEBP](https://thebestpdf.com/jpg-to-webp)           | Size up to 100 MB                                            | Missing                                                     |
| [WEBP to JPG](https://thebestpdf.com/webp-to-jpg)           | Size up to 100 MB                                            | Missing                                                     |
| [PDF to EPUB](https://thebestpdf.com/pdf-to-epub)           | Size up to 100 MB                                            | Missing                                                     |
| [PDF to Excel](https://thebestpdf.com/pdf-to-excel)         | Size up to 100 MB                                            | ConvertAPI adapter; credentials missing                     |
| [Merge PDF](https://thebestpdf.com/merge-pdf)               | Size up to 100 MB                                            | Available; improve file order and result preview            |
| [Merge Images](https://thebestpdf.com/merge-images)         | Size up to 100 MB                                            | Image to PDF exists; add a dedicated entry and thumbnails   |
| [Split PDF](https://thebestpdf.com/split-pdf)               | Size up to 100 MB                                            | Available; improve output verification                      |
| [Compress PDF](https://thebestpdf.com/compress-pdf)         | Size up to 350 MB                                            | Structural optimization only; no image downsampling         |
| [Compress Images](https://thebestpdf.com/compress-images)   | Size up to 350 MB                                            | Missing                                                     |
| [PDF to PPTX](https://thebestpdf.com/pdf-to-pptx)           | Size up to 100 MB                                            | Existing PDF to PowerPoint route; credentials missing       |
| [Word to PDF](https://thebestpdf.com/word-to-pdf)           | Size up to 100 MB                                            | Missing                                                     |
| [RTF to PDF](https://thebestpdf.com/rtf-to-pdf)             | Size up to 100 MB                                            | Missing                                                     |
| [PNG to PDF](https://thebestpdf.com/png-to-pdf)             | Size up to 100 MB                                            | Image to PDF exists; add dedicated entry                    |
| [JPG to PDF](https://thebestpdf.com/jpg-to-pdf)             | Size up to 100 MB                                            | Image to PDF exists; add dedicated entry                    |
| [EPUB to PDF](https://thebestpdf.com/epub-to-pdf)           | Size up to 100 MB                                            | Missing                                                     |
| [Excel to PDF](https://thebestpdf.com/excel-to-pdf)         | Size up to 100 MB                                            | Missing                                                     |
| [PPTX to PDF](https://thebestpdf.com/pptx-to-pdf)           | Size up to 100 MB                                            | Missing                                                     |
| [Image to PDF](https://thebestpdf.com/image-to-pdf)         | Size up to 100 MB                                            | Available; improve thumbnails and WEBP input                |
| [Sign PDF](https://thebestpdf.com/sign-pdf)                 | Size up to 100 MB                                            | Available: draw, image, type; no certificate signing        |
| [Crop PDF](https://thebestpdf.com/crop-pdf)                 | Size up to 100 MB                                            | Available: uniform margin; needs independent edge controls  |
| [PDF OCR](https://thebestpdf.com/ocr-pdf)                   | Size up to 100 MB                                            | Missing                                                     |
| [Scan to PDF](https://thebestpdf.com/scan-to-pdf)           | Size up to 100 MB                                            | Missing searchable OCR output                               |
| [Image to Text](https://thebestpdf.com/image-to-text)       | Size up to 100 MB                                            | Missing                                                     |
| [Translate PDF](https://thebestpdf.com/translate-pdf)       | Size up to 100 MB                                            | Google document translation adapter; credentials missing    |
| [Remove Watermark](https://thebestpdf.com/remove-watermark) | Size up to 50 MB. Supported formats: JPG, PNG, BMP, and PDF. | No image inpainting; original text can be deleted in editor |
| [Convert to Video](https://thebestpdf.com/video-converter)  | Size up to 1000 MB                                           | Missing                                                     |
| [Transcribe Audio](https://thebestpdf.com/transcribe-audio) | Size up to 1000MB                                            | Missing                                                     |
| [Convert to Audio](https://thebestpdf.com/audio-converter)  | Size up to 1000 MB                                           | Missing                                                     |
| [Transcribe Video](https://thebestpdf.com/transcribe-video) | Size up to 1000MB                                            | Missing                                                     |
| [Enhance Image](https://thebestpdf.com/enhance-image)       | Size up to 7 MB.                                             | Missing                                                     |
| [Unlock PDF](https://thebestpdf.com/unlock-pdf)             | Size up to 100 MB                                            | Missing                                                     |
| [Create QR Code](https://thebestpdf.com/create-qr-code)     | Not shown                                                    | Missing                                                     |

## Implemented in this change

- Added JPG-to-WEBP, WEBP-to-JPG, batch image compression, brightness/contrast/saturation/sharpness adjustments, and static URL/text/Wi-Fi QR codes.
- Added dedicated JPG-to-PDF, PNG-to-PDF and merge-images routes. Added WEBP input and JPEG rotation handling for image-to-PDF.
- Added original/result previews of actual generated PDFs and images, batch file pagination/order controls, immediate invalid-range feedback, 300 DPI PDF image export and individual image downloads for single-page exports.
- Added a CloudConvert adapter for existing PDF-to-Word, Excel and PowerPoint routes, with bounded responses, restricted output URLs, cancellation/error handling and provider-job cleanup. Existing ConvertAPI configuration remains supported.
- Added [service setup instructions](../PROCESSING-SERVICES.md). Credentials remain absent, so provider-backed tools stay unavailable.

This closes native-tool gaps without claiming full parity: Office/RTF/EPUB reverse conversions, standalone OCR, scan-to-searchable-PDF, image-to-text, audio/video conversion/transcription, unlock PDF, inpainting and super-resolution remain outstanding. Crop currently uses uniform margins and PDF compression remains structural/lossless. Native image workspaces hold the current batch in memory; generalized cloud persistence for non-PDF files is not implemented.

Validation: the existing 84 unit tests passed, with two additional print-resolution/orientation tests passing afterwards. Sixteen distinct browser checks passed across new native workflows and affected existing routes, including exported formats, dimensions, 300 DPI metadata, page order, independent QR decoding, mobile width/accessibility, SEO HTML, invalid inputs and translation download gating. Lint, TypeScript and the production build passed. CloudConvert tests mock its API, so real service authentication and conversion fidelity remain unverified.

Production deployment: [Folio](https://folio-pdf-kappa.vercel.app), deployment `dpl_HqssZ4X28gLZHe2ti6zHghN6RZ2C`. Live smoke checks verified WEBP download dimensions, independent QR decoding, 300 DPI PNG dimensions and print metadata, mobile width, and no uncaught page errors in those flows. Provider processing remains unverified without credentials.

## Implementation priorities

1. Shared preview of the actual output, reversible settings, accessible custom controls, clear progress, source/output dimensions and sizes, cancellation, and responsive layout.
2. Native image conversion, image compression, image adjustments and QR generation; dedicated image-to-PDF routes. Avoid server round trips where processing is already supported in the browser.
3. CloudConvert for Office/RTF/EPUB, OCR and media conversion; Google Cloud document translation; AssemblyAI transcripts. Connect credentials before enabling paid processing.
4. Durable private source/result storage and asynchronous jobs for large files. Quotas must count sources, outputs and temporary jobs. Vercel request/response body limits mean large files must use direct private uploads and signed downloads, not oversized multipart requests.
5. Image watermark removal and super-resolution need a separately evaluated inpainting/upscaling engine. Tonal adjustments and sharpening must not be advertised as AI reconstruction.

## Release acceptance criteria

- PDF editing: preserve color/font where available; removing text must remove its visible ink; clipboard, move, undo, save, refresh, and guest-to-account recovery work.
- Merge/split/crop: inspect exported page count, order, bounds and selectable text; preserve images and vectors.
- Compression: compare original/output sizes; offer original when recompression is larger; disclose lossy presets.
- Images: verify magic bytes, dimensions, orientation, alpha-to-JPEG background, quality setting and ZIP contents.
- Office/EPUB: test paragraph order, tables, links, fonts, RTL, page breaks and images in the destination reader; never use a page screenshot as an editable-document substitute.
- OCR: compare text to a known transcript on clean/noisy/rotated scans, confirm searchable text alignment, preserve original page appearance.
- Translation: verify every page, RTL shaping, overflow, scanned/native behavior and terminology; retain original side by side.
- Audio/video: verify codecs, duration, sync, channels, resolution and playback on target devices; no invented progress percentages.
- Transcripts: evaluate word error rate, timestamps and speaker labels; allow corrections before TXT/SRT/VTT download.
- QR: decode exported codes with an independent decoder; preserve quiet zone and sufficient contrast; verify URL/text/Wi-Fi payloads.
- Each new workflow: keyboard/mobile accessibility, cancellation, malformed input, provider failures, isolation between users, quota enforcement and refresh recovery.

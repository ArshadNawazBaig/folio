# Tool access policy

Editing, configuration, and previews are available before purchase. Ask for a plan only when someone downloads a premium result. Do not add premium badges, locked controls, or upgrade prompts to tool discovery or editing. Show the applicable feature and full renewal terms in the download dialog; keep the document open through sign-in and checkout.

## Current catalogue

| Downloads              | Tools and operations                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Free                   | Add text, annotations, highlights, shapes, images, and visual signatures; fill and create PDF forms                 |
| Free                   | Merge, split, compress, rotate, crop, organize, duplicate, and delete PDF pages; add watermarks and page numbers    |
| Free                   | PDF to JPG/PNG; selectable PDF text to TXT; JPG/PNG/WEBP images to PDF; merge images into a PDF                     |
| Free                   | JPG to WEBP, WEBP to JPG, image compression, basic brightness/contrast/saturation/sharpening, static QR codes       |
| Premium                | Replace, delete, move, duplicate, or find and replace original PDF text; change its font, size, or color            |
| Premium                | Password-protected PDF downloads                                                                                    |
| Premium when connected | PDF to Word/Excel/PowerPoint and PDF translation. These workspaces exist, but processing needs service credentials. |

The editor is mixed: adding annotations or opening Edit Text alone does not require a plan. Only actual original-text changes in the finished document trigger paid export, regardless of the tool used to enter the workspace. Undoing all those changes restores free export. Added text boxes remain free to edit, move, and duplicate. Free outputs receive no Folio watermark.

The current tool catalogue gets its classification from [tool-access.ts](../src/lib/tool-access.ts). Unknown tool slugs must receive an explicit policy before joining it. The pricing page lists only currently enabled premium tools; it identifies disconnected services separately instead of promising them with a subscription.

## Policy for planned tools

These decisions do **not** mean the features are implemented or available for purchase today.

| Planned tool                                                                           | Download access                                       |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Word, Excel, PowerPoint, RTF, and EPUB to PDF                                          | Premium                                               |
| PDF to RTF and EPUB                                                                    | Premium                                               |
| PDF OCR, image to text, searchable scan to PDF                                         | Premium                                               |
| Audio/video format conversion and audio/video transcription                            | Premium                                               |
| AI image enhancement/super-resolution and watermark removal using image reconstruction | Premium                                               |
| Unlock PDF with a known opening password                                               | Free                                                  |
| Camera scan or image capture into an image-only PDF                                    | Free; adding a searchable text layer uses premium OCR |

Ordinary photo adjustments stay free even when advanced enhancement is added. Removing an annotation created in the current editor stays free. Extracting selectable PDF text is free; recognizing text from pixels uses premium OCR. Existing free converters stay free when advanced converters are introduced.

## Billing and enforcement

- Keep the existing offers: $1 USD for seven days, then $25/month, or $25/month immediately. Admin pricing customization continues to apply; the tool policy does not change offer amounts.
- Free accounts and guests have 100 MB private storage. Guest files expire after 24 hours. Paid introductory access has 1 GB, and paid monthly access has unlimited total storage. Existing per-file and processing limits still apply.
- `/api/pro/pdf` verifies the signed-in user's paid entitlement before returning original-text or protected PDF exports. `/api/documents/export` does the same for authenticated, encrypted conversion/translation results. UI flags, file names, and checkout return URLs cannot grant access.
- Preview endpoints do not require a subscription. Processing limits and capacity controls are independent of billing; access to previews is not a promise of unlimited service usage.
- This policy changes no existing subscription or storage entitlement. Follow [BILLING.md](BILLING.md) for billing setup and [PROCESSING-SERVICES.md](PROCESSING-SERVICES.md) for service connections.

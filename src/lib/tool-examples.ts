export type ToolExample = {
  // Actual date this example was significantly revised, not the build/request date.
  updated: string;
  title: string;
  scenario: string;
  settings: [string, string][];
  check: string;
  note: string;
  samples?: { label: string; href: string }[];
};

const packet = { label: 'Six-page practice PDF', href: '/samples/page-selection-practice.pdf' };
const portrait = { label: 'A4 portrait practice PDF', href: '/samples/a4-portrait-practice.pdf' };
const landscape = {
  label: 'Letter landscape practice PDF',
  href: '/samples/letter-landscape-practice.pdf',
};
const image = { label: 'Practice receipt JPG', href: '/samples/practice-receipt.jpg' };
const screenshot = { label: 'Practice screenshot PNG', href: '/samples/practice-screenshot.png' };
const webp = { label: 'Transparent practice WebP', href: '/samples/practice-transparent.webp' };

// Original examples checked against the controls and export behavior in this repository.
// English editorial content stays on English pages until reviewed translations are supplied.
export const toolExamples: Record<string, ToolExample> = {
  'edit-pdf': {
    updated: '2026-10-05',
    title: 'Add a note to a PDF without changing the original wording',
    scenario:
      'You have a project packet and want to add a review note beside its budget. Use an annotation when the existing words should stay intact.',
    settings: [
      ['Tool', 'Add text'],
      ['Example note', 'Please confirm the material quantities.'],
      ['Placement', 'An empty area beside the budget, clear of existing text'],
    ],
    check:
      'Download the PDF and open it again. Confirm that the note is readable and does not cover the budget. Use PDF text editor when you need to replace the original words.',
    note: 'The editor saves your document privately in cloud storage, including guest workspaces. An annotation placed over sensitive text is not secure redaction.',
    samples: [packet],
  },
  'edit-pdf-text': {
    updated: '2026-10-05',
    title: 'Change existing PDF text and check the downloaded result',
    scenario:
      'A proposal contains a typo in an existing text block. Try the built-in sample before opening your own document, then select the original text you want to replace.',
    settings: [
      ['Example replacement', 'Change “A place to” to “A space to” in the built-in sample'],
      ['Font', 'Keep the original font first; choose a supported replacement if necessary'],
      ['Review', 'Update PDF preview before downloading'],
    ],
    check:
      'Open the exported PDF, search for the new wording and inspect its spacing. A short replacement is easier to fit than a much longer sentence.',
    note: 'Paragraphs do not automatically reflow. Scanned words and outlined lettering need other processing; this tool does not perform OCR.',
  },
  'merge-pdf': {
    updated: '2026-10-05',
    title: 'Merge portrait and landscape PDFs while keeping their page sizes',
    scenario:
      'Combine an A4 report and a landscape appendix into one document. The two practice files let you check the page-size behavior before using your own PDFs.',
    settings: [
      ['File order', 'A4 portrait first, Letter landscape second'],
      ['Operation', 'Merge PDFs'],
      ['Output', 'One PDF retaining the source page dimensions'],
    ],
    check:
      'Open the result and verify that the portrait page comes first and the landscape page follows without being stretched to A4.',
    note: 'Keep original copies of signed documents and interactive forms. Copying pages can change form behavior or invalidate existing digital signatures.',
    samples: [portrait, landscape],
  },
  'split-pdf': {
    updated: '2026-10-05',
    title: 'Extract nonconsecutive PDF pages in a custom order',
    scenario:
      'Send the appendix first, followed by the summary and budget, without sharing the whole six-page practice packet.',
    settings: [
      ['Pages', '6, 2-3'],
      ['Output', 'Selected pages in one PDF'],
      ['Expected order', 'Source page 6, then source pages 2 and 3'],
    ],
    check:
      'The exported file should contain three pages in that order. Page selection uses file positions, not the numbers printed inside the document.',
    note: 'Choose the separate-pages ZIP option when you need one file per page. Extracting pages is different from splitting one scanned spread into left and right halves.',
    samples: [packet],
  },
  'compress-pdf': {
    updated: '2026-10-05',
    title: 'Check whether lossless PDF optimization makes your file smaller',
    scenario:
      'You want to reduce document overhead while keeping selectable text and the original image resolution. Compare the reported sizes before keeping the result.',
    settings: [
      ['Input', 'One existing PDF'],
      ['Operation', 'Optimize PDF'],
      ['Decision', 'Use the optimized copy only when it is smaller'],
    ],
    check:
      'Reopen the download and inspect several pages. The amount saved depends on how the original PDF was written; some files have little removable overhead.',
    note: 'This tool does not downsample embedded images or guarantee 100 KB, 200 KB, or 1 MB output. For a PDF made from photos, compress those images first and then create the PDF.',
    samples: [packet],
  },
  'organize-pdf': {
    updated: '2026-10-05',
    title: 'Reorder PDF pages and remove an unwanted attachment',
    scenario:
      'In the practice packet, move the appendix ahead of the receipts and remove one receipt you do not want to share.',
    settings: [
      ['Workspace', 'Page organizer in the PDF editor'],
      ['Starting point', 'Six-page practice packet'],
      ['Review', 'Check the page thumbnails after moving or deleting pages'],
    ],
    check:
      'Download and reopen the reorganized PDF. Confirm the final page count and that the appendix and receipts appear in the intended order.',
    note: 'The editor uses private cloud saving. Deleting a page changes the exported document; keep your original when you might need that page later.',
    samples: [packet],
  },
  'rotate-pdf': {
    updated: '2026-10-05',
    title: 'Rotate one sideways PDF page and save the correction',
    scenario:
      'The second page of the rotation practice file opens sideways. Correct that page without turning the surrounding pages.',
    settings: [
      ['Pages', '2'],
      ['Rotate clockwise', '90°'],
      ['Other pages', 'Leave unselected'],
    ],
    check:
      'Reopen the downloaded PDF in another viewer. All three pages should now be upright; the change is saved in the file rather than only in the current preview.',
    note: 'This tool rotates by 90°, 180°, or 270°. It does not straighten a slightly tilted scan by an arbitrary angle.',
    samples: [{ label: 'PDF with one sideways page', href: '/samples/rotation-practice.pdf' }],
  },
  'crop-pdf': {
    updated: '2026-10-05',
    title: 'Trim equal margins from selected PDF pages',
    scenario:
      'A page has extra blank space around its edges. Start with a modest crop and check that headers and footers remain visible.',
    settings: [
      ['Pages', 'Choose the pages that need trimming'],
      ['Trim each edge', '20 points'],
      ['Measurement', '72 points equals 1 inch'],
    ],
    check:
      'Review all four edges of the downloaded pages. Each selected page loses 40 points from its visible width and height because both opposite edges are trimmed.',
    note: 'The same margin is applied to every edge. Cropping changes the visible boundary; hidden content can remain in the PDF and must not be treated as redacted.',
    samples: [portrait],
  },
  'watermark-pdf': {
    updated: '2026-10-05',
    title: 'Add a DRAFT watermark to selected PDF pages',
    scenario:
      'Mark a review copy of a report while leaving its cover unchanged. Use a light text watermark so the document remains readable.',
    settings: [
      ['Pages', '2-6 in the practice packet'],
      ['Watermark text', 'DRAFT'],
      ['Size and opacity', '48 points and 18% — subtle'],
    ],
    check:
      'Inspect a paragraph, a heading and the budget page after download. Reduce the text size if it is wider than the page.',
    note: 'This tool adds a centered text watermark. It does not remove an existing watermark, embed a logo watermark, or prevent someone from copying the document.',
    samples: [packet],
  },
  'page-numbers': {
    updated: '2026-10-05',
    title: 'Add PDF page numbers starting after the cover',
    scenario:
      'The six-page numbering practice file has an unnumbered cover. Number its five content pages starting at 1.',
    settings: [
      ['Pages', '2-6'],
      ['Start numbering at', '1'],
      ['Result', 'Cover unchanged; following pages numbered 1 through 5'],
    ],
    check:
      'Open the download and inspect the centered footer. File position 2 should show 1, and file position 6 should show 5.',
    note: 'Numbers are added to the page content. Existing printed numbers are not removed, and this is not a tool for changing PDF navigation labels or adding Bates prefixes.',
    samples: [{ label: 'Unnumbered PDF with a cover', href: '/samples/numbering-practice.pdf' }],
  },
  'protect-pdf': {
    updated: '2026-10-05',
    title: 'Require an opening password for a PDF copy',
    scenario:
      'Create a password-protected version of an unsigned document while keeping the original in a separate location.',
    settings: [
      ['Input', 'An unencrypted, unsigned PDF'],
      ['Password', 'Enter and confirm a password you can keep securely'],
      ['Action', 'Protect & download'],
    ],
    check:
      'Close the preview and reopen the downloaded copy. Confirm that it asks for the password and that the pages are readable after opening.',
    note: 'Folio cannot recover a forgotten password. Protection controls opening the file; it does not prevent a person with the password from accessing its contents.',
    samples: [portrait],
  },
  'pdf-to-jpg': {
    updated: '2026-10-05',
    title: 'Convert selected PDF pages to JPG for a presentation',
    scenario:
      'You need pictures of two report pages rather than the complete PDF. Choose the pages and compare the exported images at their actual dimensions.',
    settings: [
      ['Pages', '2-3 in the practice packet'],
      ['Resolution', 'High — 144 DPI'],
      ['JPG quality', 'Balanced — 90%'],
    ],
    check:
      'Download and open the ZIP. It should contain two JPG page images. Check small text before placing them in your presentation.',
    note: 'This renders complete pages. It does not extract the original embedded photos. Use PDF to PNG for lossless image encoding around text and diagrams.',
    samples: [packet],
  },
  'pdf-to-png': {
    updated: '2026-10-05',
    title: 'Export a PDF page as a PNG at 300 DPI',
    scenario:
      'Create an image of a PDF page for a document or design workflow that needs fine text edges.',
    settings: [
      ['Pages', '1'],
      ['Resolution', 'Print — 300 DPI'],
      ['Format', 'PNG'],
    ],
    check:
      'Inspect the downloaded image at 100% zoom. The practice page is 11 inches wide, so it renders about 3,300 pixels wide at 300 DPI; other page dimensions produce different image sizes.',
    note: 'Higher DPI uses more memory and produces larger files. It cannot restore detail missing from a low-resolution scan. Multiple selected pages download as a ZIP.',
    samples: [landscape],
  },
  'pdf-to-text': {
    updated: '2026-10-05',
    title: 'Extract selectable text from only the PDF pages you need',
    scenario:
      'Copy the summary and budget wording into your notes without carrying over fonts, images or page layout.',
    settings: [
      ['Pages', '2-3 in the practice packet'],
      ['Action', 'Extract text'],
      ['Output', 'A plain text file'],
    ],
    check:
      'Open the TXT file and look for the summary and the budget figures. Review the reading order before reusing a table or a multi-column passage.',
    note: 'An image-only scan can produce no useful text. OCR is not included, and this tool does not reconstruct an Excel spreadsheet.',
    samples: [packet],
  },
  'image-to-pdf': {
    updated: '2026-10-05',
    title: 'Combine different image formats into an A4 PDF',
    scenario:
      'Put a JPG receipt and a PNG screenshot into one document that is easier to send than two separate files.',
    settings: [
      ['Input order', 'Receipt JPG, then screenshot PNG'],
      ['Page size', 'A4 — centered with margins'],
      ['Output', 'One PDF with one image per page'],
    ],
    check:
      'Review both pages before downloading. Verify that small text is readable and the order matches the files you selected.',
    note: 'The PDF contains images, not OCR text. JPG, PNG and WebP are supported; convert unsupported formats such as HEIC first.',
    samples: [image, screenshot],
  },
  'jpg-to-pdf': {
    updated: '2026-10-05',
    title: 'Put JPG receipt photos into one PDF',
    scenario:
      'Package receipt photos in the order they appear on an expense list. Use the practice JPG to check the page-sizing options.',
    settings: [
      ['Input', 'JPG or JPEG photos'],
      ['Page size', 'A4 for consistent sheets, or Fit each image'],
      ['Order', 'Arrange photos before creating the PDF'],
    ],
    check:
      'Look for clipped edges, sideways photos and unreadable amounts. Each photo becomes its own page; the tool does not place multiple receipts on one sheet.',
    note: 'Changing the container to PDF does not make a blurry photograph clearer or its words selectable. Keep the source photos for later corrections.',
    samples: [image],
  },
  'png-to-pdf': {
    updated: '2026-10-05',
    title: 'Turn PNG screenshots into a PDF without stretching them',
    scenario:
      'Collect screenshots of a process into a document that a colleague can read in order.',
    settings: [
      ['Input', 'PNG screenshots'],
      ['Page size', 'Fit each image to retain each screenshot’s proportions'],
      ['Order', 'Move the first step above the later steps'],
    ],
    check:
      'Open the PDF and zoom into small interface labels. Fit-to-image pages may have different dimensions; use A4 when consistent paper sizes matter more.',
    note: 'PNG screenshots remain pictures in the PDF. Review them for visible account details before sharing; conversion does not remove private information from the image.',
    samples: [screenshot],
  },
  'merge-images': {
    updated: '2026-10-05',
    title: 'Merge mixed images into one PDF in a deliberate order',
    scenario:
      'Combine a receipt, a screenshot and a graphic into a single attachment. This workflow makes a sequence of pages rather than a stitched collage.',
    settings: [
      ['Accepted formats', 'JPG, PNG and WebP in the same batch'],
      ['Arrangement', 'Move images into the reading order'],
      ['Page size', 'Choose A4 or Fit each image'],
    ],
    check:
      'The number of PDF pages should match the number of chosen images. Preview the full sequence so the recipient sees the intended first page.',
    note: 'This does not merge pictures into one JPG or PNG. Use the dedicated JPG-to-PDF or PNG-to-PDF pages when all inputs share a format.',
    samples: [image, screenshot, webp],
  },
  'compress-images': {
    updated: '2026-10-05',
    title: 'Compress a photo to 20 KB for an upload form',
    scenario:
      'A form accepts only JPG files under 20 KB. Select the required format explicitly so a smaller WebP result is not rejected by that form.',
    settings: [
      ['Target size', '20 KB'],
      ['Output format', 'JPG'],
      ['Before submitting', 'Compare the resulting pixel dimensions with the form’s requirements'],
    ],
    check:
      'A successful result must be at or below 20,000 bytes. Inspect faces and small writing before uploading. If the dimensions are too small, use a cleaner source or a larger allowance if the form permits it.',
    note: 'The compressor may reduce both quality and dimensions. 50 KB and 100 KB work through the same presets. The limit applies to each image, not the size of a downloaded ZIP.',
    samples: [image],
  },
  'enhance-image': {
    updated: '2026-10-05',
    title: 'Adjust photo brightness and sharpness without AI upscaling',
    scenario:
      'A picture looks dark or flat but already has enough pixels. Make small tonal changes and compare the actual result with the original.',
    settings: [
      [
        'Brightness and contrast',
        'Increase gradually rather than applying every control at maximum',
      ],
      ['Saturation', 'Keep colors close to the original subject'],
      ['Sharpness', 'Stop before bright outlines appear around edges'],
    ],
    check:
      'Inspect light areas for lost detail and dark areas for extra noise. View the exported image at 100% zoom, not only as a small preview.',
    note: 'These controls do not reconstruct missing detail, remove severe blur, or provide AI super-resolution. A larger pixel count is not the same as recovering detail.',
    samples: [image],
  },
  'jpg-to-webp': {
    updated: '2026-10-05',
    title: 'Convert JPG images to WebP and compare file sizes',
    scenario:
      'Prepare an image for a website that accepts WebP. Start with the original dimensions so the size comparison is not confused by resizing.',
    settings: [
      ['Input', 'JPG photos'],
      ['Output', 'WebP'],
      ['Dimensions', 'Keep original dimensions for the first comparison'],
    ],
    check:
      'Compare the original and converted sizes and inspect text or sharp edges. Adjust quality if the result shows visible artifacts. A conversion is not guaranteed to save space.',
    note: 'Check that the destination accepts WebP. Keep your original JPG instead of repeatedly converting between lossy formats.',
    samples: [image],
  },
  'webp-to-jpg': {
    updated: '2026-10-05',
    title: 'Convert WebP to JPG when an upload form rejects WebP',
    scenario:
      'You have a WebP graphic but the receiving website accepts only JPG. Convert the file’s actual format rather than renaming its extension.',
    settings: [
      ['Input', 'WebP image'],
      ['Output', 'JPG'],
      ['Transparent areas', 'Filled with white in the JPG'],
    ],
    check:
      'Open the downloaded JPG and confirm that edges and the white background look right. Its file size can be larger than the WebP original.',
    note: 'JPG cannot preserve transparency. Animated sources become still images when re-encoded; this tool is not an animation converter.',
    samples: [webp],
  },
  'signature-generator': {
    updated: '2026-10-05',
    title: 'Create a transparent signature PNG for a document',
    scenario:
      'Make a signature image you can place on a colored document without a white rectangle around it.',
    settings: [
      ['Method', 'Draw or Type for a transparent background'],
      ['Crop', 'Leave a small amount of space around the strokes'],
      ['Download', 'PNG'],
    ],
    check:
      'Place the PNG on a colored background and check that the background shows through. Use Image and white-background removal when starting from a photograph of a signature.',
    note: 'Use your own signature or one you are authorized to use. A signature image does not contain an identity certificate or provide a signing audit trail.',
  },
  'sign-pdf': {
    updated: '2026-10-05',
    title: 'Place your signature on a PDF and check its position',
    scenario:
      'A document needs your visual signature. Open it in the editor and add a drawn, typed or uploaded signature at the intended signing line.',
    settings: [
      ['Signature source', 'Draw, Type, or an existing signature image'],
      ['Placement', 'Keep the signature clear of names and dates'],
      ['Output', 'Download the finished PDF'],
    ],
    check:
      'Reopen the PDF and inspect the signed page at normal reading size. Confirm that any required name, date or other form fields are also completed.',
    note: 'This is visual signing with private cloud saving, not a certificate-based signature or identity-verification service. Follow the recipient’s required signing method.',
    samples: [portrait],
  },
  'create-pdf-form': {
    updated: '2026-10-05',
    title: 'Create a fillable PDF that recipients can type into',
    scenario:
      'Turn an existing questionnaire into a reusable form by placing fields over the response areas.',
    settings: [
      ['Text field name', 'customer_name'],
      ['Checkbox name', 'receive_updates'],
      ['Export choice', 'Keep fields fillable rather than flattening them'],
    ],
    check:
      'Open the exported PDF in the reader your recipient uses. Type into the text field, toggle the checkbox, save a copy and reopen it to check the answers.',
    note: 'Fields need unique names unless shared values are intentional. Reader support varies. Flattening turns filled appearances into page content and removes editability.',
    samples: [portrait],
  },
  'invoice-generator': {
    updated: '2026-10-05',
    title: 'Create a freelance invoice with a deposit and a clear balance',
    scenario:
      'A fictional design job includes three hours of work at 50 per hour and a fixed 25 charge. Use this arithmetic example to check the totals before entering real work.',
    settings: [
      ['Line items', '3 × 50 plus 1 × 25 = 175 subtotal'],
      ['Example tax and shipping', '0 for this calculation example only'],
      ['Deposit already received', '50, leaving a balance of 125'],
    ],
    check:
      'Choose a currency and review the amount due, customer details, due date and payment instructions in the PDF. Apply the tax treatment appropriate to your real transaction.',
    note: 'Folio does not send the invoice, collect payment or verify that the balance was paid. Download a JSON backup or sign in to save an editable draft.',
  },
  'url-shortener': {
    updated: '2026-10-05',
    title: 'Create a custom short link whose destination you can update',
    scenario:
      'A printed handout should use one recognizable link even when the destination page changes.',
    settings: [
      ['Account', 'Sign in to save and manage the link'],
      ['Example alias', 'workshop-notes, if available'],
      ['Destination', 'A complete HTTP or HTTPS URL you have checked'],
    ],
    check:
      'Open the short link in a private browser window. After editing its destination, test it again and check any QR code pointing to the same short URL.',
    note: 'The short link depends on Folio’s redirect service and the destination staying available. Deleted aliases remain reserved. It is not a custom domain or a promise of permanent hosting.',
  },
  'create-qr-code': {
    updated: '2026-10-05',
    title: 'Make a static QR code for a link without a scan subscription',
    scenario:
      'Put a direct link to a public page on a handout. A static QR stores the destination itself, so Folio does not need to redirect each scan.',
    settings: [
      ['Content', 'The complete public HTTPS address'],
      ['Colors', 'Dark foreground on a light background with a clear margin'],
      ['Download', 'SVG for scalable artwork or PNG for an image file'],
    ],
    check:
      'Scan the downloaded code with a second device and test a printed copy at its intended size. Confirm that the destination opens without your own logged-in session.',
    note: 'Folio does not impose an expiry on a static code, but the linked page must stay available. Changing the destination requires a new code unless it points to an editable short link.',
  },
};

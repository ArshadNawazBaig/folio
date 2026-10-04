import { FREE_LAUNCH } from './access-policy';
import { toolDownloadAccess } from './tool-access';

type ToolFacts = {
  question: string;
  answer: string;
  input: string;
  output: string;
  processing: string;
  limits: string;
};

const localProcessing =
  'This standalone tool processes document contents in your browser. Opening the result in the editor uploads it for private cloud saving.';
const editorProcessing =
  'The editor uploads your PDF and saves changes to private cloud storage. Guest workspaces expire after 24 hours; signing in keeps files in your account.';

// Product facts checked against the tool implementations, download policy and privacy page.
// Keep limitations explicit; these summaries are visible to visitors as well as crawlers.
export const toolFacts: Record<string, ToolFacts> = {
  'invoice-generator': {
    question: 'How do I create a free invoice PDF?',
    answer:
      'Open the invoice editor, enter your business and customer details, add line items, and review the live totals. Choose any design and brand color, then download your invoice PDF for free. A logo, tax, discounts, shipping, and deposits are included.',
    input:
      'Business and customer details, invoice dates, up to 50 line items, and an optional logo.',
    output:
      'A watermark-free PDF in A4 or US Letter, plus an optional JSON draft backup for later editing.',
    processing:
      'Classic and Minimal PDFs are generated in your browser. Other designs are processed in server memory. All exports are free. Only Save to account stores invoice contents in your private library. Unsaved drafts are lost when the tab closes or refreshes.',
    limits:
      '24 currencies; one invoice-level tax rate with per-item exemptions. Sign in to save up to 200 invoices for free. No automatic currency conversion, payment collection, email sending, tax filing, or payment-status synchronization. Some writing systems are not supported by the PDF font.',
  },
  'compress-images': {
    question: 'How can I compress images to a file-size limit without uploading them?',
    answer:
      'Choose a preset or custom KB limit in Folio’s image compressor, add your images, and select Compress images. It adjusts quality and dimensions in your browser. Review the actual size and pixel dimensions, then download individual files or a ZIP for free.',
    input: 'JPG/JPEG, PNG, or WebP images. Up to 20 per batch.',
    output:
      'JPG, PNG, or WebP files, individually or in a ZIP. A size limit applies to each image, not the ZIP.',
    processing:
      'Images and results stay in the current browser tab. Folio does not upload them or save them in browser storage. Clear all or refresh to discard the batch. Downloads remain on your device.',
    limits:
      '35 MB per file, 150 MB per batch, and 25 million pixels per image. Presets from 10 KB to 1 MB; custom targets from 1 to 35,000 KB. Target mode may resize images. Manual mode does not enforce a size limit. Re-encoded animations become still images.',
  },
  'signature-generator': {
    question: 'How can I create a signature PNG without saving it online?',
    answer:
      'Draw, type, or choose a signature image in Folio’s free signature generator, then download a PNG. Drawn and typed signatures have transparent backgrounds. Everything is prepared in the current browser tab, with no account and no saved signature library.',
    input: 'A drawing, a typed name up to 80 characters, or a PNG, JPG, or WebP signature image.',
    output:
      'A cropped PNG image. Draw and Type are transparent; Image offers white background removal.',
    processing:
      'Your name, drawing, and chosen image are not uploaded or saved in browser storage. Refreshing or clearing the tool discards the working signature. Website and font requests still use the network. Downloaded copies remain on your device.',
    limits:
      'Image files up to 5 MB and 25 megapixels, resized to at most 1,400 pixels on the longest edge before cropping. White removal does not remove dark shadows or colored paper. This is a visual signature image, with no certificate or identity verification.',
  },
  'url-shortener': {
    question: 'What is included with a free short link?',
    answer:
      'Save up to 1,000 short links in your free account, with custom aliases, editable destinations, and QR downloads.',
    input: 'An HTTP or HTTPS website address, plus an optional title and custom alias.',
    output: 'A shareable short URL and optional PNG or SVG QR code.',
    processing:
      'URLs, titles, aliases, and creation dates are stored in your account. The public redirect does not require sign-in. QR images are generated in your browser.',
    limits:
      'Sign-in required. URLs up to 2,048 characters; aliases 3–48 letters, numbers, or hyphens. Up to 20 new links per minute, and 1,000 per day. Deleted aliases remain reserved.',
  },
  'edit-pdf': {
    question: 'What can I edit in a PDF for free?',
    answer:
      'Folio’s free PDF editor adds text, highlights, images, shapes, visual signatures and form fields, and organizes pages. These changes download without a Folio watermark. Replacing words already in the PDF uses the original-text editor and is free to download.',
    input: 'PDF documents, including scans for annotations.',
    output: 'A PDF with your additions and page changes.',
    processing: editorProcessing,
    limits:
      'Up to 50 MB per PDF. Guest storage is 100 MB. Scanned words cannot be replaced without OCR, which Folio does not include. Covering text is not secure redaction.',
  },
  'edit-pdf-text': {
    question: 'Can I change words already in a PDF?',
    answer:
      'Folio’s PDF text editor replaces supported original text blocks and offers font, size, color, and find-and-replace controls. Preview the result before downloading for free. Scans and outlined letters are not editable text, and paragraphs do not automatically reflow.',
    input: 'A text-based PDF with supported text blocks.',
    output: 'A PDF containing your original-text changes.',
    processing:
      'Text processing sends the PDF to Folio. The standalone tool keeps unsaved work in the current tab. The main editor has separate automatic cloud saving. Older saved recovery copies expire after seven days, but failed cleanup can leave a stored copy.',
    limits:
      'This standalone text tool accepts PDFs up to 10 MB and 100 pages. Fonts may need substitution. Text deletion does not sanitize the document for secure redaction.',
  },
  'merge-pdf': {
    question: 'How can I combine PDFs without uploading their contents?',
    answer:
      'Folio’s standalone Merge PDF tool combines files in your browser. Add two or more PDFs, arrange their order, and download one PDF for free without signing in. Page sizes and orientations are retained.',
    input: 'Two or more PDF files.',
    output: 'One combined PDF, in the file order you choose.',
    processing: localProcessing,
    limits:
      'Up to 20 files, 50 MB per file and 150 MB total. Keep originals of interactive forms and digitally signed documents; copying their pages can change form behavior or invalidate signatures.',
  },
  'split-pdf': {
    question: 'How do I extract only the PDF pages I need?',
    answer:
      'Folio’s Split PDF tool extracts a page range into one PDF or separates every page into individual PDFs in a ZIP. Enter ranges such as 1-3, 5, 8-10. Processing runs in your browser and the download is free.',
    input: 'One PDF and the page numbers or ranges to keep.',
    output: 'A PDF of selected pages, or a ZIP containing one PDF per page.',
    processing: localProcessing,
    limits:
      'Up to 50 MB per PDF. Page numbers start at one. Selected pages follow the order entered; repeated pages are included only once.',
  },
  'compress-pdf': {
    question: 'Will compressing a PDF make it smaller without lowering image resolution?',
    answer:
      'Folio’s Compress PDF tool reduces structural overhead using compressed object streams. It keeps text selectable and does not lower image resolution. An already optimized or image-heavy PDF may not get smaller; Folio keeps the original available when the result is larger.',
    input: 'One PDF to optimize.',
    output: 'An optimized PDF, with the original available if optimization increases its size.',
    processing: localProcessing,
    limits:
      'Up to 50 MB per PDF. There is no guaranteed reduction or target file size. This tool does not downsample images or perform OCR.',
  },
  'sign-pdf': {
    question: 'Can I sign a PDF for free in Folio?',
    answer:
      'Folio lets you draw, type or upload a visual signature, place it on a PDF, and download the signed copy for free. It can also fill supported form fields. A visual signature does not provide a digital certificate, identity verification or an audit trail.',
    input: 'A PDF, plus an optional signature image.',
    output: 'A PDF with your visual signature and completed fields.',
    processing: editorProcessing,
    limits:
      'Up to 50 MB per PDF. Guest storage is 100 MB. Use the recipient’s specified signing service if they require certificate-based signatures.',
  },
  'image-to-pdf': {
    question: 'How can I turn photos or receipts into one PDF?',
    answer:
      'Folio’s Image to PDF tool combines JPG, PNG and WEBP images into a free PDF, with one image per page. Arrange the images, choose pages fitted to each image or A4 paper, and download the result from your browser.',
    input: 'JPG, PNG or WEBP images.',
    output: 'One PDF with one image on each page.',
    processing: localProcessing,
    limits:
      'Up to 20 images, 50 MB per file and 150 MB total. Convert HEIC images first. Words in photos remain images; this tool does not add searchable text with OCR.',
  },
  'pdf-to-text': {
    question: 'Can I extract text from a scanned PDF?',
    answer:
      'Folio’s PDF to Text tool extracts existing selectable text into a plain text file. Image-only scans need OCR, which this tool does not provide. For a text-based PDF, choose the pages you need and download the extracted words for free.',
    input: 'A PDF containing selectable text.',
    output: 'A plain text (.txt) file.',
    processing: localProcessing,
    limits:
      'Up to 50 MB per PDF. Fonts, images and page layout are not preserved. Reading order can differ in tables and multi-column documents.',
  },
  'protect-pdf': {
    question: 'How does Folio password-protect a PDF?',
    answer:
      'Folio’s Protect PDF tool creates a copy with AES-256 encryption and an opening password. Downloading the protected copy is free. Keep the original and your password separately; Folio cannot recover a forgotten password.',
    input: 'An unencrypted, unsigned PDF and an opening password.',
    output: 'A PDF that requires your password to open.',
    processing:
      'The PDF and password are sent to Folio for processing in server memory. This tool does not persist them in a document database or object storage; hosting infrastructure may buffer requests.',
    limits:
      'Up to 10 MB and 100 pages. Digitally signed PDFs are not accepted. Someone with the password can access the contents; this is not digital rights management.',
  },
};

export function downloadFact(slug: string) {
  if (FREE_LAUNCH)
    return 'All downloads and options are free. Sign in only to save files, invoices, or short links to your account.';
  if (slug === 'invoice-generator')
    return 'Classic and Minimal PDFs with preset colors are free. Premium designs, custom branding, payment QR codes, and account saving require Pro.';
  if (slug === 'compress-images')
    return 'Free individual downloads and batch ZIPs. No account or watermark.';
  if (slug === 'signature-generator')
    return 'Free PNG download. No sign-in, subscription, or watermark.';
  if (slug === 'url-shortener')
    return 'QR downloads are free. Custom aliases, destination changes, and the larger saved-link allowance require Pro.';
  const access = toolDownloadAccess(slug);
  if (access === 'premium') return 'A paid plan is required to download the processed result.';
  if (access === 'mixed')
    return 'Annotations and page changes download free. Original-text changes are free.';
  return 'Free for this tool. Adding original-text changes in the editor requires a paid download.';
}

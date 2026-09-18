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
  'edit-pdf': {
    question: 'What can I edit in a PDF for free?',
    answer:
      'Folio’s free PDF editor adds text, highlights, images, shapes, visual signatures and form fields, and organizes pages. These changes download without a Folio watermark. Replacing words already in the PDF uses the original-text editor and requires a paid plan at download.',
    input: 'PDF documents, including scans for annotations.',
    output: 'A PDF with your additions and page changes.',
    processing: editorProcessing,
    limits:
      'Up to 50 MB per PDF. Guest storage is 100 MB. Scanned words cannot be replaced without OCR, which Folio does not include. Covering text is not secure redaction.',
  },
  'edit-pdf-text': {
    question: 'Can I change words already in a PDF?',
    answer:
      'Folio’s PDF text editor replaces supported original text blocks and offers font, size, color, and find-and-replace controls. Preview the result before a paid download. Scans and outlined letters are not editable text, and paragraphs do not automatically reflow.',
    input: 'A text-based PDF with supported text blocks.',
    output: 'A PDF containing your original-text changes.',
    processing:
      'Text processing sends the PDF to Folio. Signed-in checkout recovery saves the source and edits privately; recovery expires after seven days, but failed cleanup can leave a stored copy. The main editor has separate automatic cloud saving.',
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
      'Folio’s Protect PDF tool creates a copy with AES-256 encryption and an opening password. Downloading the protected copy requires a paid plan. Keep the original and your password separately; Folio cannot recover a forgotten password.',
    input: 'An unencrypted, unsigned PDF and an opening password.',
    output: 'A PDF that requires your password to open.',
    processing:
      'The PDF and password are sent to Folio for processing in server memory. This tool does not persist them in a document database or object storage; hosting infrastructure may buffer requests.',
    limits:
      'Up to 10 MB and 100 pages. Digitally signed PDFs are not accepted. Someone with the password can access the contents; this is not digital rights management.',
  },
};

export function downloadFact(slug: string) {
  const access = toolDownloadAccess(slug);
  if (access === 'premium') return 'A paid plan is required to download the processed result.';
  if (access === 'mixed')
    return 'Annotations and page changes download free. Original-text changes require a paid plan.';
  return 'Free for this tool. Adding original-text changes in the editor requires a paid download.';
}

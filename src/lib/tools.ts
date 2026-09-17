import { nativeTools } from './native-tools';
import { toolDownloadAccess } from './tool-access';
export type ToolCategory = 'Edit & organize' | 'Convert' | 'Forms & signing' | 'More possibilities';
export type Tool = {
  slug: string;
  name: string;
  short: string;
  description: string;
  icon: string;
  category: ToolCategory;
  color: string;
  available: boolean;
  premium?: boolean;
  action: string;
  accept?: string;
  steps: [string, string, string];
  detail: string;
  faq: [string, string][];
  keywords: string[];
  processor?: string;
};
const tool = (t: Omit<Tool, 'premium'>) => t;
export const tools: Tool[] = [
  tool({
    slug: 'edit-pdf',
    name: 'Edit PDF',
    short: 'Make it yours. Every last detail.',
    description:
      'Add text, highlight, annotate and sign PDFs online for free. Download your additions for free; changes to original PDF text require a paid plan.',
    icon: 'edit',
    category: 'Edit & organize',
    color: 'orange',
    available: true,
    action: 'Open in editor',
    steps: [
      'Choose a PDF from your device.',
      'Add your text, annotations, or signature.',
      'Download your edited PDF.',
    ],
    detail:
      'Use one workspace to edit original text, add annotations and signatures, and organize pages. Select Edit Text to change supported text directly on the page. Scanned pages can be annotated, but need OCR for original text editing.',
    faq: [
      [
        'Is this PDF editor free to use and download?',
        'Yes for added text, highlights, images, shapes, signatures, form fields, and page organization. Download these changes without a subscription or a Folio watermark. Replacing original PDF text is available to try, but downloading a document with those changes requires a paid plan.',
      ],
      [
        'Can I change the original text?',
        'Yes. Select Edit Text in the same editor, click a supported text block, and type directly on the page. Font, size and color controls are available. Paragraphs do not automatically reflow. You can preview changes before buying; downloading original-text changes requires a paid plan.',
      ],
      [
        'Will my file be uploaded?',
        'Yes. Your editor document and changes are saved in private cloud storage for refresh recovery. Guest files expire after 24 hours. Sign in to keep your files and access them across devices.',
      ],
      [
        'Can I edit a PDF without signing in?',
        'You can start as a guest without Google sign-in. Guest editor documents are saved privately with a 100 MB storage allowance and expire after 24 hours. Sign in to keep your files and open them on another device.',
      ],
    ],
    keywords: ['annotate', 'write', 'add text', 'highlight'],
  }),
  tool({
    slug: 'edit-pdf-text',
    name: 'PDF text editor',
    short: 'Change the words already on the page.',
    description:
      'Replace existing PDF text, adjust fonts and colors, and find and replace across your document. Preview your changes right on the page.',
    icon: 'text-edit',
    category: 'Edit & organize',
    color: 'sage',
    available: true,
    action: 'Edit original text',
    steps: [
      'Choose a PDF and open it for text editing.',
      'Select a text block, make changes, and update the preview.',
      'Review your changes and download your edited PDF.',
    ],
    detail:
      'Edit supported text blocks directly on the PDF. Preserve the original appearance where the embedded font permits, or choose a replacement font. Copy, paste and move selected blocks, undo changes, and save the workspace to private cloud storage. Paragraphs do not automatically reflow.',
    faq: [
      [
        'Can I edit a scanned PDF?',
        'Not yet. Scans, outlined letters, text inside artwork, and some clipped or complex text require other processing. OCR is not included.',
      ],
      [
        'Are the original fonts preserved?',
        'The editor preserves supported embedded fonts, weight and color. If an embedded font omits a character you add, a matching fallback is used. You can also choose another font. Review the result because substitutions can change spacing.',
      ],
      [
        'Does deleting text securely redact it?',
        'No. Deleting a text block removes that page object, but does not sanitize metadata, attachments, or other copies. Do not use it for secure redaction.',
      ],
      [
        'Can I replace a word throughout my document?',
        'Yes. Find and replace works across supported text blocks on all pages. Review the updated previews to check each replacement and its spacing before downloading.',
      ],
    ],
    keywords: [
      'change original text',
      'rewrite',
      'replace words',
      'edit existing text',
      'find replace',
      'premium',
      'pro',
    ],
  }),
  tool({
    slug: 'protect-pdf',
    name: 'Protect PDF',
    short: 'An opening password. A little peace of mind.',
    description:
      'Protect a PDF with an opening password and AES-256 encryption. Create a protected copy while keeping your original.',
    icon: 'protect',
    category: 'More possibilities',
    color: 'sand',
    available: true,
    action: 'Protect & download',
    steps: [
      'Choose an unencrypted PDF.',
      'Enter and confirm the opening password.',
      'Download your protected PDF. Keep your password separately.',
    ],
    detail:
      'Password protection creates an encrypted copy that requires your password to open. Folio processes the PDF and password in memory on the server and does not persist them. This tool accepts unencrypted, unsigned PDFs up to 10 MB and 100 pages. Keep your original and a separate record of the password.',
    faq: [
      [
        'Can Folio recover a forgotten password?',
        'No password is stored by this application. Keep the password and an original unencrypted copy somewhere you can access.',
      ],
      [
        'Does this stop copying after opening the PDF?',
        'The password controls opening the file. Someone with the password can access its contents; this tool is not digital rights management.',
      ],
      [
        'Can I protect a digitally signed PDF?',
        'Use an unsigned original. Rewriting a signed file can invalidate its digital signature, so this tool does not process signed PDFs.',
      ],
    ],
    keywords: ['password', 'encrypt', 'lock', 'secure', 'premium', 'pro'],
  }),
  tool({
    slug: 'merge-pdf',
    name: 'Merge PDF',
    short: 'Bring your pages together.',
    description:
      'Merge PDF files online for free. Arrange multiple PDFs in your preferred order, combine them in your browser, and download one document without signing in.',
    icon: 'merge',
    category: 'Edit & organize',
    color: 'sage',
    available: true,
    action: 'Merge PDFs',
    steps: [
      'Add two or more PDF files.',
      'Arrange the files in the order you want.',
      'Merge and download your combined PDF.',
    ],
    detail:
      'Put a proposal, supporting documents, and an appendix in one place. Files are combined in the order shown. The original page sizes and orientations are retained. Save a separate original copy of interactive forms or digitally signed documents, whose behavior can change when pages are copied.',
    faq: [
      [
        'Can I change the file order?',
        'Yes. Use the move up and move down controls beside each file before merging.',
      ],
      [
        'Is there a file limit?',
        'Each file can be up to 50 MB. A batch is limited to 20 files and 150 MB total to protect browser memory.',
      ],
    ],
    keywords: ['combine', 'join', 'put together'],
  }),
  tool({
    slug: 'compress-pdf',
    name: 'Compress PDF',
    short: 'Less space. Same big ideas.',
    description:
      'Optimize the structure of a PDF to reduce its file size without rasterizing text or lowering image resolution.',
    icon: 'compress',
    category: 'Edit & organize',
    color: 'rose',
    available: true,
    action: 'Optimize PDF',
    steps: [
      'Choose the PDF you want to optimize.',
      'Run lossless document optimization.',
      'Compare file sizes and download the result.',
    ],
    detail:
      'Folio rewrites the document using compressed object streams. This can reduce overhead in some PDFs while keeping text and image resolution intact. Already optimized or image-heavy PDFs may not get smaller. If the result is larger, Folio tells you and keeps the original available.',
    faq: [
      [
        'How much smaller will my PDF be?',
        'It depends on the original file. Structural optimization cannot guarantee a particular reduction. Image downsampling is not part of this tool.',
      ],
      [
        'Will the text stay searchable?',
        'Yes. This operation does not turn document pages into images.',
      ],
    ],
    keywords: ['smaller', 'reduce size', 'make my pdf smaller', 'optimize'],
  }),
  tool({
    slug: 'split-pdf',
    name: 'Split PDF',
    short: 'Keep just the pages you need.',
    description:
      'Split PDF files online for free. Extract selected pages into one PDF or download individual pages in a ZIP. No sign-up needed.',
    icon: 'split',
    category: 'Edit & organize',
    color: 'blue',
    available: true,
    action: 'Split PDF',
    steps: [
      'Choose your PDF.',
      'Select a page range or separate every page.',
      'Download the selected pages or ZIP file.',
    ],
    detail:
      'Share a chapter, separate an attachment, or turn one long document into individual pages. Enter ranges such as 1-3, 5, 8-10. Page numbers start at one. Selected pages are exported in the order entered.',
    faq: [
      [
        'Can I select nonconsecutive pages?',
        'Yes. Separate page numbers or ranges with commas, for example 1, 4-6, 9.',
      ],
      [
        'What do I get when splitting every page?',
        'A ZIP archive containing one PDF per page, named in page order.',
      ],
    ],
    keywords: ['extract', 'separate', 'pages'],
  }),
  tool({
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    short: 'A fresh perspective on your pages.',
    description:
      'Rotate PDF pages by 90, 180, or 270 degrees. Fix sideways scans and download the corrected document.',
    icon: 'rotate',
    category: 'Edit & organize',
    color: 'sand',
    available: true,
    action: 'Rotate pages',
    steps: [
      'Open your PDF.',
      'Choose a rotation and the pages to apply it to.',
      'Download the corrected document.',
    ],
    detail:
      'Apply the same rotation to all pages or to a selected range. The rotation is saved in the exported document, so other readers see the corrected orientation too.',
    faq: [
      ['Can I rotate just one page?', 'Yes. Enter its page number in the page-range field.'],
      [
        'Does rotation lower quality?',
        'No. Rotation changes page orientation without resampling the page content.',
      ],
    ],
    keywords: ['sideways', 'orientation', 'turn'],
  }),
  tool({
    slug: 'organize-pdf',
    name: 'Organize PDF',
    short: 'Everything in its right place.',
    description:
      'Reorder, rotate, duplicate, and delete PDF pages in a visual workspace. Add a blank page when you need more room.',
    icon: 'pages',
    category: 'Edit & organize',
    color: 'sage',
    available: true,
    action: 'Organize pages',
    steps: [
      'Open your document in the workspace.',
      'Select a page and use the page controls.',
      'Download your newly organized PDF.',
    ],
    detail:
      'Page thumbnails help you find the right place in a document. Move pages, remove extras, or add a blank page for notes. Undo and redo let you explore changes before exporting.',
    faq: [
      ['Can I undo a deleted page?', 'Yes. Use Undo while the editing session is open.'],
      [
        'Are my originals changed?',
        'No. The exported PDF is a new file; your original stays on your device.',
      ],
    ],
    keywords: ['reorder', 'delete', 'remove', 'arrange'],
  }),
  tool({
    slug: 'watermark-pdf',
    name: 'Watermark PDF',
    short: 'Leave your mark, thoughtfully.',
    description:
      'Add a text watermark to selected PDF pages. Customize its wording, size, color, and opacity.',
    icon: 'watermark',
    category: 'Edit & organize',
    color: 'blue',
    available: true,
    action: 'Add watermark',
    steps: [
      'Choose the PDF to mark.',
      'Enter your watermark and choose its appearance.',
      'Apply it and download the marked PDF.',
    ],
    detail:
      'Mark a draft, label a review copy, or add a simple attribution. Watermarks are added to the center of the selected pages. They are visible labels, not access controls or a guarantee against copying.',
    faq: [
      ['Can I watermark only certain pages?', 'Yes. Enter the pages or ranges you want to mark.'],
      [
        'Can I remove a watermark later?',
        'Keep your original file. This tool adds a permanent mark to the exported copy.',
      ],
    ],
    keywords: ['draft', 'stamp', 'confidential'],
  }),
  tool({
    slug: 'page-numbers',
    name: 'Page numbers',
    short: 'Never lose your place.',
    description:
      'Add clear page numbers to your PDF. Choose a starting number and apply numbering to a selected range.',
    icon: 'numbers',
    category: 'Edit & organize',
    color: 'sand',
    available: true,
    action: 'Add page numbers',
    steps: [
      'Upload your PDF.',
      'Choose your starting number and page range.',
      'Download the numbered document.',
    ],
    detail:
      'Add a centered footer number to reports, handbooks, and proposals. Numbering follows the selected page order. Check that the footer does not overlap existing content before sharing your file.',
    faq: [
      [
        'Can I start numbering after the cover?',
        'Yes. Set the range to start at page 2 and choose 1 as the starting number.',
      ],
      [
        'Can I use a different starting number?',
        'Yes. Enter a positive starting number in the settings.',
      ],
    ],
    keywords: ['pagination', 'numbering', 'footer'],
  }),
  tool({
    slug: 'crop-pdf',
    name: 'Crop PDF',
    short: 'A little more focus.',
    description:
      'Trim the visible margins of your PDF pages with a consistent crop. Preview the exported document before sharing.',
    icon: 'crop',
    category: 'Edit & organize',
    color: 'rose',
    available: true,
    action: 'Crop pages',
    steps: [
      'Choose a PDF.',
      'Set the margin to trim from each edge.',
      'Download and check the cropped pages.',
    ],
    detail:
      'Cropping adjusts the visible page boundary. Hidden content remains in the document and could be recovered; cropping must not be used to redact sensitive information. A crop is applied evenly to the selected pages.',
    faq: [
      [
        'Does cropping remove hidden text?',
        'No. It only changes the visible boundary. Do not use cropping to hide private information.',
      ],
      [
        'What measurement is used?',
        'Margins are measured in PDF points. There are 72 points in one inch.',
      ],
    ],
    keywords: ['trim', 'margins', 'resize'],
  }),
  tool({
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    short: 'Give your pages a new format.',
    description:
      'Turn PDF pages into JPG images. Choose pages, quality and resolution up to 300 DPI. Preview the actual result before downloading.',
    icon: 'image',
    category: 'Convert',
    color: 'sand',
    available: true,
    action: 'Convert to JPG',
    steps: ['Choose a PDF.', 'Select pages and image resolution.', 'Download your JPG images.'],
    detail:
      'Export document pages as images for presentations, previews, and sharing. JPG is useful for small image files; use PNG when crisp line art matters more than file size. Text in an exported image is no longer selectable.',
    faq: [
      [
        'Will each page become its own image?',
        'Yes. One selected page downloads as a JPG. Multiple pages download as separate JPGs in a ZIP archive.',
      ],
      [
        'Can I increase image quality?',
        'Choose a higher resolution, up to 300 DPI, and adjust the JPG quality. Larger pages and higher resolution need more memory.',
      ],
    ],
    keywords: ['jpeg', 'picture', 'photo', 'convert'],
  }),
  tool({
    slug: 'pdf-to-png',
    name: 'PDF to PNG',
    short: 'Every line, beautifully clear.',
    description:
      'Export PDF pages as PNG images with lossless image encoding. Select your page range and download the results.',
    icon: 'image',
    category: 'Convert',
    color: 'sage',
    available: true,
    action: 'Convert to PNG',
    steps: [
      'Choose your PDF.',
      'Select pages and resolution.',
      'Preview and download your PNG images.',
    ],
    detail:
      'PNG is a useful choice for diagrams, text-heavy pages, and screenshots. Each page is rendered to an image at your chosen resolution. Original interactive fields and links become part of the image.',
    faq: [
      [
        'Are the images transparent?',
        'Pages are exported with a white background for reliable viewing.',
      ],
      [
        'Is PNG better than JPG?',
        'PNG avoids lossy compression artifacts; JPG often produces smaller files for photographs.',
      ],
    ],
    keywords: ['image', 'picture', 'convert'],
  }),
  tool({
    slug: 'image-to-pdf',
    name: 'Image to PDF',
    short: 'Your images, all on the same page.',
    description:
      'Combine JPG, PNG and WEBP images into a PDF. Arrange your images, choose fitted pages or A4 paper, and review the result.',
    icon: 'image-plus',
    category: 'Convert',
    color: 'orange',
    available: true,
    action: 'Create PDF',
    accept: 'image/jpeg,image/png,image/webp',
    steps: [
      'Add JPG, PNG or WEBP images.',
      'Arrange them and choose your page size.',
      'Create and download your PDF.',
    ],
    detail:
      'Turn receipts, sketches, and exported images into a single document. Each image gets its own page. Fit-to-image uses the image proportions; A4 centers your image on a portrait sheet with comfortable margins.',
    faq: [
      [
        'Which images are supported?',
        'JPG, PNG and WEBP files are supported. JPEG rotation metadata is respected. Convert HEIC or other formats before adding them.',
      ],
      [
        'Can I combine multiple images?',
        'Yes. Add up to 20 images and arrange the file list before creating your PDF.',
      ],
    ],
    keywords: ['jpg to pdf', 'png to pdf', 'photos', 'pictures'],
  }),
  tool({
    slug: 'pdf-to-text',
    name: 'PDF to text',
    short: 'Get straight to the words.',
    description:
      'Extract selectable text from a PDF and download it as a plain text file. Choose the pages you need.',
    icon: 'text',
    category: 'Convert',
    color: 'blue',
    available: true,
    action: 'Extract text',
    steps: [
      'Choose a text-based PDF.',
      'Select the pages to extract.',
      'Download a plain text file.',
    ],
    detail:
      'Extract text for notes, searching, or reuse. Reading order can differ in multi-column layouts and tables. Image-only scans need OCR, which is not currently connected; this tool will tell you if it finds no selectable text.',
    faq: [
      [
        'Can it read a scanned document?',
        'This tool extracts existing text. Image-only scans require OCR, which is not available in this local version.',
      ],
      [
        'Will formatting be preserved?',
        'Plain text preserves words and basic line breaks, not fonts, images, or complex layout.',
      ],
    ],
    keywords: ['extract words', 'txt', 'copy text'],
  }),
  tool({
    slug: 'sign-pdf',
    name: 'Fill & sign',
    short: 'Make it official. Make it simple.',
    description:
      'Sign a PDF online for free. Draw, type or upload a visual signature, fill supported form fields, and download your completed copy.',
    icon: 'sign',
    category: 'Forms & signing',
    color: 'orange',
    available: true,
    action: 'Fill and sign',
    steps: [
      'Open your PDF.',
      'Fill its fields or add your signature.',
      'Download your completed copy.',
    ],
    detail:
      'Add a visual signature to a document and complete its supported form fields. Typed and drawn signatures are annotations; Folio does not provide certificate-based digital signatures, identity verification, or an audit trail.',
    faq: [
      [
        'Is this a digital certificate signature?',
        'No. This tool adds a visual signature. It does not apply a cryptographic certificate or verify a signer’s identity.',
      ],
      [
        'Can I fill existing forms?',
        'Yes. Supported text fields, checkboxes, dropdowns, and radio groups appear in the workspace form panel.',
      ],
    ],
    keywords: ['signature', 'fill a form', 'esign', 'signing'],
  }),
  tool({
    slug: 'create-pdf-form',
    name: 'Create a PDF form',
    short: 'Good questions. Clear answers.',
    description:
      'Create fillable text fields and checkboxes in your PDF. Export an interactive form or a flattened copy.',
    icon: 'form',
    category: 'Forms & signing',
    color: 'sage',
    available: true,
    action: 'Create a form',
    steps: [
      'Open a PDF or start with a template.',
      'Add named text fields and checkboxes.',
      'Export a fillable or flattened PDF.',
    ],
    detail:
      'Build a simple form on your own PDF background. Give each field a meaningful, unique name and mark required fields where appropriate. Use the form panel to fill values before exporting, or leave fields empty for someone else.',
    faq: [
      [
        'Will fields work in other PDF readers?',
        'Folio exports standard PDF form fields. Support and appearance vary across readers, so check the exported form in your preferred reader.',
      ],
      [
        'What does flattening do?',
        'Flattening turns current field appearances into page content. The exported fields can no longer be filled.',
      ],
    ],
    keywords: ['fillable', 'form builder', 'checkbox', 'input'],
  }),
  ...nativeTools,
  tool({
    slug: 'translate-pdf',
    name: 'Translate PDF',
    short: 'Good ideas speak every language.',
    description:
      'Translate PDF documents and review translated pages side by side. Choose your languages and preview the result when the translation service is connected.',
    icon: 'translate',
    category: 'More possibilities',
    color: 'blue',
    available: false,
    action: 'Translate PDF',
    steps: [
      'Choose a PDF to preview locally.',
      'Choose a source and target language.',
      'Translate, review your pages, and download your translated PDF.',
    ],
    detail:
      'Translation uses Google Cloud Translation when connected. Choose your source and target language, then explicitly start processing. Review the translated page previews before downloading. Layout, fonts, and recognition can vary; bilingual export and standalone OCR are not included. Maximum 10 MB and 20 pages.',
    faq: [
      [
        'Is translation available now?',
        'The workspace shows whether its translation service is connected. You can always preview your original locally; processing is enabled when the service is ready.',
      ],
      [
        'Will scanned files need OCR?',
        'Recognition depends on the document service and source quality. Review your translated preview carefully; scans may not produce usable results.',
      ],
    ],
    keywords: ['language', 'urdu', 'arabic', 'english', 'spanish'],
  }),
  ...['Word', 'Excel', 'PowerPoint'].map((format) =>
    tool({
      slug: `pdf-to-${format.toLowerCase()}`,
      name: `PDF to ${format}`,
      short: `A new home for your document.`,
      description: `Convert PDF documents to ${format}. Prepare your file with the connected conversion service and review its page previews.`,
      icon: 'convert',
      category: 'Convert',
      color: 'blue',
      available: false,
      action: `Convert to ${format}`,
      steps: [
        'Choose a PDF and review its local preview.',
        'Start conversion with the connected document service.',
        `Download your ${format} file after processing.`,
      ],
      detail: `Accurate PDF to ${format} conversion requires a dedicated conversion engine. It must reconstruct paragraphs, tables, and other document structure. Folio uses ConvertAPI when connected. Conversion starts only when you choose Convert. Layout and recognition vary with source quality; review the downloaded document in Office. Maximum 10 MB and 100 pages.`,
      faq: [
        [
          'Is this converter available?',
          'Current availability is shown above. When the service is connected, choose a PDF and start conversion. Review the page previews when processing finishes.',
        ],
        [
          'What can I use today?',
          'You can export PDF pages to JPG or PNG, extract selectable text, and convert JPG and PNG images to PDF.',
        ],
      ],
      keywords: [format.toLowerCase(), 'office', 'convert', 'docx', 'xlsx', 'pptx'],
    }),
  ),
].map((entry) => ({ ...entry, premium: toolDownloadAccess(entry.slug) === 'premium' }));
export const categories: ToolCategory[] = [
  'Edit & organize',
  'Convert',
  'Forms & signing',
  'More possibilities',
];
export const popularSlugs = [
  'edit-pdf',
  'merge-pdf',
  'compress-pdf',
  'split-pdf',
  'sign-pdf',
  'image-to-pdf',
];
export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
export const editorTools = ['edit-pdf', 'organize-pdf', 'sign-pdf', 'create-pdf-form'];

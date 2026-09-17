export type Guide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  published: string;
  updated: string;
  tool: string;
  relatedTools?: string[];
  sections: { title: string; text: string }[];
};
export const guides: Guide[] = [
  {
    slug: 'choose-a-free-pdf-editor',
    title: 'Choosing the Best Free PDF Editor for Your Task',
    description:
      'Choose a free PDF editor by checking downloads, text editing, signatures, file limits and privacy. See which Folio workflows are free and which require a plan.',
    category: 'Choosing your tools',
    readTime: '4 min read',
    published: '2026-09-17',
    updated: '2026-09-17',
    tool: 'edit-pdf',
    relatedTools: ['sign-pdf', 'merge-pdf', 'split-pdf', 'image-to-pdf'],
    sections: [
      {
        title: 'Choose for the document you need to finish',
        text: 'The best free PDF editor for your task is one that can produce the finished file you need within its free allowance. Adding a note, correcting an existing sentence, filling a form, and combining receipts are different jobs. Before uploading, identify the exact change and check whether both that feature and its download are free. This guide explains those choices using Folio’s current capabilities. It is written by the team behind Folio, not an independent ranking of competing products.',
      },
      {
        title: 'Check free downloads before spending time editing',
        text: 'An editor may let you preview a feature without including the finished download in its free tier. Check for payment requirements, export watermarks, file-size limits, and any sign-in requirement. Try a small, non-sensitive sample first: add a note, download it, and open it in another PDF reader. In Folio, added text, highlights, images, shapes, visual signatures, form fields, and page organization include free PDF downloads without a Folio watermark. Downloads containing original-text changes require a paid plan. Mixing a free annotation with an original-text change therefore makes that document’s export a paid workflow; you can undo the original-text change to keep an annotation-only export free.',
      },
      {
        title: 'Adding text and changing existing text are different',
        text: 'Use Add Text for a comment, date, name, or other addition. It places a new text box on the page without changing the words underneath. In Folio, choose Add Text, click the page, type your note, and adjust its position or appearance. Use Edit Text to replace supported words already in the PDF. That feature preserves the original appearance where the embedded font allows, but downloading those changes requires a plan. A white rectangle over a sentence does not securely remove it. If the document is a scan or its letters are drawn as shapes, it needs OCR or another reconstruction step; Folio’s original-text editor does not include OCR.',
      },
      {
        title: 'Use a focused free tool when editing is unnecessary',
        text: 'Choose Merge PDF to combine separate files, Split PDF to extract selected pages, or Image to PDF to collect photos and receipts into a document. Those workflows include free downloads and do not need original-text editing. For a form, Fill & Sign lets you complete supported fields and draw, type, or upload a visual signature. This is not a certificate-based digital signature or identity verification service. For compression, check the result rather than expecting a fixed reduction: Folio optimizes PDF structure without downsampling images, so an already optimized or image-heavy file may not get smaller.',
      },
      {
        title: 'Understand guest storage and file privacy',
        text: 'A tool that runs in a browser does not necessarily keep every file on your device. Folio’s editor automatically uploads documents and recovery drafts to private cloud storage. Guests can start without Google sign-in, receive 100 MB of storage, and have a 24-hour file expiry. When that space is full, delete old files before uploading more. Sign in to keep files in your account and access them across devices. Standalone merge, split, and image tools process files in the browser; server-assisted features use Folio or connected document services. Choose a workflow that fits your document’s confidentiality requirements, and keep your own original copy.',
      },
      {
        title: 'Review the exported file, not just the preview',
        text: 'After downloading, open the PDF in your usual reader. Confirm the page order, small text, signature placement, and any fields or links you need. Zoom in to inspect fine details. For a reusable form, leave fields interactive; a flattened copy makes their current appearance part of the page. Keep the original when changing a signed document, because rewriting it can invalidate its existing digital signature. Use Folio’s free editor when additions, signatures, and page changes solve your task. If you need substantial paragraph rewriting, editing the source document and exporting a fresh PDF may give you a more predictable result.',
      },
    ],
  },
  {
    slug: 'how-to-edit-a-pdf',
    title: 'How to Edit a PDF Online: Text, Annotations & Saving',
    description:
      'Add text, highlights, and a signature without losing sight of the original. A practical guide to working in the Folio editor.',
    category: 'Editing',
    readTime: '4 min read',
    published: '2026-09-14',
    updated: '2026-09-15',
    tool: 'edit-pdf',
    relatedTools: ['edit-pdf-text', 'organize-pdf', 'sign-pdf'],
    sections: [
      {
        title: 'Start with the right kind of edit',
        text: 'A PDF captures the appearance of a document. The free Folio editor adds annotations, text, images, shapes, and visual signatures. Choose Edit Text in the same workspace to replace supported original text blocks, with font, size, color, and find-and-replace controls. You can edit and preview first; original-text changes require a premium plan only at download. It does not reflow paragraphs or recognize scanned text. For extensive paragraph changes, editing the source document and exporting a fresh PDF is often the better fit.',
      },
      {
        title: 'Give each addition a clear purpose',
        text: 'Choose Edit PDF, open a document, and select Add text. Click where you want the annotation and type directly into its text box. For an existing PDF text block, choose Edit Text, select the words on the page, and type in place. The properties panel adjusts appearance. Adjust the size and color, and drag the annotation into place. A short note in the margin is often more readable than a large block over the original text. Use highlights sparingly so the most important passages still stand out. You can move, duplicate, resize, or delete your additions and use Undo to recover from a change.',
      },
      {
        title: 'Put the pages in order',
        text: 'The left sidebar shows page thumbnails. Select a page, then use the controls to move it up or down, rotate it, duplicate it, or delete it. Keep at least one page in the document. After changing page layout, review the position of annotations and form fields in the preview and exported copy. Add a blank page if you need room for notes or a new cover.',
      },
      {
        title: 'Save a draft, then check the export',
        text: 'The editor automatically uploads your PDF and saves a recovery workspace to private cloud storage. Use Save now to request a save, then wait for All changes saved before refreshing or leaving. Guests have 100 MB of storage and their files expire after 24 hours. Google sign-in opens separately so the editor remains open; signing in lets you keep files in your account. Download PDF creates your finished file. Added annotations, forms, and signatures export for free when no original-text changes remain. Check the downloaded pages in a PDF reader and keep an original copy.',
      },
    ],
  },
  {
    slug: 'how-to-merge-and-split-pdfs',
    title: 'How to Merge and Split PDF Files Without Losing Pages',
    description:
      'Learn when to merge documents, how to arrange their order, and how to extract just the pages you need.',
    category: 'Organization',
    readTime: '3 min read',
    published: '2026-09-13',
    updated: '2026-09-15',
    tool: 'merge-pdf',
    relatedTools: ['split-pdf', 'organize-pdf'],
    sections: [
      {
        title: 'Build one useful document',
        text: 'Merging works well when the recipient needs several pieces of information together: a proposal with its appendix, a portfolio with a cover, or a group of receipts for one project. Add at least two PDFs to Merge PDF. Use the up and down controls to set the file order before processing. Folio preserves each page’s dimensions, so a landscape chart can sit beside a portrait report.',
      },
      {
        title: 'Check the details before combining',
        text: 'Open the originals and check for duplicates, blank pages, and outdated versions. Think about which document should introduce the rest. Combining pages can change the behavior of interactive forms and invalidate existing cryptographic signatures. Keep original signed documents and forms separately when those properties matter. A merged copy is useful for reading, but it should not replace an original whose signature must remain verifiable.',
      },
      {
        title: 'Extract a useful section',
        text: 'Split PDF can export a range to one new PDF or put each selected page in a separate PDF inside a ZIP. Enter a range such as 1-3, 5, 8-10. Page numbers refer to the position in the file, not necessarily a number printed on the page. A report with an unnumbered cover may have printed page 1 at file position 2. Preview the document to make sure your selection matches what you intend to share.',
      },
      {
        title: 'Make the final copy easy to recognize',
        text: 'After downloading, open the result and confirm the first page, last page, and total page count. Give the file a clear name describing its contents. The source files remain on your device and are not changed. You can continue in the Folio editor to add a note or adjust the order further without manually uploading the result again.',
      },
    ],
  },
  {
    slug: 'why-your-pdf-wont-get-smaller',
    title: 'Why Your PDF Won’t Get Smaller — and What to Try',
    description:
      'Understand PDF file size, lossless optimization, image-heavy documents, and why compression results vary.',
    category: 'File size',
    readTime: '3 min read',
    published: '2026-09-13',
    updated: '2026-09-15',
    tool: 'compress-pdf',
    relatedTools: ['split-pdf', 'compress-images'],
    sections: [
      {
        title: 'A PDF is more than its page count',
        text: 'Two documents with the same number of pages can have very different sizes. A short scan with high-resolution photographs may be larger than a long text report. Embedded images, fonts, repeated objects, and the way the file was saved all contribute to the total. Page count alone is not a reliable way to predict how much a compressor will help.',
      },
      {
        title: 'What local optimization changes',
        text: 'Folio’s Compress PDF tool rewrites the document with compressed object streams. This can reduce structural overhead while retaining the existing text and image resolution. It does not downsample photographs or rasterize pages. The benefit depends on how the original PDF was produced. A file that was already saved efficiently may show little or no reduction.',
      },
      {
        title: 'When the original is the better result',
        text: 'If optimization produces a larger file, Folio says so and makes your original available instead. That is an honest outcome rather than a processing failure. Running the same file through the same optimization repeatedly is unlikely to keep reducing it. For an image-heavy document, exporting a smaller version from the original application may be more effective. Check its image-resolution settings and preview fine text carefully.',
      },
      {
        title: 'Choose readability over a target percentage',
        text: 'Before sharing, open the result at a normal reading size and zoom in on small text, charts, and signatures. Keep links and selectable text useful whenever possible. If an upload service sets a strict size limit, splitting a long document into useful sections may be more appropriate than making each page hard to read. Keep a full-quality original so you can produce a different version later.',
      },
    ],
  },
  {
    slug: 'fillable-pdf-vs-flattened-pdf',
    title: 'Fillable vs. Flattened PDFs: Which Should You Share?',
    description:
      'Understand editable PDF form fields, flattened exports, and visual signatures before sharing your completed document.',
    category: 'Forms',
    readTime: '3 min read',
    published: '2026-09-13',
    updated: '2026-09-15',
    tool: 'create-pdf-form',
    relatedTools: ['sign-pdf'],
    sections: [
      {
        title: 'Leave room for the next person',
        text: 'A fillable PDF contains interactive fields such as text boxes, checkboxes, dropdowns, and radio groups. Someone can open it in a compatible PDF reader and enter their own details. This is useful for a reusable questionnaire, an onboarding form, or a standard project inquiry. Clear field names, meaningful labels, and a logical order make the form easier to complete.',
      },
      {
        title: 'Build or fill with Folio',
        text: 'Create a PDF form opens the editor, where you can place new text fields and checkboxes on a page. Name each field uniquely. The Form panel shows supported existing fields along with fields you add, so you can enter values before exporting. The original page preview does not update to show edits to existing form values; review the downloaded PDF to confirm their appearance. You can also start with one of Folio’s original sample templates.',
      },
      {
        title: 'Understand what flattening does',
        text: 'Flattening turns the visible appearances of form fields into regular page content. The result is no longer an interactive form. This can help preserve a completed form’s appearance, but it is not encryption, access protection, or secure redaction. Keep a fillable original if you may need to change answers or send the blank form to someone else.',
      },
      {
        title: 'Choose the right signature workflow',
        text: 'A typed or drawn signature is a visual mark. Folio adds these marks as document annotations; it does not verify identity, issue certificates, or create a cryptographic audit trail. If a recipient requires a certificate-based digital signature, use their specified signing process. For ordinary completed forms, confirm the recipient’s format requirements and check that the exported values are visible in their preferred PDF reader.',
      },
    ],
  },
  {
    slug: 'how-to-sign-a-pdf',
    title: 'How to Sign a PDF: Draw, Type or Upload Your Signature',
    description:
      'Add a signature to a PDF using a mouse, touch screen, typed name, or image. Position it clearly and check the finished document before sharing.',
    category: 'Signing',
    readTime: '3 min read',
    published: '2026-09-15',
    updated: '2026-09-15',
    tool: 'sign-pdf',
    relatedTools: ['create-pdf-form', 'edit-pdf'],
    sections: [
      {
        title: 'Choose how you want to sign',
        text: 'Open Sign PDF and choose your document. In the editor, select Sign to open the signature dialog. Draw is useful when you want to write with a mouse, stylus, or touch screen. Type turns your name into a visual signature. Image lets you use a signature picture you already have. These are three ways to place a visual mark on the page; choose the one that gives the clearest result at the size you need.',
      },
      {
        title: 'Create a clear signature',
        text: 'For a drawn signature, write comfortably across the drawing area instead of squeezing the mark into a corner. Clear it and try again if the strokes overlap or the name is difficult to read. For a typed signature, check spelling and preview the style before inserting it. For an image, use a tightly cropped picture with enough detail to remain clear when resized. A transparent PNG can avoid a white rectangle covering a colored form background.',
      },
      {
        title: 'Place it beside the right information',
        text: 'Confirm the signature in the dialog, place it on the page, and adjust its position and size. Avoid stretching it into a different proportion or covering printed labels. Use Add Text for a date or printed name if the PDF has no fillable field for them. A signature on one page does not automatically sign every page: check whether the recipient has marked additional places for initials or a signature and complete those separately.',
      },
      {
        title: 'Check the download and keep the right original',
        text: 'A PDF containing only added signatures, annotations, and form values downloads for free. Changes to original PDF text use premium downloads. Open the exported copy to confirm the signature is visible and the page order is correct. Folio visual signatures do not create a digital certificate or verify identity. If the recipient asks for certificate-based signing or a particular signing platform, use that process. Keep an unsigned original and check the editor save status before closing your workspace.',
      },
    ],
  },
  {
    slug: 'how-to-convert-pdf-to-images',
    title: 'How to Convert PDF Pages to JPG or PNG at the Right Resolution',
    description:
      'Choose JPG or PNG, select PDF pages, and set export resolution. Learn how to keep small text clear without making image files unnecessarily large.',
    category: 'Conversion',
    readTime: '3 min read',
    published: '2026-09-15',
    updated: '2026-09-15',
    tool: 'pdf-to-png',
    relatedTools: ['pdf-to-jpg', 'pdf-to-text', 'compress-images'],
    sections: [
      {
        title: 'Choose a format for the content',
        text: 'PNG is a useful starting point for screenshots, charts, diagrams, and pages with small text because its compression does not add JPEG artifacts. JPG often produces a smaller file for photographs and illustrated pages, although sharp letter edges can become less distinct at lower quality. Both formats turn the entire PDF page into pixels. Links, selectable text, and interactive form fields do not remain interactive in the image. Use PDF to Text instead if you need the selectable words.',
      },
      {
        title: 'Select just the pages you need',
        text: 'Open PDF to PNG or PDF to JPG and choose a PDF. Enter the required page range, such as 1-3, 5, to export the first three pages and page five. Use positions in the file rather than printed page labels; a cover sheet can shift the numbering. Convert the selection and inspect the result preview. Exporting one page makes an image file, while several pages are packaged in a ZIP. The preview navigation lets you check each page before downloading.',
      },
      {
        title: 'Match resolution to the intended size',
        text: 'Use a lower resolution for a small screen preview and a higher resolution when small text or printing matters. At 300 DPI, a US Letter page is about 2550 by 3300 pixels. Doubling resolution in both directions creates roughly four times as many pixels, so processing and file size can grow quickly. More pixels cannot reconstruct detail missing from an original scan. Folio limits raster output to 25 million pixels per page and 200 pages per export to bound memory use.',
      },
      {
        title: 'Inspect the actual result before sharing',
        text: 'Look at the exported preview at a useful reading size, especially footnotes, fine chart lines, and signatures. If JPG letters look uneven, try PNG or a higher resolution and compare. If the file is too large, export fewer pages or choose a smaller resolution. You can also use Compress Images after export, checking the new result before replacing the first version. These conversions and downloads are free, and your original PDF remains unchanged.',
      },
    ],
  },
  {
    slug: 'how-to-combine-images-into-pdf',
    title: 'How to Combine JPG, PNG and WEBP Images into One PDF',
    description:
      'Turn receipts, photos, or screenshots into an ordered PDF. Choose image-sized or A4 pages, check orientation, and preview every page before export.',
    category: 'Conversion',
    readTime: '3 min read',
    published: '2026-09-15',
    updated: '2026-09-15',
    tool: 'image-to-pdf',
    relatedTools: ['jpg-to-pdf', 'png-to-pdf', 'merge-images', 'compress-images'],
    sections: [
      {
        title: 'Prepare pictures that belong together',
        text: 'Combining images into one PDF is useful for a set of receipts, project photographs, or screenshots that someone should read in order. Open Image to PDF for a mixed group of JPG, PNG, and WEBP files, or choose a format-specific tool for JPG or PNG. Each image becomes a separate page. Check that every picture is readable before adding it; packaging a blurred receipt inside a PDF will not make its details clearer.',
      },
      {
        title: 'Arrange the reading order',
        text: 'Choose the images and use the move controls beside each file to set their order. Remove accidental duplicates before creating the PDF. The tool accepts up to 20 files per batch, with a 50 MB limit for each file and a 150 MB combined limit. Very large images may need resizing first. Keep the originals separately if you plan to adjust brightness or compression. File names can help you recognize pages, but the order in the workspace determines the PDF order.',
      },
      {
        title: 'Choose page dimensions deliberately',
        text: 'Fit-to-image makes each page follow its picture’s proportions, using 96 pixels per inch to determine the PDF page dimensions. A4 centers the picture on a standard page with margins, which is useful when the document will be printed or combined with other A4 paperwork. Mixing portrait and landscape photographs is allowed. Ordinary JPG and PNG images retain their image data; WEBP and photos that need orientation correction are decoded before embedding so they display correctly.',
      },
      {
        title: 'Review the PDF, not only the file list',
        text: 'Choose Create PDF and move through the result preview. Confirm the first and last pages, orientation, visible margins, and total page count. If something is wrong, adjust the order or page setting and recreate the result. Download the PDF when it looks right; this workflow is free. Text photographed inside the images remains part of those images rather than selectable PDF text. A searchable text layer needs OCR, which is not currently a standalone Folio tool.',
      },
    ],
  },
  {
    slug: 'how-to-password-protect-a-pdf',
    title: 'How to Password Protect a PDF Before Sharing It',
    description:
      'Create a PDF that requires an opening password. Check encryption limits, retain an original, and avoid confusing password protection with redaction.',
    category: 'Protection',
    readTime: '3 min read',
    published: '2026-09-15',
    updated: '2026-09-15',
    tool: 'protect-pdf',
    relatedTools: ['split-pdf'],
    sections: [
      {
        title: 'Start with a supported original',
        text: 'Open Protect PDF and choose an unencrypted, unsigned PDF. The tool accepts files up to 10 MB and 100 pages. If the file is larger, prepare an appropriate smaller copy or split the document before protecting it. Keep an unencrypted original somewhere you can access independently. Rewriting a document can invalidate a cryptographic signature, so Folio requires an unsigned source for this workflow. Adding an opening password is a separate task from signing the document.',
      },
      {
        title: 'Set and confirm the opening password',
        text: 'Enter a password of 8–64 characters, then type it again in the confirmation field. Use the visibility control to check it in a private setting if the values do not match. Avoid placing the password in the PDF file name or on its first page. Folio processes the PDF and password in memory when creating the protected download and does not save the opening password. The application cannot recover it for you later, so keep your own record.',
      },
      {
        title: 'Download and test the protected copy',
        text: 'You can choose your file and configure protection before paying. Downloading the encrypted copy requires a premium plan. Sign-in and checkout open separately so the current workspace stays open. After access is confirmed, request the protected download, then open that file in a PDF reader and confirm it asks for the correct password. Folio uses AES-256 encryption for this copy. Send the password through a separate channel when that fits your sharing process.',
      },
      {
        title: 'Understand what protection does and does not change',
        text: 'An opening password controls access to the file. Once someone can open it, this workflow does not prevent them from copying or sharing its contents. It also does not remove sensitive text, clean metadata, or sanitize attachments. If you need a redacted document, use a process designed to remove that information and verify its result separately. Keep the original and the protected copy clearly named, and check that you are sharing the intended version.',
      },
    ],
  },
];

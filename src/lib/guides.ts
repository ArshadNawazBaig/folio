export const guides = [
  {
    slug: 'how-to-edit-a-pdf',
    title: 'A thoughtful guide to editing your PDF',
    description:
      'Add text, highlights, and a signature without losing sight of the original. A practical guide to working in the Folio editor.',
    category: 'Editing',
    readTime: '4 min read',
    updated: '2026-09-14',
    tool: 'edit-pdf',
    sections: [
      {
        title: 'Start with the right kind of edit',
        text: 'A PDF captures the appearance of a document. The free Folio editor adds annotations, text, images, shapes, and visual signatures. The Pro PDF text editor replaces supported existing text blocks and offers font, size, color, and find-and-replace controls. It does not reflow paragraphs or recognize scanned text. For extensive paragraph changes, editing the source document and exporting a fresh PDF is often the better fit.',
      },
      {
        title: 'Give each addition a clear purpose',
        text: 'Choose Edit PDF, open a document, and select Add text. Click where you want the annotation, then replace its wording in the properties panel. Adjust the size and color, and drag the annotation into place. A short note in the margin is often more readable than a large block over the original text. Use highlights sparingly so the most important passages still stand out. You can move, duplicate, resize, or delete your additions and use Undo to recover from a change.',
      },
      {
        title: 'Put the pages in order',
        text: 'The left sidebar shows page thumbnails. Select a page, then use the controls to move it up or down, rotate it, duplicate it, or delete it. Keep at least one page in the document. If a page already has annotations, export the PDF and reopen that copy before rotating it; this keeps all of the new marks aligned with the page. Add a blank page if you need room for notes or a new cover.',
      },
      {
        title: 'Save a draft, then check the export',
        text: 'Save to cloud uploads your edited PDF to your private account so you can open it on another device. Sign in when saving, and keep the editor tab open until the upload finishes. Download PDF creates a separate file containing your changes. Open that exported file in a PDF reader and check the pages you edited, including any signatures or form fields. Keep your original separately. Unsaved changes stay in the current tab. Download a separate backup of work you want to keep.',
      },
    ],
  },
  {
    slug: 'how-to-merge-and-split-pdfs',
    title: 'Bring PDFs together. Take them apart.',
    description:
      'Learn when to merge documents, how to arrange their order, and how to extract just the pages you need.',
    category: 'Organization',
    readTime: '3 min read',
    updated: '2026-09-13',
    tool: 'merge-pdf',
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
    title: 'Why some PDFs won’t get smaller',
    description:
      'Understand PDF file size, lossless optimization, image-heavy documents, and why compression results vary.',
    category: 'File size',
    readTime: '3 min read',
    updated: '2026-09-13',
    tool: 'compress-pdf',
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
    title: 'Fillable or flattened? Choose the right PDF.',
    description:
      'Understand editable PDF form fields, flattened exports, and visual signatures before sharing your completed document.',
    category: 'Forms',
    readTime: '3 min read',
    updated: '2026-09-13',
    tool: 'create-pdf-form',
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
];

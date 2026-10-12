import type { Guide } from './guides';

// Substantive English revision; other languages retain their reviewed edition.
export const editingGuideRevision: NonNullable<Guide['englishRevision']> = {
  updated: '2026-10-12',
  summary:
    'To edit a PDF online, open Edit PDF, choose your file and select Open in editor after the preview loads. Use Add Text for a new note, Edit Text to replace supported original words, or Sign for a visual signature. Download PDF exports the result for free. You can start without an account; the editor uploads and saves your document to a private cloud workspace. Scanned words need OCR elsewhere before they can become editable text.',
  sections: [
    {
      title: 'Which kind of PDF edit do you need?',
      text: 'Choose the control by what should change in the finished document. Adding a text box leaves the original words underneath it; replacing original text is a separate operation. A PDF also does not rearrange paragraphs like a word processor, so extensive rewriting is usually easier in the source document.',
      table: {
        caption: 'Choose a tool for the change you want to make',
        columns: ['Your task', 'Use', 'Check before continuing'],
        rows: [
          {
            name: 'Add an answer, date or review note',
            href: '/guides/how-to-add-text-to-a-pdf',
            cells: [
              'Add Text in Edit PDF',
              'Place the new box in a clear area. It does not replace or remove existing words.',
            ],
          },
          {
            name: 'Correct a typo in existing text',
            href: '/edit-pdf-text',
            cells: [
              'Edit Text, or the PDF text editor',
              'The text block must be supported. Longer replacements do not automatically reflow the paragraph.',
            ],
          },
          {
            name: 'Fill an interactive form',
            href: '/guides/fillable-pdf-vs-flattened-pdf',
            cells: [
              'The PDF’s supported form fields',
              'A flat or scanned form has no interactive fields; Add Text can place answers over its blank areas.',
            ],
          },
          {
            name: 'Add a signature',
            href: '/sign-pdf',
            cells: [
              'Sign in the editor',
              'A visual signature does not create a digital certificate or verify the signer’s identity.',
            ],
          },
          {
            name: 'Reorder or remove pages',
            href: '/organize-pdf',
            cells: [
              'Page controls, or Organize PDF',
              'Review the page order and keep at least one page.',
            ],
          },
          {
            name: 'Change words in a scanned image',
            href: '/guides/why-cant-i-edit-pdf-text',
            cells: [
              'OCR software or the original source document',
              'Folio does not include OCR. Covering scanned words with a shape is not secure redaction.',
            ],
          },
        ],
      },
    },
    {
      title: 'Add text to a PDF, step by step',
      text: 'Keep an original copy before you start. A short note beside the relevant content is usually easier to read than a large block placed over the document.',
      steps: [
        'Open Edit PDF and choose your PDF. Wait for the preview, then select Open in editor.',
        'Choose Add Text, click a clear area of the page and type your note.',
        'Use the properties controls to set the size and color. Move or resize the box until it fits without covering important content.',
        'Use Undo if a change goes wrong. Review the other pages if you also moved, rotated or deleted pages.',
        'Choose Download PDF. Reopen the downloaded file and confirm the note appears on the correct page.',
      ],
      links: [
        { label: 'Open the free PDF editor', href: '/edit-pdf' },
        {
          label: 'Follow the Android and iPhone editing steps',
          href: '/guides/how-to-edit-a-pdf-on-mobile',
        },
      ],
    },
    {
      title: 'Replace existing PDF text without confusing it with an annotation',
      text: 'Choose Edit Text in the workspace, select a supported original text block and enter the replacement. Keep the original font where possible and inspect the spacing. The separate PDF text editor also offers a built-in sample: change “A place to” to “A space to”, update the preview and check the download. Neither path recognizes scanned words or reflows surrounding paragraphs. If no text block can be selected, first check whether the page is a scan, outlined lettering or a restricted document.',
      links: [
        { label: 'Try the original-text editing sample', href: '/edit-pdf-text?demo=1' },
        {
          label: 'Troubleshoot PDF text that will not edit',
          href: '/guides/why-cant-i-edit-pdf-text',
        },
      ],
    },
    {
      title: 'Practice: add a review note to the budget page',
      text: 'The six-page practice packet contains fictional material. Use it to check the workflow before opening a document of your own. This example adds a note; it does not change the budget figures.',
      steps: [
        'Download the six-page practice PDF below and open it in Edit PDF.',
        'Go to file page 3, the budget page. Choose Add Text and enter “Please confirm the material quantities.” in an empty area.',
        'Adjust the note so it stays clear of the existing wording and amounts.',
        'Download the result and open page 3 in a PDF reader. Confirm that the note is readable, the original figures remain visible and all six pages are present.',
      ],
      links: [
        {
          label: 'Download the six-page practice PDF',
          href: '/samples/page-selection-practice.pdf',
        },
      ],
    },
    {
      title: 'Save your workspace and check the finished file',
      text: 'The editor uploads your PDF and saves a recovery workspace to private cloud storage. Use Save now and wait for All changes saved before leaving when you need to resume later. Guests have 100 MB of storage and their files expire after 24 hours; signing in lets you keep files in your account. A saved workspace and a downloaded PDF serve different purposes: keep the downloaded file for sharing, and reopen it to check text, form values, signatures and page order. Annotations, supported original-text changes and downloads are free. A box over sensitive content does not remove that content from the PDF.',
      links: [
        {
          label: 'Understand which Folio tools upload files',
          href: '/guides/does-folio-upload-pdf-files',
        },
        { label: 'Compare editors for your task', href: '/guides/choose-a-free-pdf-editor' },
      ],
    },
  ],
};

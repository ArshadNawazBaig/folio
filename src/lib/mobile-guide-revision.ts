import type { Guide } from './guides';

// Reviewed English edition. Existing translations keep their reviewed content and date.
export const mobileGuideRevision: NonNullable<Guide['englishRevision']> = {
  updated: '2026-10-05',
  summary:
    'To edit a PDF on your phone, first save the document where your browser’s file picker can find it, then open Edit PDF and choose the file. Use Add Text for a new note, Edit Text to change supported original words, or Sign for a visual signature. Download the finished PDF and reopen it before sharing. The browser editor works without installing an app, but its private cloud saving needs an internet connection.',
  sections: [
    {
      title: 'Choose the kind of PDF edit you need',
      text: '“Edit a PDF” can mean several different things. A note, a form answer and a correction to the original wording use different controls. All available Folio tools and downloads are free; you can start the editor as a guest.',
      table: {
        caption: 'Which PDF control should you use on a phone?',
        columns: ['Your task', 'Control', 'What it changes'],
        rows: [
          {
            name: 'Add a date, answer or note',
            cells: [
              'Add Text',
              'Places a new text box on the page. Existing wording stays in the PDF.',
            ],
          },
          {
            name: 'Correct original wording',
            cells: [
              'Edit Text',
              'Changes supported original text blocks. Scanned words need OCR elsewhere.',
            ],
          },
          {
            name: 'Add your signature',
            cells: [
              'Sign',
              'Places a drawn, typed or uploaded visual signature. It is not certificate-based signing.',
            ],
          },
          {
            name: 'Complete existing form fields',
            cells: [
              'Fill the PDF’s supported fields',
              'Enter answers in the interactive fields. For a flat scan, add text over the answer areas.',
            ],
          },
        ],
      },
      links: [{ label: 'Open the free PDF editor', href: '/edit-pdf' }],
    },
    {
      title: 'How to edit a PDF on Android in your browser',
      text: 'Start with a saved PDF. If the document is inside an email or messaging app, download a copy first. Seeing a PDF in an attachment preview does not necessarily make it available to the browser’s file picker.',
      steps: [
        'Open Edit PDF in your browser and choose the PDF from the file picker. Check Recent, Downloads or the storage location where you saved it; labels vary by phone.',
        'Wait for the page preview. Swipe the editor toolbar horizontally to find Add Text, Edit Text or Sign.',
        'For a new note, choose Add Text, tap an empty part of the page and type. For original wording, follow the Edit Text steps below.',
        'Open Properties and forms when you need appearance controls, then close it to see the page. Use Move and the bottom zoom controls for precise placement.',
        'Use Download PDF and wait for the browser to finish. In Chrome, find the file under More → Downloads or in your device’s Files app.',
        'Reopen the downloaded file, inspect the edited page and share that checked copy.',
      ],
      links: [
        { label: 'Edit a PDF on Android', href: '/edit-pdf' },
        {
          label: 'Google Chrome: find and share Android downloads',
          href: 'https://support.google.com/chrome/answer/95759?co=GENIE.Platform%3DAndroid&hl=en',
        },
      ],
    },
    {
      title: 'How to edit a PDF on iPhone in Safari',
      text: 'Keep the original in Files before editing. If Safari is displaying the source PDF, open its Share menu and choose Save to Files. Choose a folder you can recognize when the file picker opens.',
      steps: [
        'Open Edit PDF in Safari, choose a file and use the picker to locate the PDF you saved in Files.',
        'Wait for the document to load. Swipe the toolbar to reveal the control you need; it may be outside the visible part of the toolbar.',
        'Add your note or signature, or use Edit Text for supported original text. Close the on-screen keyboard before checking the final placement.',
        'Use Download PDF. If the browser displays the finished PDF instead of saving it immediately, use Share → Save to Files and choose a name and folder.',
        'Open the saved PDF from Files and confirm that the changes are present before sending it.',
      ],
      links: [
        { label: 'Edit a PDF on iPhone', href: '/edit-pdf' },
        {
          label: 'Apple: save a PDF from Safari to Files',
          href: 'https://support.apple.com/guide/iphone/ipha9ed5131c/ios',
        },
      ],
    },
    {
      title: 'How do I change the original PDF text on my phone?',
      text: 'Choose Edit Text when you need to correct words already in the document. Add Text creates a separate box; covering a word with that box does not remove the original content. Short replacements are easier to fit on a small screen.',
      steps: [
        'In the editor, choose Edit Text and wait for the supported text blocks to become selectable.',
        'Tap the text block and enter the replacement. Use Properties for appearance controls when needed.',
        'Keep the original font where possible and inspect the updated page. Longer wording does not automatically reflow the surrounding paragraph.',
        'Download the PDF, reopen it and check both the new wording and its spacing.',
      ],
      links: [
        { label: 'Try the original-text editor’s built-in sample', href: '/edit-pdf-text?demo=1' },
        { label: 'Why some PDF text cannot be edited', href: '/guides/why-cant-i-edit-pdf-text' },
      ],
    },
    {
      title: 'Try a practice PDF before editing your own document',
      text: 'Download the fictional portrait practice PDF below and select it in Edit PDF. Add “Reviewed on my phone” in a blank area, then download and reopen the result. Check that the new note is readable, the original heading is intact and the page edges are not clipped. This checks the full file-picker-to-download workflow without using a personal document.',
      links: [
        { label: 'Download the fictional practice PDF', href: '/samples/a4-portrait-practice.pdf' },
        { label: 'Open the editor for this practice', href: '/edit-pdf' },
      ],
    },
    {
      title: 'Fix common phone editing and download problems',
      text: 'The browser’s file picker, the PDF editor and your phone’s downloads are separate places. Follow the symptom rather than repeatedly selecting the same file.',
      table: {
        caption: 'Mobile PDF problems and the next thing to check',
        columns: ['Problem', 'What to try'],
        rows: [
          {
            name: 'The attachment is missing from the picker',
            cells: [
              'Save it from the email or messaging app to Files or Downloads, then choose that saved copy.',
            ],
          },
          {
            name: 'I cannot see Add Text or Sign',
            cells: [
              'Swipe the toolbar horizontally. Close Properties and forms when it covers the page.',
            ],
          },
          {
            name: 'The original words cannot be selected',
            cells: [
              'The page may be a scan or use outlined lettering. Folio does not provide OCR; adding a note is still a separate option.',
            ],
          },
          {
            name: 'I saved, but cannot find a PDF on my phone',
            cells: [
              'Save now stores the editable cloud workspace. Download PDF creates the file to keep or share. Check the browser’s download list.',
            ],
          },
          {
            name: 'The tab reloads or the file fails repeatedly',
            cells: [
              'Keep the original and try a smaller document or a desktop browser. Image-heavy PDFs can exceed a phone’s available memory.',
            ],
          },
        ],
      },
    },
    {
      title: 'Keep an original and understand guest saving',
      text: 'The editor uploads your PDF to private cloud storage for recovery. Guests have 100 MB of storage and files expire after 24 hours; wait for All changes saved before refreshing and download a finished copy before expiry. Sign in when you need to keep work in an account or access it on another device. A white box over sensitive text is not secure redaction, and editing an already digitally signed PDF can invalidate its signature. For long documents or precise layout work, a desktop gives you more room to check the result.',
      links: [
        { label: 'How Folio handles uploaded PDFs', href: '/guides/does-folio-upload-pdf-files' },
        { label: 'Add text: a detailed walkthrough', href: '/guides/how-to-add-text-to-a-pdf' },
      ],
    },
  ],
};

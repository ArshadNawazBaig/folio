import type { Guide } from './guides';

export const signingGuideRevision: NonNullable<Guide['englishRevision']> = {
  updated: '2026-10-15',
  readTime: '4 min read',
  summary:
    'Open Fill & sign, choose your PDF and enter the editor. Select Sign, choose Draw, Type or Image, then Add signature. Move and resize the mark on the correct line, complete any name or date fields, and download the PDF for free. Folio adds a visual signature; it does not verify identity or create a certificate-based digital signature.',
  sections: [
    {
      title: 'Check what the recipient means by “sign this PDF”',
      text: 'A request for a visible signature on a page differs from a signing link that records identities, consent or certificates. Folio places a drawn mark, styled name or signature image on the PDF. It does not manage a multi-person signing process or create a certificate or audit trail. If you received a signing link or instructions for a specific service, follow those instructions. For an already digitally signed document, keep the original; editing it can invalidate its existing signature.',
    },
    {
      title: 'Choose Draw, Type or Image for the clearest result',
      text: 'In the editor, select Sign to open the signature dialog. Work at a comfortable size; you can resize the result on the document afterward. A mouse, touch screen or stylus can be used for Draw. Type uses a font rather than reproducing your handwriting.',
      table: {
        caption: 'Signature methods in the Folio editor',
        columns: ['Method', 'How to prepare it', 'Check in the preview'],
        rows: [
          {
            name: 'Draw',
            cells: [
              'Write in the pad. Use Undo stroke for the last mark or Clear signature to restart.',
              'Keep loops and long strokes away from the edges.',
            ],
          },
          {
            name: 'Type',
            cells: [
              'Enter your name and choose Classic, Handwritten or Flowing.',
              'Confirm spelling and that all characters display before adding the signature.',
            ],
          },
          {
            name: 'Image',
            cells: [
              'Choose a PNG, JPG or WebP image up to 5 MB. Remove white background is available for a paper signature.',
              'Use a clear, cropped image; shadows or colored paper can leave an unwanted patch.',
            ],
          },
        ],
      },
      links: [
        {
          label: 'Make a reusable transparent signature PNG',
          href: '/guides/create-transparent-signature-png',
        },
      ],
    },
    {
      title: 'Place the signature and finish the surrounding fields',
      text: 'Read the page before placing anything, including the label beside the signature line. A document may have separate spaces for the customer, supplier, witness or approver. Placing a mark on the wrong line is easy to miss when you only look at the signature itself.',
      steps: [
        'Open Fill & sign, choose the PDF and select Open in editor after the preview loads.',
        'Navigate to the intended signature page. Choose Sign, prepare the mark and select Add signature.',
        'Drag the added signature into place and resize it to fit without covering labels or nearby wording.',
        'Use the Form panel for supported name and date fields. If there are no fields, use Add Text for those details.',
        'Check the remaining pages for additional signature or initial boxes; a signature added once does not appear automatically elsewhere.',
        'Choose Download PDF and open the downloaded copy to check the signature and all entered values.',
      ],
      links: [{ label: 'Open Fill & sign', href: '/sign-pdf' }],
    },
    {
      title: 'Fix a white background, a disabled button or a missing signature',
      text: 'Start with the symptom in the signature dialog or the downloaded PDF. If the mark is correct in the editor but absent from the file you opened, check that you downloaded the edited copy rather than reopening the original.',
      table: {
        caption: 'Common PDF signing problems',
        columns: ['Problem', 'What to do'],
        rows: [
          {
            name: 'A white rectangle covers the line',
            cells: [
              'In Image, enable Remove white background and inspect the result, or use a transparent PNG. A screenshot of a signature preview can include its background.',
            ],
          },
          {
            name: 'Add signature is disabled',
            cells: [
              'Add content to the active tab and wait for the image or font to load. If a typed style fails, choose Classic.',
            ],
          },
          {
            name: 'The mark is blurry or clipped',
            cells: [
              'Use a sharper source image or redraw with space around the strokes. Avoid enlarging a small image beyond its useful detail.',
            ],
          },
          {
            name: 'Sign is not visible on a phone',
            cells: [
              'Swipe the editor toolbar horizontally. Close Properties and forms when the panel covers the signature area.',
            ],
          },
          {
            name: 'The download is missing on a phone',
            cells: [
              'Check the browser’s downloads list and Files app. Save now keeps the workspace; Download PDF creates the file to send.',
            ],
          },
        ],
      },
    },
    {
      title: 'Check the signed copy at reading size',
      text: 'Open the exported PDF at a normal reading size and confirm the signature is complete, on the correct page and beside the intended name. Check any initials, dates and completed fields. For a document that will be printed, inspect a print preview or test print for a faint or undersized mark. Send the finished PDF when the recipient asks for a signed document; a separate reusable signature image is a different file.',
    },
    {
      title: 'Keep a finished download and understand where the draft is saved',
      text: 'Signing inside the PDF editor uploads the document and changes for private cloud saving. Wait for All changes saved if you need to resume the workspace. Guests have 100 MB of storage and a 24-hour file expiry; signing in keeps saved files in your account until deleted. Download the finished PDF before guest expiry. The separate Signature generator keeps an image in the current tab without uploading it, but placing that image in the editor brings it into the saved document workflow.',
      links: [
        {
          label: 'Read the mobile editing and download walkthrough',
          href: '/guides/how-to-edit-a-pdf-on-mobile',
        },
        {
          label: 'Understand document uploads and cloud saving',
          href: '/guides/does-folio-upload-pdf-files',
        },
      ],
    },
  ],
};

import type { Guide } from './guides';

export const protectionGuideRevision: NonNullable<Guide['englishRevision']> = {
  updated: '2026-10-15',
  readTime: '4 min read',
  summary:
    'Protect PDF creates an AES-256 encrypted copy that requires an opening password. Choose an unencrypted, unsigned PDF up to 10 MB and 100 pages, enter and confirm a password, then select Protect & download. The PDF and password are sent to Folio for server processing. Reopen the protected download to verify the password before sharing it, and keep your original and password separately.',
  sections: [
    {
      title: 'Check that an opening password solves the sharing problem',
      text: 'An opening password is useful when the recipient should need a secret before reading the PDF. It does not verify who the recipient is, stop someone who knows the password from sharing the document, or remove information from its pages. If a portal specifies an unencrypted upload, adding a password can make the file unusable there. Confirm the receiving workflow before protecting your only working copy.',
      table: {
        caption: 'Password protection compared with other document tasks',
        columns: ['Your requirement', 'Does this tool do it?', 'What to use or check'],
        rows: [
          {
            name: 'Require a password to open the file',
            cells: ['Yes', 'Protect the PDF, then test the downloaded copy in a reader.'],
          },
          {
            name: 'Recover an unknown password',
            cells: [
              'No',
              'Ask the document owner for access or use an original you can already open.',
            ],
          },
          {
            name: 'Remove sensitive words or metadata',
            cells: [
              'No',
              'Use a suitable redaction or sanitization workflow and verify its result before sharing.',
            ],
          },
          {
            name: 'Verify the signer or prevent later changes',
            cells: ['No', 'Follow the recipient’s required certificate or signing process.'],
          },
        ],
      },
    },
    {
      title: 'Prepare a supported PDF before choosing a password',
      text: 'Use an unencrypted, unsigned source with no more than 100 pages and a file size up to 10 MB. The protection workflow also rejects XFA forms. Open the source in a PDF reader first and keep a separate original. If the document is already encrypted, use an unlocked copy you are authorized to create. If it has a digital certificate signature, obtain an unsigned original instead of assuming that rewriting the signed copy will preserve verification.',
      links: [
        { label: 'Extract required pages from a larger source', href: '/split-pdf' },
        {
          label: 'Understand why PDF compression may not meet a size limit',
          href: '/guides/why-your-pdf-wont-get-smaller',
        },
      ],
    },
    {
      title: 'Set the opening password and download the protected copy',
      text: 'Choose a password you can store and communicate accurately. Avoid placing it in the filename or the same message as the attachment when your sharing process allows a separate channel. Folio does not keep a recoverable password for you. The form accepts 8–64 characters, while processing also enforces a maximum of 64 UTF-8 bytes. Accented letters, non-Latin characters and emoji can use more than one byte each; a password with fewer than 64 visible characters may still exceed the limit.',
      steps: [
        'Open Protect PDF, select Choose a PDF and choose the supported source.',
        'Enter the password in Opening password and repeat it exactly in Confirm password.',
        'Use Show password in a private setting if you need to check a mismatch. Remove unintended spaces or pasted line breaks.',
        'Select Protect & download and wait for the protected file. The download name ends in -protected.pdf.',
        'Keep your password record independently of the PDF. The password fields clear after a successful download.',
      ],
      links: [{ label: 'Open Protect PDF', href: '/protect-pdf' }],
    },
    {
      title: 'Verify the downloaded copy before sending it',
      text: 'Close the document preview and open the file whose name ends in -protected.pdf in a PDF reader. Confirm that it asks for a password, rejects an incorrect entry and opens with the password you recorded. Some readers remember an entered password for the current session; if no prompt appears, use a fresh reader session and check that you opened the protected file. After opening it, inspect the page count and several pages, including any forms or images important to the recipient. Keep the protected copy clearly distinct from the unencrypted original.',
    },
    {
      title: 'Resolve an error without losing the source',
      text: 'A failed protection request does not make an unsupported source suitable for encryption. Follow the actual error, then retry with a compatible copy. Downloading the original from the tool does not protect it.',
      table: {
        caption: 'Password protection errors and practical next steps',
        columns: ['Problem', 'Next step'],
        rows: [
          {
            name: 'The passwords do not match',
            cells: [
              'Re-enter both fields and check accidental spaces, letter case and keyboard layout.',
            ],
          },
          {
            name: 'The password is rejected despite its character count',
            cells: [
              'Check the 64-byte limit and remove control characters such as line breaks. Store the exact revised password.',
            ],
          },
          {
            name: 'The file exceeds the size or page limit',
            cells: [
              'Return to the source application for a smaller export or extract only the needed pages. Splitting by page count does not guarantee a file under 10 MB.',
            ],
          },
          {
            name: 'The file is signed, encrypted or uses XFA forms',
            cells: [
              'Obtain a compatible original or use a tool that supports that document. Do not discard the signed original.',
            ],
          },
          {
            name: 'The password has been forgotten',
            cells: [
              'Use your retained unencrypted original to create a new protected copy with a new password. Folio cannot retrieve the old one.',
            ],
          },
        ],
      },
    },
    {
      title: 'Understand where the PDF and password are processed',
      text: 'Protect PDF sends the PDF and opening password to Folio for processing on its server; this is not a local-only tool. The application processes them in memory and does not persist them in document storage, though hosting infrastructure may buffer requests. An editor draft you opened beforehand has its own private cloud saving and retention. The protected download remains wherever your browser saves it. Review the privacy explanation when choosing a workflow for confidential documents.',
      links: [
        { label: 'Read Folio’s file handling and retention details', href: '/privacy' },
        {
          label: 'Compare local tools and cloud saving',
          href: '/guides/does-folio-upload-pdf-files',
        },
      ],
    },
  ],
};

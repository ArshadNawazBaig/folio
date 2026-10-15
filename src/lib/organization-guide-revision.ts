import type { Guide } from './guides';

export const organizationGuideRevision: NonNullable<Guide['englishRevision']> = {
  updated: '2026-10-15',
  readTime: '5 min read',
  summary:
    'Merge PDF joins every page from two or more files in the file order you choose. Split PDF takes selected pages from one file and returns either one PDF or a ZIP of individual pages. If a packet needs only part of each source, extract those parts first, then merge them. Count the expected pages before processing and check the downloaded result against that count.',
  sections: [
    {
      title: 'Choose the operation by what should be in the final packet',
      text: 'Start with a list of the documents and pages your recipient needs. For example, a cover, a two-page summary and an appendix should become four pages even if the source report contains six. Merging the complete report first would include unwanted pages. Selecting the right operation avoids extra deletions and makes the result easier to verify.',
      table: {
        caption: 'Which PDF organization workflow fits your task?',
        columns: ['You need', 'Start with', 'Result'],
        rows: [
          {
            name: 'Every page from several PDFs',
            href: '/merge-pdf',
            cells: [
              'Merge PDF',
              'One PDF, with each complete source placed after the previous one.',
            ],
          },
          {
            name: 'Some pages from one PDF',
            href: '/split-pdf',
            cells: [
              'Split PDF: Selected pages in one PDF',
              'One document containing your selection in the order entered.',
            ],
          },
          {
            name: 'A separate file for each page',
            href: '/split-pdf',
            cells: [
              'Split PDF: One PDF per selected page (ZIP)',
              'An archive containing individual one-page PDFs.',
            ],
          },
          {
            name: 'Selected pages from several sources',
            cells: [
              'Split each source, then merge the extracted files',
              'One packet containing only the requested material.',
            ],
          },
        ],
      },
    },
    {
      title: 'Merge complete documents in the intended reading order',
      text: 'Open Merge PDF and add at least two PDFs. Use the move controls beside the filenames to place the introductory document first, followed by the supporting material. The order in the tool determines the output; filenames alone do not. Folio copies every page from each input and preserves its page dimensions and rotation, so landscape and portrait pages can share one document.',
      steps: [
        'Open the source files and note their page counts. Remove duplicate files or outdated versions from your selection.',
        'Add the PDFs to Merge PDF and arrange the file list in reading order.',
        'Choose Merge PDFs, then inspect the preview at each point where one source ends and another begins.',
        'Download the PDF and confirm its total page count equals the sum of the selected inputs.',
      ],
      links: [
        { label: 'Open Merge PDF', href: '/merge-pdf' },
        {
          label: 'Check a mixed A4 and Letter merge',
          href: '/guides/merge-pdfs-different-page-sizes',
        },
      ],
    },
    {
      title: 'Extract a range using file positions, not printed labels',
      text: 'In Split PDF, Pages accepts entries such as 1-3, 5, 8-10. Count from the first page in the file, even when that page has no printed number. With an unnumbered cover, printed page 1 may be file position 2. A selection of 6, 2-3 places page 6 first, then pages 2 and 3. Repeated page numbers appear only once. Leave Pages blank to select every page, and choose the ZIP output if you want each one as a separate file.',
      links: [
        {
          label: 'See page-range examples and rejected selections',
          href: '/guides/extract-nonconsecutive-pdf-pages',
        },
      ],
    },
    {
      title: 'Practice: create a four-page packet from two sources',
      text: 'Use the fictional six-page practice packet and the one-page A4 portrait sample below. The exercise creates a cover followed by Summary, Budget and Appendix, without the other pages from the longer packet. The expected output is four pages; this is a workflow you can repeat before using your own documents.',
      steps: [
        'Download both samples. Open page-selection-practice.pdf in Split PDF.',
        'Enter 2-3, 6 in Pages and choose Selected pages in one PDF. Create and download the three-page selection.',
        'Open Merge PDF. Add a4-portrait-practice.pdf first and your downloaded selection second.',
        'Merge and download. Confirm the four pages are Portrait report, Summary, Budget and Appendix, in that order.',
        'Rename the finished download to identify the packet. Keep the source files separately so you can make another selection later.',
      ],
      links: [
        {
          label: 'Download the six-page practice packet',
          href: '/samples/page-selection-practice.pdf',
        },
        {
          label: 'Download the one-page portrait sample',
          href: '/samples/a4-portrait-practice.pdf',
        },
        { label: 'Begin the practice in Split PDF', href: '/split-pdf' },
      ],
    },
    {
      title: 'Diagnose missing pages, unexpected order or a failed merge',
      text: 'Compare the result with your input list before repeating the operation. A merge includes all input pages; an extraction includes only the selected file positions. Neither operation decides whether a page belongs in your packet.',
      table: {
        caption: 'Find the cause of a PDF packet problem',
        columns: ['Symptom', 'Check', 'Next action'],
        rows: [
          {
            name: 'The wrong pages were extracted',
            cells: [
              'A cover or contents page shifts the printed numbering.',
              'Find the page in the original preview and use its file position.',
            ],
          },
          {
            name: 'ZIP files appear in a different order',
            cells: [
              'Your file manager may sort the one-page files by filename.',
              'Use Selected pages in one PDF when reading order must stay inside one document.',
            ],
          },
          {
            name: 'The merged file is larger than expected',
            cells: [
              'All pages and their embedded images were copied.',
              'Extract only the needed pages first; merging is not compression.',
            ],
          },
          {
            name: 'A source cannot be opened',
            cells: [
              'Check that it opens in a PDF reader and is not encrypted.',
              'Use an unlocked copy you are permitted to edit, or request a usable original.',
            ],
          },
        ],
      },
    },
    {
      title: 'Check document behavior as well as page appearance',
      text: 'Check the first page, last page and every join between sources. Also test any form fields or links your recipient needs. Copying pages can change interactive form behavior and invalidate certificate-based signatures, so keep signed originals separately. Extraction does not redact sensitive content left on a selected page. These standalone tools process document contents in your browser. Merge accepts up to 20 files, 50 MB each and 150 MB total; Split accepts one PDF up to 50 MB. Continuing in the main editor uploads the result for private cloud saving.',
      links: [
        {
          label: 'Understand local processing and cloud workspaces',
          href: '/guides/does-folio-upload-pdf-files',
        },
      ],
    },
  ],
};

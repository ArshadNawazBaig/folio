import type { Guide } from './guides';

export const pdfImageGuideRevision: NonNullable<Guide['englishRevision']> = {
  updated: '2026-10-12',
  summary:
    'Use PDF to PNG for text, charts and diagrams, or PDF to JPG when a smaller photographic image matters more. Choose the required pages and a resolution, then convert and inspect the preview. One page downloads as an image; multiple pages download in a ZIP. At 300 DPI, a US Letter portrait page is 2550 × 3300 pixels and landscape is 3300 × 2550. Higher DPI cannot recover detail missing from a blurred scan.',
  sections: [
    {
      title: 'Should I convert my PDF to PNG, JPG or text?',
      text: 'PNG and JPG render the entire page as an image. They do not extract the original embedded photographs, and the image does not retain working links, selectable words or interactive form fields. Choose the output by how you will use it.',
      table: {
        caption: 'Choose an output for the page content',
        columns: ['What you need', 'Start with', 'Tradeoff to check'],
        rows: [
          {
            name: 'Small text, charts or diagrams',
            href: '/pdf-to-png',
            cells: [
              'PNG',
              'Lossless image encoding avoids JPEG artifacts around letter edges, but the file may be larger.',
            ],
          },
          {
            name: 'A photograph-heavy page',
            href: '/pdf-to-jpg',
            cells: [
              'JPG',
              'Often smaller for photographs. Inspect small text and fine lines for compression artifacts.',
            ],
          },
          {
            name: 'Words you can copy into notes',
            href: '/pdf-to-text',
            cells: [
              'Plain text',
              'Extracts selectable text without the page layout. Scanned words need OCR elsewhere.',
            ],
          },
          {
            name: 'An editable or interactive document',
            href: '/edit-pdf',
            cells: [
              'Keep the PDF',
              'Converting to an image removes interactive document behavior.',
            ],
          },
        ],
      },
    },
    {
      title: 'Select just the PDF pages you need',
      text: 'Open PDF to PNG or PDF to JPG and choose a PDF. In Pages, enter a selection such as 1-3, 5. This refers to positions in the file, not the numbers printed on the page; a cover sheet can shift the numbering. Convert the selection, then use the preview navigation to check each image. A single selected page downloads directly as an image. Several selected pages download together in a ZIP that you can open to access the individual images.',
      links: [
        { label: 'Convert PDF pages to PNG', href: '/pdf-to-png' },
        { label: 'Convert PDF pages to JPG', href: '/pdf-to-jpg' },
        {
          label: 'Keep selected pages as a PDF instead',
          href: '/guides/extract-nonconsecutive-pdf-pages',
        },
      ],
    },
    {
      title: 'How do I export a PDF to PNG at 300 DPI?',
      text: 'Choose your file in PDF to PNG, set Pages if needed, set Resolution to Print — 300 DPI and choose Convert to PNG. Folio renders the corresponding pixel dimensions and writes the chosen resolution into the image metadata. These sizes apply to an 8.5 × 11 inch US Letter portrait page; other page dimensions produce different pixel sizes at the same DPI.',
      table: {
        caption: 'Resolution choices for a US Letter portrait page',
        columns: ['Resolution setting', 'Output width × height', 'Typical use'],
        rows: [
          { name: 'Standard — 108 DPI', cells: ['918 × 1188 pixels', 'Smaller previews'] },
          { name: 'High — 144 DPI', cells: ['1224 × 1584 pixels', 'Reading on screen'] },
          {
            name: 'Extra high — 216 DPI',
            cells: ['1836 × 2376 pixels', 'Larger previews and fine detail'],
          },
          {
            name: 'Print — 300 DPI',
            cells: ['2550 × 3300 pixels', 'Printing at the original page size'],
          },
        ],
      },
    },
    {
      title: 'Practice: export a landscape page and verify its dimensions',
      text: 'Use the fictional Letter landscape practice PDF below for a repeatable check. Its page is 11 inches wide and 8.5 inches high, so width and height are reversed compared with the portrait table.',
      steps: [
        'Download the Letter landscape practice PDF and open it in PDF to PNG.',
        'Set Pages to 1 and Resolution to Print — 300 DPI.',
        'Choose Convert to PNG, inspect the preview and download the image.',
        'Open the file in an image viewer. Its dimensions should be 3300 × 2550 pixels: 11 × 300 by 8.5 × 300.',
        'Inspect the labels and fine lines at 100% zoom. If you also try JPG, compare its text edges and file size with the PNG before choosing a version to share.',
      ],
      links: [
        {
          label: 'Download the Letter landscape practice PDF',
          href: '/samples/letter-landscape-practice.pdf',
        },
        { label: 'Try the example in PDF to PNG', href: '/pdf-to-png' },
      ],
    },
    {
      title: 'What if the image is blurry, too large or will not export?',
      text: 'Start by checking the source PDF at the size you need. More pixels cannot restore detail that is missing from a low-resolution scan. Doubling resolution in both directions creates roughly four times as many pixels, increasing memory use. Folio limits raster output to 25 million pixels per page and 200 pages per export.',
      table: {
        caption: 'Common PDF image export problems',
        columns: ['Problem', 'What to try', 'Expected limit'],
        rows: [
          {
            name: 'JPG text edges look uneven',
            cells: [
              'Try PNG or a higher resolution and compare at 100% zoom.',
              'A blurred source scan can remain blurred in either format.',
            ],
          },
          {
            name: 'The image is too large to share',
            href: '/compress-images',
            cells: [
              'Reduce resolution, export fewer pages or compress the exported image.',
              'Check readability again; smaller dimensions or lossy compression can discard detail.',
            ],
          },
          {
            name: 'A large page or batch will not export',
            cells: [
              'Lower the resolution for oversized pages, or export smaller page selections.',
              'Stay within the per-page pixel and per-export page limits.',
            ],
          },
          {
            name: 'The exported words cannot be selected',
            href: '/pdf-to-text',
            cells: [
              'Use PDF to Text if the source contains selectable text.',
              'An image is pixels; this conversion does not perform OCR.',
            ],
          },
        ],
      },
    },
    {
      title: 'Check the downloaded result before sharing',
      text: 'Check footnotes, chart lines and signatures at a useful reading size. For a ZIP, open it and confirm that it contains the intended page images. Keep the original PDF for future edits and interactive use. These conversions and downloads are free and leave the original PDF unchanged. If you later combine the images into a PDF, the words remain images rather than becoming selectable text again.',
      links: [
        { label: 'Combine images into a PDF', href: '/guides/how-to-combine-images-into-pdf' },
      ],
    },
  ],
};

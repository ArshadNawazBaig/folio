import type { Guide } from './guides';
import evidence from './compression-example.json' with { type: 'json' };

const original: Guide = {
  slug: 'why-your-pdf-wont-get-smaller',
  title: 'Why Your PDF Won’t Get Smaller (or Gets Bigger)',
  description:
    'PDF bigger after compression? Learn why optimization can increase file size, when to keep the original, and how to handle an upload limit.',
  category: 'File size',
  readTime: '3 min read',
  published: '2026-09-13',
  updated: '2026-09-26',
  tool: 'compress-pdf',
  relatedTools: ['split-pdf', 'compress-images'],
  summary:
    'A compressed PDF can be larger when the new file structure costs more space than the optimizer saves. Folio compares the result with the original and keeps the original available when it is smaller. Its compressor preserves image resolution; it cannot promise a 100 KB or 200 KB output.',
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
      title: 'Why did my PDF get bigger after compression?',
      text: 'Rewriting a PDF creates a new file structure, and that structure can take more space than the original. Already compressed image data may offer little saving to offset that overhead. If optimization produces a larger file, Folio says so and makes your original available instead. That is an honest outcome rather than a processing failure. Running the same file through the same optimization repeatedly is unlikely to keep reducing it. For an image-heavy document, exporting a smaller version from the original application may be more effective. Check its image-resolution settings and preview fine text carefully.',
    },
    {
      title: 'How can I meet an upload limit without unreadable pages?',
      text: 'Before sharing, open the result at a normal reading size and zoom in on small text, charts, and signatures. Keep links and selectable text useful whenever possible. If an upload service sets a strict size limit, splitting a long document into useful sections may be more appropriate than making each page hard to read. Keep a full-quality original so you can produce a different version later.',
      steps: [
        'Check the receiving service’s exact file-size limit and whether it accepts multiple files.',
        'Try one optimization and compare the actual before and after sizes. Keep the original if it is smaller.',
        'If multiple files are accepted, extract the required pages or split the document into useful sections.',
        'If one smaller file is required, return to the source application and adjust its PDF export or image settings, then review small text in the new copy.',
      ],
      links: [
        {
          label: 'Extract selected pages instead of sending the whole PDF',
          href: '/guides/extract-nonconsecutive-pdf-pages',
        },
      ],
    },
  ],
};

// The measured English example keeps existing translated editions and dates intact.
export const compressionGuide: Guide = {
  ...original,
  englishRevision: {
    updated: evidence.measuredAt.slice(0, 10),
    summary: original.summary,
    sections: [
      ...original.sections,
      {
        title: 'Try a measured example: the same page, two file structures',
        text: `Folio measured these two fictional one-page PDFs on ${evidence.measuredAt.slice(0, 10)} (UTC), using the same compression engine as the standalone tool. Both contain the same five lines on an A4 page, with no photographs or added padding. Only the way PDF objects are stored differs. These two files illustrate the behavior; they do not predict savings on your documents.`,
        table: {
          caption: 'Measured input and returned-file sizes, in bytes',
          columns: ['Source PDF', 'Before', 'Returned file', 'What happened'],
          rows: evidence.examples.map((example) => ({
            name: example.originalReturned ? 'Already compressed objects' : 'Uncompressed objects',
            href: example.source,
            cells: [
              example.inputBytes.toLocaleString('en-US'),
              example.returnedBytes.toLocaleString('en-US'),
              example.originalReturned
                ? 'No smaller result: Folio returned the original bytes.'
                : 'A smaller PDF was returned; all five text lines and the page size were checked.',
            ],
          })),
        },
        steps: [
          'Download either source PDF from the table and open Compress PDF.',
          'Choose that file, run the tool once, and compare its reported original and result sizes.',
          'Download the returned PDF and reopen it. Check all five lines and the A4 page dimensions.',
          'Repeat with the other source. A no-saving message is the expected result for the already compressed example.',
        ],
        links: [{ label: 'Try these files in Compress PDF', href: '/compress-pdf' }],
      },
      {
        title: 'How we checked this example',
        text: 'The source files were generated by Folio, then processed with its PDF compression engine. We reopened each returned file, checked the page count and dimensions, and extracted all five text lines to confirm they remained present. For the no-saving case, we also compared the returned bytes with the original. This is a product example, not an independent comparison. PDF metadata and future engine changes can affect exact byte counts; judge your file by its actual result and readable contents.',
        links: [{ label: 'Folio’s editorial approach and corrections', href: '/about#editorial' }],
      },
    ],
  },
};

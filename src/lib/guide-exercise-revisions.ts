import type { Guide } from './guides';
import evidence from './guide-exercises.json';

// English exercises extend existing tutorials. Reviewed translated editions keep
// their own text and dates until these additions have translated replacements.
export function withGuideExercises(guide: Guide): Guide {
  if (guide.slug === 'how-to-add-text-to-a-pdf') {
    const exercise: Guide['sections'][number] = {
      title: 'Try it: add a review note to a fictional report',
      text: 'Use the downloadable A4 portrait report to practice without uploading a personal document. The worked result below was exported with Folio’s annotation engine. It keeps the original Portrait report heading and adds a separate, selectable note in the blank lower half. The sample date is part of the exercise, not a record of a real review. Your placement can differ; the important checks are readable text, no overlap, and an unchanged original heading.',
      steps: [
        'Download the A4 portrait practice PDF below. Open it in Edit PDF and choose Open in editor after its preview loads. This starts a private cloud workspace, including for guests.',
        'Choose Add Text and click in the blank lower half. Replace the placeholder with Reviewed by Sam / 30 October 2026.',
        'In Properties, set the text to 14 points and a dark color. Move the box if it touches existing content. Leave the original heading unchanged.',
        'Choose Download PDF and open the result in your usual PDF reader. Find the new note and check that the page still contains the original report. Compare with the worked result below.',
      ],
      links: [
        {
          label: 'Download the original A4 practice report',
          href: '/samples/a4-portrait-practice.pdf',
        },
        { label: 'Compare the PDF with the added review note', href: evidence.annotation.source },
      ],
    };
    const troubleshooting: Guide['sections'][number] = {
      title: 'Fix a text box that does not look right after export',
      text: 'Check the downloaded PDF at a readable size before changing settings. A PDF viewer’s zoom changes what you see on screen, while the annotation’s font size changes the exported letters. A long reference number may need a wider box; reducing every answer to tiny text makes the page harder to read. Keep the editor tab open until your download is checked.',
      table: {
        caption: 'Problems when adding text and a useful next step',
        columns: ['What you see', 'Check', 'Next step'],
        rows: [
          {
            name: 'The new answer overlaps a line',
            cells: [
              'The box position, width, and font size.',
              'Move the box into a clear area, widen it, or use a shorter answer. Recheck the export.',
            ],
          },
          {
            name: 'The original wording is still there',
            cells: [
              'Whether you used Add Text or Edit Text.',
              'Use Edit Text for a supported original block. Adding a box does not replace the source words.',
            ],
          },
          {
            name: 'A photographed label cannot be selected',
            cells: [
              'Whether the page contains an image instead of text.',
              'Add an answer in a blank response area. OCR in another app is needed to recognize the printed words.',
            ],
          },
          {
            name: 'The recipient needs to fill in the answer',
            cells: [
              'Whether you need a reusable form rather than fixed wording.',
              'Create a fillable text field, then test the interactive download in the recipient’s reader.',
            ],
          },
        ],
      },
    };
    return {
      ...guide,
      updated: '2026-10-30',
      readTime: '5 min read',
      sections: [
        guide.sections[0],
        exercise,
        ...guide.sections.slice(1, 3),
        troubleshooting,
        ...guide.sections.slice(3),
      ],
    };
  }
  if (guide.slug === 'how-to-combine-images-into-pdf') {
    const a4 = evidence.examples[0].pageSizes[0];
    const fitted = evidence.examples[1].pageSizes;
    const exercise: Guide['sections'][number] = {
      title: 'Try the same two images with A4 and fitted pages',
      text: 'The fictional receipt JPG is 1200 × 900 pixels; the practice screenshot PNG is 1000 × 700 pixels. Download both and add the receipt first. Create one PDF with A4 selected, then switch to Fit each image and create another. The worked downloads below were produced by Folio’s image-to-PDF engine and checked for two pages, their dimensions, and the absence of an OCR text layer. This is a controlled example, not a promise about other photos or their file sizes.',
      table: {
        caption: 'Verified page dimensions for the two practice images (72 PDF points = 1 inch)',
        columns: ['Setting', 'First page: receipt', 'Second page: screenshot'],
        rows: [
          {
            name: 'A4 — centered with margins',
            cells: [`${a4.width} × ${a4.height} points`, `${a4.width} × ${a4.height} points`],
          },
          {
            name: 'Fit each image',
            cells: [
              `${fitted[0].width} × ${fitted[0].height} points`,
              `${fitted[1].width} × ${fitted[1].height} points`,
            ],
          },
        ],
      },
      links: [
        { label: 'Download the fictional receipt JPG', href: '/samples/practice-receipt.jpg' },
        { label: 'Download the practice screenshot PNG', href: '/samples/practice-screenshot.png' },
        { label: 'Compare the two-page A4 result', href: evidence.examples[0].source },
        { label: 'Compare the two-page fitted result', href: evidence.examples[1].source },
      ],
    };
    const troubleshooting: Guide['sections'][number] = {
      title: 'What if the result is tiny, sideways, or too large?',
      text: 'A long screenshot can become very small when fitted onto one A4 sheet. Choose fitted pages if the recipient can zoom, or capture shorter sections before importing when normal-size printing matters. Folio does not automatically split a long screenshot over several sheets. A4 uses portrait paper even for a landscape photo; choose fitted pages to follow the picture’s shape. For a sideways source, correct its orientation before importing, or rotate the finished PDF page. If the receiving site rejects the PDF’s size, reduce the source images in Image Compressor and recreate the PDF, checking small text again. Compress PDF only optimizes document structure and may save little on an image-heavy packet.',
      links: [
        { label: 'Reduce source image sizes', href: '/compress-images' },
        { label: 'Rotate a finished PDF page', href: '/rotate-pdf' },
        {
          label: 'Why an image-heavy PDF may not get smaller',
          href: '/guides/why-your-pdf-wont-get-smaller',
        },
      ],
    };
    return {
      ...guide,
      updated: '2026-10-30',
      readTime: '5 min read',
      summary:
        'Each JPG, PNG, or WebP becomes one PDF page. Use A4 for consistent portrait sheets with margins, or Fit each image to retain each picture’s proportions. Arrange the file list before creating the PDF. The standalone converter processes images in your browser, with no account needed; opening its result in the editor starts private cloud saving. Try the downloadable receipt and screenshot to compare both page settings.',
      sections: [
        ...guide.sections.slice(0, 4),
        exercise,
        troubleshooting,
        ...guide.sections.slice(4),
      ],
    };
  }
  return guide;
}

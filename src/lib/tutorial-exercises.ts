import type { Guide } from './guides';
import {
  tutorialInputs as input,
  tutorialResult as output,
  measuredImageResult,
  type WorkedResult,
} from './tutorial-results';

type Download = { href: string; label: string };
export type TutorialExercise = {
  title: string;
  purpose: string;
  inputs: Download[];
  steps: string[];
  results: WorkedResult[];
  expected: string;
  ifDifferent: string;
  processing: string;
  replaces?: string;
};
const local =
  'This standalone workflow processes document contents in the browser. Opening its result in the editor starts a separate private cloud workspace.';
const cloud =
  'The editor uploads this fictional PDF for private cloud saving, including for guests. Keep the download; guest workspaces expire after 24 hours.';
const server =
  'Text inspection/replacement and password protection send the PDF to Folio for processing. The standalone text editor does not save a recovery workspace.';
const venue = input.wording;
const form = input.master;

export const guideExercises: Record<string, TutorialExercise> = {
  'create-professional-invoice-online': {
    title: 'Practice: import an invoice and verify a received deposit',
    purpose:
      'This smaller, separate arithmetic exercise lets you inspect an editable draft and its finished PDF. All names and charges are fictional; no money is requested. It tests data entry and export, without assuming a tax rule for your real work.',
    inputs: [
      { href: '/samples/tutorials/invoice-draft.json', label: 'Fictional invoice JSON draft' },
    ],
    steps: [
      'Open the invoice editor and import the practice JSON backup.',
      'Check two lines: 3 hours at USD 50, plus one fixed USD 25 charge. Amount already paid is USD 50; tax, shipping, and discount are zero.',
      'Review USD 175 total and USD 125 balance. Download the PDF and compare it with the worked copy. Do not subtract the deposit from a line item as well.',
    ],
    results: [output('invoice-with-deposit.pdf', 'Invoice PDF with USD 125 due')],
    expected:
      'The charge total is 175.00, paid is 50.00, and balance is 125.00. The deposit is counted once.',
    ifDifferent:
      'If the balance differs, inspect Amount already paid, tax mode, discounts, and shipping separately. A paid amount records your entry; the app does not verify that a payment arrived.',
    processing:
      'Importing a draft does not save it to an account. Classic/Minimal preset exports run locally; custom options can use server processing. Save to account is a separate choice.',
  },
  'create-transparent-signature-png': {
    title: 'Practice: inspect a transparent signature before using it',
    purpose:
      'Use a clearly fictional name to check transparency and cropping before trying your own signature. This exercise produces a reusable image; the signing guide separately covers completing and exporting a PDF.',
    inputs: [],
    steps: [
      'In Signature generator choose Type, enter Sam Example, and choose Classic with black ink.',
      'Download PNG. Place the image over a colored background in your document application.',
      'Compare it with the supplied sample: the background should show through around the letters, and no stroke should touch the cropped edge.',
    ],
    results: [output('fictional-signature.png', 'Fictional transparent signature PNG')],
    expected:
      'Transparent pixels surround visible ink. The supplied sample was checked for both; exact pixel dimensions can vary with fonts and browser rendering.',
    ifDifferent:
      'A white rectangle may come from the image you imported or from another application changing its format. Keep PNG and avoid screenshots or JPG when transparency is needed.',
    processing:
      'The standalone signature stays in the tab. Adding it to a PDF in the editor uses private cloud saving. The practice image is not proof of anyone’s identity.',
  },
  'does-folio-upload-pdf-files': {
    title: 'Practice: choose a workflow before selecting a file',
    purpose:
      'Make the same two-page attachment with the standalone merger, then decide whether you actually need a cloud editor. This is a workflow comparison, not a security certification.',
    inputs: [input.portrait, input.landscape],
    steps: [
      'Use Merge PDF, put the portrait report first and landscape appendix second, then merge and download directly.',
      'Open the result in your usual PDF reader. If two ordered pages finish your task, the editor is unnecessary.',
      'If you also need an annotation or signature, opening the result in Folio’s editor starts an upload and a private workspace. Decide that separately.',
    ],
    results: [
      output('mixed-page-sizes.pdf', 'Two-page attachment made with the standalone merger'),
    ],
    expected:
      'Two pages, with the original A4 portrait and Letter landscape sizes. A local processing operation and cloud recovery are separate decisions.',
    ifDifferent:
      'If the editor appears, check whether you chose Open in editor after processing. A guest session does not mean no upload.',
    processing: local,
    replaces: 'Example: combine receipts without opening a cloud workspace',
  },
  'choose-a-free-pdf-editor': {
    title: 'Practice: compare editors with the same three-page input',
    purpose:
      'Use one controlled input to test a candidate’s ability to select wording, add a note, and download a usable copy. The three pages look similar but store their text differently. This is a reusable evaluation protocol; it does not claim that the other products in the comparison were benchmarked.',
    inputs: [input.diagnostic],
    steps: [
      'Try copying Orchard 42 from each page in a PDF reader: page 1 has visible text, page 2 is an image, and page 3 has an invisible search layer over an image.',
      'In a candidate editor, try the change you need on a working copy. Record whether the visible page changes, whether a download is free, and whether sign-in is required.',
      'Reopen its download independently. Compare the visible words and original page sizes; copied text or a successful preview alone is insufficient.',
    ],
    results: [],
    expected:
      'Text extraction finds the phrase on pages 1 and 3, and no words on page 2. Page 3 demonstrates why text selection does not prove that visible scanned letters can be replaced.',
    ifDifferent:
      'If you need OCR or extensive paragraph rewriting, choose a product explicitly supporting that task, or ask for the source document. Do not give a tool credit for changing only a hidden search layer.',
    processing:
      'Check each candidate’s current upload, retention, export, and account rules. This sample contains no personal documents.',
    replaces: 'How should I evaluate a top PDF editor before using it?',
  },
  'how-to-edit-a-pdf': {
    title: 'Practice: choose the correct control for three different edits',
    purpose:
      'The editor reference covers choosing controls. The Add Text guide contains a placement exercise, while the text-correction article changes a specific original value. Here, decide which control is appropriate before starting.',
    inputs: [input.packet, venue, form],
    steps: [
      'For a note beside the Budget, use Add Text on the packet. The existing amounts should remain underneath as original content.',
      'For the wording exercise, use Edit Text to change only Venue: Room 4 on page 1 to Venue: Room 7.',
      'For the workshop master, use the Form panel to enter Sam Example and check Receive workshop notes. Keep the master and the finished copies separate.',
    ],
    results: [
      output('budget-note.pdf', 'An added budget note'),
      output('wording-one-correction.pdf', 'One replaced original value'),
      output('workshop-form-filled.pdf', 'A completed interactive form'),
    ],
    expected:
      'Three different changes: a new annotation, one original-text replacement, and two form values. No operation implies secure redaction.',
    ifDifferent:
      'If the old wording remains visible, you may have added a box instead of replacing it. If the recipient still needs to type, keep fields interactive rather than flattening them.',
    processing: cloud,
  },
  'how-to-edit-a-pdf-on-mobile': {
    title: 'Practice: fill, download, and reopen one form on your phone',
    purpose:
      'A small two-field form isolates mobile controls and finding the saved file. This replaces the repeated blog walkthrough with one maintained procedure and a downloadable comparison.',
    inputs: [form],
    steps: [
      'Save the workshop master where your phone’s file picker can find it, then open it in Folio. Open the Form panel.',
      'Enter Sam Example and check Receive workshop notes. Close the side panel to inspect both answers on the page.',
      'Download the PDF, use the download options shown by your browser, and open that saved file independently. Compare it with the completed interactive copy below.',
    ],
    results: [output('workshop-form-filled.pdf', 'Completed workshop form for comparison')],
    expected:
      'The downloaded file shows the fictional name and checked box, and its two fields remain interactive. Finding a saved file is a different step from saving an editor workspace.',
    ifDifferent:
      'If a browser opens a preview, use its save/share controls to keep a copy. If typing is hidden by the keyboard or panel, dismiss it and check the page before exporting. Device and reader behavior can differ.',
    processing: cloud,
  },
  'why-cant-i-edit-pdf-text': {
    title: 'Practice: distinguish a scan from an invisible text layer',
    purpose:
      'All three pages show Practice phrase: Orchard 42, but the file structures differ. The example makes the diagnostic checks observable without assuming that a successful copy operation means the visible artwork is editable.',
    inputs: [input.diagnostic],
    steps: [
      'Try selecting and copying the phrase on page 1. This page uses ordinary visible text.',
      'Try page 2. Its phrase is part of a picture; the sample has no text layer to extract.',
      'Try page 3. Words can be copied from an invisible layer, while the visible phrase remains in a picture. Inspect the actual page after any attempted correction.',
    ],
    results: [],
    expected:
      'Existing text is extractable on pages 1 and 3, not page 2. These checks were run with PDF.js; support for replacing a particular block still depends on its structure.',
    ifDifferent:
      'If the ordinary text page edits but a longer replacement overlaps, that is a fitting problem rather than a missing-text problem. The standalone text processor also has a 10 MB/100-page limit and Latin replacement-character limits; the main editor’s larger upload allowance does not remove them.',
    processing: server,
  },
  'extract-nonconsecutive-pdf-pages': {
    title: 'Compare the actual extraction with the source packet',
    purpose:
      'Check reading order and page count against a downloadable result, rather than relying only on a success message. This exercise selects pages; the mixed-size merge guide covers combining complete input files.',
    inputs: [input.packet],
    steps: [
      'Enter 6, 2-3 in Split PDF and choose Selected pages in one PDF.',
      'Create and download the PDF. Compare its first, second, and third headings with the supplied output.',
      'If you need separate files, repeat with the ZIP option and inspect each extracted file rather than treating archive sorting as the PDF reading order.',
    ],
    results: [output('selected-pages.pdf', 'Expected three-page selection')],
    expected:
      'Appendix, Summary, Budget — exactly three pages. Positions refer to the source file, not its printed labels.',
    ifDifferent:
      'A repeated position is included once. A ZIP is the separate-pages mode. Neither mode duplicates a page or cuts a scanned spread in half.',
    processing: local,
  },
  'merge-pdfs-different-page-sizes': {
    title: 'Compare the mixed-size merge with a checked output',
    purpose:
      'This is a page-geometry exercise, separate from the extraction and multi-stage packet tutorials. It tests what merging preserves, not whether a viewer makes every page look equally wide.',
    inputs: [input.portrait, input.landscape],
    steps: [
      'Merge the portrait report first and landscape appendix second.',
      'Open the downloaded copy in a PDF reader that can report page dimensions.',
      'Compare the two pages with the worked output: 595.28 × 841.89 points, followed by 792 × 612 points.',
    ],
    results: [output('mixed-page-sizes.pdf', 'Expected mixed-size two-page PDF')],
    expected:
      'Both original sizes and their reading order remain. Merging does not normalize the second page to A4.',
    ifDifferent:
      'Use the same zoom when comparing text. Fit-to-width displays can make different paper sizes appear equal; printer scaling is a separate setting.',
    processing: local,
  },
  'how-to-merge-and-split-pdfs': {
    title: 'Practice: build and verify a four-page packet',
    purpose:
      'Combine extraction and merging into one handoff. The selection tutorial explains range syntax, and the mixed-size guide explains geometry; this exercise checks the boundary between those two operations.',
    inputs: [input.packet, input.landscape],
    steps: [
      'Extract 6, 2-3 from the six-page packet into one PDF.',
      'Merge that extract first, with the landscape appendix second.',
      'Download the combined result. Verify the four headings in order and confirm the last page retains its landscape dimensions.',
    ],
    results: [output('four-page-packet.pdf', 'Expected four-page handoff packet')],
    expected: 'Appendix, Summary, Budget, Landscape appendix. The final count is 3 + 1 = 4.',
    ifDifferent:
      'If six source pages appear, the full packet was merged instead of the extract. If the landscape page comes first, change file order in Merge PDF and recreate the result.',
    processing: local,
    replaces: 'Practice: create a four-page packet from two sources',
  },
  'why-your-pdf-wont-get-smaller': {
    title: 'Compare an optimized download with both source structures',
    purpose:
      'The measured table above explains the two source files. The downloadable optimized copy below lets you inspect the returned page as well as its byte count. Savings on this small synthetic file are not typical savings or a target-size promise.',
    inputs: [
      {
        href: '/samples/compression-uncompressed-objects.pdf',
        label: 'Uncompressed-object source',
      },
      { href: '/samples/compression-compressed-objects.pdf', label: 'Already-compressed source' },
    ],
    steps: [
      'Run each source through Compress PDF once and record the actual input and returned byte sizes.',
      'Open the optimized reference and confirm the original five text lines, one page, and A4 dimensions.',
      'For the already-compressed input, expect Folio to retain the original when rewriting does not make it smaller.',
    ],
    results: [output('optimized-structure.pdf', 'Optimized one-page reference')],
    expected:
      'The uncompressed-object input gets smaller; the already efficient input may be returned unchanged. Text remains text and image resolution is not reduced.',
    ifDifferent:
      'Metadata or engine changes can alter exact byte counts. If your real file consists mainly of scans, lowering source image sizes or exporting again may be necessary.',
    processing: local,
    replaces: 'How we checked this example',
  },
  'fillable-pdf-vs-flattened-pdf': {
    title: 'Practice: compare blank, filled, and flattened versions',
    purpose:
      'Use the same two-field workshop form to inspect three different deliverables. This maintained guide now covers the duplicated form-building article as well as deciding which version to send.',
    inputs: [input.blankForm, form],
    steps: [
      'To build the master from the plain page, add a Text field named participant_name and a Checkbox named receive_notes in the marked response areas.',
      'To try filling instead, open the supplied master, enter Sam Example, and check Receive workshop notes in the Form panel.',
      'Download once with fields kept fillable and once with them flattened. Compare both files in the reader the recipient uses.',
    ],
    results: [
      output('workshop-form-master.pdf', 'Blank interactive master'),
      output('workshop-form-filled.pdf', 'Filled copy with two editable fields'),
      output('workshop-form-flattened.pdf', 'Finished copy with no interactive fields'),
    ],
    expected:
      'Both completed copies visibly contain Sam Example and a checked box. The interactive copy has two fields; the flattened copy has zero.',
    ifDifferent:
      'Empty answers can mean the blank master was exported or the reader does not support the fields. Check a saved copy in a second reader. A unique internal field name alone does not establish screen-reader accessibility; labels, navigation, and reader behavior also need review.',
    processing: cloud,
    replaces: 'Practice with the Project inquiry template',
  },
  'how-to-sign-a-pdf': {
    title: 'Practice: finish one response without altering the blank master',
    purpose:
      'This exercise produces a completed PDF, rather than a standalone signature image. The supplied name and signature are fictional and do not represent consent to any real transaction.',
    inputs: [form],
    steps: [
      'Fill participant_name with Sam Example and check Receive workshop notes.',
      'Open Sign, choose Type and Classic, enter Sam Example, then place the mark below Signature (practice only).',
      'Download a finished copy with completed fields flattened. Keep the blank master separately and compare with the worked response.',
    ],
    results: [output('workshop-signed-copy.pdf', 'Finished fictional workshop response')],
    expected:
      'One page with the name, checked box, and visible signature. No digital certificate or identity-verification record is created.',
    ifDifferent:
      'If a white rectangle covers the label, review the signature image or use Type/Draw. If a recipient requires certificate signing, this visual exercise does not meet that different requirement.',
    processing: cloud,
  },
  'how-to-convert-pdf-to-images': {
    title: 'Practice: export a landscape page and compare actual files',
    purpose:
      'Compare a JPG at 144 DPI and a PNG at 300 DPI from one known 11 × 8.5 inch page. Both format and resolution change, so this is a settings illustration, not an encoding-quality benchmark.',
    inputs: [input.landscape],
    steps: [
      'In PDF to JPG choose page 1, High — 144 DPI, and Balanced — 90% quality, then convert and download JPG.',
      'In PDF to PNG use the same page with Print — 300 DPI, then download PNG.',
      'Inspect image dimensions and fine text at 100% zoom. Choose for the required use rather than assuming the larger file must be better.',
    ],
    results: [
      output('landscape-144dpi.jpg', 'Actual 144 DPI JPG'),
      output('landscape-300dpi.png', 'Actual 300 DPI PNG'),
    ],
    expected:
      'JPG: 1584 × 1224 pixels. PNG: 3300 × 2550 pixels. A single selected page downloads as an image rather than a ZIP.',
    ifDifferent:
      'Check page orientation and the resolution setting. Exporting a larger number of pixels cannot restore detail absent from a low-resolution source.',
    processing: local,
    replaces: 'Practice: export a landscape page and verify its dimensions',
  },
  'how-to-password-protect-a-pdf': {
    title: 'Practice: verify a password-protected copy before sharing',
    purpose:
      'Use the public, fictional report to test the opening-password workflow. The demonstration password is intentionally published; it offers no confidentiality for this public practice file and must never be reused.',
    inputs: [input.portrait],
    steps: [
      'Open Protect PDF with the portrait report, enter Practice-only-42 in both password fields, and select Protect & download.',
      'Close the preview and open the downloaded file in a separate PDF reader. Confirm that it requests a password.',
      'Enter the demonstration password and verify Portrait report, one page, and the original A4 dimensions. Compare with the worked protected copy.',
    ],
    results: [output('password-practice.pdf', 'Protected practice PDF; password Practice-only-42')],
    expected:
      'Opening without a password fails; the published practice password opens the original page. This behavior was checked with PDF.js.',
    ifDifferent:
      'If your reader remembers an opening password, test in another reader or a fresh session. For real work use a new private password and a separate sharing channel appropriate to your process.',
    processing:
      'Protect PDF sends the PDF and password to Folio for processing in server memory. Do not assume local processing because no account is required.',
  },
};

export function withTutorialDepth(guide: Guide): Guide {
  const exercise = guideExercises[guide.slug];
  if (!exercise) return guide;
  const section: Guide['sections'][number] = {
    title: exercise.title,
    text: `${exercise.purpose} ${exercise.processing}`,
    steps: exercise.steps,
    table: {
      caption: 'What to verify in this exercise',
      columns: ['Check', 'Expected outcome'],
      rows: [
        { name: 'Finished output', cells: [exercise.expected] },
        { name: 'If your result differs', cells: [exercise.ifDifferent] },
      ],
    },
    links: [
      ...new Map(
        [...exercise.inputs, ...exercise.results].map((file) => [
          file.href,
          { href: file.href, label: file.label },
        ]),
      ).values(),
    ],
  };
  const previous = exercise.replaces
    ? guide.sections.findIndex((s) => s.title === exercise.replaces)
    : -1;
  const sections =
    previous < 0
      ? [...guide.sections, section]
      : guide.sections.map((s, i) => (i === previous ? section : s));
  return {
    ...guide,
    sections,
    updated: '2026-10-31',
    readTime: `${Math.max(
      3,
      Math.ceil(
        sections
          .map((s) => JSON.stringify(s))
          .join(' ')
          .split(/\s+/).length / 220,
      ),
    )} min read`,
  };
}

export const articleExercises: Record<string, TutorialExercise> = {
  'choose-a-free-pdf-editor': {
    ...guideExercises['how-to-merge-and-split-pdfs'],
    title: 'Practice: choose the operations for a four-page upload',
    purpose:
      'Plan an output before choosing a tool. You need three specific pages plus a landscape appendix. Record the page positions, required order, and the receiving site’s actual byte limit. This is an end-to-end selection exercise; the guides explain the individual controls.',
    expected:
      'Four pages in the specified order. Measure the actual downloaded byte size against your receiving site’s limit; no target size or compression percentage is promised.',
  },
  'first-freelance-invoice-with-free-invoice-generator': {
    ...guideExercises['create-professional-invoice-online'],
    title: 'Practice: check a deposit before writing the client handoff',
    purpose:
      'After the larger project example in this article, use this separate smaller draft to rehearse a handoff. Reconcile the PDF’s total and paid amount, then write the email against that exact finished copy rather than a remembered estimate.',
    steps: [
      ...guideExercises['create-professional-invoice-online'].steps,
      'Draft a message naming PRACTICE-001 and USD 125 remaining, with your agreed due date and payment route. This fictional exercise does not send an email or request payment.',
    ],
  },
  'how-to-edit-pdf-text': {
    title: 'Practice: correct only one original value',
    purpose:
      'A workshop pack has changed room on only its first sheet. This exercise deliberately leaves the later sheets alone; the separate find-and-replace article updates repeated wording across the file.',
    inputs: [venue],
    steps: [
      'Open the three-page wording source in the PDF text editor and inspect the supported text blocks.',
      'On page 1 change Venue: Room 4 to Venue: Room 7; leave pages 2 and 3 alone. Update the PDF preview, then download.',
      'Search the download for both values and inspect the changed line. Compare with the one-correction reference.',
    ],
    results: [output('wording-one-correction.pdf', 'One-correction reference PDF')],
    expected:
      'One Venue: Room 7, two remaining Venue: Room 4 entries, and Archive: Room 40 unchanged.',
    ifDifferent:
      'If all three venue entries changed, a global replacement was used. Undo it or reopen the original and edit the page-1 block only.',
    processing: server,
  },
  'how-to-edit-pdf-original-text': {
    title: 'Practice: replace three venues while preserving Room 40',
    purpose:
      'This sample includes a deliberate near-match. A short search for Room 4 can also match Room 40, so the useful operation is a specific repeated phrase, followed by a verification of excluded wording.',
    inputs: [venue],
    steps: [
      'Open Find & replace in the dedicated PDF text editor. Search for Venue: Room 4 rather than Room 4.',
      'Replace it with Venue: Room 7 and check that the count is three. Update the preview and visit each changed page.',
      'Download and confirm three new venue labels. Archive: Room 40 on page 3 must still be present.',
    ],
    results: [
      output('wording-replaced.pdf', 'Three replacements with the archive reference retained'),
    ],
    expected: 'Three Venue: Room 7 entries; no Venue: Room 4 entries; Archive: Room 40 retained.',
    ifDifferent:
      'If the archive changes, restart from the original and use the full Venue label. The matching operation searches substrings, not meanings or whole words.',
    processing: server,
  },
  'how-to-compress-images-to-target-size': {
    title: 'Practice: meet 20 KB and check the returned dimensions',
    purpose:
      'An upload can require both a byte limit and minimum pixel dimensions. Use the fictional receipt to see why meeting the first requirement may affect the second.',
    inputs: [input.receipt],
    steps: [
      'Set 20 KB and JPG output in Image Compressor, then add the practice receipt.',
      'Compress once and compare the returned size and dimensions with the original 1200 × 900 pixels.',
      'Download and inspect the smallest labels. Compare the actual reference below; judge your receiving site’s dimension rules separately.',
    ],
    results: [output('receipt-under-20kb.jpg', 'JPG returned below 20 KB')],
    expected:
      measuredImageResult('receipt-under-20kb.jpg') +
      '. This measurement describes this particular file and run.',
    ifDifferent:
      'Different browser encoders can produce different results. If a minimum width is required, check it as well as bytes; a smaller target may force dimensions below that minimum.',
    processing:
      'Images and results remain in the current browser tab; the standalone compressor does not upload them.',
  },
  'how-to-create-a-qr-code-for-a-link': {
    title: 'Practice: decode a QR before printing it',
    purpose:
      'Use a public practice PDF as the destination so another reader does not need your logged-in session. This tests the destination and generated code separately from designing a printed handout.',
    inputs: [input.portrait],
    steps: [
      'Choose Website URL and enter https://thebestfreepdf.com/samples/a4-portrait-practice.pdf. Use dark #202522 on white.',
      'Download SVG or PNG. Scan it with another device and confirm the portrait report opens.',
      'Print a small test at the intended size, keep the empty border, and scan that physical copy before printing a batch.',
    ],
    results: [
      output('practice-pdf-qr.svg', 'Static practice QR (SVG)'),
      output('practice-pdf-qr.png', 'Static practice QR (PNG)'),
    ],
    expected:
      'Both reference files encode the direct practice-PDF URL. The 1024 × 1024 PNG was independently decoded back to that exact string.',
    ifDifferent:
      'A code can decode correctly while its destination is unavailable. Check the URL, access permissions, printed contrast, and quiet border independently.',
    processing:
      'The static code is created in the browser. It has no Folio redirect or scan analytics.',
  },
  'how-to-shorten-a-url': {
    title: 'Practice: change a destination and reuse the same saved QR',
    purpose:
      'This is an account exercise rather than a pre-created demonstration link. It isolates the difference between a static direct-PDF QR and a QR containing an editable short URL.',
    inputs: [input.portrait, input.landscape],
    steps: [
      'In your account create an available practice alias pointing to the public portrait PDF. Save its QR.',
      'Open the short URL in a private window and check that it reaches Portrait report.',
      'Edit the link’s destination to the landscape practice PDF. Open the same short URL and scan the same saved QR: both should now reach Landscape appendix.',
      'Delete the practice link when finished and confirm that it stops redirecting. The alias stays reserved.',
    ],
    results: [],
    expected:
      'The short URL and QR payload do not change; only their resolved destination changes. There is no shared pre-created alias or promise of permanent hosting in this exercise.',
    ifDifferent:
      'Check that you edited the existing record rather than creating a second alias. Test the public destination directly and allow the redirect request to finish before relying on a cached preview.',
    processing:
      'Sign-in and server storage are required. The public PDF destinations contain only fictional examples.',
  },
  'pdf-conversion-guide-choose-the-right-format': {
    title: 'Practice: compare what a page image and text extraction preserve',
    purpose:
      'Use one landscape source to distinguish pixels from words. The DPI guide teaches image resolution; this exercise chooses the output by what the next application needs to receive.',
    inputs: [input.landscape],
    steps: [
      'Export source page 1 as PNG at 300 DPI. Inspect its page geometry and visible labels.',
      'Extract the same source as text. Open the TXT file in a text editor, not an image viewer.',
      'Compare both references: the PNG preserves page appearance as pixels; the TXT keeps extracted wording without the page’s graphic layout.',
    ],
    results: [
      output('landscape-300dpi.png', 'Page appearance as PNG'),
      output('landscape-text.txt', 'Extracted wording as plain text'),
    ],
    expected:
      'PNG is 3300 × 2550 pixels. The TXT includes Landscape appendix and no page-image layout. Neither reconstructs a Word document or performs OCR.',
    ifDifferent:
      'If a scan produces no words, it needs a separate recognition step. If you need editable tables or paragraphs, neither page pictures nor plain-text extraction recreates that source layout.',
    processing: local,
  },
  'how-to-prepare-and-review-pdf-translation': {
    title: 'Practice: record a translation review without losing reference numbers',
    purpose:
      'The worksheet turns the article’s review advice into a handoff to a separate translator or reviewer. It intentionally provides no invented translated text or claim of automatic translation.',
    inputs: [venue],
    steps: [
      'Download the source and the CSV worksheet. It lists the three venue labels and the Archive: Room 40 reference by page.',
      'With your separate translation, enter the target language and the translated phrase for each row. Check the numbers 4 and 40 independently.',
      'Record a review decision and unresolved questions. Inspect the translated page layout in addition to completing the worksheet.',
    ],
    results: [output('translation-review-worksheet.csv', 'Blank translation-review worksheet')],
    expected:
      'Four source-phrase rows; target wording and decisions are intentionally blank for human review. Folio does not translate or certify the result.',
    ifDifferent:
      'A missing row, changed reference number, or unreviewed phrase should remain an open issue. A completed spreadsheet alone does not establish translation accuracy.',
    processing:
      'The worksheet is a direct download. Your chosen translation service has its own upload and retention terms.',
  },
  'pdf-editor-online-review-share': {
    title: 'Practice: request a decision without silently correcting the PDF',
    purpose:
      'The review copy asks whether the venue should change on page 2, while retaining the original wording. This is a comment handoff, separate from the one-correction and global-replacement articles.',
    inputs: [venue],
    steps: [
      'Open the wording source and add a comment on page 2: Please confirm whether this venue should change to Room 7. Keep the archive reference on page 3.',
      'Download a clearly named review copy. Open its comment in a PDF reader with comment support.',
      'Compare with the reference. Its original words remain unchanged; one comment carries the proposed decision. Send the checked file and identify the requested response.',
    ],
    results: [output('review-with-comment.pdf', 'Review copy with one comment on page 2')],
    expected:
      'Three original pages and one PDF comment. Venue: Room 4 is still the original wording; no correction was silently applied.',
    ifDifferent:
      'Some previews omit comment text. Use a reader with comment support before assuming that the export lost it; the reference was checked for the comment annotation and unchanged extracted wording.',
    processing: cloud,
  },
};

export function articleExerciseUpdated(slug: string, cmsUpdated: string) {
  const edition = '2026-10-31T00:00:00+05:00';
  return Object.hasOwn(articleExercises, slug) && Date.parse(cmsUpdated) < Date.parse(edition)
    ? new Date(edition).toISOString()
    : cmsUpdated;
}

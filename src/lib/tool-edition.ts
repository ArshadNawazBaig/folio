import type { Tool } from './tools';

type ToolCopy = Partial<Pick<Tool, 'description' | 'steps' | 'detail' | 'faq'>>;

// The catalog remains the source for the existing reviewed translations. These
// English revisions are grounded in the actual controls and export behavior;
// they must not fall through as English paragraphs on translated pages.
const englishToolCopy: Record<string, ToolCopy> = {
  'edit-pdf': {
    description:
      'Add text, sign or fill a PDF. Use Edit Text to replace supported wording. Download free without a watermark.',
    steps: [
      'Choose a PDF and open it in the editor. Guest work is saved privately for 24 hours.',
      'Choose Add text for a new note, Edit Text for existing words, or the annotation, signature and page controls for other changes.',
      'Download the PDF, reopen it, and check the changed pages at normal reading size.',
    ],
    detail:
      'Start by deciding whether the existing wording needs replacing or you only need to add information. Add text places a new object on the page; Edit Text changes a supported original text block. For a scanned form, add text over the response areas because the printed words are images. Check longer replacements for overlap: PDF paragraphs do not automatically reflow. The editor saves the document and changes to private cloud storage, so it needs an internet connection.',
    faq: [
      [
        'Which edits and downloads are free?',
        'Added text, highlights, images, shapes, visual signatures, form fields, page changes and supported original-text replacements are free to download. Folio does not add a watermark.',
      ],
      [
        'Why can I add text but cannot select the original words?',
        'The page may be a scan, its lettering may be drawn as shapes, or the text may use an unsupported PDF structure. Adding a text annotation still works, but it does not make the underlying words editable. Folio does not include OCR.',
      ],
      [
        'What happens to my document if I refresh?',
        'The editor saves your document and changes in private cloud storage for recovery. Guest files expire after 24 hours and share a 100 MB allowance. Sign in to keep documents in your account and access them across devices; keep a downloaded copy of work you need.',
      ],
      [
        'Does covering a sentence remove the underlying text?',
        'No. A white shape, an image or a new text box can hide content visually while leaving it in the PDF. Folio does not provide secure redaction. Use a dedicated redaction workflow when information must be removed.',
      ],
      [
        'Can I use the editor on a phone?',
        'Yes. Swipe the toolbar to see more tools and close the Properties panel to make room for the page. A desktop gives more space for precise placement and large documents. Reopen the download to check that small-screen placement looks correct.',
      ],
    ],
  },
  'edit-pdf-text': {
    steps: [
      'Choose a text-based PDF up to 10 MB and 100 pages, or try the built-in sample.',
      'Select a supported text block, replace the wording, and update the PDF preview. Adjust the font or size if the new text does not fit.',
      'Download the PDF, search for the replacement wording, and check its spacing. Unsaved standalone work stays in this tab.',
    ],
  },
  'merge-pdf': {
    steps: [
      'Add two or more PDFs: up to 20 files, 50 MB each and 150 MB combined.',
      'Use the move controls to put the complete files in reading order. Each file contributes all its pages.',
      'Merge the files, then check the first page, each document boundary and the final page before sharing.',
    ],
    detail:
      'Merge follows the file list from top to bottom and keeps the pages inside each source in their existing order. A portrait report and a landscape appendix keep their own page dimensions. To include only part of a source, extract those pages with Split PDF first; to rearrange pages after merging, open the result in Organize PDF. Keep original copies of interactive forms and digitally signed documents because copying pages can change form behavior or invalidate signatures.',
  },
  'compress-pdf': {
    faq: [
      [
        'Why did my PDF stay the same size?',
        'This tool rewrites PDF structure using compressed object streams. If the original already stores that structure efficiently, or most of its size is embedded photographs, there may be little to save. When optimization is not smaller, the download keeps your original file.',
      ],
      [
        'Can I compress a PDF to 100 KB or another upload limit?',
        'There is no target-size setting or guaranteed reduction. Compare the result with the receiving website’s limit. If the PDF is made from photos, compress the source images and create a new PDF. If only a few pages are required, extract those pages before checking the size again.',
      ],
      [
        'Will the text stay searchable and the images stay sharp?',
        'The operation does not rasterize text or reduce image resolution. Existing selectable text remains text; an image-only scan does not gain a searchable text layer. Reopen the exported file and check the pages you intend to send.',
      ],
    ],
  },
  'split-pdf': {
    steps: [
      'Choose a PDF and identify the file positions of the pages you need; printed page labels may differ.',
      'Enter a range such as 2-4, 7. Choose Selected pages in one PDF or One PDF per selected page (ZIP). Leave Pages blank to include every page.',
      'Download and check the page count. For a ZIP, extract it to open the individual PDFs.',
    ],
    detail:
      'Choose one combined extract when the recipient needs a chapter or a set of attachments. Choose the ZIP option when each selected page needs its own file. Ranges follow file positions starting at 1, and selected pages follow the order you enter: 6, 2-3 produces source pages 6, 2 and 3. Repeated selections are included once. This selects complete pages; it does not cut a scanned two-page spread into left and right halves.',
  },
  'rotate-pdf': {
    steps: [
      'Choose the PDF and find the sideways page in the preview.',
      'Enter that page number or a range, then choose 90°, 180° or 270° clockwise. Leave Pages blank to rotate all pages.',
      'Apply the rotation, download the copy, and reopen it to confirm the corrected orientation.',
    ],
    detail:
      'Rotation is added to each selected page’s current orientation and saved in the exported PDF. Use 90° for a clockwise quarter turn, 180° for an upside-down page, or 270° for a counterclockwise quarter turn. Every page in the selection receives the same turn. If different pages need different corrections, use the page controls in Organize PDF or process the groups separately.',
    faq: [
      [
        'Can I rotate just one page?',
        'Yes. Enter its position in the PDF, such as 3, in Pages. Use 2, 5-7 to rotate several nonconsecutive pages.',
      ],
      [
        'Does rotation lower quality?',
        'No. Rotation changes page orientation without resampling the page content. It does not straighten a scan that is tilted by a small angle.',
      ],
      [
        'Why is the rotation different in my PDF viewer?',
        'A viewer may offer a temporary viewing rotation. Download the processed file from Folio and open that copy to check the saved orientation, rather than reopening the source or relying on a viewer’s rotation button.',
      ],
    ],
  },
  'organize-pdf': {
    steps: [
      'Open the PDF in the editor and inspect the page thumbnails.',
      'Select the page you want to move, rotate, duplicate or delete. Use Undo if a change was unintended.',
      'Download and check the new page count, order and orientation against the thumbnails.',
    ],
    detail:
      'Use page thumbnails to remove an empty scan, move an appendix next to the section it supports, or duplicate a page before adding different notes. A blank page gives you room for new content. Page changes do not rewrite numbers already printed inside the PDF, so a reordered report can still show its old numbering. Review those labels and any table of contents before sending the new copy.',
    faq: [
      [
        'Can I undo a deleted page?',
        'Yes. Use Undo while the editing session is open. Keep the original PDF if you may need to recover material after the session has ended.',
      ],
      [
        'Are my originals changed?',
        'The download is a new file and does not overwrite the source on your device. The editor also saves the working document and changes to private cloud storage; guest workspaces expire after 24 hours.',
      ],
      [
        'Does reordering update printed page numbers?',
        'No. Moving a page moves its existing content, including any printed number. Check the final sequence before adding new footer numbers, since the Page numbers tool does not erase old ones.',
      ],
    ],
  },
  'watermark-pdf': {
    steps: [
      'Choose the PDF and enter the pages to mark. Leave Pages blank to include every page.',
      'Enter one line such as DRAFT, then choose text size, color and opacity. Start with a light setting for a review copy.',
      'Apply the watermark and inspect pages with dense text or different sizes before downloading.',
    ],
    detail:
      'The tool places one centered text watermark on each selected page. A light DRAFT or REVIEW COPY label can distinguish versions while keeping the text readable. Check both portrait and landscape pages: the same wording and size must fit each selected page. If the tool reports that the watermark is too wide, shorten the wording or lower its size. A watermark is a visible label and does not restrict opening, copying or editing the PDF.',
    faq: [
      [
        'Can I leave the cover unmarked?',
        'Yes. For a six-page file, enter 2-6 in Pages. Selections use positions in the PDF, not printed page numbers.',
      ],
      [
        'Can I add a logo or a repeated diagonal watermark?',
        'This tool adds a single centered line of text. It does not offer logo watermarks, tiled marks or a rotation control. The PDF editor can place an image when you need a logo on a particular page.',
      ],
      [
        'What should I do if the watermark obscures the text?',
        'Choose a lighter opacity or a smaller size, then process the original PDF again. Starting from the already marked download would add another watermark rather than replacing the first one.',
      ],
      [
        'Can I remove a watermark later?',
        'Keep your original file. Folio has no watermark-removal control. The mark becomes page content in the exported copy; it is not tamper-proof protection.',
      ],
    ],
  },
  'page-numbers': {
    steps: [
      'Choose the PDF and check for existing numbers or content near the bottom of each page.',
      'Set Pages to the positions you want numbered and enter a positive starting number. For an unnumbered cover, use 2 onward and start at 1.',
      'Add the numbers, then check the first and last numbered pages and the footer clearance in the download.',
    ],
    detail:
      'Numbers are placed in a centered footer and increase through the selection in the order entered. For a six-page document with a cover, Pages 2-6 and Start numbering at 1 adds numbers 1 through 5 without marking the cover. Enter pages in reading order unless you deliberately want another numbering sequence. This tool adds visible numbers; it does not change the PDF viewer’s page labels, erase old numbers or update a table of contents.',
    faq: [
      [
        'Can I start numbering after the cover?',
        'Yes. Exclude the cover from Pages and set Start numbering at to 1. For example, use 2-6 for the content pages in a six-page file.',
      ],
      [
        'Can I continue numbering from a previous document?',
        'Yes. Set a positive starting number such as 21. Five selected pages will then receive 21, 22, 23, 24 and 25.',
      ],
      [
        'Can I change the footer position or add a prefix?',
        'The current tool uses a centered numeric footer. It does not offer custom positions, “Page X of Y” text or Bates prefixes. Check the result for overlap with existing footers before sharing.',
      ],
    ],
  },
  'crop-pdf': {
    steps: [
      'Choose a PDF and select the pages whose margins need trimming.',
      'Enter the amount to trim from each edge in PDF points. Start small: 18 points trims a quarter inch from every side.',
      'Process the PDF and inspect all four edges of the smallest selected page before keeping the download.',
    ],
    detail:
      'The same amount is removed from the visible boundary on all four edges. A 20-point setting makes the visible width and height 40 points smaller because both opposite edges are trimmed. For mixed page sizes, the margin must leave a visible area on every selected page; reduce it or crop a smaller group if the tool rejects the setting. Cropping changes the visible boundary, not the underlying content, and must not be used to redact sensitive information.',
    faq: [
      [
        'Does cropping remove hidden text?',
        'No. Content outside the new visible boundary can remain in the PDF and may be recoverable. Use a dedicated redaction workflow when information must be removed.',
      ],
      [
        'What measurement is used?',
        'There are 72 PDF points in one inch. Use 18 points for a quarter inch or 36 points for half an inch from each edge. The setting is a trim amount, not the final page size.',
      ],
      [
        'Can I crop different amounts from the left and right?',
        'This tool applies an equal trim to every edge. It does not provide separate edge controls, an automatic whitespace detector or a target A4/Letter page size.',
      ],
    ],
  },
  'pdf-to-jpg': {
    steps: [
      'Choose a PDF and enter the pages to export, or leave Pages blank for all pages.',
      'Choose resolution and JPG quality. Try High — 144 DPI with Balanced — 90% for an initial preview.',
      'Inspect small text in the result. Download one JPG for a single page or a ZIP for multiple pages.',
    ],
    faq: [
      [
        'Will each page become its own image?',
        'Yes. The converter renders complete pages, including text and pictures, rather than extracting the original embedded photos. One selected page downloads as a JPG; multiple pages download as separate JPGs in a ZIP.',
      ],
      [
        'What is the difference between resolution and JPG quality?',
        'Resolution controls the number of pixels rendered from the page. JPG quality controls lossy compression of those pixels. Raise resolution for small text, and raise quality if edges show compression artifacts. Both can increase file size.',
      ],
      [
        'Why does a large page fail at 300 DPI?',
        'The tool limits each rendered page to 25 million pixels, each export to 200 pages and the combined image output to 150 MB. Lower resolution for an oversized page; choose fewer pages if the combined output is too large.',
      ],
      [
        'Will links and selectable text still work?',
        'No. A JPG is a flat image. Keep the PDF when the recipient needs searchable text, clickable links or interactive form fields.',
      ],
    ],
  },
  'pdf-to-png': {
    steps: [
      'Choose a PDF and select the pages you need.',
      'Choose resolution: 108, 144, 216 or 300 DPI. Use a higher setting when the destination needs more pixels.',
      'Preview the actual output, then download a PNG or a ZIP of separate page images. Check small labels at 100% zoom.',
    ],
    detail:
      'PNG stores the rendered page without JPG compression artifacts, which is useful for charts, diagrams and pages with small text. It does not preserve PDF interactivity: text, visible field values and link labels become pixels. Pages use a white background. A higher DPI produces more pixels and larger files, but cannot recover detail absent from a low-resolution scan.',
  },
  'pdf-to-text': {
    steps: [
      'Choose a PDF containing selectable words and wait for its preview to load.',
      'Enter the pages to extract. Limit each export to 200 pages; leave the field blank only when the whole document fits that limit.',
      'Download the TXT file and compare names, numbers and reading order with the original before reusing the text.',
    ],
    detail:
      'The export contains the existing PDF text, with page separators and basic line breaks. It is useful for notes, searching or moving wording into another editor. It does not reconstruct a document’s columns or a spreadsheet’s cells, so table values can appear in a different order from the page. Image-only scans have no selectable words to extract; Folio does not include OCR.',
    faq: [
      [
        'Why is there no selectable text?',
        'A scan or photograph can look like text while containing only pixels. Lettering can also be drawn as shapes. This tool reads an existing text layer and does not recognize words from images.',
      ],
      [
        'Why are columns or table values in the wrong order?',
        'PDFs store text for page display, which does not always match sentence or row order. Check the TXT output against the source. Use a table-specific conversion workflow if you need reliable spreadsheet rows and columns.',
      ],
      [
        'Will formatting be preserved?',
        'The TXT file contains words, page separators and basic line breaks. It does not contain fonts, images, clickable links or the original page layout.',
      ],
    ],
  },
  'sign-pdf': {
    steps: [
      'Open the PDF and check which fields and signing method the recipient requires.',
      'Fill supported fields, then draw, type or upload your signature and place it beside the signing line.',
      'Download and reopen the PDF. Check the signature, name, date and completed fields before sending it.',
    ],
    detail:
      'Fill existing text fields, checkboxes, dropdowns and radio groups from the editor’s form panel. If a scanned form has no interactive fields, use Add text over its answer spaces. Drawn, typed and uploaded signatures are visual additions to the PDF. Folio does not verify a signer’s identity, issue a certificate or provide a signing audit trail; use the method the recipient requests. The editor saves the document and changes to private cloud storage.',
  },
  'create-pdf-form': {
    steps: [
      'Open the PDF that will provide your form’s labels and layout, or start from a form template.',
      'Place text fields and checkboxes over the answer areas. Give each a unique name and mark required fields where appropriate.',
      'Export with fields fillable, then complete, save and reopen a test copy in the PDF reader your recipient uses.',
    ],
    detail:
      'Use a text field for a name or written response and a checkbox for a yes/no choice. Give fields names such as customer_name and receive_updates so they are easy to identify in the form panel. This builder creates text fields and checkboxes; the editor can also fill supported dropdowns and radio groups already present in a PDF. Leave the new fields empty when making a reusable form, and keep an interactive master before flattening any completed copies.',
    faq: [
      [
        'Will fields work in other PDF readers?',
        'Folio exports standard PDF form fields, but support and appearance vary across readers. Test the actual exported file: type a response, toggle a checkbox, save it and reopen it to confirm the values remain.',
      ],
      [
        'What does flattening do?',
        'Flattening turns current field appearances into page content. The exported fields can no longer be filled. Use it for a finished copy, and keep an unflattened master if other people still need to complete the form.',
      ],
      [
        'Why should field names be unique?',
        'Names identify form values. Reusing a name can cause fields to share a value or conflict during export. Use a separate meaningful name for each answer, such as applicant_name and contact_name.',
      ],
      [
        'Does a required field guarantee a complete response?',
        'The required flag can be interpreted differently by PDF readers and does not check whether an answer is correct. Review the returned form for missing responses before using it.',
      ],
    ],
  },
  'jpg-to-webp': {
    steps: [
      'Choose up to 20 JPG or JPEG photos and confirm that the destination accepts WebP.',
      'Keep the original dimensions for a first comparison, choose quality, then convert and compare the actual preview and file size.',
      'Download individual WebP images or the batch ZIP. Keep the source JPGs for future edits.',
    ],
    detail:
      'Use WebP when a website or publishing workflow accepts it and you want to compare another format’s file size. Start with the original dimensions to separate format savings from resizing. If the image is larger than it will be displayed, reduce its longest edge and check the result at the intended display size. Quality is adjustable and conversion can introduce artifacts, so inspect fine text, faces and high-contrast edges before replacing an existing image.',
    faq: [
      [
        'Will WebP always be smaller than my JPG?',
        'No. The result depends on the source and quality setting. Compare the reported file sizes at the same dimensions; an already optimized JPG may provide little saving.',
      ],
      [
        'Does converting to WebP improve the original photo?',
        'No. Conversion re-encodes the available pixels and cannot restore details lost to blur or earlier compression. Keep the original instead of repeatedly converting between JPG and WebP.',
      ],
      [
        'Can I resize and convert a batch together?',
        'Yes. Apply the maximum-dimension and quality settings to the batch, then review each result. The tool accepts up to 20 JPG/JPEG files, 50 MB per file and 150 MB total; decoded images are limited to 25 million pixels.',
      ],
    ],
  },
  'webp-to-jpg': {
    steps: [
      'Choose the WebP files that the receiving app or upload form cannot accept.',
      'Set JPG quality and optional maximum dimensions, convert, then check transparent areas against the new white background.',
      'Download the JPGs individually or as a ZIP, and verify that the receiving app accepts the exported files.',
    ],
    detail:
      'Convert the actual image format when a form or app requires JPG; changing a filename from .webp to .jpg does not convert its contents. JPG cannot store transparent pixels, so this converter fills them with white. The output can be larger than the source WebP. Check logos, cutout edges and small text before using the result, and keep the WebP original when its transparency is still needed elsewhere.',
    faq: [
      [
        'Why did my transparent WebP get a white background?',
        'JPG does not support transparency. White is used behind transparent areas during conversion. Keep the WebP original for uses that need a transparent background.',
      ],
      [
        'Can I convert an animated WebP?',
        'Re-encoding creates a still image. The output does not retain animation or export a sequence of frames.',
      ],
      [
        'Why is the JPG larger?',
        'Different formats use different encoding, so conversion is not a size guarantee. Lower JPG quality or reduce dimensions if the destination permits it, then inspect the result. Use Image compressor when a specific byte limit is the main requirement.',
      ],
    ],
  },
  'enhance-image': {
    steps: [
      'Choose a JPG, PNG or WebP image and identify the issue: dark exposure, flat contrast, weak color or soft edges.',
      'Make small adjustments, apply them, and switch between the original and result before increasing another setting.',
      'Download the result and inspect it at 100% zoom for lost highlight detail, noise and bright sharpening outlines.',
    ],
    detail:
      'Brightness shifts light and dark values; contrast increases their separation; saturation changes color intensity; sharpness emphasizes nearby edges. These adjustments work on the existing pixels. They do not reconstruct missing detail, remove a subject, restore severe blur or perform AI upscaling. A preview can look crisp when small while revealing halos or noise at full size, so judge the exported result at its intended viewing size.',
    faq: [
      [
        'Can this fix a blurry or very small image?',
        'It can emphasize existing edges, but cannot recover detail that the source did not capture. Use a higher-resolution original when possible. Sharpening a blurred image too strongly can make outlines more visible without making the subject clearer.',
      ],
      [
        'Why do bright areas become plain white?',
        'Increasing brightness or contrast too far can push light tones beyond the available range. Reduce the setting and compare highlights such as clouds, pale paper or skin with the original.',
      ],
      [
        'Can I apply the same adjustments to several images?',
        'Yes. One set of settings applies to the batch. Images with different lighting may need different adjustments, so check every result or process those images separately.',
      ],
    ],
  },
  'jpg-to-pdf': {
    steps: [
      'Choose JPG or JPEG photos and move them into the required reading order.',
      'Choose A4 for consistent portrait sheets or Fit each image for pages matching the photos’ proportions.',
      'Create the PDF and check the orientation, page order and readability of each photo before downloading.',
    ],
    detail:
      'This converter makes one PDF page per photo, useful for a sequence of receipt pictures or photographed documents. A4 centers each photo with margins; Fit each image uses its proportions at 96 pixels per inch. JPEG rotation metadata is respected so phone photos appear the intended way up. A portrait A4 page can leave wide margins around a landscape photo. Conversion packages the pixels you provide: it does not straighten, sharpen or recognize text in the photograph.',
    faq: [
      [
        'Can I put several receipt photos on a single sheet?',
        'Each photo becomes a separate PDF page. This tool does not make a collage or place several receipts on one sheet. Arrange the source photos into one image first if that is the layout you need.',
      ],
      [
        'Why is my phone photo not accepted?',
        'This page accepts JPG/JPEG. A phone photo may be HEIC even when it looks like an ordinary picture. Export it as JPG first, or use Image to PDF for a supported PNG or WebP source.',
      ],
      [
        'Will photographed text become searchable?',
        'No. The photo remains an image in the PDF. OCR is a separate step and is not included in this converter. Check small amounts and dates visually before sharing receipt scans.',
      ],
    ],
  },
  'png-to-pdf': {
    steps: [
      'Choose PNG screenshots or graphics and arrange them in the sequence you want readers to follow.',
      'Choose Fit each image to retain each graphic’s proportions, or A4 for consistent portrait paper sizes.',
      'Create and preview the PDF. Zoom into small interface labels and inspect transparent graphics against the page before downloading.',
    ],
    detail:
      'PNG is useful for screenshots and diagrams whose sharp labels should not acquire JPG compression artifacts. Ordinary PNG source data is embedded into the PDF, with one image per page. Fit-to-image pages can differ in size; A4 centers each image with margins on a consistent sheet. A long screenshot may look very small when fitted to one A4 page, so check its text at the scale your recipient will use. The converter does not split one tall screenshot across several pages.',
    faq: [
      [
        'Why is a tall screenshot hard to read on A4?',
        'A4 fits the complete image on one portrait sheet. A very tall screenshot must shrink to fit. Choose Fit each image for a page matching its proportions, or prepare shorter source images before converting.',
      ],
      [
        'Does this turn screenshot labels into selectable words?',
        'No. The PDF contains the PNG image, not an OCR text layer. Keep the original document when selectable text or accessibility information is required.',
      ],
      [
        'Can I include a JPG in the same PDF?',
        'This page accepts PNG files. Use Image to PDF or Merge images to combine supported JPG, PNG and WebP files in one batch.',
      ],
    ],
  },
  'merge-images': {
    steps: [
      'Add JPG, PNG and WebP images in one batch, up to 20 files and 150 MB combined.',
      'Arrange the complete file list, then choose A4 or Fit each image for the PDF pages.',
      'Create the PDF and check that the page count matches the image count and that every page is in order.',
    ],
    detail:
      'Merge images creates one PDF attachment with one image per page. Mix a receipt photo, a screenshot and a graphic without first converting them to a common image format. A4 provides consistent portrait pages; Fit each image allows different page dimensions. WebP sources and JPEGs needing orientation correction are decoded to PNG before embedding. The output is a sequence of PDF pages, so use another workflow if you need a stitched panorama, collage or one combined JPG.',
    faq: [
      [
        'Does Merge images produce one long image?',
        'No. It produces a multi-page PDF. Each source image occupies its own page; the tool does not stitch pictures together or combine them on one canvas.',
      ],
      [
        'Can I reorder images from different formats?',
        'Yes. JPG, PNG and WebP share one file list. Use the move controls before creating the PDF and inspect the resulting sequence in the preview.',
      ],
      [
        'What if one image is sideways or unreadable?',
        'Check the source first. JPEG orientation metadata is respected, but conversion cannot repair a blurred photo or detect how a screenshot should be read. Correct the source or rotate the resulting PDF page before sharing.',
      ],
    ],
  },
  'create-qr-code': {
    detail:
      'Choose Website for a destination address, Text for a short message, or Wi-Fi for network connection details. The QR stores the content directly and does not use a Folio tracking redirect. Use dark modules on a light background and keep the clear border intact. Before printing, scan the exported file on a second device and test it at the intended printed size. A website QR still depends on the destination remaining available; a Wi-Fi QR contains the network password.',
    faq: [
      [
        'Can I change the destination after printing?',
        'A static QR stores its original content, so changing the website address requires a new code. If you need to change a destination later, create an editable short link first and make the QR point to that link. The redirect then depends on the short-link service.',
      ],
      [
        'Why does the QR scan on screen but fail when printed?',
        'The printed modules may be too small, the colors may have low contrast, or the clear border may have been cropped. Keep the border, use a dark foreground on a light background, and test the actual printed size before producing a batch.',
      ],
      [
        'Which format should I use?',
        'PNG works well in documents and on screens. SVG keeps the module shapes sharp when resized for artwork. Avoid stretching a QR unequally or placing text over it.',
      ],
      [
        'Do these QR codes expire?',
        'Folio does not impose an expiry on the static code. A website code works only while its destination is available, and a Wi-Fi code needs updating if the network details change.',
      ],
    ],
  },
};

export function toolEdition(tool: Tool, locale = 'en'): Tool {
  if (locale !== 'en') return tool;
  const copy = englishToolCopy[tool.slug];
  return copy ? { ...tool, ...copy } : tool;
}

// Bump only pages whose visible copy or search description was revised.
const correctedToolSlugs = new Set([
  'invoice-generator',
  'edit-pdf-text',
  'watermark-pdf',
  'create-pdf-form',
]);

export function toolContentUpdated(slug: string, locale = 'en'): string | undefined {
  return correctedToolSlugs.has(slug) || (locale === 'en' && slug in englishToolCopy)
    ? '2026-10-15'
    : undefined;
}

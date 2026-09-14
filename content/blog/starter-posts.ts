import type { BlogDraft, RichNode } from '../../src/lib/blog';

const text = (value: string): RichNode => ({ type: 'text', text: value });
const link = (label: string, href: string): RichNode => ({
  ...text(label),
  marks: [{ type: 'link', attrs: { href } }],
});
const p = (...parts: (string | RichNode)[]): RichNode => ({
  type: 'paragraph',
  content: parts.map((part) => (typeof part === 'string' ? text(part) : part)),
});
const h = (title: string): RichNode => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [text(title)],
});
const list = (items: string[], ordered = false): RichNode => ({
  type: ordered ? 'orderedList' : 'bulletList',
  content: items.map((item) => ({ type: 'listItem', content: [p(item)] })),
});
const note = (value: string): RichNode => ({ type: 'blockquote', content: [p(value)] });
const table = (headers: string[], rows: string[][]): RichNode => ({
  type: 'table',
  content: [headers, ...rows].map((row, index) => ({
    type: 'tableRow',
    content: row.map((value) => ({
      type: index === 0 ? 'tableHeader' : 'tableCell',
      content: [p(value)],
    })),
  })),
});

type EditorialPost = {
  id: string;
  image: { id: string; photographer: string; page: string };
  draft: BlogDraft;
};
function article(
  id: string,
  fields: Omit<BlogDraft, 'author' | 'content'>,
  image: EditorialPost['image'],
  body: RichNode[],
): EditorialPost {
  return {
    id,
    image,
    draft: {
      ...fields,
      author: 'Folio Editorial',
      content: {
        type: 'doc',
        content: [
          ...body,
          { type: 'horizontalRule' },
          p('Cover photograph by ', link(image.photographer, image.page), ' on Unsplash.'),
        ],
      },
    },
  };
}

// Editorial source copies. Live posts remain editable in the super admin dashboard.
export const starterPosts: EditorialPost[] = [
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde101',
    {
      title: 'How to Edit PDF Text Without Rebuilding Your Document',
      slug: 'how-to-edit-pdf-text',
      excerpt:
        'Correct existing text, add new content, and keep your PDF looking consistent. A practical guide to editing directly on the page and checking your finished document.',
      category: 'PDF editing',
      tags: ['Edit PDF', 'Text editing', 'Annotations', 'Document workflow'],
      cover:
        'https://images.unsplash.com/photo-1552912140-6b3c254f5214?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'A blank notebook and black pen on a pale desk with soft leaf shadows.',
      seoTitle: 'How to Edit PDF Text Online: A Practical Guide',
      seoDescription:
        'Learn how to edit existing PDF text, add new text, review formatting, and save your work in Folio. Includes tips for scans and font differences.',
      featured: true,
    },
    {
      id: 'Hrh1E3T8nQc',
      photographer: 'Kelly Sikkema',
      page: 'https://unsplash.com/photos/photo-of-a-paper-and-pen-Hrh1E3T8nQc',
    },
    [
      p(
        'A proposal is ready to send, but the contact name has changed. A handout needs a revised date. A report needs one extra sentence. These are small changes, and recreating the entire document would take longer than the correction itself.',
      ),
      p(
        'Folio lets you work directly on the PDF page. The useful starting point is to decide whether you need to change words already in the file or add something new. Those two jobs use different tools, even when the finished pages look similar.',
      ),
      h('Choose Edit Text or Add Text'),
      p(
        'Use Edit Text to replace supported original text. This is the right choice for a spelling correction, a new heading, or an updated reference number. Use Add Text for a new note, an extra label, or information that belongs in an empty area. Added text sits above the existing page content.',
      ),
      p(
        'A PDF can store one sentence as several separate text objects. Clicking a word may therefore select only part of a line. Work through the available blocks and check the surrounding text after each change. The editor does not automatically rearrange a paragraph when you make a sentence longer.',
      ),
      h('Make a correction directly on the page'),
      list(
        [
          'Open Edit PDF and choose your document. Wait for the page preview and initial upload to finish.',
          'Choose Edit Text in the toolbar. Let Folio inspect the page for supported original text.',
          'Click the text block you want to change and type directly into it. Keep the first replacement short so you can judge how it fits.',
          'Use the text properties to adjust the replacement font, size, or color where needed. Click outside the text to review the result.',
          'Choose Save now and wait for the saved confirmation. Review the page again before downloading your finished PDF.',
        ],
        true,
      ),
      p(
        'For example, changing “Project review: 12 June” to “Project review: 19 June” is a useful first edit because the replacement occupies similar space. Changing that line to a full paragraph requires a more careful layout review. If several paragraphs need rewriting, returning to the source document may be the more efficient choice.',
      ),
      h('Add text that belongs in an empty space'),
      p(
        'Select Add Text, place a text box on the page, and enter your content. Use a size and color that match nearby text, then position the box with enough space around it. A short “Prepared for” label can look deliberate; a crowded note across the document footer usually will not.',
      ),
      p(
        'Keep annotations separate from corrections in your own review process. Highlights are useful when someone needs to notice a passage, while comments can hold feedback without rewriting the original. Remove temporary review marks from the copy you intend to send.',
      ),
      h('Check fonts, spacing, and zoom'),
      p(
        'The original PDF may contain an embedded or subset font that cannot be reproduced exactly by the replacement font. Look closely at letter width, line endings, and the alignment of numbers. A correction can be technically successful while still looking noticeably different from the rest of the page.',
      ),
      p(
        'Use Ctrl or Command with the mouse wheel, or a trackpad pinch, to zoom around the area you are inspecting. Check the edited line close up, then return to a whole-page view. This second pass catches changes that fit locally but disturb the overall balance of the layout.',
      ),
      h('What if the text cannot be selected?'),
      p(
        'A scan is often a picture of a page rather than a collection of editable words. Outlined lettering and some complex PDF objects may also be unavailable for original text editing. Folio does not currently provide standalone OCR to turn those page images into editable text. You can still add annotations, or obtain a text-based original before attempting a correction.',
      ),
      note(
        'Covering words with a white shape is a visual change. It is not secure redaction, and it should not be used to remove confidential information.',
      ),
      h('Save the workspace, then check the downloaded copy'),
      p(
        'Save now stores your editing progress so you can continue working. A successful save and a downloaded PDF serve different purposes: one preserves the workspace, while the other gives you the document to share. If saving reports an error, keep the tab open and retry before refreshing.',
      ),
      p(
        'Open the downloaded file and inspect every changed page. Confirm the wording, compare fonts, and check that new text does not overlap a page number or image. If the document uses a paid download feature, Folio presents the current plan options when you request the finished file.',
      ),
      p(
        'Start with ',
        link('Edit PDF', '/edit-pdf'),
        ', or read ',
        link('how to merge and organize PDFs', '/blog/how-to-merge-and-organize-pdf-files'),
        ' when your next task is arranging the pages.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde102',
    {
      title: 'How to Merge and Organize PDFs into a Clear, Professional Document',
      slug: 'how-to-merge-and-organize-pdf-files',
      excerpt:
        'Turn separate reports, attachments, and supporting pages into one document with a clear order. Learn when to merge, split, rotate, and add page numbers.',
      category: 'Document organization',
      tags: ['Merge PDF', 'Split PDF', 'Page numbers', 'Organize PDF'],
      cover:
        'https://images.unsplash.com/photo-1518081963661-980bed44215c?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'An open weekly planner with pens and small wrapped chocolates on a desk.',
      seoTitle: 'How to Merge and Organize PDF Files',
      seoDescription:
        'Combine PDFs in the right order, extract selected pages, fix rotation, and add page numbers. Build a clear document with Folio’s organization tools.',
      featured: false,
    },
    {
      id: 'NzukYmIQOps',
      photographer: 'Estée Janssens',
      page: 'https://unsplash.com/photos/white-printing-paper-and-blue-pen-NzukYmIQOps',
    },
    [
      p(
        'A well-organized PDF saves the reader from opening a string of attachments and guessing which one comes first. A proposal, a project brief, and a supporting appendix often work better as a single document, provided the pages tell a clear story.',
      ),
      p(
        'Merging brings the files together. Organizing makes the result easy to use. Taking a few minutes to choose the reading order, remove unnecessary pages, and check orientation can make the difference between a complete document and a confusing bundle.',
      ),
      h('Plan the reading order before merging'),
      p(
        'Start by writing a simple outline: introduction, main document, supporting evidence, appendix. Put the information the reader needs first at the front. For a project handover, that might mean the overview comes before the detailed specification. For a workshop pack, the agenda should appear before the worksheets.',
      ),
      p(
        'Use filenames to make your own preparation easier. Names such as 01-overview.pdf, 02-project-brief.pdf, and 03-appendix.pdf help you spot the intended sequence. Folio uses the order displayed in its file list when merging, so still check that list before you run the tool.',
      ),
      h('Combine your PDFs in Folio'),
      list(
        [
          'Open Merge PDF and add the PDF files that belong in the final document.',
          'Review the filenames. Use the move up and move down controls to put the files in the intended reading order.',
          'Remove an incorrect file or use Add more files if something is missing.',
          'Choose Merge PDFs, then download the combined result.',
          'Open the result and check the transitions between documents, including the first and last page of every section.',
        ],
        true,
      ),
      p(
        'The current merge tool accepts up to 20 files in a batch, with a maximum of 50 MB per file and 150 MB combined. Large files also require more browser memory. If the source material is unusually large, split the task into smaller, clearly named batches and review each result.',
      ),
      h('Keep only the pages the reader needs'),
      p(
        'A long appendix is not always useful in its entirety. Split PDF lets you extract selected pages into another document. Enter a range such as 1-3, 5, 8-10 to keep the opening section and a few supporting pages. Folio counts from the first physical page of the PDF, which may differ from the page numbers printed on the document itself.',
      ),
      p(
        'Suppose a 24-page report contains the summary on pages 2–4 and a useful diagram on page 18. Extracting those pages before merging keeps the final pack focused. Always check that the shortened selection still includes any definitions or references needed to understand it.',
      ),
      h('Use page tools for the final arrangement'),
      p(
        'Open the combined PDF in Organize PDF when you need to adjust individual pages. You can reorder, rotate, duplicate, or delete pages and add a blank page. File ordering belongs to the merge step; page ordering belongs to this final review.',
      ),
      p(
        'Mixed page sizes and orientations can be intentional. A landscape chart may be easier to read at its original size than forced onto a portrait page. Rotate pages that are genuinely sideways, and leave deliberately wide pages alone. Merging preserves the original sizes and orientations rather than making every page uniform.',
      ),
      h('Add consistent page numbers after the order is settled'),
      p(
        'Page numbers are most useful when they describe the final document. Add them after merging and arranging the pages. To leave a cover unnumbered, select a range beginning with physical page 2 and set the starting number to 1. Folio adds the number in the centered footer area.',
      ),
      p(
        'Check the footer before sharing. If a page already includes a number, a logo, or a line of contact information, a new number may overlap it. Keep the original unnumbered copy available so you can revisit the decision without repeatedly adding numbers to the same file.',
      ),
      h('Review the final document as a reader'),
      list([
        'Does the opening page explain what the document contains?',
        'Are the sections in the order referenced by the introduction?',
        'Are any blank, repeated, or unrelated pages still present?',
        'Can every chart and scanned page be read in the intended orientation?',
        'Do the final page numbers help the reader navigate without covering content?',
      ]),
      p(
        'Keep separate originals of interactive forms or digitally signed files. Copying their pages into a new document can change form behavior or affect signatures. Review those files separately before deciding whether a merged reference copy is appropriate.',
      ),
      p(
        'Build your document with ',
        link('Merge PDF', '/merge-pdf'),
        ', then use ',
        link('Organize PDF', '/organize-pdf'),
        ', ',
        link('Split PDF', '/split-pdf'),
        ', or ',
        link('Page numbers', '/page-numbers'),
        ' for the finishing steps.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde103',
    {
      title: 'How to Reduce PDF File Size While Keeping Your Pages Readable',
      slug: 'how-to-reduce-pdf-file-size',
      excerpt:
        'Understand what PDF compression can change, why some files barely shrink, and how to choose the right next step when a document exceeds an upload limit.',
      category: 'PDF optimization',
      tags: ['Compress PDF', 'File size', 'PDF quality', 'Sharing documents'],
      cover:
        'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'A hand-drawn line graph, metal ruler, and pens arranged on a wooden table.',
      seoTitle: 'How to Reduce PDF File Size Without Blurry Pages',
      seoDescription:
        'Optimize PDF file size with Folio, understand lossless compression limits, and learn what to do when a scanned or image-heavy document stays large.',
      featured: false,
    },
    {
      id: '6EnTPvPPL6I',
      photographer: 'Isaac Smith',
      page: 'https://unsplash.com/photos/line-graph-with-ruler-and-pens-6EnTPvPPL6I',
    },
    [
      p(
        'An upload form rejects your PDF because it exceeds the size limit. You could remove pages or export everything as a low-resolution image, but either choice may make the document less useful. A better first step is to understand what makes the file large and which changes your reader can accept.',
      ),
      p(
        'Folio’s Compress PDF tool optimizes the structure of the document. It does not lower image resolution or turn text into page screenshots. That makes it a useful first attempt when you want a smaller file while keeping its existing text and image resolution.',
      ),
      h('Why PDF file sizes vary so much'),
      p(
        'Two documents with the same number of pages can have very different sizes. One may contain mostly text and simple shapes. The other may contain a full-resolution scan on every page, plus photographs or other large assets. Page count alone does not tell you how much space a PDF needs.',
      ),
      p(
        'The way a PDF was generated also matters. Some files contain structural overhead that can be stored more efficiently. Others have already been optimized by the application that created them. A compressor has less room to improve a file that is already compact.',
      ),
      h('Run a structural optimization'),
      list(
        [
          'Open Compress PDF and choose the document you want to reduce.',
          'Note the original size and the upload limit you are trying to meet.',
          'Choose Optimize PDF and wait for the operation to finish.',
          'Compare the reported output size with the original. Keep the result that is useful for your destination.',
          'Open the downloaded PDF and review the pages you expect to be hardest to read: small text, charts, screenshots, and scanned details.',
        ],
        true,
      ),
      p(
        'Folio rewrites the document using compressed object streams. The aim is to store its structure more efficiently without resampling its images. Existing selectable text is not converted into a picture during this operation. An image-only scan, however, will still be an image-only scan afterward.',
      ),
      h('Set a useful target instead of chasing a percentage'),
      p(
        'If an upload accepts files under 10 MB, your practical target is a readable file below that limit. A hypothetical reduction from 11 MB to 9 MB solves that problem. A reduction from 30 MB to 25 MB is larger in absolute terms, but still leaves you needing another step.',
      ),
      p(
        'These numbers are examples, not promised results. Structural optimization cannot guarantee a specific reduction or a final file size. Folio reports the actual outcome, and an already optimized PDF may stay the same size or become larger when rewritten. In that case, keep the original available.',
      ),
      h('What to do when the file is still too large'),
      p(
        'Start with the document’s purpose. If the recipient needs only a few pages, use Split PDF to extract that selection. If the upload accepts multiple files, you may be able to send separate sections. Confirm the recipient’s requirements before splitting a document that must arrive as one complete file.',
      ),
      p(
        'For an image-heavy PDF, go back to the source when possible. A document prepared for screen reading may not need the same image resolution as a large printed poster. Adjust the image export settings in the original authoring or scanning application, create a new PDF, and inspect the smallest text and fine details before sending it.',
      ),
      p(
        'Folio’s current compressor does not include image downsampling. Repeatedly running the same structural optimization is unlikely to solve a file-size problem caused mainly by large photographs or scans. Identifying that cause is more productive than running the tool again without changing the input.',
      ),
      h('Do not confuse a smaller file with a better document'),
      p(
        'Converting every page into an image may remove useful text selection and other document behavior. Shrinking an image too aggressively can also make small labels difficult to read. Preserve the features your recipient needs and evaluate the result at a normal viewing size, not only as a thumbnail.',
      ),
      list([
        'Open several pages, including the most detailed page.',
        'Check that text which was selectable in the original is still selectable.',
        'Inspect chart labels, fine lines, and small print.',
        'Compare the final file size with the actual destination limit.',
        'Keep the source PDF so you can choose another export approach later.',
      ]),
      p(
        'Try ',
        link('Compress PDF', '/compress-pdf'),
        ' first. If only part of the document is needed, continue with ',
        link('Split PDF', '/split-pdf'),
        '. For a broader preparation workflow, read ',
        link(
          'the guide to merging and organizing PDFs',
          '/blog/how-to-merge-and-organize-pdf-files',
        ),
        '.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde104',
    {
      title: 'How to Create, Fill, and Sign a PDF Form',
      slug: 'how-to-create-fill-and-sign-pdf-forms',
      excerpt:
        'Build useful fillable fields, complete an existing form, and add a visual signature. Learn how to prepare an editable master and a finished copy for sharing.',
      category: 'Forms & signing',
      tags: ['PDF forms', 'Fill and sign', 'Checkboxes', 'Fillable PDF'],
      cover:
        'https://images.unsplash.com/photo-1530971013997-e06bb52a2372?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'A person writing in a notebook at a meeting table beside a laptop.',
      seoTitle: 'How to Create, Fill and Sign PDF Forms',
      seoDescription:
        'Create PDF text fields and checkboxes, fill existing forms, add a visual signature, and understand when to export an interactive or flattened copy.',
      featured: false,
    },
    {
      id: 'O3gOgPB4sRU',
      photographer: 'Sarah Elizabeth',
      page: 'https://unsplash.com/photos/person-holding-pen-writing-on-paper-O3gOgPB4sRU',
    },
    [
      p(
        'A useful form makes the next action obvious. The reader knows what to enter, where to enter it, and what to do with the completed document. Whether you are preparing an event registration sheet or completing a project checklist, a few thoughtful field choices can remove unnecessary back-and-forth.',
      ),
      p(
        'Folio supports two common workflows: filling supported fields that already exist in a PDF, and adding text fields or checkboxes to a PDF background. You can also place a visual signature on the page. Start by deciding whether you are creating a reusable form or finishing a single copy.',
      ),
      h('Check whether the PDF already has fields'),
      p(
        'Open the document through Fill & sign. Supported text fields, checkboxes, dropdowns, and radio groups appear in the workspace’s Form panel. Use these existing fields when they are available; they connect your answer to the form’s intended structure.',
      ),
      p(
        'A printed line or an empty box is not necessarily an interactive field. If the Form panel has no usable fields, the PDF may be a flat page or a scan. You can add text annotations to complete your own copy, or create real fields if other people will need to fill the document later.',
      ),
      h('Build a reusable form'),
      list(
        [
          'Open Create a PDF form and choose the PDF that will provide the page layout.',
          'Choose Text field from More tools and place a field beside the relevant question or label.',
          'Give the field a meaningful, unique name in its properties. For example, use participant_name and contact_email for separate answers.',
          'Choose Checkbox for a simple yes-or-no response or an individual item in a checklist.',
          'Adjust field positions and sizes, then mark fields as required where that matches the intended workflow.',
          'Leave reusable fields empty and export without flattening so recipients can enter their own answers.',
        ],
        true,
      ),
      p(
        'A field’s internal name and its visible question do different jobs. “contact_email” is a useful internal name, but the reader still needs a clear label such as “Email address” printed beside the box. Keep instructions close to the field rather than forcing readers to search the top of the page.',
      ),
      h('Design fields for the answers you expect'),
      p(
        'Leave enough width for realistic names and addresses. A narrow box may look tidy when it is empty but become difficult to use when someone enters a longer response. Checkboxes need enough surrounding space that their purpose is unambiguous, especially when several choices appear on the same line.',
      ),
      p(
        'For an event form, a simple structure might include participant name, contact email, organization, and a checkbox for a specific attendance option. Avoid asking for information you do not need. Fewer, clearer questions make the completed form easier to review.',
      ),
      p(
        'The current form builder creates text fields and checkboxes. It can fill supported existing dropdowns and radio groups, but those additional field types are not part of its current creation tools. Plan your layout around the controls you can actually provide.',
      ),
      h('Fill the form and add a visual signature'),
      p(
        'Use the Form panel to enter values and review your answers against the page. For a non-interactive area, Add Text can place information directly on the document. Choose Sign for a typed signature, or use Pencil to draw a signature by hand. Position it within the intended signature area and check that it does not cover a date or printed name.',
      ),
      note(
        'Folio adds a visual signature. It does not provide a certificate-based digital signature, identity verification, or a signing audit trail. Check what format the recipient requires before completing the document.',
      ),
      h('Choose an interactive or flattened export'),
      p(
        'Keep fields interactive when the next person must enter or change answers. This is the appropriate choice for a blank master that you plan to reuse. Flatten fields when exporting turns their current appearances into page content, so the exported fields can no longer be filled.',
      ),
      p(
        'Flattening is useful for a finished reading copy, but it is not a guarantee that the entire PDF can never be edited. Keep a separate interactive master if you may need to revise answers or issue the form again. Give the two files distinct names so you do not accidentally send an empty master instead of a completed copy.',
      ),
      h('Test the form before sending it out'),
      p(
        'Open the exported form in the PDF reader your recipients are likely to use. Enter a long sample answer, check the boxes, save, and reopen the file to confirm the values remain visible. Field appearance and behavior can vary between readers, so this small test is more useful than judging only the editor preview.',
      ),
      p(
        'Begin with ',
        link('Create a PDF form', '/create-pdf-form'),
        ' for a reusable template, or ',
        link('Fill & sign', '/sign-pdf'),
        ' to complete a document you have received.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde105',
    {
      title: 'PDF Conversion Guide: Choose the Right Format for Your Next Task',
      slug: 'pdf-conversion-guide-choose-the-right-format',
      excerpt:
        'Choose between JPG, PNG, plain text, and a PDF made from images. Learn which formats fit presentations, notes, and document sharing, plus what to check after conversion.',
      category: 'PDF conversion',
      tags: ['PDF converter', 'PDF to JPG', 'Image to PDF', 'PDF to text'],
      cover:
        'https://images.unsplash.com/photo-1770681381576-fe1ca0178da1?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'An open laptop and a small notebook on a tidy desk beside a chair.',
      seoTitle: 'PDF Conversion Guide: JPG, PNG, Text and More',
      seoDescription:
        'Choose the right PDF conversion for images, presentations, plain text, and editable Office files. Follow practical steps and check the finished result.',
      featured: false,
    },
    {
      id: '-Z8cI1gs4zk',
      photographer: 'nicoll camacho',
      page: 'https://unsplash.com/photos/laptop-notebook-and-pen-on-a-desk--Z8cI1gs4zk',
    },
    [
      p(
        '“Convert this PDF” can mean several different things. You might need a slide image, a collection of receipts in one document, editable words for your notes, or an Office file for further work. Choosing the output format first prevents unnecessary conversions and makes the result easier to evaluate.',
      ),
      p(
        'A PDF is designed around pages. When you convert it, some of the information that matters on a page may no longer behave the same way. Images preserve the visible appearance, plain text keeps the words, and editable document formats attempt to reconstruct a working layout.',
      ),
      h('Match the format to the job'),
      table(
        ['Your next task', 'Useful format', 'What to check'],
        [
          ['Place a page preview in a presentation', 'JPG', 'Small text and compression artifacts'],
          [
            'Share a diagram or a text-heavy page as an image',
            'PNG',
            'Resolution and the resulting file size',
          ],
          [
            'Combine receipt photos or sketches into a document',
            'PDF from JPG or PNG',
            'Image order, orientation, and page fit',
          ],
          ['Reuse selectable words in notes', 'Plain text', 'Reading order and missing layout'],
          [
            'Continue editing in Word, Excel, or PowerPoint',
            'DOCX, XLSX, or PPTX when connected',
            'Reconstructed layout and editable content',
          ],
        ],
      ),
      h('Export PDF pages as JPG or PNG'),
      p(
        'Use PDF to JPG for page previews where a compact image is helpful. PNG is a useful alternative for diagrams, fine lines, and text-heavy pages because its image encoding avoids lossy compression artifacts. The selected resolution still determines how much detail the rendered page contains.',
      ),
      list(
        [
          'Open PDF to JPG or PDF to PNG and choose your PDF.',
          'Select the pages you need. Leave the range empty for all pages, or enter a selection such as 1-3, 6.',
          'Choose an image resolution appropriate to where you will use the result.',
          'Run the conversion and download the ZIP archive containing one image per selected page.',
          'Open an exported image at its intended display size and check the smallest important text.',
        ],
        true,
      ),
      p(
        'An exported page image no longer contains selectable PDF text or interactive fields. A visible link becomes part of the picture rather than a clickable PDF link. Keep the original PDF if recipients need to search, copy text, or interact with a form.',
      ),
      h('Turn images into a single PDF'),
      p(
        'Image to PDF is useful for grouping receipt photos, sketches, and existing JPG or PNG exports. Add the images, arrange their order, and choose fitted pages or A4. Each image becomes its own PDF page. A4 places the image on a portrait sheet with margins; fitted pages follow the image proportions.',
      ),
      p(
        'Prepare the images before combining them. Rotate a sideways photo, remove an accidental duplicate, and check that handwriting is readable. Folio currently accepts JPG and PNG in this tool, with up to 20 images per batch. Convert other formats, such as HEIC, before adding them.',
      ),
      p(
        'Creating a PDF from a photograph does not recognize the words inside it. The resulting document contains page images. If searchable text is essential, you will need a separate OCR workflow; Folio does not currently offer standalone OCR.',
      ),
      h('Extract words for notes and reuse'),
      p(
        'PDF to text extracts existing selectable text and downloads it as a plain text file. It is a practical choice when you want the wording from a report without its typography, page furniture, or images. Select only the pages you need to keep the output focused.',
      ),
      p(
        'Read the extracted text before reusing it. Multi-column pages can produce an unexpected reading order, and tables may lose the visual relationship between cells. Plain text does not preserve fonts, images, or complex layout. If the PDF is an image-only scan, there may be no selectable words to extract.',
      ),
      h('Understand Office conversion availability'),
      p(
        'Folio also has workspaces for PDF to Word, Excel, and PowerPoint. These conversions depend on a connected conversion service. Check the tool’s availability message before planning your workflow. If it displays Service not connected, processing is unavailable; that message does not mean your PDF is damaged.',
      ),
      p(
        'When the service is available, open the converted file in the target application and review it there. Check paragraph flow in Word, rows and columns in Excel, and object placement in PowerPoint. Converting a finished page back into editable objects can change its layout, so leave time for a final adjustment pass.',
      ),
      h('Convert once, review, then share'),
      p(
        'Work from the best available original and avoid unnecessary round trips between formats. Give the output a descriptive name that identifies its purpose, such as workshop-page-03.png or receipts-march.pdf. Keep the source until you have confirmed that the converted copy does everything the recipient needs.',
      ),
      p(
        'Explore ',
        link('PDF conversion tools', '/convert'),
        ', or go directly to ',
        link('PDF to JPG', '/pdf-to-jpg'),
        ', ',
        link('PDF to PNG', '/pdf-to-png'),
        ', ',
        link('Image to PDF', '/image-to-pdf'),
        ', and ',
        link('PDF to text', '/pdf-to-text'),
        '.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde106',
    {
      title: 'How to Prepare and Review a PDF Translation',
      slug: 'how-to-prepare-and-review-pdf-translation',
      excerpt:
        'Prepare a clear source PDF, choose the right languages, and review translated pages carefully. A practical workflow for preserving meaning and catching layout problems.',
      category: 'PDF translation',
      tags: ['Translate PDF', 'Languages', 'Document review', 'PDF preparation'],
      cover:
        'https://images.unsplash.com/photo-1604297992396-5df2499ba816?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'A small blue globe resting on a stack of books in natural light.',
      seoTitle: 'How to Prepare and Review a PDF Translation',
      seoDescription:
        'Prepare PDFs for translation, choose source and target languages, compare translated pages, and review layout and terminology before sharing.',
      featured: false,
    },
    {
      id: 'xSofsfb5Hco',
      photographer: 'Eugenia Pan’kiv',
      page: 'https://unsplash.com/photos/blue-and-yellow-desk-globe-on-yellow-and-white-books-xSofsfb5Hco',
    },
    [
      p(
        'A translated PDF should help someone use the document, not simply replace its words. Headings must still guide the reader, labels must still belong to the right diagrams, and dates or reference numbers must remain easy to verify. Preparing the source and reviewing the result are both part of that work.',
      ),
      p(
        'Folio provides a translation workspace where you can choose languages and compare original and translated pages. Processing depends on a connected translation service. The workflow below explains how to prepare your document and what to check when translation is available.',
      ),
      note(
        'Check the workspace’s service status first. If it shows Service not connected, you can preview the original PDF, but translation processing is not currently available.',
      ),
      h('Begin with the clearest source PDF'),
      p(
        'Use the document exported from its original authoring application when you have it. Clear text and a straightforward layout give you a better starting point than a low-quality photograph of a printed page. Check that the PDF opens normally and that every page is present before translating it.',
      ),
      p(
        'If you only have a scan, inspect its orientation, contrast, and readability. A skewed or faint page is harder to review in either language. Recognition of scanned content depends on the connected document service and source quality; Folio does not provide a separate OCR tool in this workflow.',
      ),
      p(
        'The current translation workspace accepts PDFs up to 10 MB and 20 pages. For a longer document, use Split PDF to prepare clearly named sections. Keep related paragraphs, tables, and their explanatory notes together where possible, then maintain a simple list of the sections you have translated and reviewed.',
      ),
      h('Choose the source and target languages deliberately'),
      p(
        'Original language controls how the source is interpreted. You can use Auto-detect or choose a supported language explicitly. If you already know the language, selecting it makes your intended source clear. Translate into sets the output language, and it must differ from the selected source.',
      ),
      p(
        'A document containing several languages deserves extra attention. A title, a quoted passage, and the main body may not all need the same treatment. Review the original first and note anything that should remain unchanged, such as a product name, an address, or an identifier. Do not assume a language selection will resolve every mixed-language passage correctly.',
      ),
      h('Translate and compare the result'),
      list(
        [
          'Open Translate PDF and confirm that processing is available.',
          'Choose your PDF and inspect the original page preview.',
          'Set Original language and Translate into, then start translation.',
          'Wait for the translated result and review the corresponding pages alongside the original. On a smaller screen, switch between the original and translation views.',
          'Check every page before downloading. If a paid download is required, review the plan shown at that step.',
        ],
        true,
      ),
      p(
        'Take a short document as an example: a three-page event guide with a schedule, a venue description, and arrival instructions. Confirm the schedule’s times and dates against the original, review the venue name and address, and read the arrival steps as a complete sequence. A sentence can sound natural while still changing a detail that matters.',
      ),
      h('Review meaning before polishing appearance'),
      list([
        'Check names, reference numbers, dates, units, and numerical values against the original.',
        'Look for repeated terms and confirm that the same concept is expressed consistently.',
        'Read instructions in order and check whether the intended action is still clear.',
        'Review headings and table labels together with the content they describe.',
        'Ask a fluent reviewer to resolve wording you cannot confidently evaluate yourself.',
      ]),
      p(
        'Automatic translation can provide a useful draft, but it should not be treated as an assurance of accuracy. For material where a misunderstanding would have serious consequences, arrange an appropriate qualified review before relying on or distributing the translation. The tool does not provide a certified translation service.',
      ),
      h('Check layout after the language changes'),
      p(
        'Translated text can take more or less space than the original. Watch for lines running into neighboring content, headings wrapping awkwardly, and table cells becoming crowded. Compare the positions of labels, captions, and footnotes rather than checking only the main paragraphs.',
      ),
      p(
        'Fonts and text direction may also affect the appearance. Review the translated pages at a readable zoom level and inspect the exported file again before sharing it. Folio offers separate original and translated views; the current workflow does not create a bilingual PDF with both versions combined.',
      ),
      h('Keep the original and identify the translated copy'),
      p(
        'Use a filename that includes the target language, such as event-guide-spanish.pdf, and keep the source separately. This makes later corrections easier to trace and helps the recipient identify the version they received. If the source changes, compare the affected sections before reusing an older translation.',
      ),
      p(
        'Prepare your file with ',
        link('Split PDF', '/split-pdf'),
        ' or ',
        link('Rotate PDF', '/rotate-pdf'),
        ' where needed, then visit ',
        link('Translate PDF', '/translate-pdf'),
        ' to check availability and begin your review workflow.',
      ),
    ],
  ),
];

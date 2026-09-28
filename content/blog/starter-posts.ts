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
const h = (title: string, level: 2 | 3 = 2): RichNode => ({
  type: 'heading',
  attrs: { level },
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
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde107',
    {
      title: 'How to Create a QR Code for a Link That People Can Actually Use',
      slug: 'how-to-create-a-qr-code-for-a-link',
      excerpt:
        'Turn a website, menu, or PDF link into a free QR code. Learn when to use a static code, how to keep a destination editable, and what to check before you print.',
      category: 'QR codes',
      tags: [
        'QR code generator',
        'Free QR code',
        'WiFi QR code',
        'Static QR codes',
        'Dynamic QR codes',
      ],
      cover:
        'https://images.unsplash.com/photo-1706759755832-47e53579cc0d?auto=format&fit=crop&w=1600&q=85',
      coverAlt:
        'A person holds a phone in front of a QR code displayed on a laptop at a coffee table.',
      seoTitle: 'How to Create a QR Code for a Link: Free, Practical Guide',
      seoDescription:
        'Create a free QR code for a website, PDF link, or Wi-Fi network. Compare static and editable links, choose PNG or SVG, and fix common scanning problems.',
      featured: false,
    },
    {
      id: 'v9bLIYP20xw',
      photographer: 'Marielle Ursua',
      page: 'https://unsplash.com/photos/a-person-using-a-laptop-computer-with-a-qr-code-on-the-screen-v9bLIYP20xw',
    },
    [
      p(
        'A café prints a QR code on its menus. It scans perfectly, opens the right page, and looks good beside the logo. A month later, the menu moves to a new web address. The printed code still points to the old one.',
      ),
      p(
        'Making a QR code takes very little time. Choosing the right link is the part worth slowing down for. Before you download anything, decide whether the destination will stay put, whether visitors can open it without signing in, and where they will scan the finished code.',
      ),
      p(
        'For a quick start, open Folio’s ',
        link('free QR code generator', '/create-qr-code'),
        ', select Website address, paste your link, and choose Generate QR code. Download PNG or SVG, then scan the downloaded file with your phone. You do not need an account for this standalone tool.',
      ),
      h('Start with the page you want someone to reach'),
      p(
        'Send people straight to the useful thing: the menu, booking form, event details, or document. A code on a workshop poster should open the registration page, not leave someone hunting through your homepage. Check the destination on a phone before turning it into a QR code.',
      ),
      p(
        'Open that link in a private browser window or on a device where you are signed out. A page that works in your own account may ask everyone else to request access. Shortening the address or encoding it in a QR code will not change those permissions.',
      ),
      h('Static vs. dynamic QR codes: what actually changes?'),
      p(
        'A static QR code contains fixed information. If it encodes a website address, that address is part of the pattern. You can update the page at the same address, but changing the encoded address means making a new QR image.',
      ),
      p(
        'What is often called a dynamic QR code usually contains a redirect link. The printed pattern stays the same while a service changes where that link sends visitors. The flexibility comes from managing the redirect, so the code depends on that service and the saved link remaining available.',
      ),
      table(
        ['Your situation', 'A sensible starting point'],
        [
          ['A stable website page you control', 'A static QR code pointing directly to that page.'],
          [
            'A printed menu whose web address might change',
            'A QR code for a saved short link with an editable destination.',
          ],
          [
            'Guest Wi-Fi details or a short text message',
            'A static code containing the details themselves.',
          ],
          [
            'A one-off event registration page',
            'A direct code if the address is final; an editable short link if it may move.',
          ],
        ],
      ),
      p(
        'Folio’s standalone generator makes static codes. For an editable destination, create a link with the ',
        link('URL Shortener', '/url-shortener'),
        ' and use its Generate QR option. Folio Pro lets you update that saved link’s destination while keeping the same short address and QR image. Free accounts can also generate short-link QR codes, but destination editing requires Pro.',
      ),
      h('How to create a QR code for a website link'),
      list(
        [
          'Copy the final website address and open it in a fresh browser tab to check it.',
          'Open Create QR Code in Folio. Under QR content, choose Website address and paste the URL.',
          'Choose Code color and Background. A dark code on a plain, light background is a dependable starting point.',
          'If you want a PNG, select 512, 1024, or 2048 pixels under PNG dimensions. You can also download an SVG after generating.',
          'Select Generate QR code, then Download PNG or Download SVG.',
          'Scan the downloaded image and follow the link all the way to the page. Confirm that it is the exact destination you intended.',
        ],
        true,
      ),
      p(
        'Put a short instruction beside the finished code. “View the lunch menu” gives someone a reason to scan. “Scan me” leaves them guessing. Include a readable web address nearby when space allows, so someone can still reach the page if their camera struggles.',
      ),
      h('Can you create a QR code for a PDF?'),
      p(
        'Yes. The QR code should contain a web link to the PDF or a page where people can open it. First place the document somewhere that supports the access you intend, then test its sharing link while signed out. Pasting a filename such as menu.pdf will not upload the file or make it available online.',
      ),
      p(
        'Files in your private Folio workspace are not public PDF hosting. For a public handout, use a suitable public document link or a page on your website. If you will replace the PDF regularly, keep a stable page address or use a short link whose destination you can edit.',
      ),
      h('How to make a Wi-Fi QR code'),
      p(
        'For a guest network, choose Wi-Fi network under QR content. Enter the network name exactly as it appears in your Wi-Fi settings, select the matching security option, and enter the password. Mark Hidden network only if that applies. Generate the code and try joining with a compatible phone.',
      ),
      p(
        'A Wi-Fi QR code stores connection details; it does not keep the password secret. Anyone who can read the code may be able to recover those details. Use credentials you are comfortable sharing with that audience, such as a separate guest network. Changing the network name or password means replacing the code.',
      ),
      h('PNG or SVG: which should you download?'),
      p(
        'PNG is convenient for documents, slides, and apps that accept ordinary image uploads. Download enough pixels for the size you plan to use, and avoid enlarging a small image until its edges blur. Folio offers three PNG sizes so you can choose the one that fits your layout.',
      ),
      p(
        'SVG is a vector format, so its edges remain sharp when scaled. It is a useful choice for print layouts when your design software or printer accepts it. Either format can work well; the final printed size, surrounding space, contrast, and viewing conditions still matter.',
      ),
      h('Why a QR code will not scan—and what to check'),
      p(
        'Start with the white space around it. That clear margin is called the quiet zone. ',
        link('DENSO WAVE’s QR code guidance', 'https://www.qrcode.com/en/howto/code.html'),
        ' specifies a margin four modules wide on every side. A module is one of the small squares that make up the code. Folio includes that margin in its download; keep it when placing the image in your design.',
      ),
      list([
        'The camera does not recognize a code: check for a cropped margin, blurry edges, low contrast, glare, or a code that is too small at the scanning distance.',
        'The camera recognizes it but the page fails: open the encoded address directly. Check for a typo, a deleted page, a sign-in requirement, or a missing internet connection.',
        'It works on screen but fails in print: scan a proof at the actual printed size and under the lighting where people will use it.',
        'It works on one phone only: try another device, adjust distance and lighting, and simplify the design before printing more copies.',
      ]),
      p(
        'Do not place a logo, label, or decorative shape over the downloaded pattern and assume it will still work. Folio does not provide a logo-overlay feature. Put your branding beside the code and test the complete layout, including any border or background you add.',
      ),
      h('Questions to settle before sharing'),
      h('Do QR codes expire?', 3),
      p(
        'The static codes created by Folio’s standalone generator have no Folio expiry. The destination can still disappear, change permissions, or stop loading. A code pointing to a short link also depends on that saved link and its redirect service. Deleting a Folio short link stops its QR code from reaching the destination.',
      ),
      h('Can I change a QR code after printing it?', 3),
      p(
        'You cannot change the information in a printed pattern. You can update a webpage at the same address, or change the destination behind an editable redirect. If your code points directly to the wrong address, you will need a replacement image and new printed copies.',
      ),
      h('Does a QR code work without internet?', 3),
      p(
        'A compatible reader can decode the pattern without an internet connection. Opening the website it contains normally needs one. Plain-text codes contain the message itself; Wi-Fi codes contain network details, though joining still depends on a compatible device and an available network.',
      ),
      h('Can I see how many people scanned my code?', 3),
      p(
        'Folio does not currently provide scan counts or short-link click analytics. If you manage a website with analytics, you can use campaign parameters on the destination URL to help identify resulting visits. Those visits are not the same measurement as every scan.',
      ),
      p(
        'Before ordering a stack of signs, print one. Scan it with two phones, open the destination while signed out, and ask someone unfamiliar with the layout to try it. That small rehearsal is far cheaper than replacing a batch of menus. When the link is ready, ',
        link('create your QR code', '/create-qr-code'),
        ' or read ',
        link('how to shorten a URL and manage its destination', '/blog/how-to-shorten-a-url'),
        ' if you need more flexibility.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde108',
    {
      title: 'How to Shorten a URL: Free Links, Custom Aliases, and QR Codes',
      slug: 'how-to-shorten-a-url',
      excerpt:
        'Make long links easier to share and find again. A practical guide to free URL shortening, choosing a useful custom alias, saving links, and updating QR destinations.',
      category: 'URL shortener',
      tags: [
        'URL shortener',
        'Free URL shortener',
        'Link shortener',
        'Custom short links',
        'QR codes',
      ],
      cover:
        'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'A person in a mustard sweater works on a laptop at a wooden table.',
      seoTitle: 'How to Shorten a URL: Free Links, Custom Aliases & QR Codes',
      seoDescription:
        'Learn how to shorten a URL, save links, and download QR codes. See Folio’s free limits, Pro custom aliases, editable destinations, and practical sharing tips.',
      featured: false,
    },
    {
      id: 'Hcfwew744z4',
      photographer: 'Christin Hume',
      page: 'https://unsplash.com/photos/person-using-laptop-computer-Hcfwew744z4',
    },
    [
      p(
        'You paste an event registration link into an invitation and it takes up three lines. The address contains a form ID, several parameters, and nothing a guest could comfortably type from a poster. A short link can give that address a tidier way to travel.',
      ),
      p(
        'To shorten a URL in Folio, sign in, open the URL Shortener, paste your destination, and select Shorten link. The result is saved to your account, ready to copy or turn into a QR code. Free accounts can keep up to 10 saved links; Pro adds custom aliases, editable destinations, and room for 1,000.',
      ),
      p(
        'The useful question is what happens after you share it. Can you find the link next month? Will you need to change where it goes? Is the address clear enough for someone reading it off a slide? Those choices determine whether a basic free link is enough.',
      ),
      h('What is a URL shortener, and how does it work?'),
      p(
        'A URL shortener saves a destination address and gives it another address on the shortening service. When someone opens the new link, the service redirects their browser to the destination. The original page stays where it is; the shortener keeps the connection between the two addresses.',
      ),
      p(
        'For example, a Pro custom alias might give a Folio link the ending /s/autumn-workshop. That is an illustrative alias, subject to availability. The actual link includes Folio’s full domain before that path. It can be easier to read than a long registration URL, although an already brief original address may be shorter than the generated link.',
      ),
      p(
        'A short link is useful in a message, presentation, handout, or QR code. In an ordinary website paragraph, a descriptive text link such as “Register for the workshop” may already solve the presentation problem. Shortening is most useful when you also want a saved link, a recognizable alias, or a destination you can update.',
      ),
      h('How to shorten a URL for free in Folio'),
      p('Open the ', link('URL Shortener', '/url-shortener'), ' and follow these steps:'),
      list(
        [
          'Sign in to your Folio account. The shortener saves links to accounts, including free accounts; guest access does not create saved short links.',
          'Paste the original address into Destination URL. Open it separately first to check that it reaches the intended page.',
          'Add an optional Title, such as “October workshop registration,” so you can recognize it in your list later.',
          'Leave Custom alias blank for a generated alias. If you have Pro, you can choose an available custom alias instead.',
          'Select Shorten link, then Copy link. Open the copied address in a fresh tab and check the destination.',
          'Use Open My links to return to your saved collection. You can search by title, alias, or destination.',
        ],
        true,
      ),
      p(
        'Use the original destination rather than a link that has already been shortened. Extra redirects make it harder to work out where a failure happens. Folio also prevents you from using another Folio short-link address as the destination.',
      ),
      p(
        'For public sharing, check the destination while signed out of its website. A short link to a private form or file still leads to a private form or file. Your Folio link list belongs to your account, but anyone who receives an active short link can follow it; the destination’s own access rules then apply.',
      ),
      h('Free URL shortener vs. Pro: what do you need?'),
      table(
        ['Feature', 'Folio Free', 'Folio Pro'],
        [
          ['Saved short links', 'Up to 10', 'Up to 1,000'],
          ['Automatically generated aliases', 'Included', 'Included'],
          ['Choose a custom alias', 'Not included', 'Included'],
          ['Edit the destination of an existing link', 'Not included', 'Included'],
          ['Edit titles and search saved links', 'Included', 'Included'],
          ['Download a short link’s QR code as PNG or SVG', 'Included', 'Included'],
        ],
      ),
      p(
        'The limits refer to saved links, not a new monthly allowance. A free account is a useful fit for a small collection of stable destinations. Pro becomes useful when you manage more links, want a readable alias, or need to change a destination after sharing. See the ',
        link('current pricing plans', '/pricing'),
        ' for subscription details.',
      ),
      h('Choose a custom alias you can live with'),
      p(
        'An alias is the ending of your short link. Your optional title helps you organize the link inside Folio; changing that title does not change the shared address. A custom alias gives the address itself a name you choose.',
      ),
      p(
        'Folio Pro aliases use 3–48 lowercase letters, numbers, or hyphens, and must start and end with a letter or number. They must also be available. Once created, an alias cannot be changed or reused, even after you delete the link, so check the spelling before saving.',
      ),
      list([
        'Use a clear purpose: team-handbook tells someone more than document-final-2.',
        'Include a date when the link belongs to one event: workshop-october-2026 can distinguish it from next year’s registration.',
        'Leave dates out when the link should stay useful: lunch-menu suits a destination you plan to update regularly.',
        'Keep sensitive details out of the alias. The short address is visible to anyone who receives it.',
      ]),
      p(
        'A custom alias uses Folio’s domain. It does not give you a custom domain owned by your business. If using your own domain is a requirement, account for that when choosing a service; Folio does not currently offer a custom-domain setting.',
      ),
      h('Turn a short link into a QR code'),
      p(
        'After creating a link, choose Generate QR beside its details. Download PNG for a layout that accepts ordinary images, or SVG for a design workflow that supports vector graphics. Both options are available for free and Pro short links.',
      ),
      p(
        'This QR code contains the saved short address. With Pro, you can edit the destination in My links and keep using the same QR image. Imagine a printed workshop poster whose registration form needs replacing: update the saved link, then scan the original poster to confirm that it opens the new form.',
      ),
      p(
        'For a direct website, plain-text, or Wi-Fi code, you can also use the separate ',
        link('free QR code generator', '/create-qr-code'),
        ' without signing in. Read our ',
        link('guide to creating a QR code for a link', '/blog/how-to-create-a-qr-code-for-a-link'),
        ' for the static-versus-editable decision and checks before printing.',
      ),
      h('Keep campaign tracking on the destination URL'),
      p(
        'If you use website analytics, prepare the complete campaign URL before shortening it. For a workshop flyer, you might add utm_source=flyer, utm_medium=print, and utm_campaign=autumn_workshop to the destination. Paste that complete address into Folio so those parameters remain part of the saved destination.',
      ),
      p(
        link(
          'Google Analytics’ campaign URL guide',
          'https://support.google.com/analytics/answer/10917952?hl=en',
        ),
        ' explains how campaign parameters identify referring sources and campaigns in reporting. They require the appropriate analytics setup on the destination. Keep your naming consistent so that two spellings of the same campaign do not split your reports.',
      ),
      p(
        'Folio does not currently show click counts or QR scan analytics, and shortening a link does not install tracking on another website. Destination analytics can help you understand resulting visits; it should not be presented as a complete count of scans or clicks on the short link.',
      ),
      h('Keep your saved links useful after launch'),
      p(
        'Give each link a title you will recognize later. “Workshop registration — October 2026” is easier to find than “New link.” My links lets you search titles, aliases, and destinations, which helps when you remember the form service but not the name you gave the link.',
      ),
      p(
        'When a campaign ends, check where its address still appears before removing it. Old emails, printed cards, and downloaded PDFs can keep circulating. Deleting a saved link permanently stops that short address and its QR code from working, and its alias stays reserved. With Pro, updating the destination to a useful follow-up page may be a better choice.',
      ),
      h('Questions about short links'),
      h('Do Folio short links expire?', 3),
      p(
        'Folio does not assign an automatic expiry date to saved short links. That is not a promise that a link will work forever: deletion, account availability, the redirect service, and the destination website can all affect it. Recheck links attached to materials you continue distributing.',
      ),
      h('Can I change the destination after sharing?', 3),
      p(
        'Yes, with Folio Pro. Edit the saved link in My links, update Destination URL, and save. The short address and its QR code remain the same. Free accounts can edit the organizational title, but changing an existing destination requires Pro.',
      ),
      h('Does the person opening my link need a Folio account?', 3),
      p(
        'No. An active short link redirects visitors without a Folio sign-in. The page it leads to may still require its own account or access permission. Test that part from the recipient’s perspective before sharing.',
      ),
      h('Can I shorten a Google Form, PDF link, or social profile?', 3),
      p(
        'You can use a valid HTTP or HTTPS destination, including a form, a publicly shared document, or a social profile. Check its sharing settings first. A shortener cannot make a file stored only on your computer accessible online, or remove a website’s login requirement.',
      ),
      p(
        'Start with one real link: the page you already send people most often. Give it a useful title, check it while signed out, and decide whether its destination is likely to change. Then ',
        link('create your short link in Folio', '/url-shortener'),
        ' and save the address you will actually share.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde109',
    {
      title: 'How to Make a Signature Online That Looks Right in Your Documents',
      slug: 'how-to-make-a-signature-online',
      excerpt:
        'A useful signature image should be easy to create, clear at the right size, and free of a white box. Learn how to draw, type, or clean up your signature and use the PNG in PDFs, Word, and Google Docs.',
      category: 'Forms & signing',
      tags: [
        'Signature generator',
        'Transparent PNG',
        'Handwritten signature',
        'Sign PDF',
        'Document tips',
      ],
      cover:
        'https://images.unsplash.com/photo-1552912140-6b3c254f5214?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'A black pen beside a blank notebook on a pale desk, with soft leaf shadows.',
      seoTitle: 'How to Make a Signature Online: Draw, Type & Download PNG',
      seoDescription:
        'Make a signature online, download a transparent PNG, and use it in PDFs, Word, or Google Docs. Practical tips for clean edges, sizing, and privacy.',
      featured: false,
    },
    {
      id: 'Hrh1E3T8nQc',
      photographer: 'Kelly Sikkema',
      page: 'https://unsplash.com/photos/photo-of-a-paper-and-pen-Hrh1E3T8nQc',
    },
    [
      p(
        'The document is finished. Your name is in the right place, the date is correct, and there is just one empty line left. You could print the page, sign it, and scan it again. Or, when the recipient accepts a signature image, you can create one and put it straight into the document.',
      ),
      p(
        'The tricky part is making that image look as though it belongs there. A white rectangle can cover the signature line. A tiny picture can turn fuzzy when enlarged. A decorative font can look elegant in a preview and become hard to read on the finished page.',
      ),
      p(
        'This article walks through those small but useful decisions. With ',
        link('Folio’s free signature generator', '/signature-generator'),
        ', you can draw your signature, type your name in a signature style, or choose an existing image. Download a PNG when you are happy with it. You do not need to open a PDF or create an account, and the standalone generator does not upload or save your signature.',
      ),
      h('Need a signature now? Start here'),
      list(
        [
          'Open Signature generator and choose Draw or Type. Both create a transparent background automatically.',
          'Draw your signature, or enter your name and select a style. Choose an ink color that will be easy to read on your document.',
          'Select Download PNG. Your browser saves a file named signature.png.',
          'Insert that original PNG into your document, resize it from a corner, and check the finished copy before sending it.',
        ],
        true,
      ),
      p(
        'If you already have a photograph of your signature, choose Image and leave Remove white background checked. A clean photo on plain white paper gives the tool a much better starting point than a signature cut out of a crowded document.',
      ),
      h('Choose the method that feels natural to you'),
      p(
        'You do not have to force your handwriting through a mouse if it feels uncomfortable. Think about whether you need your own handwritten mark, a neat typed name, or a copy of a signature you already have. Each method is useful for a different reason.',
      ),
      table(
        ['Method', 'Choose it when', 'Keep in mind'],
        [
          [
            'Draw',
            'You want to write your own signature with a mouse, finger, or stylus.',
            'Leave space around the edges of the pad for loops and flourishes.',
          ],
          [
            'Type',
            'You want a readable name or initials without drawing.',
            'A signature font styles the letters; it does not reproduce your personal handwriting.',
          ],
          [
            'Image',
            'You already have a clear paper signature or an image file.',
            'White removal can leave shadows, ruled lines, or colored paper behind.',
          ],
        ],
      ),
      h('Draw a signature without fighting the screen'),
      p(
        'Use the Draw tab and write at a comfortable size. Folio crops empty space around the ink when it prepares the PNG, so there is no benefit to squeezing your signature into a small corner. Keep the first letter, tall loops, and any underline away from the edge of the pad.',
      ),
      p(
        'If the final stroke goes wrong, choose Undo stroke. If the whole attempt feels awkward, Clear signature gives you a fresh pad. On a touch screen, try your finger or a compatible stylus. A few practice attempts can help you find a comfortable movement; there is no need to perfect every curve.',
      ),
      p(
        'The guide line and checkerboard are preview aids. They are not drawn into the downloaded file. Black, blue, and green ink are available, and changing the color updates the entire drawing. Black is a sensible first choice for ordinary paperwork, particularly when you expect someone to print it.',
      ),
      h('Type your name when you want a simple, consistent result'),
      p(
        'Choose Type, enter your name, and compare Classic, Handwritten, and Flowing. Look at the whole name before deciding: a style that suits short initials may make a long surname difficult to read. Check punctuation and accented characters in the preview as well.',
      ),
      p(
        'The name field accepts up to 80 characters. Longer names are fitted to the available space, so review the PNG at the size you will actually place in your document. If a handwriting style fails to load, choose Classic and try the download again. The tool will not enable a typed download while its selected font is still loading.',
      ),
      p(
        'A typed signature can be useful for a personal letter or a document whose recipient accepts that format. It is still a font-based image, so choose Draw or Image when you specifically need the appearance of your own handwriting.',
      ),
      h('Turn a paper signature into a cleaner image'),
      p(
        'Start with dark ink on unlined white paper. Photograph the signature straight on, with the page in focus and evenly lit. Move your phone or the light if your hand casts a shadow across the ink. Crop away the desk and unrelated writing before selecting the file.',
      ),
      p(
        'In Image mode, choose a PNG, JPG, or WebP file up to 5 MB and 25 megapixels. Leave Remove white background checked, then inspect the spaces between the letters. Large images are resized to at most 1,400 pixels on their longest edge before the signature is cropped. A close, clear picture therefore keeps more useful signature detail than a full-page photo containing a tiny mark.',
      ),
      p(
        'White removal is deliberately limited: it lightens very pale background pixels rather than identifying handwriting in any scene. Gray shadows, colored paper, stamps, and ruled lines can remain. If the preview has a dirty-looking patch around the signature, a better photo is usually more useful than repeatedly downloading the same result. Unchecking white removal keeps the image’s original background.',
      ),
      h('Keep the PNG transparent all the way into your document'),
      p(
        'A transparent image lets the page show through around your handwriting. That matters on a shaded form, a colored letterhead, or a signature line that should remain visible between the strokes. PNG supports an alpha channel for this transparency, as described in the ',
        link('W3C PNG specification', 'https://www.w3.org/TR/png-3/#3alpha'),
        '.',
      ),
      p(
        'Use Download PNG rather than taking a screenshot of the preview. A screenshot captures the visible backdrop too. Keep the downloaded file in PNG format when moving it between apps; converting it to JPG removes transparency. Renaming a JPG so its filename ends in .png does not change the image format.',
      ),
      p(
        'A white background in an image viewer does not necessarily mean the file is opaque. Try placing the PNG over a pale colored shape in a document. If that color shows through around and inside the letters, the transparency is working. If you see a white box, return to the original download or check the Image tab’s background setting.',
      ),
      h('Use the signature in a PDF, Word, or Google Docs'),
      h('Add it to a PDF in Folio', 3),
      p(
        'Open ',
        link('Fill & sign', '/sign-pdf'),
        ', choose your PDF, and select Sign. Use the Image tab to select your downloaded PNG, then choose Add signature. Position it on the intended line and resize it using a corner handle. Download the completed PDF and reopen that file to check its placement. If you only need one signed PDF, you can also draw or type directly in this dialog without creating a separate PNG first.',
      ),
      h('Insert it into Word', 3),
      p(
        'Use Insert > Pictures to choose the PNG saved on your device. Resize the picture from a corner and keep its proportions. Microsoft’s ',
        link(
          'signature image instructions for Word',
          'https://support.microsoft.com/en-us/word/insert-a-signature-in-a-word-document',
        ),
        ' explain the image workflow. If the picture moves when you edit the paragraph above it, check its placement and text-wrapping settings before exporting your final copy.',
      ),
      h('Insert it into Google Docs', 3),
      p(
        'On a computer, choose Insert > Image > Upload from computer and select the PNG. Google’s ',
        link(
          'instructions for inserting an image',
          'https://support.google.com/docs/answer/97447?hl=en',
        ),
        ' cover this route. Resize the signature in the document, then inspect any PDF you export from it. Inserting the PNG into a cloud document sends that image to the document service; the generator’s local processing does not change how another app stores its files.',
      ),
      h('Size the signature for the page, not for the preview'),
      p(
        'Imagine adding your signature to a one-page letter. At its original image size, it might dominate the closing paragraph. Reduce it until it sits comfortably above your printed name, with enough space for the date or title. A signature that looks impressive on an empty canvas can feel oversized next to normal document text.',
      ),
      p(
        'Keep the width and height in proportion. Dragging one side independently can make handwriting look stretched. There is no single correct width for every form: use the available line as your guide and inspect the result at normal reading size. If the strokes become too faint, create a clearer source instead of stretching a small image larger.',
      ),
      h('Fix the problems that usually show up at the last minute'),
      table(
        ['What you see', 'What to check', 'A practical fix'],
        [
          [
            'A white rectangle hides the signature line',
            'Was the image copied from a screenshot or saved as JPG?',
            'Insert the original PNG. For a paper photo, enable Remove white background and download again.',
          ],
          [
            'A gray halo or patch surrounds the ink',
            'Does the original photo contain shadows or textured paper?',
            'Retake it in even light on plain white paper, or use Draw.',
          ],
          [
            'The letters look blurry in the document',
            'Has a small image been enlarged well beyond its original size?',
            'Use it at a smaller size, redraw, or choose a sharper photograph.',
          ],
          [
            'A loop or underline is cut off',
            'Did the stroke touch the edge of the drawing pad or photo?',
            'Create a new version with some clear space around all the ink.',
          ],
          [
            'Download PNG is unavailable',
            'Does the selected tab contain a signature, and has its image or font finished loading?',
            'Finish the active input, wait for processing, or choose Classic after a font error.',
          ],
          [
            'The file is missing from the phone’s Photos app',
            'Did the browser save it as a downloaded file?',
            'Look for signature.png in the browser’s downloads list or your device’s Files app.',
          ],
        ],
      ),
      h('Know what is saved, and where'),
      p(
        'Folio’s standalone signature generator keeps your typed name, drawing, and selected image in the current page’s memory. It does not upload those contents or save a signature library in your account or browser storage. Choose Clear all to discard the working signature. Refreshing starts over, so download your result before leaving.',
      ),
      p(
        'The website and font files still load over the network. The PNG you choose to download remains on your device, and clearing the tool does not delete that copy. If you later add the signature to a PDF in Folio’s editor, the document uses private cloud saving. Guest workspaces expire after 24 hours; signed-in workspaces remain in the account until deleted. The ',
        link('privacy page', '/privacy'),
        ' explains that separate workflow.',
      ),
      h('Check what the recipient means by “signed”'),
      p(
        'A PNG is a visual representation of a signature. It does not verify the signer’s identity, attach a cryptographic certificate, or create an audit trail. If the recipient sent a signing link or named a required service, follow those instructions. A neat image cannot replace capabilities that a document’s signing process requires.',
      ),
      p(
        'Keep the reusable PNG private. When someone needs a completed document, send that document rather than the standalone signature image. On a shared device, remove downloaded copies when you are finished.',
      ),
      h('A few questions before you start'),
      h('Is the signature generator free to use?', 3),
      p(
        'Yes. Creating and downloading a signature PNG is free, with no Folio watermark, account requirement, or subscription. You can complete the image download without uploading a PDF.',
      ),
      h('Can I make initials instead of a full name?', 3),
      p(
        'Yes. Draw your initials or enter them in Type. Check whether the recipient wants initials or a full signature at that particular place in the document.',
      ),
      h('Can I create a signature on my phone?', 3),
      p(
        'Yes. Draw with your finger or a compatible stylus, or use Type if the screen feels cramped. Keep a little room around the ink, then use the browser’s download action to save the PNG.',
      ),
      h('Will Folio remember my signature next time?', 3),
      p(
        'No. The standalone generator does not keep a saved copy. If you want to reuse the result, retain the downloaded PNG somewhere you control. Otherwise, create a fresh signature when you need it.',
      ),
      h('Give the finished document one final look'),
      p(
        'Open the file you intend to send, not just the working preview. Check the page number, signature line, nearby date, and every stroke of the signature. Look for a white box, a clipped flourish, or letters that become unreadable at normal size. If it will be printed, a test print can catch faint ink that looked fine on screen.',
      ),
      p(
        'Ready to make yours? ',
        link('Open the signature generator', '/signature-generator'),
        ' and choose the method that feels easiest. For a shorter walkthrough focused on the image background, see ',
        link(
          'how to create a transparent signature PNG',
          '/guides/create-transparent-signature-png',
        ),
        '.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde110',
    {
      title: 'How to Compress Images to a File Size Limit Without Guessing',
      slug: 'how-to-compress-images-to-target-size',
      excerpt:
        'An upload form says 100 KB, but your photo is several megabytes. Learn how to choose a target size and format, keep the details that matter, and check the compressed image before you send it.',
      category: 'Image tools',
      tags: ['Image compressor', 'Compress images', 'JPG', 'PNG', 'WebP', 'File size'],
      cover:
        'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1600&q=85',
      coverAlt: 'A person working on a laptop at a wooden table beside a notebook.',
      seoTitle: 'How to Compress Images to 20 KB, 50 KB or 100 KB',
      seoDescription:
        'Compress JPG, PNG and WebP images to a target KB size. Learn how to choose a format, preserve transparency, check dimensions, and fix rejected uploads.',
      featured: false,
    },
    {
      id: 'Hcfwew744z4',
      photographer: 'Christin Hume',
      page: 'https://unsplash.com/photos/person-using-laptop-computer-Hcfwew744z4',
    },
    [
      p(
        'You choose a photo, press Upload, and see the same message again: “File is too large.” The picture looks perfectly ordinary on your screen, but the website wants something under 100 KB. Your phone saved it as a file several megabytes larger.',
      ),
      p(
        'The useful next step is to work backwards from the upload requirements. You need an image that fits the size limit, uses an accepted format, and still has enough detail for its purpose. Repeatedly saving random lower-quality copies makes that harder to judge.',
      ),
      p(
        'Folio’s ',
        link('free image compressor', '/compress-images'),
        ' lets you choose a target file size before adding your images. It adjusts quality and, when needed, pixel dimensions, then shows the actual result. JPG, PNG, and WebP are supported. Processing happens in your browser, and Folio does not upload or save your images.',
      ),
      h('The quickest way to compress an image to a KB limit'),
      list(
        [
          'Read the destination’s requirements. Note the maximum file size, accepted format, and any required pixel dimensions.',
          'Open Image compressor and select a size preset. For a different limit, enter it in Custom size (KB) and select Apply.',
          'Choose an output format. Use JPG if the destination specifically asks for JPEG; use Auto when different formats are acceptable.',
          'Choose files or drag your images onto the upload area, then select Compress images.',
          'Compare Original and Result. Check the final file size and dimensions, then download the image or the batch ZIP.',
        ],
        true,
      ),
      p(
        'The available presets are 10, 15, 20, 30, 40, 50, 100, 200, and 500 KB, plus 1 MB. A custom target can be any number from 1 to 35,000 KB, including up to three decimal places. The displayed current limit confirms what you applied. Changing a preset or applying another setting clears the old results, so run compression again to create the new version.',
      ),
      h('File size and image dimensions are different requirements'),
      p(
        'File size tells you how much data the image contains. Pixel dimensions describe the width and height of the picture. A 100 KB file can be wide or narrow, and two photos with the same dimensions can have very different file sizes. Fine texture, image noise, and the chosen format all affect how much data is needed.',
      ),
      p(
        'For example, imagine a form requires a JPG below 100 KB and at least 400 pixels wide. Reaching 100 KB is only part of the task. If the compressed result is 300 pixels wide, it still fails the form’s rules. Folio shows the original and output dimensions beside the preview so you can catch this before uploading.',
      ),
      p(
        'Target mode can reduce dimensions to reach a smaller file size. If the destination requires exact dimensions, start with an image prepared at those dimensions and try Manual settings with Keep original dimensions. Adjust JPG or WebP quality there, then check the resulting bytes. Manual mode does not guarantee a particular file size.',
      ),
      h('Choose a useful target instead of the smallest possible file'),
      p(
        'A smaller number is not automatically a better result. A small avatar may remain useful at a size that makes a receipt impossible to read. Begin with the largest file the destination allows, then reduce further only when there is a reason. Keep your original separately so you can start again without compressing an already compressed copy.',
      ),
      table(
        ['Situation', 'A useful starting point', 'Check before using it'],
        [
          [
            'A form with a 20 KB or 50 KB limit',
            'Choose the matching preset and the exact format the form accepts.',
            'Make sure required dimensions and important facial or text details survive.',
          ],
          [
            'A photo limited to 100 KB or 200 KB',
            'Use that limit first rather than jumping straight to 10 KB.',
            'Inspect the subject, edges, and any required identifying details.',
          ],
          [
            'A website or email image without a strict limit',
            'Choose dimensions suited to where the image will appear, then compare formats and quality.',
            'Check it at its intended display size, not just as a tiny preview.',
          ],
          [
            'A screenshot, receipt, or diagram',
            'Allow enough space for small text and lines; compare a PNG result.',
            'Zoom in on the smallest text you actually need to read.',
          ],
        ],
      ),
      p(
        'These are workflow examples, not promises that a particular size will suit every image. A detailed photo and a simple logo can respond very differently to the same target.',
      ),
      h('JPG, PNG, WebP, or Auto: which should you choose?'),
      h('JPG when the destination requires it or the image is a photograph', 3),
      p(
        'JPG is a practical choice for photographs and for forms that list JPEG as an accepted format. Lower quality can reduce the file size, but fine detail may soften and edges may show artifacts. JPG does not preserve a transparent background; Folio fills transparent areas with white when you choose it.',
      ),
      h('PNG when clear graphics or transparency matter', 3),
      p(
        'PNG is useful for graphics, screenshots, and images with transparent areas. Its encoding is lossless, but that does not mean every size-target operation leaves the source unchanged. To reach a small limit, Folio may reduce the number of pixels. A PNG can therefore remain losslessly encoded while the resized picture contains less detail.',
      ),
      p(
        'The browser’s quality control applies to formats such as JPG and WebP, rather than PNG. ',
        link(
          'MDN’s canvas export documentation',
          'https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob',
        ),
        ' explains this distinction. In Manual settings, lowering the JPG / WEBP quality slider will not make PNG encoding more aggressive.',
      ),
      h('WebP when the receiving app accepts it', 3),
      p(
        'WebP can be useful for compact photos and graphics, including images with transparency. ',
        link('Google’s WebP documentation', 'https://developers.google.com/speed/webp'),
        ' describes its support for lossy and lossless compression and transparent pixels. Folio’s WebP quality setting uses lossy compression. Check the destination’s accepted file types before choosing it; a small WebP is not useful if the upload form only accepts JPG.',
      ),
      h('Auto when you want the tool to compare formats', 3),
      p(
        'Auto compares supported output formats and chooses a smaller result that meets the limit at the tested dimensions. It avoids JPG when the source has transparent pixels. The file extension can change, so check the format shown with your result. If the original already fits the target, Auto can keep it unchanged instead of reducing its quality unnecessarily.',
      ),
      h('What a target-size compressor actually changes'),
      p(
        'In target mode, Folio tries quality settings and measures the encoded file, rather than guessing its size from a percentage slider. If an image still exceeds the limit, it tries smaller dimensions while keeping the same proportions. For PNG, reducing dimensions is the available route when its lossless output is too large.',
      ),
      p(
        'A successful result is at or below the selected byte limit. It is not padded to reach an exact number. If the tool cannot produce a result within the limit, it reports a problem rather than labelling an oversized file as ready. You can then choose another format or a larger target where the destination allows it.',
      ),
      p(
        'Folio’s targets use decimal units: 1 KB means 1,000 bytes, and the 1 MB preset means 1,000,000 bytes. Some operating systems display file sizes using a different convention or round the number. Use the exact byte count shown beside the result when comparing it with a strict limit.',
      ),
      h('Check quality where it matters'),
      p(
        'Switch between Original and Result before downloading. For a photograph, inspect the main subject and high-contrast edges. For a receipt, check the date, total, and small print you need. For a logo, inspect thin strokes and the transparent outline against the checkerboard preview.',
      ),
      p(
        'A fit-to-screen preview can hide lost detail. Open the downloaded file at normal viewing size, and zoom in if it contains important text. If it looks muddy or the letters merge together, try a larger limit, a different format, or a cleaner source. Compression cannot bring back detail that was missing or out of focus in the original.',
      ),
      h('Compress several images and keep the batch manageable'),
      p(
        'You can add up to 20 images in one batch, with a 35 MB limit per image and a 150 MB total limit. Decoded images must contain no more than 25 million pixels. Drag and drop works alongside Choose files, and Add images lets you extend the batch after the first selection.',
      ),
      p(
        'The target applies to each image individually. A ZIP containing ten images may be much larger than the limit selected for one image, and an upload form may not accept ZIP files at all. Use Download this image for a single result, or Download all (ZIP) to collect the successful batch outputs.',
      ),
      p(
        'If one file is damaged, check its error in the preview area. Other successfully processed files can still be downloaded. Remove the problem file or replace it with a valid original, then run the batch again. Cancel processing stops the current work; Clear all discards the selected images and results.',
      ),
      h('Why an upload can still be rejected'),
      table(
        ['Problem', 'What may be happening', 'What to try'],
        [
          [
            'The website says the file is too large',
            'You may be selecting the original, an old download, or the entire ZIP.',
            'Choose the latest individual result and compare its exact byte count with the limit.',
          ],
          [
            'The website rejects the format',
            'Auto produced a type that the destination does not accept.',
            'Select the required output format explicitly and compress again.',
          ],
          [
            'The dimensions are wrong',
            'Target mode reduced the pixel dimensions while meeting the size limit.',
            'Use a source with the required proportions and try Manual settings with original dimensions.',
          ],
          [
            'The image looks worse after several attempts',
            'A previously compressed download was used as the next source.',
            'Return to the original file for each new attempt.',
          ],
          [
            'A transparent area became white',
            'The result was exported as JPG.',
            'Choose PNG or WebP if the destination supports transparency.',
          ],
          [
            'An animated image became still',
            'Re-encoding produced one frame.',
            'Use a tool designed for animation if motion must be preserved.',
          ],
        ],
      ),
      h('What happens to your images after compression?'),
      p(
        'The compressor holds the selected files and results in the current browser tab’s memory. It does not upload those images to Folio, save them to your account, or write them to browser storage. You can use it without signing in. The website still requests scripts and other assets over the network.',
      ),
      p(
        'Clear all or refresh to discard the batch. Downloaded images and ZIPs remain on your device; clearing the page does not remove those copies. Read ',
        link('Folio’s privacy details', '/privacy'),
        ' if you also use the PDF editor, which has a separate cloud-saving workflow.',
      ),
      p(
        'Compression is not a guarantee of metadata removal. An original that already fits the requested settings may be returned unchanged, including its existing metadata. If removing location or camera information is your goal, use a process specifically designed for that and verify the saved file.',
      ),
      h('Common questions about image compression'),
      h('Can I compress an image without losing quality?', 3),
      p(
        'Sometimes an image can be stored more efficiently, and an already-small original may be kept unchanged. A strict target can require lossy encoding or fewer pixels, though. Compare the result rather than relying on a universal “no quality loss” promise.',
      ),
      h('Can I use a custom target such as 75 KB?', 3),
      p(
        'Yes. Enter 75 in Custom size (KB), select Apply, and confirm that the current limit shows 75.0 KB. That applies a maximum of 75,000 bytes to each image in the next run.',
      ),
      h('Are compression and downloads free?', 3),
      p(
        'Yes. Folio’s image compressor and individual or ZIP downloads are free. There is no account requirement or Folio watermark added to the exported image.',
      ),
      h('Will changing a file extension convert the image?', 3),
      p(
        'No. Renaming photo.webp to photo.jpg does not change its encoding. Select JPG as the output format and download the newly encoded file instead.',
      ),
      p(
        'Start with the upload requirements, choose a sensible size, and inspect the result once at the size that matters. Then ',
        link('compress your images in Folio', '/compress-images'),
        ' and download the version you intend to use. Keep the original until you know the destination accepts the new file.',
      ),
    ],
  ),
  article(
    'fa48b3ab-2458-4da1-b98b-517e8bbde111',
    {
      title: 'How to Edit a PDF on Your Phone: iPhone and Android',
      slug: 'how-to-edit-pdf-on-phone',
      excerpt:
        'Need to fill a form, change a date, or sign a PDF from your phone? Follow practical steps for iPhone and Android, understand which edits need a PDF editor, and find the finished file before sending it.',
      category: 'PDF editing',
      tags: ['Edit PDF on phone', 'Mobile PDF editing', 'iPhone', 'Android', 'PDF forms'],
      cover:
        'https://images.unsplash.com/photo-1488509082528-cefbba5ad692?auto=format&fit=crop&w=1600&q=85',
      coverAlt:
        'Close-up of hands holding and using a smartphone against a softly blurred background.',
      seoTitle: 'How to Edit a PDF on Your Phone: iPhone & Android',
      seoDescription:
        'Learn how to edit a PDF on your phone, add text, fill forms, sign, and save the finished file. Practical iPhone and Android steps, costs, and fixes.',
      featured: false,
    },
    {
      id: 'BjhUu6BpUZA',
      photographer: 'Priscilla Du Preez',
      page: 'https://unsplash.com/photos/person-using-smartphone-BjhUu6BpUZA',
    },
    [
      p(
        'To edit a PDF on your phone, save the document where you can find it, open it in a PDF editor, make your changes, and download the finished copy. Before sending it, open that downloaded file once to check that your changes are there.',
      ),
      p(
        'The part that causes confusion is the word “edit.” Writing your name in an empty space is different from replacing a name already printed on the page. A phone’s PDF viewer may handle the first task while offering no way to do the second. Choosing the right tool at the start saves a lot of tapping.',
      ),
      h('Choose the right way to edit your PDF'),
      table(
        ['What you need to do', 'What to use', 'What to check'],
        [
          [
            'Type into an empty form field',
            'A form-filling tool, or Add Text for a flat form',
            'Can you tap the field and place a cursor inside it?',
          ],
          [
            'Correct words already on the page',
            'An editor that supports original PDF text',
            'Can it select the existing words as editable text?',
          ],
          [
            'Add a signature or handwritten note',
            'A signature or annotation tool',
            'Is it positioned clearly without covering nearby text?',
          ],
          [
            'Highlight a passage',
            'A highlight or markup tool',
            'Will the mark remain visible in the saved PDF?',
          ],
          [
            'Change words in a photographed document',
            'OCR followed by a suitable editor, or the source document',
            'Are the words actually pixels in a scan?',
          ],
        ],
      ),
      p(
        'Keep the original PDF until the edited copy has been checked. A screenshot is a poor substitute: it can leave out other pages and turn readable document text into an image.',
      ),
      h('How to edit a PDF on your phone with Folio'),
      p(
        'Open the ',
        link('Folio PDF editor', '/edit-pdf'),
        ' in your phone’s browser. You do not need to install a separate Folio app. The same basic workflow applies on iPhone and Android; the file picker and final save options depend on your phone.',
      ),
      list(
        [
          'Save the PDF attachment from your email or messaging app. Choose a folder you can recognize, and keep the .pdf filename.',
          'In Folio, tap Choose a file. Use the phone’s file picker to select the saved PDF, then wait for the page preview.',
          'Go to the page you need. Zoom in with the editor controls so you can place text accurately. If a toolbar option is off-screen, scroll the toolbar sideways.',
          'Choose Add Text to type in an empty area. Choose Edit Text to change supported original words. Use Sign when you need to place a signature.',
          'Check the changed area and the rest of that page. Dismiss the keyboard to see whether your text overlaps a line, label, or signature box.',
          'Tap Download PDF. When Your file is ready appears, tap Download file, or use Share file if your browser offers it. Save the copy, then reopen it before attaching it to a message.',
        ],
        true,
      ),
      p(
        'For example, a school form might have a blank line for an emergency contact. Add Text is enough for that blank line. If the school has already printed the wrong contact number, use Edit Text to replace the supported original number. Placing a second number over the first can leave an untidy page and does not reliably remove the old information.',
      ),
      h('Changing existing PDF text', 3),
      p(
        'With Edit Text active, select the text block you want to change and enter the replacement. Keep a short correction close to the original length where possible. A PDF often stores lines as separate objects, so a longer sentence may run into the next line instead of pushing it down automatically.',
      ),
      p(
        'Check names, dates, spacing, and line endings after each change. If you need to rewrite several paragraphs, ask for the original Word or other editable source file. Making the changes there and exporting a new PDF is usually easier than rebuilding the layout on a small screen.',
      ),
      p(
        'Folio’s added text, annotations, visual signatures, and form tools have free downloads. Downloading a PDF with changes to its original text requires premium access. Editing and previewing come before that download check; opening Edit Text alone does not make an otherwise free export paid. See ',
        link('the current plans', '/pricing'),
        ' before starting work that depends on a paid export.',
      ),
      h('How to edit a PDF on iPhone'),
      p(
        'For a quick form entry or signature, you may already have what you need. If Preview is available on your iPhone, open the PDF there and use its form or annotation controls. Apple describes those options in its ',
        link(
          'Preview guide for iPhone',
          'https://support.apple.com/en-euro/guide/iphone/iph7239ea3b5/ios',
        ),
        '. Use a PDF text editor when you need to replace existing wording rather than add a mark or fill a field.',
      ),
      p(
        'If you use Folio, save the attachment to Files first when it is difficult to locate from the browser’s file picker. Choose a file opens that picker; navigate to the folder where you saved the document. The PDF does not need to be in Photos.',
      ),
      h('Save and find the edited file on iPhone', 3),
      p(
        'After Folio prepares the PDF, tap Download file. If Safari shows a PDF preview instead of a save prompt, use the preview’s Share control and choose Save to Files when available. Folio’s Share file option can also open your device’s share sheet. Finish the save action there; simply opening the sheet does not save a copy.',
      ),
      p(
        'For a Safari download, check the Downloads folder in Files or Safari’s downloads list. If you selected a different folder through Save to Files, look there instead. ',
        link('Apple’s guide to finding downloads', 'https://support.apple.com/en-au/102440'),
        ' shows the Files and Safari routes. A downloaded PDF normally belongs in a file location, not your photo library.',
      ),
      h('How to edit a PDF on Android'),
      p(
        'Save the attachment, open Folio in Chrome, and tap Choose a file. Your file manager may be called Files, My Files, or something similar. Look in Downloads or the folder used by the app that saved the attachment. If you can only see pictures, return to the document browser rather than selecting the photo picker.',
      ),
      p(
        'Make your changes, tap Download PDF, and use Download file in the ready dialog. Check the downloaded copy through Chrome’s Downloads list or your file manager. ',
        link(
          'Google’s Android download instructions',
          'https://support.google.com/chrome/answer/95759?co=GENIE.Platform%3DAndroid&hl=en',
        ),
        ' explain where Chrome exposes downloaded files and sharing controls.',
      ),
      p(
        'If you only need freehand notes or highlights and already use Google Drive, its Android app offers PDF annotation. Open the PDF preview, tap the annotation control, make your marks, and save a new copy if you want to preserve the original. This is an annotation workflow, not a way to rewrite the PDF’s existing text. See ',
        link(
          'Google’s PDF annotation guide',
          'https://support.google.com/drive/answer/13207179?hl=en',
        ),
        ' for the available tools.',
      ),
      h('Fill a form or add a signature without printing'),
      p(
        'First tap a blank field. If the PDF has interactive fields, enter the information into those fields with a compatible form tool. If nothing happens, the page may be a flat form: its boxes are part of the page artwork. You can use Add Text to position an answer above a blank line.',
      ),
      p(
        'Use ',
        link('Folio’s Fill & sign tool', '/sign-pdf'),
        ' for a form workflow, or Sign in the editor to draw, type, or add a signature image. Resize the signature to fit its space, then check the date and any nearby labels. If you only need a reusable transparent image, the separate ',
        link('signature generator', '/signature-generator'),
        ' downloads a PNG; that image still needs to be inserted into the document.',
      ),
      p(
        'Follow any signing instructions supplied with the form. A placed signature image does not add identity verification or a certificate-based digital signature. If the sender requires a particular signing service, complete that process rather than assuming any visible signature is sufficient.',
      ),
      h('Why some PDFs will not let you change the words'),
      p(
        'A PDF can look like a normal document while containing only a photograph of the page. If the words are part of an image, a text editor cannot select them as original PDF text. Selectable text is a useful clue, but even selectable text may use fonts or structures an editor cannot safely change.',
      ),
      p(
        'For a scan, ask for the editable original or use a suitable OCR tool to recognize the text. OCR results need checking, especially names, amounts, and reference numbers. Folio does not currently provide standalone OCR, so uploading a scan will not automatically turn its printed words into editable text. You can still add a note or fill blank space on top of a readable scan.',
      ),
      p(
        'A password, restricted document, or unsupported PDF structure can also block editing. Get an editable copy from the sender when needed. Avoid treating a white rectangle as secure redaction: covering something visually can leave the underlying information in the PDF.',
      ),
      h('Fix common mobile PDF problems'),
      table(
        ['Problem', 'What to try'],
        [
          [
            'The PDF opens, but there is no editing toolbar',
            'You may be in an attachment preview. Save the file, then open it from the PDF editor’s file picker.',
          ],
          [
            'I cannot find the PDF to open',
            'Save it from the original email or message first. Check the saved folder, recent files, and the filename rather than searching only Photos.',
          ],
          [
            'The keyboard hides the part I am editing',
            'Dismiss the keyboard to review placement, or try landscape orientation. Zoom in before selecting a small text block.',
          ],
          [
            'Download opens a preview',
            'Use the preview’s Save or Share control and finish saving to a folder. Return to the editor tab if you still need to make changes.',
          ],
          [
            'I canceled the Share sheet',
            'Your prepared file remains in Folio’s ready dialog. Tap Download file or try Share file again.',
          ],
          [
            'The attachment still shows the old version',
            'Open the newest downloaded copy and check it. Remove the old email attachment, then attach that verified file.',
          ],
          [
            'A large document stalls',
            'Keep the tab open, close unnecessary apps, and check your connection. If appropriate, work with a smaller selection of pages.',
          ],
        ],
      ),
      h('Check the finished PDF before sending it'),
      list([
        'Open the saved file outside the editor and check the actual changed page.',
        'Confirm that every required page is present and in the correct order.',
        'Check spelling, contact details, dates, and signature placement at a readable zoom.',
        'Use a clear filename, such as School-form-completed.pdf, so you can distinguish it from the original.',
        'Attach the PDF itself and verify the attachment, especially if your email draft already contained an earlier version.',
      ]),
      h('What happens to a PDF you open in Folio?'),
      p(
        'Folio’s main PDF editor uploads opened documents to private cloud storage for workspace recovery, even though free annotation processing runs in the browser. Guest workspaces expire after 24 hours. Some operations, including original-text processing, also send the document to Folio’s server. This is a different workflow from the standalone signature generator and image compressor.',
      ),
      p(
        'Keep a downloaded copy of anything you need to retain, and do not treat the editor’s All changes saved message as confirmation that a PDF is in your phone’s Downloads folder. For a work or confidential document, check that the upload and storage workflow fits your requirements before opening it. The ',
        link('privacy page', '/privacy'),
        ' explains storage and deletion.',
      ),
      h('Questions about editing files on a phone'),
      h('How do I edit a PDF on my phone for free?', 3),
      p(
        'For an empty field, note, highlight, or visual signature, use a suitable free annotation or form tool. Folio offers free downloads for those changes without adding a Folio watermark. Replacing the document’s original text is a different operation and requires premium access for the finished Folio export.',
      ),
      h('Can I edit a PDF document on my phone without an app?', 3),
      p(
        'You can use Folio in your browser without installing a separate PDF app. You still need a connection for the website, private workspace saving, and any server processing. Browser-based does not mean the PDF necessarily stays only on your device.',
      ),
      h('How do I edit a file on my phone if it is not a PDF?', 3),
      p(
        'Check the extension first. A .docx document needs an editor that supports Word documents; a spreadsheet needs a compatible spreadsheet app. Folio’s PDF editor expects a PDF, so renaming another file to end in .pdf will not make it compatible. If you have the editable source, change it in the appropriate app and export a PDF when you are finished.',
      ),
      h('Can I keep the PDF’s formatting exactly the same?', 3),
      p(
        'Small additions are easier to review than a rewritten page, but no single workflow guarantees an identical result for every PDF. Original fonts, text blocks, and page structure can affect editing. Preview the changed area, then inspect the downloaded file before relying on its layout.',
      ),
      p(
        'For a straightforward correction or form entry, start with the ',
        link('PDF editor', '/edit-pdf'),
        ', make the specific change you need, and check the saved copy before sending it. That last check is what separates an edit you can see on your screen from a finished document the recipient will receive.',
      ),
    ],
  ),
];

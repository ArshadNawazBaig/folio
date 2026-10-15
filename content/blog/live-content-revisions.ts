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
const h = (value: string): RichNode => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [text(value)],
});
const list = (items: string[], ordered = false): RichNode => ({
  type: ordered ? 'orderedList' : 'bulletList',
  content: items.map((item) => ({ type: 'listItem', content: [p(item)] })),
});
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

// These are revisions to two existing database-authored articles, not new posts.
// Retain their slugs, authors, covers, publication dates, and featured settings.
// The version-guarded review bundle records the complete before/after drafts.
export const liveContentRevisions: Record<
  string,
  Pick<BlogDraft, 'title' | 'excerpt' | 'seoTitle' | 'seoDescription' | 'tags' | 'content'>
> = {
  'how-to-edit-original-text-in-a-pdf': {
    title: 'Why PDF Text Will Not Edit: Scans, Fonts, and Text Blocks',
    excerpt:
      'Diagnose a PDF that opens but will not let you change its words. Distinguish scans, searchable image layers, unsupported text, and font problems before choosing the next step.',
    seoTitle: 'Why PDF Text Won’t Edit: Scans, Fonts & Text Blocks',
    seoDescription:
      'Find out why PDF text cannot be edited. Check scans, text layers, fonts, file limits, and replacement layout, then choose a practical next step.',
    tags: ['PDF text editing', 'Scanned PDF', 'PDF troubleshooting', 'PDF fonts'],
    content: {
      type: 'doc',
      content: [
        p(
          'A PDF can open perfectly and still refuse a text correction. The page you see may contain editable text objects, an image of a printed page, outlined lettering, or a mixture. The next step depends on which of those you have. Repeatedly clicking the same sentence will not change its underlying format.',
        ),
        p(
          'Use the checks below before rebuilding the document. Keep an untouched original and test a short, non-sensitive correction first. If you can already select and replace the intended text, the ',
          link('basic PDF text-editing walkthrough', '/blog/how-to-edit-pdf-text'),
          ' covers the normal editing steps.',
        ),
        h('Start with the symptom you can observe'),
        table(
          ['What happens', 'What it may mean', 'Useful next check'],
          [
            [
              'The page opens, but words cannot be selected',
              'The wording may be part of a scan or outlined artwork.',
              'Ask for the source file; check whether a separate OCR workflow is needed.',
            ],
            [
              'Words copy successfully, but the visible letters do not change',
              'A searchable text layer may sit behind a page image, or the objects may be unsupported.',
              'Compare the edited preview with the actual visible page; do not assume copied text is editable artwork.',
            ],
            [
              'Only part of a sentence is selected',
              'The sentence may be stored as separate text blocks.',
              'Inspect the neighboring blocks instead of replacing only the first fragment.',
            ],
            [
              'New letters look different',
              'The original font may not contain the replacement characters.',
              'Compare font, size, spacing, and line endings in the downloaded copy.',
            ],
            [
              'The edit runs into the next line',
              'The replacement is longer than the available space.',
              'Shorten the wording or edit the original source document.',
            ],
          ],
        ),
        h('Check for text without treating selection as proof'),
        p(
          'Try copying a distinctive phrase from the PDF into a plain text document. Recognizable words show that some text is available. They do not prove that every visible letter can be safely replaced. Try a second location, particularly if the file combines exported pages with scanned attachments.',
        ),
        p(
          'A scanned page can have an invisible OCR text layer that allows searching while the visible wording remains in the image. Changing a text layer is not the same as changing the photographed letters. After a trial edit, inspect the page itself; a successful text search alone is not enough.',
        ),
        p(
          'Folio does not perform OCR. If your source is an image-only scan, obtain the editable original or use a separate OCR process and review its output. ',
          link('W3C’s OCR guidance', 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF7'),
          ' explains the distinction between a page image and recognized text, and includes checks for recognition and reading order. OCR can misread a character, so verify names, dates, and identifiers against the image.',
        ),
        h('Confirm that you chose the original-text control'),
        p(
          'Add Text places new wording above the page. It is appropriate for a blank line, a note, or a flat form. Edit Text in the main editor selects supported existing wording. A separate text box placed over an old address may leave both versions in the document.',
        ),
        p(
          'For focused inspection, open the ',
          link('dedicated PDF text editor', '/edit-pdf-text'),
          '. Choose your PDF, check the local preview, then select Upload for text editing when you are ready to send the document for processing. The resulting text-block list identifies what this editor can work with. If the required text is absent, do not infer that the original file is damaged.',
        ),
        h('Check size, page count, and replacement characters'),
        p(
          'The original-text processor accepts PDFs up to 10 MB and 100 pages. A file that opens in the main 50 MB editor can still exceed that smaller processing limit. For a change confined to a few pages, a separate extracted working copy may be useful, provided you keep the full original and check the final page order when reassembling it.',
        ),
        p(
          'Replacement text currently supports Latin characters. A document in another writing system may display normally without supporting the replacement you need. Use an editor or the source application that supports the document’s language instead of changing characters to force the file through.',
        ),
        p(
          'If the document requires an opening password or carries restrictions, obtain an authorized editable copy from its owner. Do not use a failed text edit as evidence that access restrictions have been removed.',
        ),
        h('When editing works but the result looks wrong'),
        p(
          'Test a correction of similar length before a large rewrite. In a fictional appointment letter, changing “Room 4” to “Room 7” is easier to compare than replacing it with “Second-floor conference room beside reception.” The latter needs more space even when every character is supported.',
        ),
        p(
          'Folio works with separately positioned text blocks; it does not automatically push the following paragraph down. Supported original fonts can be preserved, but missing characters may use a matching substitute. Compare the new letters with the surrounding line at normal reading size, then zoom in to check collisions and alignment.',
        ),
        list([
          'Keep the wording short enough for its existing location.',
          'Inspect each affected text block, including fragments on the same line.',
          'Check the downloaded PDF for font substitution, missing characters, and overlaps.',
          'Return to the source document when a correction becomes a substantial layout change.',
        ]),
        h('Choose a useful fallback'),
        p(
          'If the document needs a new answer in empty space, Add Text may finish the task without original-text editing. If it needs a correction to an image-only paragraph, a note can communicate the requested change to the document owner, but it does not replace the printed wording. For a whole paragraph rewrite, request the original Word, layout, or other authoring file.',
        ),
        p(
          'Visual covering is not secure redaction. Neither a white rectangle nor a successful spelling correction proves that confidential information has been removed from metadata, attachments, or other document content. Use a dedicated redaction process when permanent removal is the task.',
        ),
        h('Keep the working file and the finished file distinct'),
        p(
          'The main Folio editor uploads opened PDFs for private workspace saving; guest workspaces expire after 24 hours. The dedicated text editor previews a selected PDF locally before its explicit upload action, and text processing sends it to Folio. Review the ',
          link('privacy details', '/privacy'),
          ' before using material with specific storage requirements.',
        ),
        p(
          'Finally, open the downloaded PDF independently. Confirm the visible wording, search for the old value where useful, and check every location that should have changed. If you ask support for help, describe the symptom, file size, page count, and tool used without sending confidential document contents.',
        ),
      ],
    },
  },
  'how-to-edit-pdf-original-text': {
    title: 'Find and Replace PDF Text: Update Repeated Names and Dates',
    excerpt:
      'Correct repeated wording with Folio’s PDF text editor. Use a specific search, understand case and substring matching, preview every affected page, and verify the downloaded result.',
    seoTitle: 'Find and Replace PDF Text: Names, Dates & Repeated Words',
    seoDescription:
      'Update repeated text in a PDF with find and replace. Learn case matching, text-block limits, preview checks, and how to catch unintended replacements.',
    tags: ['Find and replace PDF', 'PDF text editing', 'PDF review', 'Document corrections'],
    content: {
      type: 'doc',
      content: [
        p(
          'A new venue name appears on the cover, agenda, and contact page. Editing the first occurrence leaves the others wrong. Find and replace can help when the same correction belongs in several places, but the search must be specific and every replacement still needs review.',
        ),
        p(
          'This workflow uses ',
          link('Folio’s dedicated PDF text editor', '/edit-pdf-text'),
          ' and its Find & replace panel. It updates matching wording inside supported editable text blocks across the document. It does not search the meaning of sentences, recognize words inside a scan, or automatically reflow the layout.',
        ),
        h('Decide whether every occurrence should change'),
        p(
          'First write down the old value, its replacement, and where you expect it to appear. For a fictional workshop pack, the change might be “Room 4” to “Room 7” on three pages. Check whether a historical note or an example should still mention the old room. If different occurrences need different treatment, edit their blocks individually.',
        ),
        p(
          'Choose the longest useful search phrase that still matches each intended location. Searching for the digit “4” could also change page references, times, and telephone numbers. Searching for “Room 4” is more specific, but can still match the beginning of “Room 40.” Specific wording reduces accidental matches; it does not remove the need to inspect them.',
        ),
        table(
          ['Find', 'Replace with', 'What to check'],
          [
            [
              'Room 4',
              'Room 7',
              'Check longer labels such as Room 40, which contain the same substring.',
            ],
            [
              '15 October 2026',
              '22 October 2026',
              'Numeric dates such as 15/10/2026 will need a separate review.',
            ],
            [
              'North Studio',
              'North Design Studio',
              'Check narrow headers and cells because the replacement is longer.',
            ],
            [
              'draft',
              'final',
              'Review sentences and filenames; the intended meaning may differ by location.',
            ],
          ],
        ),
        h('Run a controlled replacement'),
        list(
          [
            'Keep the original PDF and open a working copy in the dedicated text editor.',
            'Choose Upload for text editing to inspect supported blocks. The processor accepts up to 10 MB and 100 pages.',
            'Open Find & replace. Enter the original phrase in Find and the new wording in Replace with.',
            'Choose whether Match case should be enabled, then select Replace across document.',
            'Read the replacement count. If it differs from your expected count, investigate before downloading.',
            'Choose Update PDF preview and visit every affected page to check wording and placement.',
            'Download PDF, open the saved file in a separate reader, and verify the changes there.',
          ],
          true,
        ),
        p(
          'Use Undo text change if a replacement touched unintended text. Then refine the search or make individual corrections. The displayed replacement count counts matches in editable blocks; it is not a count of changed pages and is not proof that every visible occurrence has been corrected.',
        ),
        h('Understand exactly what matching does'),
        p(
          'The Find input is literal text. Characters such as a period or parentheses are searched as characters, not as regular-expression instructions. Match case distinguishes uppercase and lowercase when enabled. With it disabled, matching ignores case, but the replacement is inserted exactly as you typed it; it does not adapt to each occurrence’s capitalization.',
        ),
        p(
          'Matching is not restricted to whole words. For example, searching for “art” can also match that sequence inside “start.” Use a fuller phrase or edit the individual block when a short word has several uses. Check both headings and body text if their capitalization should differ.',
        ),
        p(
          'The operation searches the current wording of supported text blocks, including edits you have already made in the workspace. A second replacement therefore works on the result of the first. Plan the order and avoid running the same action repeatedly without checking what remains.',
        ),
        h('Why a visible phrase can produce no match'),
        p(
          'A sentence may be split between text blocks even when it looks continuous. Find and replace does not join separate blocks to match a phrase. Select the relevant blocks and inspect their wording; a shorter search may locate a fragment, but confirm that it will not affect unrelated passages.',
        ),
        p(
          'A printed date may use a different separator, a different spelling, or a line break. An occurrence on a scanned appendix may be pixels rather than supported text. Do not shorten a search down to a single common digit just to make the counter increase. Review alternate spellings and image-only locations separately.',
        ),
        p(
          'For a PDF that has no usable blocks, the ',
          link('guide to text that will not edit', '/blog/how-to-edit-original-text-in-a-pdf'),
          ' explains how to distinguish scans, searchable image layers, and unsupported objects. Folio does not include OCR.',
        ),
        h('Review the layout as well as the wording'),
        p(
          'A repeated phrase can sit in a wide paragraph on one page and a narrow table cell on another. Replacing “North Studio” with “North Design Studio” may fit the paragraph but collide with the amount column. Visit every affected location, including headers and footers, before treating the change as finished.',
        ),
        p(
          'The editor does not automatically reflow paragraphs. Replacement text currently supports Latin characters, and a missing character in the original font may require substitution. Inspect the preview at normal reading size and compare alignment, line endings, and nearby content. If several locations need rebuilding, revising the source document is usually easier.',
        ),
        h('Verify the actual file you will share'),
        list([
          'Search the downloaded PDF for the old phrase and inspect any remaining matches.',
          'Search for the new phrase and compare its locations with your expected list.',
          'Visually review scanned pages and alternate spellings that text search may miss.',
          'Check the new wording, page count, and layout in an independent reader.',
          'Use a recognizable revised filename and attach that exact download.',
        ]),
        p(
          'Text search is a consistency check, not a redaction check. Changing a visible name does not prove all personal information has been removed from the PDF. Keep the original privately and use a separate redaction workflow when permanent removal is required.',
        ),
        h('Understand the upload before starting'),
        p(
          'The dedicated text editor previews your file locally before Upload for text editing. Inspection and text processing send the document to Folio. Opening it in the main PDF editor uses a separate private cloud-saving workflow. The ',
          link('privacy page', '/privacy'),
          ' describes those differences. A downloaded PDF is your separate finished copy; keep it before closing the working tab.',
        ),
      ],
    },
  },
};

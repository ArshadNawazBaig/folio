export type Guide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  published: string;
  updated: string;
  tool: string;
  relatedTools?: string[];
  summary?: string;
  sections: {
    title: string;
    text: string;
    steps?: string[];
    table?: {
      caption: string;
      columns: string[];
      rows: { name: string; href: string; cells: string[] }[];
    };
    links?: { label: string; href: string }[];
  }[];
};
export const guides: Guide[] = [
  {
    slug: 'does-folio-upload-pdf-files',
    title: 'Does Folio Upload Your PDF? Local Tools vs. Cloud Saving',
    description:
      'See which Folio PDF tools process files locally, which save to private cloud storage, and which send documents for server processing before choosing a workflow.',
    category: 'Document privacy',
    readTime: '4 min read',
    published: '2026-09-18',
    updated: '2026-09-18',
    tool: 'merge-pdf',
    relatedTools: [
      'edit-pdf',
      'edit-pdf-text',
      'split-pdf',
      'compress-pdf',
      'sign-pdf',
      'image-to-pdf',
      'pdf-to-text',
      'protect-pdf',
    ],
    summary:
      'Folio’s standalone merge, split, compression, image conversion and text extraction tools process document contents in your browser. Opening a PDF in the editor uploads it for private cloud saving, including guest sessions. Original-text processing and password protection send the PDF to Folio; connected translation and Office conversion send it to a document provider. Choose the workflow before selecting a file.',
    sections: [
      {
        title: 'Which PDF tasks can I finish without a document upload?',
        text: 'Use the standalone Merge PDF, Split PDF, Compress PDF, PDF to JPG, PDF to PNG, Image to PDF, or PDF to Text tool when that task is all you need. These tools read and process document contents in your browser and let you download the result directly. The website still loads scripts, fonts and viewer assets over the network. Local document processing does not mean the website is an offline application. Choosing to open the result in the main editor starts a different workflow with a private cloud upload.',
        table: {
          caption: 'How Folio handles files by workflow — checked September 18, 2026',
          columns: ['Workflow', 'Where the document goes', 'What to expect'],
          rows: [
            {
              name: 'Standalone merge, split and compression',
              href: '/merge-pdf#tool-facts',
              cells: [
                'Document contents are processed in the current browser tab.',
                'Download locally. Moving the result into the editor uploads it for cloud saving.',
              ],
            },
            {
              name: 'Editor, page organization, forms and signing',
              href: '/edit-pdf#tool-facts',
              cells: [
                'The PDF and workspace changes are uploaded to private cloud storage.',
                'Guest workspaces expire after 24 hours. Signed-in files stay in your account until deleted.',
              ],
            },
            {
              name: 'Standalone original-text editing',
              href: '/edit-pdf-text#tool-facts',
              cells: [
                'The PDF is sent to Folio for text processing.',
                'Signed-in checkout recovery expires after seven days; stored copies may remain if cleanup fails. Paid download required.',
              ],
            },
            {
              name: 'Password protection',
              href: '/protect-pdf#tool-facts',
              cells: [
                'The PDF and opening password are sent to Folio for processing in server memory.',
                'The tool does not persist the file or password in document storage. Hosting may buffer requests. Paid download required.',
              ],
            },
          ],
        },
      },
      {
        title: 'Does using the editor as a guest keep the PDF on my device?',
        text: 'No. Guest access removes the need to sign in before starting; it does not disable uploads. The editor saves the source PDF and workspace changes privately so the same browser can recover work after a refresh. Guest storage is 100 MB, with a 50 MB limit per PDF and a 24-hour workspace expiry. A session cookie provides access. Clearing cookies can remove that access without deleting the cloud copy. Expired files are removed by scheduled cleanup, with a grace period and retries; expiry is not a promise of immediate physical deletion. Signing in attaches the open workspace to your account and removes its guest expiry.',
        links: [{ label: 'Workspace storage and deletion details', href: '/privacy' }],
      },
      {
        title: 'What changes when I use original-text editing or conversion?',
        text: 'Adding a new text annotation and replacing an existing word are different operations. Original-text processing sends the PDF to Folio, and downloading those changes requires a paid plan. Password protection also uses Folio’s server and sends the opening password. When connected, translation and Office conversion send the PDF through Folio to the provider named in the workspace. Review that provider before starting processing. Free previews or guest access do not imply that document processing is local. The main editor’s cloud saving also applies when you use original-text features inside that workspace.',
        links: [
          { label: 'Original-text editing capabilities', href: '/edit-pdf-text#tool-facts' },
          { label: 'Current free and paid download policies', href: '/pricing' },
        ],
      },
      {
        title: 'Example: combine receipts without opening a cloud workspace',
        text: 'If you only need one PDF containing several receipts, a standalone tool can finish the job. Start with Merge PDF for existing PDFs or Image to PDF for photos. The steps below describe Folio’s workflow; they are not a security certification or a benchmark of other services.',
        steps: [
          'Choose Merge PDF for PDF receipts, or Image to PDF for JPG, PNG or WEBP images.',
          'Add files and arrange them. These tools accept up to 20 files, 50 MB per file and 150 MB total.',
          'Create the PDF and download it directly. Open the download in your usual PDF reader to check the order and readability.',
          'If you choose to continue in the Folio editor to annotate or sign, expect a private cloud upload. Keep the standalone download if that is all you need.',
        ],
        links: [{ label: 'Combine receipt images into a PDF', href: '/image-to-pdf#tool-facts' }],
      },
      {
        title: 'What should I check before using a sensitive document?',
        text: 'Check whether the selected workflow uploads the source, where recovery copies are saved, and how deletion works. Use a non-sensitive sample to confirm that the exported file meets your needs. If your requirements prohibit uploads, use an appropriate local workflow and avoid opening the file in a cloud-saved editor. Cropping, covering text, flattening fields and deleting a text block do not sanitize a PDF for secure redaction. Folio does not currently provide secure redaction. This guide describes Folio’s current behavior; the privacy page has the fuller retention and infrastructure details.',
        links: [
          { label: 'Read Folio’s privacy explanation', href: '/privacy' },
          { label: 'How Folio writes and corrects its guides', href: '/about#editorial' },
        ],
      },
    ],
  },
  {
    slug: 'choose-a-free-pdf-editor',
    title: 'Best Free PDF Editor: Compare 5 Options by Task',
    description:
      'Compare Folio, Sejda, PDF24, PDFgear and Adobe by free features, text editing, device support and limits. Choose a PDF editor for the work you need to finish.',
    category: 'Choosing your tools',
    readTime: '6 min read',
    published: '2026-09-17',
    updated: '2026-09-18',
    tool: 'edit-pdf',
    relatedTools: ['sign-pdf', 'merge-pdf', 'split-pdf', 'image-to-pdf'],
    summary:
      'Choose by the change you need: Folio for browser annotations and visual signatures, Sejda for occasional original-text edits within its free limits, PDF24 Creator for offline Windows tools, PDFgear for Mac text editing, or Adobe’s online editor for comments and markup. Check the finished download and the privacy requirements before committing to a tool.',
    sections: [
      {
        title: 'Which is the best PDF editor for your task?',
        text: 'There is no single best PDF editor for every document. Adding a note, correcting an existing sentence, filling a form, and combining receipts are different jobs. This comparison is written by the team behind Folio. We checked the linked publishers’ feature pages on September 18, 2026; we have not benchmarked these products against each other or assigned performance scores. The options below cover different workflows, and their order is not a ranking. Confirm current limits on each provider’s site and try your own non-sensitive sample.',
      },
      {
        title: 'How do these free PDF editors compare?',
        text: 'Compare the specific product and platform, not just the brand. A company’s online editor may have different features and upload rules from its desktop software. The product names in this table link to the sources for their features and limits.',
        table: {
          caption: 'Free PDF editor comparison — checked September 18, 2026',
          columns: ['Editor', 'Useful for', 'Free features and limits'],
          rows: [
            {
              name: 'Folio',
              href: '/edit-pdf',
              cells: [
                'Adding text, annotations and visual signatures in a browser.',
                'Free annotation and page-tool downloads without a Folio watermark. Original-text downloads require a paid plan. Guest editor storage is 100 MB with a 24-hour expiry; drafts are uploaded privately.',
              ],
            },
            {
              name: 'Sejda Online',
              href: 'https://www.sejda.com/pdf-editor',
              cells: [
                'Occasional changes to existing PDF text in a browser.',
                'Its free editor supports original-text changes, with limits of 200 pages or 50 MB and three tasks per hour. The online service uploads files and states that they are deleted after two hours.',
              ],
            },
            {
              name: 'PDF24 Creator',
              href: 'https://tools.pdf24.org/en/creator',
              cells: [
                'Offline PDF organization, conversion and OCR on Windows.',
                'The desktop suite is free for personal and commercial use and processes files locally. Creator requires Windows; the separate PDF24 web tools are a different workflow.',
              ],
            },
            {
              name: 'PDFgear for Mac',
              href: 'https://www.pdfgear.com/pdfgear-for-mac/',
              cells: [
                'Changing existing text and organizing PDFs in a Mac app.',
                'Its publisher offers free text editing, annotations and page tools. Most editing runs locally; AI features and online services need an internet connection. Installation is required.',
              ],
            },
            {
              name: 'Adobe Acrobat Online',
              href: 'https://www.adobe.com/acrobat/online/pdf-editor.html',
              cells: [
                'Comments, text boxes, highlights and drawings in a browser.',
                'Adobe’s free online editor supports markup with an Adobe account. Changing existing body text is not part of that free editor; check the paid offering for that task.',
              ],
            },
          ],
        },
      },
      {
        title: 'Can I download a PDF for free without a watermark?',
        text: 'An editor may let you preview a feature without including the finished download in its free tier. Check for payment requirements, export watermarks, file-size limits, and any sign-in requirement. Try a small, non-sensitive sample first: add a note, download it, and open it in another PDF reader. In Folio, added text, highlights, images, shapes, visual signatures, form fields, and page organization include free PDF downloads without a Folio watermark. Downloads containing original-text changes require a paid plan. Mixing a free annotation with an original-text change therefore makes that document’s export a paid workflow; you can undo the original-text change to keep an annotation-only export free.',
      },
      {
        title: 'Do I need to add text or replace the original words?',
        text: 'Use Add Text for a comment, date, name, or other addition. It places a new text box on the page without changing the words underneath. In Folio, choose Add Text, click the page, type your note, and adjust its position or appearance. Use Edit Text to replace supported words already in the PDF. That feature preserves the original appearance where the embedded font allows, but downloading those changes requires a plan. A white rectangle over a sentence does not securely remove it. If the document is a scan or its letters are drawn as shapes, it needs OCR or another reconstruction step; Folio’s original-text editor does not include OCR.',
        links: [
          { label: 'How to add text to a PDF for free', href: '/guides/how-to-add-text-to-a-pdf' },
          { label: 'Why some PDF text cannot be edited', href: '/guides/why-cant-i-edit-pdf-text' },
        ],
      },
      {
        title: 'Use a focused free tool when editing is unnecessary',
        text: 'Choose Merge PDF to combine separate files, Split PDF to extract selected pages, or Image to PDF to collect photos and receipts into a document. Those workflows include free downloads and do not need original-text editing. For a form, Fill & Sign lets you complete supported fields and draw, type, or upload a visual signature. This is not a certificate-based digital signature or identity verification service. For compression, check the result rather than expecting a fixed reduction: Folio optimizes PDF structure without downsampling images, so an already optimized or image-heavy file may not get smaller.',
      },
      {
        title: 'Understand guest storage and file privacy',
        text: 'A tool that runs in a browser does not necessarily keep every file on your device. Folio’s editor automatically uploads documents and recovery drafts to private cloud storage. Guests can start without Google sign-in, receive 100 MB of storage, and have a 24-hour file expiry. When that space is full, delete old files before uploading more. Sign in to keep files in your account and access them across devices. Standalone merge, split, and image tools process files in the browser; server-assisted features use Folio or connected document services. Choose a workflow that fits your document’s confidentiality requirements, and keep your own original copy.',
      },
      {
        title: 'How should I evaluate a top PDF editor before using it?',
        text: 'A top-editor list cannot tell you whether a particular PDF will keep its layout. Use the same short sample in each candidate and compare the exported files. This checklist is a repeatable evaluation method, not a claim that every listed editor has passed these checks.',
        steps: [
          'Choose a sample with small text, a link, an image and any form fields you rely on. Keep an untouched copy.',
          'Make the change you actually need: add a note, replace an existing word, sign, or reorganize a page.',
          'Download the result. Record any payment, sign-in, watermark or usage-limit requirement before judging the free tier.',
          'Open the export in a second PDF reader. Compare fonts, colors, page dimensions, selectable text, links and field behavior.',
          'Check where files are processed, how long uploads remain, and whether your device can handle a longer document.',
        ],
        links: [
          {
            label: 'Editing PDFs on iPhone and Android',
            href: '/guides/how-to-edit-a-pdf-on-mobile',
          },
          { label: 'Folio free and paid plans', href: '/pricing' },
        ],
      },
      {
        title: 'Review the exported file, not just the preview',
        text: 'After downloading, open the PDF in your usual reader. Confirm the page order, small text, signature placement, and any fields or links you need. Zoom in to inspect fine details. For a reusable form, leave fields interactive; a flattened copy makes their current appearance part of the page. Keep the original when changing a signed document, because rewriting it can invalidate its existing digital signature. Use Folio’s free editor when additions, signatures, and page changes solve your task. If you need substantial paragraph rewriting, editing the source document and exporting a fresh PDF may give you a more predictable result.',
      },
    ],
  },
  {
    slug: 'how-to-edit-a-pdf',
    title: 'How to Edit a PDF Online: Text, Annotations & Saving',
    description:
      'Add text, highlights, and a signature without losing sight of the original. A practical guide to working in the Folio editor.',
    category: 'Editing',
    readTime: '4 min read',
    published: '2026-09-14',
    updated: '2026-09-15',
    tool: 'edit-pdf',
    relatedTools: ['edit-pdf-text', 'organize-pdf', 'sign-pdf'],
    sections: [
      {
        title: 'Start with the right kind of edit',
        text: 'A PDF captures the appearance of a document. The free Folio editor adds annotations, text, images, shapes, and visual signatures. Choose Edit Text in the same workspace to replace supported original text blocks, with font, size, color, and find-and-replace controls. You can edit and preview first; original-text changes require a premium plan only at download. It does not reflow paragraphs or recognize scanned text. For extensive paragraph changes, editing the source document and exporting a fresh PDF is often the better fit.',
      },
      {
        title: 'Give each addition a clear purpose',
        text: 'Choose Edit PDF, open a document, and select Add text. Click where you want the annotation and type directly into its text box. For an existing PDF text block, choose Edit Text, select the words on the page, and type in place. The properties panel adjusts appearance. Adjust the size and color, and drag the annotation into place. A short note in the margin is often more readable than a large block over the original text. Use highlights sparingly so the most important passages still stand out. You can move, duplicate, resize, or delete your additions and use Undo to recover from a change.',
      },
      {
        title: 'Put the pages in order',
        text: 'The left sidebar shows page thumbnails. Select a page, then use the controls to move it up or down, rotate it, duplicate it, or delete it. Keep at least one page in the document. After changing page layout, review the position of annotations and form fields in the preview and exported copy. Add a blank page if you need room for notes or a new cover.',
      },
      {
        title: 'Save a draft, then check the export',
        text: 'The editor automatically uploads your PDF and saves a recovery workspace to private cloud storage. Use Save now to request a save, then wait for All changes saved before refreshing or leaving. Guests have 100 MB of storage and their files expire after 24 hours. Google sign-in opens separately so the editor remains open; signing in lets you keep files in your account. Download PDF creates your finished file. Added annotations, forms, and signatures export for free when no original-text changes remain. Check the downloaded pages in a PDF reader and keep an original copy.',
      },
    ],
  },
  {
    slug: 'how-to-add-text-to-a-pdf',
    title: 'How to Add Text to a PDF Online for Free',
    description:
      'Type a name, date, answer or note onto a PDF. Position and style your text, save a draft, and download an annotation-only PDF for free without a Folio watermark.',
    category: 'Editing',
    readTime: '3 min read',
    published: '2026-09-18',
    updated: '2026-09-18',
    tool: 'edit-pdf',
    relatedTools: ['sign-pdf', 'create-pdf-form', 'edit-pdf-text'],
    summary:
      'Open a PDF in Folio, choose Add Text, click or tap the page, and type. Added text can be moved and styled. Downloads containing only additions, annotations, forms and page changes are free without a Folio watermark. Replacing the original words is a separate editing feature with paid downloads.',
    sections: [
      {
        title: 'How do I type on a PDF?',
        text: 'Use a new text box when you need to add a date, a reference number, an answer or a note. You can place it on a normal PDF or on top of a scanned page. Start with a copy of the document and choose a clear area for the addition so it does not hide information that the reader needs.',
        steps: [
          'Open Edit PDF and choose a PDF from your device. You can start as a guest without Google sign-in.',
          'Choose Add Text in the toolbar, then click or tap the place where the new text should appear.',
          'Type into the text box. Select your addition to adjust its font, size and color in Properties.',
          'Move the selected box into place and check it at a comfortable zoom level. Use Undo if needed.',
          'Choose Download PDF and open the saved file in a PDF reader to check the position and spelling.',
        ],
        links: [{ label: 'Add text in the free PDF editor', href: '/edit-pdf' }],
      },
      {
        title: 'Can I add text without changing the original PDF text?',
        text: 'Yes. Add Text creates a separate addition; it does not replace the words beneath it. That makes it useful for a response beside a paragraph or a date in a blank space. If you need to correct an existing sentence, choose Edit Text instead and select a supported original block. Downloading original-text replacements requires a paid Folio plan. A scan contains an image of text, so adding a new box does not make its printed words editable or searchable.',
        links: [
          {
            label: 'Understand scans and uneditable text',
            href: '/guides/why-cant-i-edit-pdf-text',
          },
        ],
      },
      {
        title: 'How do I make added text fit the page?',
        text: 'Use a readable font size and a color with enough contrast against the page. Match the nearby text only when that helps the reader distinguish the new information. Review long names and reference numbers carefully: a box that looks correct at a small zoom may overlap another line when you inspect it closely. For a form that other people will complete, use a fillable text field instead of a fixed text annotation. For a signature, use the Sign tool’s draw, type or image options.',
        links: [
          { label: 'Create reusable fillable PDF fields', href: '/create-pdf-form' },
          { label: 'Add a visual signature', href: '/sign-pdf' },
        ],
      },
      {
        title: 'Is the finished download free and without a watermark?',
        text: 'Folio does not add a watermark to free annotation downloads. A document containing added text, highlights, images, shapes, signatures, form fields and page changes can be downloaded for free. If you also replace original PDF text, the combined download requires a paid plan. Undo those original-text changes if you only need the free additions. The preview and the downloaded PDF should both be reviewed; saving a cloud draft and downloading a finished copy are separate actions.',
        links: [
          {
            label: 'Compare free PDF editor features and limits',
            href: '/guides/choose-a-free-pdf-editor',
          },
        ],
      },
      {
        title: 'How do I keep the changes for later?',
        text: 'Folio’s editor uploads the PDF and saves a recovery draft to private cloud storage. Wait for All changes saved before refreshing or leaving, or use Save now to request a save. Guests have 100 MB of storage and a 24-hour file expiry; signing in lets you keep files in an account and open them across devices. Download your finished copy before a guest file expires. Adding a white cover over sensitive words does not securely redact them, and changes to an already digitally signed document can invalidate that signature.',
      },
    ],
  },
  {
    slug: 'how-to-edit-a-pdf-on-mobile',
    title: 'How to Edit a PDF on iPhone or Android',
    description:
      'Add text, annotate and sign a PDF in your phone browser. Learn the mobile controls, guest saving, free downloads and when a desktop works better.',
    category: 'Editing',
    readTime: '3 min read',
    published: '2026-09-18',
    updated: '2026-09-18',
    tool: 'edit-pdf',
    relatedTools: ['sign-pdf', 'organize-pdf'],
    summary:
      'Use the Folio editor in your phone’s browser, choose a PDF, and add text or a visual signature. Swipe the toolbar to reveal more tools and close Properties when you need more page space. Save the draft, then download the finished PDF. Large documents and precise original-text changes are easier on a desktop.',
    sections: [
      {
        title: 'Can I edit a PDF on my phone without installing an app?',
        text: 'You can open Folio in a browser on iPhone or Android and begin as a guest. Choose a PDF with your device’s file picker; if it is attached to a message or email, save a copy where the picker can find it first. Adding text, highlights and visual signatures includes free downloads. An internet connection is needed for the editor’s private cloud saving, and guest files expire after 24 hours. This browser workflow does not install a native phone app.',
        links: [{ label: 'Open the online PDF editor', href: '/edit-pdf' }],
      },
      {
        title: 'How do I add text or sign a PDF on mobile?',
        text: 'Work on one page at a time and zoom before positioning a small addition. The toolbar can scroll horizontally, so a tool may be off the visible edge rather than missing.',
        steps: [
          'Open Edit PDF, choose your document, and wait for the page preview.',
          'Swipe the toolbar to find Add Text or Sign. Tap Add Text and then the page to create a text box.',
          'Type your text. For a signature, choose Sign, then draw, upload an image or type your name in the signature dialog.',
          'Use the Properties and forms toggle when you need appearance controls. Close the panel to uncover the page again.',
          'Review each changed page, wait for All changes saved, and use Download PDF to save your finished copy.',
        ],
        links: [
          { label: 'Detailed steps for adding text', href: '/guides/how-to-add-text-to-a-pdf' },
          { label: 'Choose a signature method', href: '/guides/how-to-sign-a-pdf' },
        ],
      },
      {
        title: 'How can I see more of the document?',
        text: 'Close the Properties and forms panel after making an adjustment. Use the zoom controls at the bottom to enlarge small areas, and use Move when navigating around the page. Rotating your phone can make a wide document easier to inspect, although the on-screen keyboard still reduces the available space. Avoid placing a text box while the page is so small that you cannot see the intended line. Check the position again after closing the keyboard.',
      },
      {
        title: 'Where is the PDF saved after downloading?',
        text: 'The destination depends on your browser and phone settings. Open the browser’s downloads list or the device’s file manager and look for the downloaded PDF. Check that the copy contains your changes before sending it. Save now stores the editable workspace in Folio; Download PDF creates a file you can share. If a save fails, keep the editor tab open and retry. A guest workspace belongs to that browser session, so signing in is the way to access saved documents from another device.',
      },
      {
        title: 'When should I switch to a desktop PDF editor?',
        text: 'A phone is useful for a short note or signature, but long, image-heavy PDFs can exceed its available memory. Detailed page rearrangement and precise changes to original text are easier on a larger screen. Folio’s Edit Text feature supports many original text blocks, but it does not provide OCR for scans or automatic paragraph reflow. You can preview supported original-text edits on the page; downloading them requires a paid plan. If a file repeatedly fails on mobile, keep the original and try a desktop browser instead of repeatedly uploading it.',
        links: [
          {
            label: 'Choose a PDF editor for your document',
            href: '/guides/choose-a-free-pdf-editor',
          },
        ],
      },
    ],
  },
  {
    slug: 'why-cant-i-edit-pdf-text',
    title: 'Why Can’t I Edit Text in My PDF? Scans, Fonts & Text Blocks',
    description:
      'Find out why PDF text cannot be selected or edited. Check scans, outlined letters, passwords and embedded fonts, then choose a workable next step.',
    category: 'Editing',
    readTime: '4 min read',
    published: '2026-09-17',
    updated: '2026-09-17',
    tool: 'edit-pdf-text',
    relatedTools: ['edit-pdf', 'pdf-to-text'],
    sections: [
      {
        title: 'First check whether the page contains real text',
        text: 'A PDF can look like a normal document while storing an entire page as one image. Try selecting a few words in a PDF reader and copying them into a plain-text document. If the reader only selects the whole page, the content may be a scan. If you can copy words, there is probably a text layer, but that does not guarantee every block can be rewritten. A page can mix real text, scanned images and drawn lettering. Check the specific section you want to change rather than relying on another editable section.',
        links: [{ label: 'Extract selectable PDF text', href: '/pdf-to-text' }],
      },
      {
        title: 'Scanned pages need OCR before their words can be changed',
        text: 'OCR, or optical character recognition, interprets text in a picture. Folio does not currently include OCR. Adding a text box to a scanned page places new text over the image; it does not make the printed words editable. Use an OCR-capable application to create a recognized copy, then inspect the result. Some OCR outputs contain only an invisible search layer over the original image, so changing that layer will not change the visible scan. For substantial corrections, obtaining the original Word, design or other source document is usually a better starting point.',
      },
      {
        title: 'Outlined lettering and complex artwork are different from text',
        text: 'Design applications sometimes convert letters into vector shapes, particularly in logos, headings or print-ready artwork. Those shapes have no words for a text editor to replace. Other PDFs put text inside clipping paths or nested graphic objects. Folio supports many text blocks, but some structures remain unsupported. If one heading cannot be selected while the paragraphs below it can, check the source document or ask its creator for an export that keeps text as text. Making a PDF searchable and making its visible lettering editable are separate requirements.',
      },
      {
        title: 'Use Edit Text for existing words and Add Text for additions',
        text: 'In Folio, open the PDF, select Edit Text in the toolbar, wait for the selectable blocks, then click the words on the page. Type directly in the selected block and use Properties to adjust its appearance. On a phone, open Properties with the sidebar control when needed. Add Text creates a separate box for a date, note or answer. It is useful even when the underlying page is scanned. Added text and annotations include free downloads; exporting changes to original PDF text requires a paid plan. Keep an original copy and review the exported document.',
        links: [
          { label: 'Open the PDF text editor', href: '/edit-pdf-text' },
          { label: 'Add text and annotations for free', href: '/edit-pdf' },
        ],
      },
      {
        title: 'Missing characters can mean the embedded font is incomplete',
        text: 'Many PDFs embed only the characters used when the document was created. Adding a new digit or symbol can therefore require a replacement font. Folio preserves supported original fonts where possible and uses a matching fallback when a needed character is unavailable. Substitution may change spacing, so inspect names, amounts and line endings. If a word does not fit, adjust the block or choose another font rather than expecting surrounding paragraphs to reflow automatically. An exact visual match may require the original source document and font.',
      },
      {
        title: 'Separate file access, saving and editing problems',
        text: 'A password-protected file must be opened with its password and saved as an unlocked copy in a trusted reader before using workflows that require an unencrypted PDF. Folio does not recover unknown passwords. If an editable block shows Retry editing, follow the displayed error and retry without replacing your original file. If saving fails, keep the tab open, check your connection and available storage, and use Retry saving. Wait for All changes saved before refreshing. A save error does not mean the document has no text. Share the exact error with support if it continues, and avoid sending sensitive document contents unnecessarily.',
        links: [{ label: 'Contact Folio support', href: '/support' }],
      },
    ],
  },
  {
    slug: 'how-to-merge-and-split-pdfs',
    title: 'How to Merge and Split PDF Files Without Losing Pages',
    description:
      'Learn when to merge documents, how to arrange their order, and how to extract just the pages you need.',
    category: 'Organization',
    readTime: '3 min read',
    published: '2026-09-13',
    updated: '2026-09-15',
    tool: 'merge-pdf',
    relatedTools: ['split-pdf', 'organize-pdf'],
    sections: [
      {
        title: 'Build one useful document',
        text: 'Merging works well when the recipient needs several pieces of information together: a proposal with its appendix, a portfolio with a cover, or a group of receipts for one project. Add at least two PDFs to Merge PDF. Use the up and down controls to set the file order before processing. Folio preserves each page’s dimensions, so a landscape chart can sit beside a portrait report.',
      },
      {
        title: 'Check the details before combining',
        text: 'Open the originals and check for duplicates, blank pages, and outdated versions. Think about which document should introduce the rest. Combining pages can change the behavior of interactive forms and invalidate existing cryptographic signatures. Keep original signed documents and forms separately when those properties matter. A merged copy is useful for reading, but it should not replace an original whose signature must remain verifiable.',
      },
      {
        title: 'Extract a useful section',
        text: 'Split PDF can export a range to one new PDF or put each selected page in a separate PDF inside a ZIP. Enter a range such as 1-3, 5, 8-10. Page numbers refer to the position in the file, not necessarily a number printed on the page. A report with an unnumbered cover may have printed page 1 at file position 2. Preview the document to make sure your selection matches what you intend to share.',
      },
      {
        title: 'Make the final copy easy to recognize',
        text: 'After downloading, open the result and confirm the first page, last page, and total page count. Give the file a clear name describing its contents. The source files remain on your device and are not changed. You can continue in the Folio editor to add a note or adjust the order further without manually uploading the result again.',
      },
    ],
  },
  {
    slug: 'why-your-pdf-wont-get-smaller',
    title: 'Why Your PDF Won’t Get Smaller — and What to Try',
    description:
      'Understand PDF file size, lossless optimization, image-heavy documents, and why compression results vary.',
    category: 'File size',
    readTime: '3 min read',
    published: '2026-09-13',
    updated: '2026-09-15',
    tool: 'compress-pdf',
    relatedTools: ['split-pdf', 'compress-images'],
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
        title: 'When the original is the better result',
        text: 'If optimization produces a larger file, Folio says so and makes your original available instead. That is an honest outcome rather than a processing failure. Running the same file through the same optimization repeatedly is unlikely to keep reducing it. For an image-heavy document, exporting a smaller version from the original application may be more effective. Check its image-resolution settings and preview fine text carefully.',
      },
      {
        title: 'Choose readability over a target percentage',
        text: 'Before sharing, open the result at a normal reading size and zoom in on small text, charts, and signatures. Keep links and selectable text useful whenever possible. If an upload service sets a strict size limit, splitting a long document into useful sections may be more appropriate than making each page hard to read. Keep a full-quality original so you can produce a different version later.',
      },
    ],
  },
  {
    slug: 'fillable-pdf-vs-flattened-pdf',
    title: 'Fillable vs. Flattened PDFs: Which Should You Share?',
    description:
      'Understand editable PDF form fields, flattened exports, and visual signatures before sharing your completed document.',
    category: 'Forms',
    readTime: '3 min read',
    published: '2026-09-13',
    updated: '2026-09-15',
    tool: 'create-pdf-form',
    relatedTools: ['sign-pdf'],
    sections: [
      {
        title: 'Leave room for the next person',
        text: 'A fillable PDF contains interactive fields such as text boxes, checkboxes, dropdowns, and radio groups. Someone can open it in a compatible PDF reader and enter their own details. This is useful for a reusable questionnaire, an onboarding form, or a standard project inquiry. Clear field names, meaningful labels, and a logical order make the form easier to complete.',
      },
      {
        title: 'Build or fill with Folio',
        text: 'Create a PDF form opens the editor, where you can place new text fields and checkboxes on a page. Name each field uniquely. The Form panel shows supported existing fields along with fields you add, so you can enter values before exporting. The original page preview does not update to show edits to existing form values; review the downloaded PDF to confirm their appearance. You can also start with one of Folio’s original sample templates.',
      },
      {
        title: 'Understand what flattening does',
        text: 'Flattening turns the visible appearances of form fields into regular page content. The result is no longer an interactive form. This can help preserve a completed form’s appearance, but it is not encryption, access protection, or secure redaction. Keep a fillable original if you may need to change answers or send the blank form to someone else.',
      },
      {
        title: 'Choose the right signature workflow',
        text: 'A typed or drawn signature is a visual mark. Folio adds these marks as document annotations; it does not verify identity, issue certificates, or create a cryptographic audit trail. If a recipient requires a certificate-based digital signature, use their specified signing process. For ordinary completed forms, confirm the recipient’s format requirements and check that the exported values are visible in their preferred PDF reader.',
      },
    ],
  },
  {
    slug: 'how-to-sign-a-pdf',
    title: 'How to Sign a PDF: Draw, Type or Upload Your Signature',
    description:
      'Add a signature to a PDF using a mouse, touch screen, typed name, or image. Position it clearly and check the finished document before sharing.',
    category: 'Signing',
    readTime: '3 min read',
    published: '2026-09-15',
    updated: '2026-09-15',
    tool: 'sign-pdf',
    relatedTools: ['create-pdf-form', 'edit-pdf'],
    sections: [
      {
        title: 'Choose how you want to sign',
        text: 'Open Sign PDF and choose your document. In the editor, select Sign to open the signature dialog. Draw is useful when you want to write with a mouse, stylus, or touch screen. Type turns your name into a visual signature. Image lets you use a signature picture you already have. These are three ways to place a visual mark on the page; choose the one that gives the clearest result at the size you need.',
      },
      {
        title: 'Create a clear signature',
        text: 'For a drawn signature, write comfortably across the drawing area instead of squeezing the mark into a corner. Clear it and try again if the strokes overlap or the name is difficult to read. For a typed signature, check spelling and preview the style before inserting it. For an image, use a tightly cropped picture with enough detail to remain clear when resized. A transparent PNG can avoid a white rectangle covering a colored form background.',
      },
      {
        title: 'Place it beside the right information',
        text: 'Confirm the signature in the dialog, place it on the page, and adjust its position and size. Avoid stretching it into a different proportion or covering printed labels. Use Add Text for a date or printed name if the PDF has no fillable field for them. A signature on one page does not automatically sign every page: check whether the recipient has marked additional places for initials or a signature and complete those separately.',
      },
      {
        title: 'Check the download and keep the right original',
        text: 'A PDF containing only added signatures, annotations, and form values downloads for free. Changes to original PDF text use premium downloads. Open the exported copy to confirm the signature is visible and the page order is correct. Folio visual signatures do not create a digital certificate or verify identity. If the recipient asks for certificate-based signing or a particular signing platform, use that process. Keep an unsigned original and check the editor save status before closing your workspace.',
      },
    ],
  },
  {
    slug: 'how-to-convert-pdf-to-images',
    title: 'How to Convert PDF Pages to JPG or PNG at the Right Resolution',
    description:
      'Choose JPG or PNG, select PDF pages, and set export resolution. Learn how to keep small text clear without making image files unnecessarily large.',
    category: 'Conversion',
    readTime: '3 min read',
    published: '2026-09-15',
    updated: '2026-09-15',
    tool: 'pdf-to-png',
    relatedTools: ['pdf-to-jpg', 'pdf-to-text', 'compress-images'],
    sections: [
      {
        title: 'Choose a format for the content',
        text: 'PNG is a useful starting point for screenshots, charts, diagrams, and pages with small text because its compression does not add JPEG artifacts. JPG often produces a smaller file for photographs and illustrated pages, although sharp letter edges can become less distinct at lower quality. Both formats turn the entire PDF page into pixels. Links, selectable text, and interactive form fields do not remain interactive in the image. Use PDF to Text instead if you need the selectable words.',
      },
      {
        title: 'Select just the pages you need',
        text: 'Open PDF to PNG or PDF to JPG and choose a PDF. Enter the required page range, such as 1-3, 5, to export the first three pages and page five. Use positions in the file rather than printed page labels; a cover sheet can shift the numbering. Convert the selection and inspect the result preview. Exporting one page makes an image file, while several pages are packaged in a ZIP. The preview navigation lets you check each page before downloading.',
      },
      {
        title: 'Match resolution to the intended size',
        text: 'Use a lower resolution for a small screen preview and a higher resolution when small text or printing matters. At 300 DPI, a US Letter page is about 2550 by 3300 pixels. Doubling resolution in both directions creates roughly four times as many pixels, so processing and file size can grow quickly. More pixels cannot reconstruct detail missing from an original scan. Folio limits raster output to 25 million pixels per page and 200 pages per export to bound memory use.',
      },
      {
        title: 'Inspect the actual result before sharing',
        text: 'Look at the exported preview at a useful reading size, especially footnotes, fine chart lines, and signatures. If JPG letters look uneven, try PNG or a higher resolution and compare. If the file is too large, export fewer pages or choose a smaller resolution. You can also use Compress Images after export, checking the new result before replacing the first version. These conversions and downloads are free, and your original PDF remains unchanged.',
      },
    ],
  },
  {
    slug: 'how-to-combine-images-into-pdf',
    title: 'How to Combine JPG, PNG and WEBP Images into One PDF',
    description:
      'Turn receipts, photos, or screenshots into an ordered PDF. Choose image-sized or A4 pages, check orientation, and preview every page before export.',
    category: 'Conversion',
    readTime: '3 min read',
    published: '2026-09-15',
    updated: '2026-09-15',
    tool: 'image-to-pdf',
    relatedTools: ['jpg-to-pdf', 'png-to-pdf', 'merge-images', 'compress-images'],
    sections: [
      {
        title: 'Prepare pictures that belong together',
        text: 'Combining images into one PDF is useful for a set of receipts, project photographs, or screenshots that someone should read in order. Open Image to PDF for a mixed group of JPG, PNG, and WEBP files, or choose a format-specific tool for JPG or PNG. Each image becomes a separate page. Check that every picture is readable before adding it; packaging a blurred receipt inside a PDF will not make its details clearer.',
      },
      {
        title: 'Arrange the reading order',
        text: 'Choose the images and use the move controls beside each file to set their order. Remove accidental duplicates before creating the PDF. The tool accepts up to 20 files per batch, with a 50 MB limit for each file and a 150 MB combined limit. Very large images may need resizing first. Keep the originals separately if you plan to adjust brightness or compression. File names can help you recognize pages, but the order in the workspace determines the PDF order.',
      },
      {
        title: 'Choose page dimensions deliberately',
        text: 'Fit-to-image makes each page follow its picture’s proportions, using 96 pixels per inch to determine the PDF page dimensions. A4 centers the picture on a standard page with margins, which is useful when the document will be printed or combined with other A4 paperwork. Mixing portrait and landscape photographs is allowed. Ordinary JPG and PNG images retain their image data; WEBP and photos that need orientation correction are decoded before embedding so they display correctly.',
      },
      {
        title: 'Review the PDF, not only the file list',
        text: 'Choose Create PDF and move through the result preview. Confirm the first and last pages, orientation, visible margins, and total page count. If something is wrong, adjust the order or page setting and recreate the result. Download the PDF when it looks right; this workflow is free. Text photographed inside the images remains part of those images rather than selectable PDF text. A searchable text layer needs OCR, which is not currently a standalone Folio tool.',
      },
    ],
  },
  {
    slug: 'how-to-password-protect-a-pdf',
    title: 'How to Password Protect a PDF Before Sharing It',
    description:
      'Create a PDF that requires an opening password. Check encryption limits, retain an original, and avoid confusing password protection with redaction.',
    category: 'Protection',
    readTime: '3 min read',
    published: '2026-09-15',
    updated: '2026-09-15',
    tool: 'protect-pdf',
    relatedTools: ['split-pdf'],
    sections: [
      {
        title: 'Start with a supported original',
        text: 'Open Protect PDF and choose an unencrypted, unsigned PDF. The tool accepts files up to 10 MB and 100 pages. If the file is larger, prepare an appropriate smaller copy or split the document before protecting it. Keep an unencrypted original somewhere you can access independently. Rewriting a document can invalidate a cryptographic signature, so Folio requires an unsigned source for this workflow. Adding an opening password is a separate task from signing the document.',
      },
      {
        title: 'Set and confirm the opening password',
        text: 'Enter a password of 8–64 characters, then type it again in the confirmation field. Use the visibility control to check it in a private setting if the values do not match. Avoid placing the password in the PDF file name or on its first page. Folio processes the PDF and password in memory when creating the protected download and does not save the opening password. The application cannot recover it for you later, so keep your own record.',
      },
      {
        title: 'Download and test the protected copy',
        text: 'You can choose your file and configure protection before paying. Downloading the encrypted copy requires a premium plan. Sign-in and checkout open separately so the current workspace stays open. After access is confirmed, request the protected download, then open that file in a PDF reader and confirm it asks for the correct password. Folio uses AES-256 encryption for this copy. Send the password through a separate channel when that fits your sharing process.',
      },
      {
        title: 'Understand what protection does and does not change',
        text: 'An opening password controls access to the file. Once someone can open it, this workflow does not prevent them from copying or sharing its contents. It also does not remove sensitive text, clean metadata, or sanitize attachments. If you need a redacted document, use a process designed to remove that information and verify its result separately. Keep the original and the protected copy clearly named, and check that you are sharing the intended version.',
      },
    ],
  },
];

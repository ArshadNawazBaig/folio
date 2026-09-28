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
      rows: { name: string; href?: string; cells: string[] }[];
    };
    links?: { label: string; href: string }[];
  }[];
};
export const guides: Guide[] = [
  {
    slug: 'create-transparent-signature-png',
    title: 'How to Create a Signature PNG With a Transparent Background',
    description:
      'Draw or type a signature, remove white paper from a photo, and download a transparent PNG. Learn how to use it in documents and fix common image problems.',
    category: 'Forms & signing',
    readTime: '7 min read',
    published: '2026-09-28',
    updated: '2026-09-28',
    tool: 'signature-generator',
    relatedTools: ['sign-pdf', 'edit-pdf', 'create-pdf-form'],
    summary:
      'For a quick signature image, open the signature generator, choose Draw or Type, and download the PNG. Both modes create a transparent background automatically. If you already have a paper signature, Image mode can remove its white background. No PDF or account is needed, and this standalone tool does not upload or save your signature. Download a copy before leaving the page.',
    sections: [
      {
        title: 'Start with the file you actually need',
        text: 'You have a document ready to send, but the signature you pasted into it sits inside a white rectangle. That rectangle is part of the image, so it covers the line or colored paper underneath. A transparent signature PNG solves that particular problem: the letters remain visible while the page shows through around them. Use Folio’s signature generator when you need a separate image file. If you only need to sign one PDF, Fill & sign lets you create the signature directly inside the document.',
        links: [
          { label: 'Create a signature PNG', href: '/signature-generator' },
          { label: 'Sign a PDF instead', href: '/sign-pdf' },
        ],
      },
      {
        title: 'Choose between drawing, typing, and a paper signature',
        text: 'Choose the method that matches the result you want. Drawing gives you control over the shape of every stroke. Typing is convenient if a mouse makes your handwriting awkward, but it uses a font; it does not learn or reproduce your handwriting. An existing image is useful when you want to keep a signature you wrote on paper. You can try another tab without losing your current work while the page stays open.',
        table: {
          caption: 'Which signature method fits your task?',
          columns: ['Method', 'A good choice when', 'What to check'],
          rows: [
            {
              name: 'Draw',
              cells: [
                'You want your own handwriting and have a mouse, touch screen, or stylus.',
                'Leave room for loops and long strokes so they do not touch the edge.',
              ],
            },
            {
              name: 'Type',
              cells: [
                'You want a neat name or initials without drawing.',
                'Compare Classic, Handwritten, and Flowing; check every character before downloading.',
              ],
            },
            {
              name: 'Image',
              cells: [
                'You already have a clear signature on plain white paper.',
                'Watch for shadows, ruled lines, and paper texture that white removal may leave behind.',
              ],
            },
          ],
        },
      },
      {
        title: 'Draw a signature and download it as a transparent PNG',
        text: 'Sign at a comfortable size instead of squeezing your name into one corner. The tool crops empty space around the ink, so you do not need to fill the whole pad. The pale guide line and checkerboard are only there to help you; neither is included in the exported image. If you make a mistake near the end, Undo stroke removes the most recent stroke without erasing the rest of your signature.',
        steps: [
          'Open Signature generator and select Draw.',
          'Choose black, blue, or green ink. Black is a useful starting point for a document that may be printed.',
          'Write your signature with a mouse, finger, or stylus. Keep it away from the pad edges.',
          'Use Undo stroke to correct a mark, or Clear signature to redraw. Changing the ink color updates the whole drawing.',
          'Select Download PNG. The file is named signature.png and contains your ink with transparent space around it.',
        ],
      },
      {
        title: 'Make a typed signature when drawing feels awkward',
        text: 'Select Type, enter your name or initials, and compare the three styles. Classic gives you an italic look; Handwritten and Flowing offer more informal lettering. You can enter up to 80 characters. The preview fits the available space, while the PNG is rendered separately for download. A very long name will be reduced to fit the export width, so inspect it at the size you plan to use. If a style cannot load, choose Classic and check the preview before downloading. Typed signatures also export with a transparent background.',
      },
      {
        title: 'Remove white paper from an existing signature image',
        text: 'Start with dark ink on clean, unlined white paper. Photograph it straight on in even light, keeping your phone’s shadow off the signature. Crop out the desk, fingers, and unrelated writing before choosing the image. Folio accepts PNG, JPG, and WebP files up to 5 MB and 25 megapixels. It resizes large images to at most 1,400 pixels on the longest edge before cropping the signature, so selecting just the signature area helps preserve useful detail.',
        steps: [
          'Select Image, then Choose image, or drop the image onto the upload area.',
          'Leave Remove white background checked and inspect the checkerboard preview.',
          'Check between loops and beneath long strokes for leftover paper or shadows.',
          'If the result looks gray or patchy, try a brighter, cleaner original. White removal does not isolate handwriting from a busy or colored background.',
          'Download the PNG when the preview looks right. If you uncheck white removal, the original background remains in the image.',
        ],
      },
      {
        title: 'Why PNG matters, and how to check transparency',
        text: 'PNG supports an alpha channel, which describes how transparent each pixel is. That lets the document show through around your signature, including the spaces inside letters. A checkerboard is a common way to display those empty areas, but it is not part of your downloaded file. Some viewers show transparency against white, so appearance in a viewer alone is not a reliable check. Place the original PNG over a colored shape in a document: the color should show through the empty areas.',
        links: [
          {
            label: 'W3C: PNG transparency and the alpha channel',
            href: 'https://www.w3.org/TR/png-3/#3alpha',
          },
        ],
      },
      {
        title: 'Place the signature in a PDF or Word document',
        text: 'For a PDF in Folio, open Fill & sign, choose your PDF, select Sign, and use Image to choose the PNG. Place it on the signature line, resize it using a corner handle, and inspect the exported document. In Word, insert the downloaded PNG through Insert > Pictures, then adjust its size and position. Keep the original proportions so your handwriting does not look stretched. Always review the finished file, especially if the signature sits close to a date, name, or checkbox.',
        links: [
          { label: 'Open Fill & sign', href: '/sign-pdf' },
          {
            label: 'Microsoft: insert a signature image in Word',
            href: 'https://support.microsoft.com/en-us/office/insert-a-signature-f3b3f74c-2355-4d53-be89-ae9c50022730',
          },
        ],
      },
      {
        title: 'Fix a white box, fuzzy edges, or a missing download',
        text: 'Troubleshoot the downloaded file before redrawing your signature. A screenshot can capture the preview background, and saving through another app may change the image. Start with the original signature.png from the tool, then compare it with what appears in your document. The checks below help identify whether the issue comes from the source image, the download, or the way the document displays it.',
        table: {
          caption: 'Common signature PNG problems and practical fixes',
          columns: ['Problem', 'Likely cause', 'What to try'],
          rows: [
            {
              name: 'A white rectangle covers the page',
              cells: [
                'The image retained its paper background, or a later copy lost transparency.',
                'Use the original PNG. In Image mode, enable white removal and download again. Draw and Type create transparency automatically.',
              ],
            },
            {
              name: 'A gray patch surrounds the ink',
              cells: [
                'The photo contains a shadow or off-white paper.',
                'Retake the photo in even light on plain white paper, or draw the signature directly.',
              ],
            },
            {
              name: 'The signature looks blurry',
              cells: [
                'A small image was enlarged too much, or the original photo was out of focus.',
                'Reduce its size in the document or create a clearer source. Enlarging a PNG does not add missing detail.',
              ],
            },
            {
              name: 'Loops or flourishes are cut off',
              cells: [
                'The drawing reached the edge of the pad or the original photo was cropped too tightly.',
                'Redraw with extra room around the ink, or choose an image that includes every stroke.',
              ],
            },
            {
              name: 'Download PNG is disabled',
              cells: [
                'The active tab is empty, an image is processing, or a font has not loaded.',
                'Add a signature in the selected tab, wait for processing, or choose Classic if a font failed.',
              ],
            },
            {
              name: 'The PNG is hard to find on a phone',
              cells: [
                'The browser saved it to Downloads rather than Photos.',
                'Check the browser’s downloads list and your device’s Files app for signature.png. Repeated downloads may have a number added to the name.',
              ],
            },
          ],
        },
      },
      {
        title: 'What happens to your signature after you leave?',
        text: 'The standalone signature generator keeps your typed name, drawing, and selected image in the current page’s memory. It does not upload that content, create a saved signature library, or write it to browser storage. Clear all discards the working signature, and refreshing starts a new one. Website assets and signature fonts still load over the network. Downloaded PNGs remain wherever your browser saves them; clearing the tool does not delete those files. On a shared device, remove downloaded copies you no longer need.',
      },
      {
        title: 'Using the PDF editor is a separate saving choice',
        text: 'Downloading a signature image does not open a document workspace. If you later put that image into a PDF in Folio’s editor, the PDF and its changes use the editor’s private cloud saving. Guest workspaces expire after 24 hours; signed-in workspaces are kept in the account until deleted. That distinction matters if you only wanted to create an image without saving it online. Stay in the standalone generator for that task, and choose how to store or use the downloaded file yourself.',
        links: [{ label: 'Read how Folio handles files and cloud saving', href: '/privacy' }],
      },
      {
        title: 'A signature image does not certify a document',
        text: 'This tool produces a picture of your signature. It does not verify your identity, record a signing audit trail, or attach a cryptographic certificate to a document. Check what the recipient asks for before using a PNG. If they sent a signing link or require a particular service, follow that process. A handwritten-looking font cannot add those capabilities. Keep the reusable image private and share the completed document when that is what the recipient needs.',
      },
      {
        title: 'Check the final result at its actual size',
        text: 'Before sending a document, open the exported copy and look at the signature at normal reading size. Check that all strokes are present, the background blends into the page, and nearby words remain readable. Make sure the signature is on the intended page and line. For a printed document, a quick test print can reveal ink that is too faint or lettering that is too small. Keep the PNG only if you expect to reuse it, and keep it somewhere you control.',
        links: [
          { label: 'Make your signature with the free generator', href: '/signature-generator' },
        ],
      },
    ],
  },
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
    title: 'The Best Free PDF Editor for Your Task: 5 Options',
    description:
      'Choose a free PDF editor by task, device, download limits and privacy. Compare Folio, Sejda, PDF24, PDFgear and Adobe, or find a focused merge or split tool.',
    category: 'Choosing your tools',
    readTime: '7 min read',
    published: '2026-09-17',
    updated: '2026-09-21',
    tool: 'edit-pdf',
    relatedTools: ['sign-pdf', 'merge-pdf', 'split-pdf', 'image-to-pdf', 'compress-pdf'],
    summary:
      'The best free PDF tool depends on the change you need. Consider Folio for browser annotations and visual signatures, Sejda for occasional original-text edits within its free limits, PDF24 Creator for offline Windows tools, PDFgear for Mac text editing, or Adobe’s online editor for comments and markup. For merging, splitting or converting images, a focused tool may be enough. Check the finished download and the privacy requirements before committing to a tool.',
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
        table: {
          caption: 'Choose a free PDF tool by the result you need',
          columns: ['Your task', 'Free workflow in Folio', 'Check before downloading'],
          rows: [
            {
              name: 'Add a note or highlight',
              href: '/edit-pdf',
              cells: [
                'Add text or annotations in the online editor.',
                'Annotations download free. Downloading original-text changes requires a paid plan; editor drafts use private cloud storage.',
              ],
            },
            {
              name: 'Combine PDF files',
              href: '/merge-pdf',
              cells: [
                'Merge files in your browser and download one PDF.',
                'Put the files in the right order and review the combined pages.',
              ],
            },
            {
              name: 'Keep only selected pages',
              href: '/split-pdf',
              cells: [
                'Extract a page range or split a PDF in your browser.',
                'Check the page numbers against the original document.',
              ],
            },
            {
              name: 'Turn photos into a PDF',
              href: '/image-to-pdf',
              cells: [
                'Combine JPG, PNG or WEBP images into PDF pages in your browser.',
                'Review image order, orientation and page size.',
              ],
            },
            {
              name: 'Try to reduce a PDF’s size',
              href: '/compress-pdf',
              cells: [
                'Optimize the document’s structure in your browser.',
                'Images are not downsampled. An already optimized file may not get smaller.',
              ],
            },
          ],
        },
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
    slug: 'extract-nonconsecutive-pdf-pages',
    title: 'Extract Nonconsecutive PDF Pages in Any Order',
    description:
      'Extract separate PDF pages or reorder a selection using page ranges. Try a six-page sample, compare the expected result, and choose one PDF or a ZIP.',
    category: 'Organization',
    readTime: '5 min read',
    published: '2026-09-26',
    updated: '2026-09-26',
    tool: 'split-pdf',
    relatedTools: ['organize-pdf', 'merge-pdf'],
    summary:
      'To extract pages that are not next to each other, enter their file positions separated by commas. In Folio, 6, 2-3 creates one PDF containing page 6, then pages 2 and 3. Choose a ZIP instead when you need a separate PDF for each selected page. This standalone tool processes the document locally and downloads for free without an account.',
    sections: [
      {
        title: 'How do I extract pages that are not next to each other?',
        text: 'Use Split PDF when you need a few pages from one document, such as an appendix followed by a summary and budget. You do not need to delete every unwanted page individually. The original file remains unchanged, and the page range controls both which pages appear and their order in the combined output. Start with the fictional six-page practice packet below if you want to check the behavior before using your own file.',
        steps: [
          'Save the six-page practice PDF below, then open Split PDF and choose that file.',
          'In Pages, enter 6, 2-3. The tool should report 3 pages selected.',
          'Set Output to Selected pages in one PDF, then choose Split PDF.',
          'Preview the result and choose Download PDF. Open the downloaded copy and check that it contains Appendix, Summary, then Budget.',
        ],
        links: [
          { label: 'Open the six-page practice PDF', href: '/samples/page-selection-practice.pdf' },
          { label: 'Try the selection in Split PDF', href: '/split-pdf' },
        ],
      },
      {
        title: 'Which page numbers should I enter?',
        text: 'Use each page’s position in the file, starting at 1. A printed page number can differ from that position: our sample cover is file position 1, while the Summary has a printed 1 but is file position 2. Covers, contents pages and Roman-numeral introductions commonly create this mismatch. The following selections all refer to file positions in the downloadable sample.',
        table: {
          caption: 'Page selections and expected results for the six-page practice packet',
          columns: ['Page range', 'Output order', 'Page count'],
          rows: [
            { name: '1, 3, 6', cells: ['Cover, Budget, Appendix', '3'] },
            { name: '6, 2-3', cells: ['Appendix, Summary, Budget', '3'] },
            {
              name: '2-3, 3, 6',
              cells: ['Summary, Budget, Appendix; the repeated 3 is included once', '3'],
            },
            { name: 'Leave blank', cells: ['All pages in their original order', '6'] },
          ],
        },
      },
      {
        title: 'Can I split selected pages into separate PDF files?',
        text: 'Yes. Keep the same page range and change Output to One PDF per selected page (ZIP), then choose Split PDF and Download ZIP. With 6, 2-3, the archive contains three one-page PDFs whose filenames end in page-006.pdf, page-002.pdf and page-003.pdf. Extract the ZIP in your device’s file manager to access them. A file manager may sort those files by name, so use Selected pages in one PDF when you need the reading order 6, 2, 3 to remain part of one document. To split every page, leave Pages blank and choose the ZIP output.',
      },
      {
        title: 'Why is my page range rejected or shorter than expected?',
        text: 'Use commas between selections and a hyphen inside an ascending range. For this sample, 7 is outside the document and 6-2 is not a valid range. Enter 6, 5, 4, 3, 2 if you want those pages in reverse order. Repeated pages are removed after their first occurrence: 2, 2, 3 produces two pages. Page ranges cannot duplicate a page; use Manage pages in the editor if you need a copy. If your file is password protected, open it with its password in a trusted reader and save an unlocked copy first.',
      },
      {
        title: 'What should I check before sharing the extracted PDF?',
        text: 'Check the page count, first and last pages, orientation, and whether every selected page belongs in the copy you intend to share. Extraction copies pages; it is not secure redaction of content that remains on those pages. Keep digitally signed originals separately, because copying pages can invalidate a certificate-based signature or change interactive form behavior. Folio’s standalone Split PDF accepts a PDF up to 50 MB and processes its contents in your browser. Choosing to continue in the main editor starts a separate workflow with private cloud saving.',
        links: [
          {
            label: 'How Folio handles local processing and cloud saving',
            href: '/guides/does-folio-upload-pdf-files',
          },
          {
            label: 'Merge extracted pages with another document',
            href: '/guides/merge-pdfs-different-page-sizes',
          },
        ],
      },
    ],
  },
  {
    slug: 'merge-pdfs-different-page-sizes',
    title: 'Merge PDFs with Different Page Sizes and Orientations',
    description:
      'Combine A4, Letter, portrait and landscape PDFs while preserving their page sizes. Try two sample files and learn why merged pages can look different.',
    category: 'Organization',
    readTime: '5 min read',
    published: '2026-09-26',
    updated: '2026-09-26',
    tool: 'merge-pdf',
    relatedTools: ['split-pdf', 'rotate-pdf', 'image-to-pdf'],
    summary:
      'A PDF can contain pages of different sizes and orientations. Folio’s Merge PDF copies each source page with its dimensions and rotation intact, so an A4 portrait report can be followed by a US Letter landscape appendix. It does not resize everything to A4 or stretch the page content.',
    sections: [
      {
        title: 'How do I combine portrait and landscape PDFs?',
        text: 'Use the two original sample files below to try a mixed-size merge. The first is an A4 portrait report; the second is a US Letter landscape appendix. Their page labels and dimensions are printed on the page, so you can recognize the result without relying only on its filename. Both are fictional practice documents and contain no customer information.',
        steps: [
          'Save both sample PDFs below. Open Merge PDF and add the two files.',
          'Use the move controls beside the filenames to put a4-portrait-practice.pdf first and letter-landscape-practice.pdf second.',
          'Choose Merge PDFs and inspect both pages in the result preview.',
          'Choose Download PDF. Open the copy and confirm the portrait report appears before the landscape appendix, with no clipped text or stretched page content.',
        ],
        links: [
          { label: 'Open the A4 portrait practice PDF', href: '/samples/a4-portrait-practice.pdf' },
          {
            label: 'Open the US Letter landscape practice PDF',
            href: '/samples/letter-landscape-practice.pdf',
          },
          { label: 'Combine the samples in Merge PDF', href: '/merge-pdf' },
        ],
      },
      {
        title: 'What page sizes should the merged PDF contain?',
        text: 'The output should have two pages with the dimensions shown below. PDF page dimensions use points, with 72 points per inch. These are the dimensions of our generated samples; other A4 exports may differ slightly because of rounding. A landscape page can also be stored as a portrait-sized page with a rotation setting. Preserving that setting keeps its displayed orientation.',
        table: {
          caption: 'Expected page dimensions when merging the supplied practice PDFs',
          columns: ['Output page', 'Paper and orientation', 'PDF width × height'],
          rows: [
            {
              name: '1 — Portrait report',
              cells: ['A4 portrait: approximately 210 × 297 mm', '595.28 × 841.89 points'],
            },
            {
              name: '2 — Landscape appendix',
              cells: ['US Letter landscape: 11 × 8.5 inches', '792 × 612 points'],
            },
          ],
        },
      },
      {
        title: 'Why do the pages look different after merging?',
        text: 'A PDF viewer can fit each page to the available screen width, making two different paper sizes appear equally wide at different zoom levels. A continuous-page viewer may instead show the landscape page extending farther sideways. Neither appearance by itself proves that content was resized. Inspect the page dimensions in a reader that exposes them and compare the text at the same zoom. If a page is genuinely sideways in the source, correct it with Rotate PDF before merging. Rotation changes orientation; it does not convert Letter paper into A4.',
        links: [{ label: 'Correct sideways pages with Rotate PDF', href: '/rotate-pdf' }],
      },
      {
        title: 'What if every page must be A4?',
        text: 'Merging and resizing are separate tasks. Folio’s PDF merger preserves the original sizes and does not offer an A4 normalization setting. If a recipient requires uniform pages, exporting each source document to A4 in the application that created it is usually the clearest starting point. When your source files are images, Image to PDF has an A4 option that centers each picture on a portrait sheet with margins. Avoid converting an existing text PDF into images merely to make the page sizes match: that replaces selectable text with pixels.',
        links: [
          {
            label: 'Choose fitted or A4 pages for image files',
            href: '/guides/how-to-combine-images-into-pdf',
          },
        ],
      },
      {
        title: 'What else should I check before sending a merged file?',
        text: 'Check document order, duplicate cover sheets, cropped page edges and the total page count. Merge PDF adds every page from each input; use Split PDF first if you only need a selection. Keep certificate-signed documents and interactive forms in their original files when verification or form behavior matters, because copying pages can change those properties. This standalone merge workflow is free, requires no sign-in, and processes document contents in your browser. It accepts up to 20 files, 50 MB per file and 150 MB per batch; opening the result in the editor uses private cloud saving.',
        links: [
          {
            label: 'Extract only the pages you need before merging',
            href: '/guides/extract-nonconsecutive-pdf-pages',
          },
        ],
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
    updated: '2026-09-26',
    tool: 'merge-pdf',
    relatedTools: ['split-pdf', 'organize-pdf'],
    sections: [
      {
        title: 'Build one useful document',
        text: 'Merging works well when the recipient needs several pieces of information together: a proposal with its appendix, a portfolio with a cover, or a group of receipts for one project. Add at least two PDFs to Merge PDF. Use the up and down controls to set the file order before processing. Folio preserves each page’s dimensions, so a landscape chart can sit beside a portrait report.',
        links: [
          {
            label: 'Try a mixed-size merge with A4 and Letter sample files',
            href: '/guides/merge-pdfs-different-page-sizes',
          },
        ],
      },
      {
        title: 'Check the details before combining',
        text: 'Open the originals and check for duplicates, blank pages, and outdated versions. Think about which document should introduce the rest. Combining pages can change the behavior of interactive forms and invalidate existing cryptographic signatures. Keep original signed documents and forms separately when those properties matter. A merged copy is useful for reading, but it should not replace an original whose signature must remain verifiable.',
      },
      {
        title: 'Extract a useful section',
        text: 'Split PDF can export a range to one new PDF or put each selected page in a separate PDF inside a ZIP. Enter a range such as 1-3, 5, 8-10. Page numbers refer to the position in the file, not necessarily a number printed on the page. A report with an unnumbered cover may have printed page 1 at file position 2. Preview the document to make sure your selection matches what you intend to share.',
        links: [
          {
            label: 'Practice nonconsecutive page selection and custom order',
            href: '/guides/extract-nonconsecutive-pdf-pages',
          },
        ],
      },
      {
        title: 'Make the final copy easy to recognize',
        text: 'After downloading, open the result and confirm the first page, last page, and total page count. Give the file a clear name describing its contents. The source files remain on your device and are not changed. You can continue in the Folio editor to add a note or adjust the order further without manually uploading the result again.',
      },
    ],
  },
  {
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
    readTime: '4 min read',
    published: '2026-09-15',
    updated: '2026-09-26',
    tool: 'pdf-to-png',
    relatedTools: ['pdf-to-jpg', 'pdf-to-text', 'compress-images'],
    summary:
      'For a 300 DPI PNG, choose PDF to PNG, select the pages, and set Resolution to Print — 300 DPI. A US Letter portrait page becomes 2550 × 3300 pixels. One page downloads as an image; multiple pages download in a ZIP. Higher resolution increases pixel dimensions but cannot repair a blurred source scan.',
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
        title: 'How do I export a PDF to PNG at 300 DPI?',
        text: 'Open PDF to PNG and choose your PDF. Set Pages if you only need a selection, then set Resolution to Print — 300 DPI and choose Convert to PNG. Folio writes the chosen resolution into the exported image metadata as well as rendering the corresponding pixel dimensions. The table shows the output for an 8.5 × 11 inch US Letter portrait page. A page with a different physical size produces different dimensions at the same DPI.',
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
        links: [{ label: 'Export selected PDF pages as PNG images', href: '/pdf-to-png' }],
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
    readTime: '4 min read',
    published: '2026-09-15',
    updated: '2026-09-26',
    tool: 'image-to-pdf',
    relatedTools: ['jpg-to-pdf', 'png-to-pdf', 'merge-images', 'compress-images'],
    sections: [
      {
        title: 'Prepare pictures that belong together',
        text: 'Combining images into one PDF is useful for a set of receipts, project photographs, or screenshots that someone should read in order. Open Image to PDF for a mixed group of JPG, PNG, and WEBP files, or choose a format-specific tool for JPG or PNG. Each image becomes a separate page. Check that every picture is readable before adding it; packaging a blurred receipt inside a PDF will not make its details clearer.',
      },
      {
        title: 'How do I combine receipt photos into one PDF?',
        text: 'For an expense packet, collect clear pictures of the receipts and put them in the order the reviewer expects, such as purchase date. Keep totals, dates and merchant names visible; crop empty desk space in your device’s image editor before importing. Folio combines the pictures but does not verify expenses, automatically crop receipts, or recognize their text.',
        steps: [
          'Save each receipt as JPG, PNG or WEBP. If your phone saved HEIC files, convert them to a supported format first.',
          'Open Image to PDF, add the receipt pictures, and move them into the required order.',
          'Choose A4 — centered with margins for consistent portrait paper, or Fit each image to preserve each picture’s proportions.',
          'Choose Create PDF, check that every amount and date is readable, then download the finished packet.',
        ],
        links: [{ label: 'Combine receipt photos with Image to PDF', href: '/image-to-pdf' }],
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

// Search titles describe the actual task and omit branding; the layout adds Folio once.
export const toolSearchTitles: Record<string, string> = {
  'invoice-generator': 'Free Invoice Generator — Create & Download Invoice PDFs',
  'edit-pdf': 'Free Online PDF Editor — Add Text, Annotate & Sign',
  'edit-pdf-text': 'Edit PDF Text Online for Free — Change Original Text',
  'protect-pdf': 'Password Protect PDF for Free — AES-256 Encryption',
  'merge-pdf': 'Merge PDF Online — Combine PDF Files for Free',
  'compress-pdf': 'Compress PDF Online — Reduce File Size for Free',
  'split-pdf': 'Split PDF Online for Free — Extract & Separate Pages',
  'rotate-pdf': 'Rotate PDF Pages Online for Free',
  'organize-pdf': 'Organize PDF Pages for Free — Reorder, Delete & Duplicate',
  'watermark-pdf': 'Add a Watermark to PDF Online for Free',
  'page-numbers': 'Add Page Numbers to PDF Online for Free',
  'crop-pdf': 'Crop PDF Online — Adjust Page Margins for Free',
  'pdf-to-jpg': 'Free PDF to JPG Converter — Export Pages as Images',
  'pdf-to-png': 'Free PDF to PNG Converter — Export High-Resolution Images',
  'image-to-pdf': 'Free Image to PDF Converter — Combine JPG, PNG & WEBP',
  'pdf-to-text': 'Free PDF to Text Converter — Extract Selectable Text',
  'sign-pdf': 'Sign PDF Online for Free — Draw, Type or Upload',
  'signature-generator': 'Free Signature Generator — Download a Transparent PNG',
  'create-pdf-form': 'Create Fillable PDF Forms Online for Free',
  'jpg-to-webp': 'Free JPG to WebP Converter — Resize & Convert in Batches',
  'webp-to-jpg': 'Free WebP to JPG Converter — Convert Images in Batches',
  'compress-images': 'Free Image Compressor — Compress JPG, PNG & WebP to KB',
  'enhance-image': 'Free Image Enhancer — Adjust Brightness & Sharpness',
  'jpg-to-pdf': 'Free JPG to PDF Converter — Combine Photos into a PDF',
  'png-to-pdf': 'Free PNG to PDF Converter — Screenshots & Graphics',
  'merge-images': 'Merge Images into One PDF — Arrange & Combine',
  'create-qr-code': 'Free QR Code Generator — Download PNG or SVG',
  'url-shortener': 'Free URL Shortener — Custom Links & Editable Destinations',
};

// Search snippets are concise summaries of the actual tool, not a keyword list.
// Keep the visible instructions and product limits in the catalog as the source of truth.
export const toolSearchDescriptions: Record<string, string> = {
  'invoice-generator':
    'Create a free invoice PDF with your logo, line items, tax and discounts. Choose any design and download without a watermark. Sign in to save drafts.',
  'edit-pdf':
    'Edit PDFs online for free. Add text, highlights, images and signatures, then download without a Folio watermark. Guest editor files save privately for 24 hours.',
  'edit-pdf-text':
    'Change existing PDF text for free. Edit supported text blocks, adjust fonts and colors, or find and replace words. Preview your edits before downloading.',
  'protect-pdf':
    'Password protect a PDF for free with AES-256 encryption. Create a copy that requires a password to open. Supports unsigned PDFs up to 10 MB and 100 pages.',
  'merge-pdf':
    'Merge PDF files for free without signing in. Arrange your files, preserve page sizes and combine them in your browser. Download one PDF in your chosen order.',
  'compress-pdf':
    'Compress PDF structure for free without lowering image resolution. Compare file sizes and download the result. Already optimized PDFs may not get smaller.',
  'split-pdf':
    'Split a PDF for free in your browser. Extract selected pages in your chosen order, or download each page as a separate PDF in a ZIP. No sign-up needed.',
  'rotate-pdf':
    'Rotate PDF pages online for free by 90, 180 or 270 degrees. Fix one sideways page or a selected range and save the rotation in your downloaded PDF.',
  'organize-pdf':
    'Organize PDF pages for free in a visual editor. Reorder, rotate, delete or duplicate pages, add a blank page and download your updated document.',
  'watermark-pdf':
    'Add a text watermark to a PDF for free. Choose the wording, size, color and opacity, apply it to selected pages and download a marked copy.',
  'page-numbers':
    'Add page numbers to a PDF for free. Choose your starting number and page range, skip a cover page and download a PDF with numbered footers.',
  'crop-pdf':
    'Crop PDF margins online for free. Set the visible page area, apply it to selected pages and download a copy. Cropping is not secure content removal.',
  'pdf-to-jpg':
    'Convert PDF pages to JPG images for free. Select pages and resolution, preview the output and download images from your browser without signing in.',
  'pdf-to-png':
    'Convert PDF pages to PNG for free at up to 300 DPI. Choose the pages and resolution, then download crisp images for documents, screenshots or printing.',
  'image-to-pdf':
    'Convert JPG, PNG and WebP images into one PDF for free. Arrange photos, choose A4 or fit-to-image pages, preview the document and download in your browser.',
  'pdf-to-text':
    'Extract selectable text from PDF pages into a free TXT download. Process files in your browser without signing in. Image-only scans require OCR elsewhere.',
  'sign-pdf':
    'Sign a PDF online for free. Draw, type or upload a signature, place it on your document and download a copy. Visual signatures do not include a certificate.',
  'signature-generator':
    'Create a free signature PNG with a transparent background. Draw, type or remove white paper from a signature image. No account or signature upload required.',
  'create-pdf-form':
    'Create fillable PDF forms for free. Add text fields, checkboxes and dropdowns to your PDF, then download editable fields or flatten the completed form.',
  'jpg-to-webp':
    'Convert JPG to WebP for free in your browser. Adjust quality and dimensions, compare previews and file sizes, then download images individually or as a ZIP.',
  'webp-to-jpg':
    'Convert WebP to JPG for free without uploading images. Set quality and dimensions, then download individual files or a ZIP. Transparent areas become white.',
  'compress-images':
    'Compress JPG, PNG and WebP to 20 KB, 50 KB, 100 KB or a custom limit. Review quality and dimensions, then download files or a ZIP for free. No image uploads.',
  'enhance-image':
    'Enhance photos for free with brightness, contrast, saturation and sharpness controls. Compare the exported pixels with your original. No AI upscaling.',
  'jpg-to-pdf':
    'Turn JPG photos into a PDF for free. Arrange the images, choose A4 or fit-to-image pages, preview the result and download without signing in.',
  'png-to-pdf':
    'Convert PNG screenshots and graphics into a PDF for free. Put images in order, choose the page size, preview each page and download your document.',
  'merge-images':
    'Combine JPG, PNG and WebP images into one PDF for free, with one image per page. Arrange mixed formats and download your document. This is not a collage maker.',
  'create-qr-code':
    'Generate a free QR code for a URL, text or Wi-Fi network. Choose colors and download PNG or SVG. Static codes have no tracking redirect or Folio expiry.',
  'url-shortener':
    'Create free short URLs with custom aliases, editable destinations and QR downloads. Sign in to save and manage up to 1,000 links in your account.',
};

export function toolSearchTitle(tool: { slug: string; name: string; available: boolean }) {
  const title = toolSearchTitles[tool.slug] || `${tool.name} Online`;
  return tool.available ? title : `${tool.name} Online — Coming Soon`;
}

export function toolSearchDescription(tool: {
  slug: string;
  name: string;
  description: string;
  available: boolean;
}) {
  return tool.available
    ? toolSearchDescriptions[tool.slug] || tool.description
    : `${tool.name} is not currently available. Explore the working PDF, image and document tools in the tool directory.`;
}

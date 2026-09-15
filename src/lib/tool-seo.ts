// Search titles describe the actual task and omit branding; the layout adds Folio once.
export const toolSearchTitles: Record<string, string> = {
  'edit-pdf': 'Edit PDF Online — Add Text, Annotate & Sign',
  'edit-pdf-text': 'Edit Text in a PDF Online — Change Original Text',
  'protect-pdf': 'Password Protect PDF Online — AES-256 Encryption',
  'merge-pdf': 'Merge PDF Online — Combine PDF Files for Free',
  'compress-pdf': 'Compress PDF Online — Reduce File Size for Free',
  'split-pdf': 'Split PDF Online — Extract Pages & Separate Files',
  'rotate-pdf': 'Rotate PDF Pages Online for Free',
  'organize-pdf': 'Organize PDF Pages — Reorder, Delete & Duplicate',
  'watermark-pdf': 'Add a Watermark to PDF Online for Free',
  'page-numbers': 'Add Page Numbers to PDF Online for Free',
  'crop-pdf': 'Crop PDF Online — Adjust Page Margins for Free',
  'pdf-to-jpg': 'PDF to JPG Converter — Export Pages as Images',
  'pdf-to-png': 'PDF to PNG Converter — Export High-Resolution Images',
  'image-to-pdf': 'Image to PDF Converter — Combine JPG, PNG & WEBP',
  'pdf-to-text': 'PDF to Text Converter — Extract Selectable Text',
  'sign-pdf': 'Sign PDF Online — Draw, Type or Upload a Signature',
  'create-pdf-form': 'Create Fillable PDF Forms Online for Free',
  'jpg-to-webp': 'JPG to WEBP Converter — Adjust Quality & Dimensions',
  'webp-to-jpg': 'WEBP to JPG Converter — Convert Images for Free',
  'compress-images': 'Compress Images Online — JPG, PNG & WEBP',
  'enhance-image': 'Enhance Images — Adjust Brightness, Color & Sharpness',
  'jpg-to-pdf': 'JPG to PDF Converter — Combine Photos into a PDF',
  'png-to-pdf': 'PNG to PDF Converter — Turn Images into PDF Pages',
  'merge-images': 'Merge Images into One PDF — Arrange & Combine',
  'create-qr-code': 'Free QR Code Generator — Download PNG or SVG',
  'translate-pdf': 'Translate PDF Online — Preview Translated Pages',
  'pdf-to-word': 'PDF to Word Converter — Convert PDF to DOCX',
  'pdf-to-excel': 'PDF to Excel Converter — Convert PDF to XLSX',
  'pdf-to-powerpoint': 'PDF to PowerPoint Converter — Convert PDF to PPTX',
};

export function toolSearchTitle(tool: { slug: string; name: string; available: boolean }) {
  const title = toolSearchTitles[tool.slug] || `${tool.name} Online`;
  return tool.available ? title : `${tool.name} Online — Coming Soon`;
}

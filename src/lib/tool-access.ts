/**
 * Access to finished downloads, never to editing or previews.
 * Server export endpoints still verify the subscription independently.
 * Planned tools belong in docs/TOOL-ACCESS.md until they are implemented.
 */
export type ToolDownloadAccess = 'free' | 'premium' | 'mixed';

export const premiumDownloads = {
  'edit-pdf-text': {
    reason:
      'This document includes changes to original PDF text. Downloading those changes requires a premium plan. Added text, annotations, forms, and signatures on their own stay free.',
    format: 'PDF',
  },
  'protect-pdf': {
    reason:
      'Downloading a PDF with password protection requires a premium plan. You can keep your original file and change the password settings before downloading.',
    format: 'PDF',
  },
  'translate-pdf': {
    reason:
      'Downloading your translated document requires a premium plan. You can review the translated pages and change languages before downloading.',
    format: 'PDF',
  },
  'pdf-to-word': {
    reason:
      'Downloading your converted Word document requires a premium plan. Converting PDF pages to images or extracting selectable text stays free.',
    format: 'Word document',
  },
  'pdf-to-excel': {
    reason:
      'Downloading your converted Excel spreadsheet requires a premium plan. Converting PDF pages to images or extracting selectable text stays free.',
    format: 'Excel spreadsheet',
  },
  'pdf-to-powerpoint': {
    reason:
      'Downloading your converted PowerPoint presentation requires a premium plan. Converting PDF pages to images or extracting selectable text stays free.',
    format: 'PowerPoint presentation',
  },
} as const;
export type PremiumDownloadTool = keyof typeof premiumDownloads;

const freeTools = [
  'merge-pdf',
  'compress-pdf',
  'split-pdf',
  'rotate-pdf',
  'organize-pdf',
  'watermark-pdf',
  'page-numbers',
  'crop-pdf',
  'pdf-to-jpg',
  'pdf-to-png',
  'image-to-pdf',
  'pdf-to-text',
  'sign-pdf',
  'create-pdf-form',
  'jpg-to-webp',
  'webp-to-jpg',
  'compress-images',
  'enhance-image',
  'jpg-to-pdf',
  'png-to-pdf',
  'merge-images',
  'create-qr-code',
] as const;

const downloadAccess = new Map<string, ToolDownloadAccess>([
  ...freeTools.map((slug): [string, ToolDownloadAccess] => [slug, 'free']),
  ...Object.keys(premiumDownloads).map((slug): [string, ToolDownloadAccess] => [slug, 'premium']),
  ['edit-pdf', 'mixed'],
]);

export function toolDownloadAccess(slug: string): ToolDownloadAccess {
  const access = downloadAccess.get(slug);
  // A new tool must make an explicit access decision before joining the catalogue.
  if (!access) throw new Error(`Missing download policy for tool: ${slug}`);
  return access;
}

export function availablePremiumToolNames(
  catalog: ReadonlyArray<{ slug: string; name: string; available: boolean }>,
): string[] {
  return catalog
    .filter((tool) => tool.available && toolDownloadAccess(tool.slug) === 'premium')
    .map((tool) => tool.name);
}

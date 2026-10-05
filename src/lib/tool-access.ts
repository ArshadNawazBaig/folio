import { FREE_LAUNCH } from './access-policy';
/**
 * Access to finished downloads, never to editing or previews.
 * Server export endpoints still verify the subscription independently.
 * Planned tools belong in docs/TOOL-ACCESS.md until they are implemented.
 */
export type ToolDownloadAccess = 'free' | 'premium' | 'mixed';

export const premiumDownloads = {
  'invoice-generator': {
    reason:
      'Premium invoice templates, custom brand colors, payment QR codes, and custom footers require a premium plan at download. Classic and Minimal invoices with preset colors stay free, including logos, taxes, discounts, and deposits.',
    format: 'invoice PDF',
  },
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
  'signature-generator',
  'create-pdf-form',
  'jpg-to-webp',
  'webp-to-jpg',
  'compress-images',
  'enhance-image',
  'jpg-to-pdf',
  'png-to-pdf',
  'merge-images',
  'create-qr-code',
  'url-shortener', // QR downloads are free; account features have separate server-enforced entitlements.
] as const;

const downloadAccess = new Map<string, ToolDownloadAccess>([
  ...freeTools.map((slug): [string, ToolDownloadAccess] => [slug, 'free']),
  ...Object.keys(premiumDownloads).map((slug): [string, ToolDownloadAccess] => [slug, 'premium']),
  ['edit-pdf', 'mixed'],
  ['invoice-generator', 'mixed'],
]);

export function toolDownloadAccess(slug: string): ToolDownloadAccess {
  const access = downloadAccess.get(slug);
  // A new tool must make an explicit access decision before joining the catalogue.
  if (!access) throw new Error(`Missing download policy for tool: ${slug}`);
  return FREE_LAUNCH ? 'free' : access;
}

export function availablePremiumToolNames(
  catalog: ReadonlyArray<{ slug: string; name: string; available: boolean }>,
): string[] {
  return catalog
    .filter((tool) => tool.available && toolDownloadAccess(tool.slug) === 'premium')
    .map((tool) => tool.name);
}

import type { ToolSummary } from './tool-summary';

// Each tool has one home in the catalog. These are navigation groups, not extra
// keyword landing pages; each link goes to the tool's existing canonical route.
export const toolCollections = [
  {
    id: 'pdf-editing',
    title: 'PDF editing & organization',
    slugs: [
      'edit-pdf',
      'edit-pdf-text',
      'merge-pdf',
      'split-pdf',
      'compress-pdf',
      'organize-pdf',
      'rotate-pdf',
      'crop-pdf',
      'watermark-pdf',
      'page-numbers',
      'protect-pdf',
    ],
  },
  {
    id: 'conversion',
    title: 'PDF & image conversion',
    slugs: [
      'pdf-to-jpg',
      'pdf-to-png',
      'pdf-to-text',
      'image-to-pdf',
      'jpg-to-pdf',
      'png-to-pdf',
      'merge-images',
    ],
  },
  {
    id: 'images',
    title: 'Image compression & editing',
    slugs: ['compress-images', 'enhance-image', 'jpg-to-webp', 'webp-to-jpg'],
  },
  {
    id: 'signatures',
    title: 'Signatures & PDF forms',
    slugs: ['signature-generator', 'sign-pdf', 'create-pdf-form'],
  },
  {
    id: 'invoices',
    title: 'Invoice creation',
    slugs: ['invoice-generator'],
  },
  {
    id: 'links',
    title: 'Short links & QR codes',
    slugs: ['url-shortener', 'create-qr-code'],
  },
];

export function availableToolCollections(catalog: ToolSummary[]) {
  const available = new Map(
    catalog.filter((tool) => tool.available).map((tool) => [tool.slug, tool]),
  );
  return toolCollections
    .map((collection) => ({
      ...collection,
      tools: collection.slugs.flatMap((slug) => {
        const tool = available.get(slug);
        return tool ? [tool] : [];
      }),
    }))
    .filter((collection) => collection.tools.length > 0);
}

// Useful next steps, in reading order. Avoid suggesting password protection to
// someone making a QR code simply because both used to share a catch-all category.
export const toolNextSteps: Record<string, string[]> = {
  'invoice-generator': ['create-qr-code', 'signature-generator', 'merge-pdf'],
  'url-shortener': ['create-qr-code', 'invoice-generator'],
  'create-qr-code': ['url-shortener', 'invoice-generator'],
  'jpg-to-webp': ['compress-images', 'webp-to-jpg', 'enhance-image'],
  'webp-to-jpg': ['compress-images', 'jpg-to-webp', 'jpg-to-pdf'],
  'compress-images': ['jpg-to-webp', 'webp-to-jpg', 'image-to-pdf'],
  'enhance-image': ['compress-images', 'jpg-to-webp', 'image-to-pdf'],
  'merge-images': ['image-to-pdf', 'compress-images', 'organize-pdf'],
  'jpg-to-pdf': ['image-to-pdf', 'png-to-pdf', 'merge-pdf'],
  'png-to-pdf': ['image-to-pdf', 'jpg-to-pdf', 'merge-pdf'],
  'image-to-pdf': ['jpg-to-pdf', 'png-to-pdf', 'compress-images'],
  'signature-generator': ['sign-pdf', 'create-pdf-form', 'invoice-generator'],
};

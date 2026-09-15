import type { Tool } from './tools';

const imageTools = [
  [
    'jpg-to-webp',
    'JPG to WEBP',
    'Smaller images, ready for the web.',
    'Convert JPG photos to WEBP with adjustable quality and dimensions.',
    'image/jpeg',
    'Convert to WEBP',
  ],
  [
    'webp-to-jpg',
    'WEBP to JPG',
    'An image that opens everywhere.',
    'Convert WEBP images to JPG. Preview the result and choose quality and dimensions.',
    'image/webp',
    'Convert to JPG',
  ],
  [
    'compress-images',
    'Compress images',
    'Keep the detail. Lighten the file.',
    'Reduce JPG, PNG and WEBP file sizes with adjustable quality and optional resizing. Compare the result before downloading.',
    'image/jpeg,image/png,image/webp',
    'Compress images',
  ],
  [
    'enhance-image',
    'Enhance image',
    'A clearer view of your image.',
    'Adjust brightness, contrast, saturation and sharpness. Compare your changes with the original before exporting.',
    'image/jpeg,image/png,image/webp',
    'Apply adjustments',
  ],
] as const;

export const nativeTools: Tool[] = [
  ...imageTools.map(([slug, name, short, description, accept, action]): Tool => ({
    slug,
    name,
    short,
    description,
    accept,
    action,
    processor: 'image',
    category: 'Convert',
    icon: slug === 'enhance-image' ? 'enhance' : 'image',
    color: 'sage',
    available: true,
    steps: [
      'Choose your images.',
      'Adjust the settings and review the result.',
      'Download individual images or the complete batch.',
    ],
    detail:
      slug === 'enhance-image'
        ? 'Make tonal and sharpening adjustments to an image at its original resolution. These controls do not reconstruct missing details or perform AI super-resolution. Your preview uses the actual exported pixels.'
        : 'Process up to 20 JPG, PNG or WEBP images in one batch. Choose output dimensions and compare the file sizes. JPG uses a white background for transparent areas. PNG encoding is lossless; JPG and WEBP quality settings use lossy compression.',
    faq: [
      [
        'Can I check the result first?',
        'Yes. Switch between the original and result, inspect the dimensions and file size, and change settings before downloading.',
      ],
      [
        'Will compression always make a smaller file?',
        'No. Already optimized images may not shrink. When the format and dimensions are unchanged, the compression tool keeps the smaller original instead of increasing its size.',
      ],
    ],
    keywords: [slug, 'image', 'photo', 'picture', 'resize', 'quality'],
  })),
  ...[
    ['jpg-to-pdf', 'JPG to PDF', 'image/jpeg'],
    ['png-to-pdf', 'PNG to PDF', 'image/png'],
    ['merge-images', 'Merge images', 'image/jpeg,image/png,image/webp'],
  ].map(([slug, name, accept]): Tool => ({
    slug,
    name,
    accept,
    processor: 'image-to-pdf',
    short: 'Bring your pictures into one document.',
    description: `Create a PDF from your images. Arrange them in order, choose a page size, and review the finished PDF before downloading.`,
    action: 'Create PDF',
    category: 'Convert',
    icon: 'image-plus',
    color: 'orange',
    available: true,
    steps: [
      'Choose your images.',
      'Arrange the order and choose a page size.',
      'Review and download the finished PDF.',
    ],
    detail:
      'Each image becomes a separate PDF page. Fit-to-image retains its proportions at 96 pixels per inch; A4 centers the image with margins. Ordinary JPG and PNG images retain their source image data. WEBP images and JPEGs with orientation metadata are decoded to PNG before embedding, so photos appear the right way up.',
    faq: [
      [
        'Can I change the order?',
        'Yes. Use the move controls beside each image. The preview shows the actual PDF in your chosen order.',
      ],
      [
        'Does this recognize text in photos?',
        'No. The PDF contains images. A searchable text layer requires OCR.',
      ],
    ],
    keywords: ['photos', 'pictures', 'combine images', 'jpg', 'png', 'webp'],
  })),
  {
    slug: 'create-qr-code',
    name: 'Create QR code',
    short: 'A small square. A useful connection.',
    description:
      'Create a QR code for a website, plain text or Wi-Fi network. Customize its colors and download a sharp PNG or scalable SVG.',
    category: 'More possibilities',
    icon: 'qr',
    color: 'blue',
    available: true,
    action: 'Create QR code',
    processor: 'qr',
    steps: [
      'Choose a website, text or Wi-Fi network.',
      'Customize colors and review the QR code.',
      'Download PNG or SVG and test it with your camera.',
    ],
    detail:
      'Create static QR codes with no tracking redirect or expiry imposed by Folio. Codes include a clear quiet zone and use strong error correction. Colors must have enough contrast for reliable scanning. Wi-Fi codes contain the network password, so share them only with people who should have access.',
    faq: [
      [
        'Do these QR codes expire?',
        'Folio does not impose an expiry. Website codes continue to work while the destination address remains available.',
      ],
      [
        'Which format should I use?',
        'PNG works well on screens and in documents. SVG stays sharp at any print size. Always test the exported code before printing a large batch.',
      ],
    ],
    keywords: ['qr', 'barcode', 'wifi', 'link', 'url', 'scan'],
  },
];

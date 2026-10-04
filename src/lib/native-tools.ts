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
    'Image compressor',
    'Keep the detail. Lighten the file.',
    'Compress JPG, PNG and WebP images to 20 KB, 50 KB, 100 KB or a custom size. Free batch downloads, with images processed locally and never saved by Folio.',
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
    steps:
      slug === 'compress-images'
        ? [
            'Choose a target file size and output format.',
            'Add your images and select Compress images. Review sizes, dimensions, and previews.',
            'Download individual images or the batch as a ZIP, then clear the tool.',
          ]
        : [
            'Choose your images.',
            'Adjust the settings and review the result.',
            'Download individual images or the complete batch.',
          ],
    detail:
      slug === 'compress-images'
        ? 'Choose 10, 15, 20, 30, 40, 50, 100, 200 or 500 KB, 1 MB, or apply a custom KB limit. The compressor adjusts quality and, when needed, dimensions to meet the target. Auto compares supported formats while preserving transparency; choose JPG, PNG, or WebP when a website requires it. Images stay in your current tab, with no uploads, account requirement, or saved library. Review small text and required dimensions before using the result.'
        : slug === 'enhance-image'
          ? 'Make tonal and sharpening adjustments to an image at its original resolution. These controls do not reconstruct missing details or perform AI super-resolution. Your preview uses the actual exported pixels.'
          : 'Process up to 20 JPG, PNG or WEBP images in one batch. Choose output dimensions and compare the file sizes. JPG uses a white background for transparent areas. PNG encoding is lossless; JPG and WEBP quality settings use lossy compression.',
    faq:
      slug === 'compress-images'
        ? [
            [
              'How do I compress an image to 20 KB, 50 KB or 100 KB?',
              'Select that preset, choose an output format, add your images, then select Compress images. Each successful result is at or below the selected limit; the tool may reduce dimensions to get there. Check the final pixel size if an upload form has dimension requirements.',
            ],
            [
              'Can I set a custom image size in KB?',
              'Yes. Enter a number from 1 to 35,000 in Custom size (KB) and select Apply. The current limit updates below the controls. Each KB means 1,000 bytes. A file can be smaller than your limit; it is not padded to match an exact size.',
            ],
            [
              'Does Folio upload or store my images?',
              'No. Compression and previews run in the browser. Images and results remain in the current page’s memory and are not uploaded or written to browser storage. Clear all or refresh to discard the batch. Files you download remain on your device.',
            ],
            [
              'What does Auto output do?',
              'Auto compares supported JPG, PNG, and WebP results at each tested image size and chooses a smaller result that fits the limit. It avoids JPG when the source contains transparency. Select a specific format if an upload form only accepts it.',
            ],
            [
              'Does compression keep image quality and transparency?',
              'A smaller file can involve lower quality or fewer pixels. PNG encoding is lossless, but a smaller target can still reduce its dimensions. PNG and WebP preserve transparency; JPG fills transparent pixels with white. Use Manual settings to keep dimensions and choose quality yourself.',
            ],
            [
              'Which files can I compress?',
              'Add up to 20 JPG/JPEG, PNG, or WebP images, up to 35 MB each and 150 MB for the batch. Decoded images must have no more than 25 million pixels. This tool is for still images; re-encoding an animated file produces a still image.',
            ],
          ]
        : [
            [
              'Can I check the result first?',
              'Yes. Switch between the original and result, inspect the dimensions and file size, and change settings before downloading.',
            ],
            [
              'Will compression always make a smaller file?',
              'No. Already optimized images may not shrink. When the format and dimensions are unchanged, the compression tool keeps the smaller original instead of increasing its size.',
            ],
          ],
    keywords: [
      slug,
      'image',
      'photo',
      'picture',
      'resize',
      'quality',
      ...(slug === 'compress-images'
        ? [
            'image compressor',
            'compress to 20kb',
            '50kb',
            '100kb',
            '200kb',
            'target size',
            'reduce image size',
          ]
        : []),
    ],
  })),
  ...[
    [
      'jpg-to-pdf',
      'JPG to PDF',
      'image/jpeg',
      'Convert JPG photos to PDF for free. Put photos in order, choose A4 or fit-to-image pages, and preview your document before downloading.',
    ],
    [
      'png-to-pdf',
      'PNG to PDF',
      'image/png',
      'Turn PNG screenshots and graphics into PDF pages for free. Arrange your images, choose a page size, then preview and download the PDF.',
    ],
    [
      'merge-images',
      'Merge images',
      'image/jpeg,image/png,image/webp',
      'Merge JPG, PNG and WEBP images into one PDF for free. Combine different formats, reorder the pages and preview the complete document.',
    ],
  ].map(([slug, name, accept, description]): Tool => ({
    slug,
    name,
    accept,
    processor: 'image-to-pdf',
    short: 'Bring your pictures into one document.',
    description,
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
    slug: 'url-shortener',
    name: 'URL shortener',
    short: 'Short links. Ready to share.',
    description:
      'Turn long URLs into short links, save them in your account, and generate QR codes. Custom aliases and editable destinations are included for free.',
    category: 'More possibilities',
    icon: 'link',
    color: 'orange',
    available: true,
    action: 'Shorten link',
    processor: 'shortener',
    steps: [
      'Sign in and paste the destination URL.',
      'Create a random short link or choose a custom alias for free.',
      'Copy your link, download its QR code, or manage it in My links.',
    ],
    detail:
      'Free accounts include 1,000 saved links, custom aliases, and destination changes that keep your short link and QR code working. PNG and SVG QR downloads are included. Your list is private; shared links are public. Deleting a link disables its redirect and QR code. Aliases are permanent and cannot be reused after deletion.',
    faq: [
      [
        'Do I need an account?',
        'Yes. Sign in for free so your links are saved in My links and available across your devices.',
      ],
      [
        'Will my saved links keep working?',
        'Existing links and QR codes keep working, including custom aliases. You can rename or delete links. Custom aliases and destination changes are free; the limit is 1,000 saved links per account.',
      ],
      [
        'Can I change a link after sharing it?',
        'Edit its destination for free from My links. The short URL and QR code stay the same. Titles can be changed too. Aliases cannot be changed.',
      ],
      [
        'Are links private or password protected?',
        'Your dashboard list is private, but anyone with a short URL or QR code can open its destination. Do not use a short link to protect private content.',
      ],
    ],
    keywords: ['url', 'link', 'shorten', 'shortener', 'alias', 'qr', 'share'],
  },
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

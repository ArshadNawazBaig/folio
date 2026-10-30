import type { Guide } from './guides';
import { tutorialInputs as input, toolWorkedResults } from './tutorial-results';
import { tutorialResult } from './tutorial-results';

export const practiceIntro =
  'Fictional English practice files. Names, passwords, and amounts are public examples; use your own private values for real documents. Follow the steps on this page and compare the downloaded results. These examples do not promise identical results for your files.';
const inputs: Record<string, { href: string; label: string }[]> = {
  'edit-pdf': [input.packet],
  'edit-pdf-text': [input.wording],
  'merge-pdf': [input.portrait, input.landscape],
  'split-pdf': [input.packet],
  'compress-pdf': [{ href: '/samples/compression-uncompressed-objects.pdf', label: 'PDF' }],
  'organize-pdf': [input.packet],
  'rotate-pdf': [{ href: '/samples/rotation-practice.pdf', label: 'PDF' }],
  'crop-pdf': [input.portrait],
  'watermark-pdf': [input.packet],
  'page-numbers': [{ href: '/samples/numbering-practice.pdf', label: 'PDF' }],
  'protect-pdf': [input.portrait],
  'pdf-to-jpg': [input.landscape],
  'pdf-to-png': [input.landscape],
  'pdf-to-text': [input.packet],
  'image-to-pdf': [input.receipt, input.screenshot, input.webp],
  'jpg-to-pdf': [input.receipt],
  'png-to-pdf': [input.screenshot],
  'merge-images': [input.receipt, input.screenshot, input.webp],
  'enhance-image': [input.receipt],
  'jpg-to-webp': [input.receipt],
  'webp-to-jpg': [input.webp],
  'compress-images': [input.receipt],
  'signature-generator': [],
  'sign-pdf': [input.master],
  'create-pdf-form': [input.blankForm],
  'invoice-generator': [{ href: '/samples/tutorials/invoice-draft.json', label: 'JSON' }],
  'url-shortener': [input.portrait, input.landscape],
  'create-qr-code': [input.portrait],
};
const facts: Record<string, [string, string][]> = {
  'edit-pdf': [
    ['Expected pages', '6'],
    ['Expected wording', 'Please confirm the material quantities.'],
  ],
  'edit-pdf-text': [
    ['Expected pages', '3'],
    ['Expected wording', 'Venue: Room 7 × 1; Venue: Room 4 × 2; Archive: Room 40'],
  ],
  'merge-pdf': [
    ['Expected pages', '2'],
    ['Page sizes (PDF points)', '595.28 × 841.89; 792 × 612'],
  ],
  'split-pdf': [
    ['Expected pages', '3'],
    ['Source file positions', '6, 2, 3'],
  ],
  'compress-pdf': [
    ['Expected pages', '1'],
    ['Page sizes (PDF points)', '595.28 × 841.89'],
  ],
  'organize-pdf': [
    ['Expected pages', '5'],
    ['Source file positions', '1, 2, 3, 6, 4'],
  ],
  'rotate-pdf': [
    ['Expected pages', '3'],
    ['Page rotation', '0°, 0°, 0°'],
  ],
  'crop-pdf': [
    ['Expected pages', '1'],
    ['Page sizes (PDF points)', '555.28 × 801.89'],
  ],
  'watermark-pdf': [
    ['Expected pages', '6'],
    ['Expected wording', 'DRAFT × 5'],
  ],
  'page-numbers': [
    ['Expected pages', '6'],
    ['Source file positions', '2–6 → 1–5'],
  ],
  'protect-pdf': [
    ['Expected pages', '1'],
    ['Opening password', 'Practice-only-42'],
  ],
  'pdf-to-jpg': [
    ['Pixels', '1584 × 1224'],
    ['Resolution', '144 DPI'],
  ],
  'pdf-to-png': [
    ['Pixels', '3300 × 2550'],
    ['Resolution', '300 DPI'],
  ],
  'pdf-to-text': [
    ['Source file positions', '2, 3'],
    ['Expected wording', 'Summary; Budget; 120; 80; 200'],
  ],
  'image-to-pdf': [
    ['Expected pages', '3'],
    ['Page sizes (PDF points)', '595.28 × 841.89'],
  ],
  'jpg-to-pdf': [
    ['Expected pages', '1'],
    ['Page sizes (PDF points)', '595.28 × 841.89'],
  ],
  'png-to-pdf': [
    ['Expected pages', '1'],
    ['Page sizes (PDF points)', '750 × 525'],
  ],
  'merge-images': [
    ['Expected pages', '3'],
    ['Page sizes (PDF points)', '595.28 × 841.89'],
  ],
  'enhance-image': [
    ['Brightness', '+10'],
    ['Pixels', '1200 × 900'],
  ],
  'jpg-to-webp': [
    ['Output format', 'WebP'],
    ['Pixels', '1200 × 900'],
  ],
  'webp-to-jpg': [
    ['Output format', 'JPG'],
    ['Pixels', '640 × 400'],
  ],
  'compress-images': [
    ['Target size (bytes)', '20000'],
    ['Result size (bytes)', '19968'],
    ['Pixels', '811 × 608'],
  ],
  'signature-generator': [
    ['Your signature', 'Sam Example'],
    ['Output format', 'PNG'],
  ],
  'sign-pdf': [
    ['Your signature', 'Sam Example'],
    ['Expected pages', '1'],
  ],
  'create-pdf-form': [
    ['Expected wording', 'Sam Example'],
    ['Editable form fields', '2 → 2 → 0'],
  ],
  'invoice-generator': [
    ['Subtotal', 'USD 175.00'],
    ['Amount already paid', 'USD 50.00'],
    ['Amount due', 'USD 125.00'],
  ],
  'url-shortener': [
    [
      'Destination',
      'https://thebestfreepdf.com/samples/a4-portrait-practice.pdf → https://thebestfreepdf.com/samples/letter-landscape-practice.pdf',
    ],
  ],
  'create-qr-code': [
    ['Destination', 'https://thebestfreepdf.com/samples/a4-portrait-practice.pdf'],
    ['Pixels', '1024 × 1024'],
  ],
};
export function localizedPractice(slug: string, messages: Record<string, string>) {
  const tr = (text: string, values: Record<string, number> = {}) =>
    (messages[text] ?? text).replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
  const links = (files: { href: string }[], kind: 'Input' | 'Output') =>
    files.map((file, index) => ({
      href: file.href,
      label: `${kind === 'Input' ? tr('Input {number}', { number: index + 1 }) : tr('Output {number}', { number: index + 1 })} · ${file.href.split('.').at(-1)!.toUpperCase()}`,
    }));
  return {
    title: tr('Compare a worked example'),
    text: tr(practiceIntro),
    inputs: links(inputs[slug] || [], 'Input'),
    outputs: links(toolWorkedResults(slug), 'Output'),
    checks: (facts[slug] || []).map(([name, value]) => ({ name: tr(name), value })),
  };
}
export function localizedGuidePractice(guide: Guide, messages: Record<string, string>): Guide {
  const tool = ['does-folio-upload-pdf-files', 'merge-pdfs-different-page-sizes'].includes(
    guide.slug,
  )
    ? 'merge-pdf'
    : guide.slug === 'choose-a-free-pdf-editor'
      ? 'edit-pdf-text'
      : guide.tool;
  const reference = localizedPractice(tool, messages);
  if (guide.slug === 'how-to-merge-and-split-pdfs') {
    const tr = (key: string) => messages[key] ?? key;
    reference.inputs = [
      { href: input.packet.href, label: `${tr('Input {number}').replace('{number}', '1')} · PDF` },
      {
        href: input.landscape.href,
        label: `${tr('Input {number}').replace('{number}', '2')} · PDF`,
      },
    ];
    reference.outputs = [
      {
        href: tutorialResult('four-page-packet.pdf', '').href,
        label: `${tr('Output {number}').replace('{number}', '1')} · PDF`,
      },
    ];
    reference.checks = [
      { name: tr('Expected pages'), value: '4' },
      { name: tr('Source file positions'), value: '6, 2, 3; 1' },
    ];
  }
  if (guide.slug === 'how-to-convert-pdf-to-images') {
    const tr = (key: string) => messages[key] ?? key;
    reference.outputs = [
      {
        href: tutorialResult('landscape-144dpi.jpg', '').href,
        label: `${tr('Output {number}').replace('{number}', '1')} · JPG`,
      },
      {
        href: tutorialResult('landscape-300dpi.png', '').href,
        label: `${tr('Output {number}').replace('{number}', '2')} · PNG`,
      },
    ];
    reference.checks = [
      { name: tr('Pixels'), value: '1584 × 1224; 3300 × 2550' },
      { name: tr('Resolution'), value: '144 DPI; 300 DPI' },
    ];
  }
  if (guide.slug === 'why-cant-i-edit-pdf-text' || guide.slug === 'choose-a-free-pdf-editor') {
    reference.inputs = [
      {
        href: input.diagnostic.href,
        label: `${messages['Input {number}']?.replace('{number}', '1') ?? 'Input 1'} · PDF`,
      },
    ];
    reference.outputs = [];
    reference.checks = [
      {
        name: messages['Source file positions'] ?? 'Source file positions',
        value: '1: Orchard 42; 2: —; 3: Orchard 42',
      },
    ];
  }
  return {
    ...guide,
    updated: '2026-10-31',
    sections: [
      ...guide.sections,
      {
        title: reference.title,
        text: reference.text,
        table: {
          caption: messages['Checks for this example'] ?? 'Checks for this example',
          columns: [messages['Check'] ?? 'Check', messages['Expected result'] ?? 'Expected result'],
          rows: reference.checks.map((row) => ({ name: row.name, cells: [row.value] })),
        },
        links: [
          ...new Map(
            [...reference.inputs, ...reference.outputs].map((file) => [file.href, file]),
          ).values(),
        ],
      },
    ],
  };
}

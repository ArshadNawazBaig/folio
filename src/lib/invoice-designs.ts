type Design = {
  id: string;
  name: string;
  description: string;
  pro: boolean;
  header: 'plain' | 'dark' | 'split' | 'centered' | 'banner' | 'outline' | 'masthead' | 'monogram';
  frame: 'none' | 'side' | 'double' | 'border' | 'top' | 'rail';
  table: 'soft' | 'ruled' | 'dark' | 'striped' | 'grid';
  balance: 'line' | 'filled' | 'outline' | 'soft';
  serif: boolean;
};

/** One catalog drives the picker, preview, PDF, schema, and Pro checks. */
export const invoiceTemplates = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'A confident, familiar layout.',
    pro: false,
    header: 'plain',
    frame: 'none',
    table: 'soft',
    balance: 'line',
    serif: false,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Quiet lines. Plenty of space.',
    pro: false,
    header: 'plain',
    frame: 'none',
    table: 'ruled',
    balance: 'line',
    serif: false,
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'A dark masthead with a bold balance.',
    pro: true,
    header: 'dark',
    frame: 'none',
    table: 'dark',
    balance: 'filled',
    serif: false,
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Serif lettering and a signature side rule.',
    pro: true,
    header: 'plain',
    frame: 'side',
    table: 'ruled',
    balance: 'line',
    serif: true,
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'A split header and a framed total.',
    pro: true,
    header: 'split',
    frame: 'top',
    table: 'dark',
    balance: 'outline',
    serif: false,
  },
  {
    id: 'ledger',
    name: 'Ledger',
    description: 'An orderly grid for detailed billing.',
    pro: true,
    header: 'masthead',
    frame: 'none',
    table: 'grid',
    balance: 'soft',
    serif: false,
  },
  {
    id: 'atelier',
    name: 'Atelier',
    description: 'Centered serif type between fine rules.',
    pro: true,
    header: 'centered',
    frame: 'double',
    table: 'ruled',
    balance: 'outline',
    serif: true,
  },
  {
    id: 'horizon',
    name: 'Horizon',
    description: 'A full-width brand banner and clear totals.',
    pro: true,
    header: 'banner',
    frame: 'none',
    table: 'soft',
    balance: 'filled',
    serif: false,
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'An architectural frame and precise grid.',
    pro: true,
    header: 'outline',
    frame: 'border',
    table: 'grid',
    balance: 'outline',
    serif: false,
  },
  {
    id: 'meridian',
    name: 'Meridian',
    description: 'A broad side rail with alternating rows.',
    pro: true,
    header: 'plain',
    frame: 'rail',
    table: 'striped',
    balance: 'filled',
    serif: false,
  },
  {
    id: 'statement',
    name: 'Statement',
    description: 'A strong top rule and a compact masthead.',
    pro: true,
    header: 'masthead',
    frame: 'top',
    table: 'striped',
    balance: 'soft',
    serif: false,
  },
  {
    id: 'monogram',
    name: 'Monogram',
    description: 'Your initials with an elegant serif title.',
    pro: true,
    header: 'monogram',
    frame: 'none',
    table: 'ruled',
    balance: 'outline',
    serif: true,
  },
] as const satisfies readonly Design[];

export type InvoiceTemplateId = (typeof invoiceTemplates)[number]['id'];
export type InvoiceDesign = (typeof invoiceTemplates)[number];
export const invoiceTemplateIds = invoiceTemplates.map((design) => design.id) as [
  InvoiceTemplateId,
  ...InvoiceTemplateId[],
];
export const proInvoiceDesignCount = invoiceTemplates.filter((design) => design.pro).length;
export function invoiceDesign(id: InvoiceTemplateId): InvoiceDesign {
  return invoiceTemplates.find((design) => design.id === id)!;
}

export function invoiceInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  return (
    words
      .slice(0, 2)
      .map((word) => Array.from(word.replace(/^[^\p{L}\p{N}]+/u, ''))[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'IN'
  );
}

export function invoiceDesignColors(accent: string) {
  const channels = [1, 3, 5].map((index) => parseInt(accent.slice(index, index + 2), 16));
  const luminance = (values: number[]) =>
    values.reduce((total, channel, index) => {
      const value = channel / 255;
      return (
        total +
        (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
          [0.2126, 0.7152, 0.0722][index]
      );
    }, 0);
  const hex = (values: number[]) =>
    '#' + values.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('');
  // Keep decorative brand colors intact, while text stays readable on white.
  let text = channels.slice();
  while (1.05 / (luminance(text) + 0.05) < 4.5)
    text = text.map((channel) => Math.floor(channel * 0.9));
  return {
    accent,
    text: hex(text),
    onAccent: luminance(channels) > 0.179 ? '#000000' : '#ffffff',
    tint: hex(channels.map((channel) => 255 * 0.94 + channel * 0.06)),
  };
}

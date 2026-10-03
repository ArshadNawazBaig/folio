import { translator } from './i18n/translate';
import { z } from 'zod';
import { invoiceTemplates, invoiceTemplateIds } from './invoice-designs';
export { invoiceTemplates } from './invoice-designs';

export const invoiceCurrencies = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  PKR: 2,
  INR: 2,
  AED: 2,
  SAR: 2,
  CAD: 2,
  AUD: 2,
  NZD: 2,
  SGD: 2,
  HKD: 2,
  CHF: 2,
  JPY: 0,
  KRW: 0,
  BDT: 2,
  CNY: 2,
  ZAR: 2,
  NGN: 2,
  BRL: 2,
  MXN: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
} as const;
export type InvoiceCurrency = keyof typeof invoiceCurrencies;
export const invoiceColors = ['#b84b20', '#243f36', '#284867', '#5c4168', '#292929'];
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine(
      // oxlint-disable-next-line no-control-regex -- Reject control bytes in imported invoice text.
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),
      'Remove control characters.',
    );
const decimal = (maximum: number, precision = 4) =>
  z
    .string()
    .max(20)
    .refine(
      (value) =>
        value === '' ||
        (new RegExp(`^\\d+(?:\\.\\d{0,${precision}})?$`).test(value) && Number(value) <= maximum),
      `Enter a positive number up to ${maximum}, with at most ${precision} decimal places.`,
    );
const party = z
  .object({ name: text(120), email: text(160), address: text(500), taxId: text(100) })
  .strict();
const date = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    'Choose a valid date.',
  );
export const invoiceSchema = z
  .object({
    version: z.literal(1),
    number: text(60),
    issued: date,
    due: date,
    reference: text(120),
    currency: z.enum(Object.keys(invoiceCurrencies) as [InvoiceCurrency, ...InvoiceCurrency[]]),
    from: party,
    to: party,
    shipTo: text(500),
    items: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
            description: text(500),
            quantity: decimal(10000),
            rate: decimal(1000000),
            taxable: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    taxMode: z.enum(['none', 'exclusive', 'inclusive']),
    taxLabel: text(30),
    taxRate: decimal(100, 2),
    discountMode: z.enum(['percent', 'fixed']),
    discount: decimal(100000000),
    shipping: decimal(10000000),
    shippingTaxable: z.boolean(),
    paid: decimal(100000000000),
    notes: text(2000),
    terms: text(2000),
    paymentDetails: text(1500),
    paymentUrl: text(500).refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
      } catch {
        return false;
      }
    }, 'Use a full HTTPS payment link.'),
    paymentQr: z.boolean(),
    footer: text(160),
    logo: z
      .string()
      .max(480000)
      .refine(
        (v) => !v || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(v),
        'Choose a PNG or JPG logo.',
      ),
    template: z.enum(invoiceTemplateIds),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    paper: z.enum(['a4', 'letter']),
  })
  .strict()
  .refine(
    (v) => new Set(v.items.map((i) => i.id)).size === v.items.length,
    'Each item must have a unique ID.',
  );
export type Invoice = z.infer<typeof invoiceSchema>;
export type SavedInvoice = {
  id: string;
  document: Invoice;
  revision: number;
  created_at: string;
  updated_at: string;
};
export const invoiceSaveSchema = z.object({ document: invoiceSchema }).strict();
export const invoiceUpdateSchema = z
  .object({ document: invoiceSchema, revision: z.number().int().positive() })
  .strict();

export function newInvoice(today = '2026-01-01'): Invoice {
  return {
    version: 1,
    number: 'INV-001',
    issued: today,
    due: today,
    reference: '',
    currency: 'USD',
    from: { name: '', email: '', address: '', taxId: '' },
    to: { name: '', email: '', address: '', taxId: '' },
    shipTo: '',
    items: [{ id: 'item-1', description: '', quantity: '1', rate: '', taxable: true }],
    taxMode: 'none',
    taxLabel: 'Tax',
    taxRate: '0',
    discountMode: 'percent',
    discount: '0',
    shipping: '0',
    shippingTaxable: false,
    paid: '0',
    notes: '',
    terms: '',
    paymentDetails: '',
    paymentUrl: '',
    paymentQr: false,
    footer: '',
    logo: '',
    template: 'classic',
    accent: invoiceColors[0],
    paper: 'a4',
  };
}
export function localInvoiceDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dueAfter(issued: string, days: number) {
  const date = new Date(`${issued}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function sampleInvoice(today: string): Invoice {
  return {
    ...newInvoice(today),
    due: dueAfter(today, 14),
    from: {
      name: 'North & Form Studio',
      email: 'hello@example.com',
      address: '24 Studio Lane\nPortland, OR 97205',
      taxId: '',
    },
    to: {
      name: 'The Sunday Company',
      email: 'accounts@example.com',
      address: '108 Market Street\nPortland, OR 97209',
      taxId: '',
    },
    reference: 'Brand refresh / Phase 01',
    items: [
      {
        id: 'sample-1',
        description: 'Brand discovery & creative direction',
        quantity: '1',
        rate: '850',
        taxable: true,
      },
      {
        id: 'sample-2',
        description: 'Visual identity design',
        quantity: '12',
        rate: '95',
        taxable: true,
      },
      {
        id: 'sample-3',
        description: 'Brand guidelines & final files',
        quantity: '1',
        rate: '360',
        taxable: true,
      },
    ],
    notes: 'Thank you for trusting us with your next chapter.',
    terms: 'Payment is due within 14 days of the invoice date.',
    paymentDetails: 'Add your payment instructions here before sending.',
  };
}
export function invoiceProFeatures(invoice: Invoice) {
  return [
    ...(invoiceTemplates.find((design) => design.id === invoice.template)?.pro
      ? ['premium template']
      : []),
    ...(!invoiceColors.includes(invoice.accent.toLowerCase()) ? ['custom brand color'] : []),
    ...(invoice.paymentQr ? ['payment QR code'] : []),
    ...(invoice.footer.trim() ? ['custom footer'] : []),
  ];
}
export function freeInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    template: invoiceTemplates.find((design) => design.id === invoice.template)?.pro
      ? 'classic'
      : invoice.template,
    accent: invoiceColors.includes(invoice.accent.toLowerCase())
      ? invoice.accent
      : invoiceColors[0],
    paymentQr: false,
    footer: '',
  };
}
// Integer arithmetic: four decimal places for quantities/rates; round half up at
// the currency's minor unit. Never use floating-point sums for invoice money.
function scaled(value: string, places = 4): bigint {
  if (!/^\d+(?:\.\d*)?$/.test(value)) return 0n;
  const [whole, fraction = ''] = value.split('.');
  return (
    BigInt(whole) * 10n ** BigInt(places) +
    BigInt((fraction + '0'.repeat(places)).slice(0, places) || '0')
  );
}
const round = (value: bigint, divisor: bigint) => (value + divisor / 2n) / divisor;
export function invoiceTotals(invoice: Invoice) {
  const factor = 10n ** BigInt(invoiceCurrencies[invoice.currency]);
  const minor = (value: string) => round(scaled(value) * factor, 10000n);
  const amounts = invoice.items.map((item) =>
    round(scaled(item.quantity) * scaled(item.rate) * factor, 100000000n),
  );
  const subtotal = amounts.reduce((a, b) => a + b, 0n);
  let discount =
    invoice.discountMode === 'percent'
      ? round(subtotal * scaled(invoice.discount), 1000000n)
      : minor(invoice.discount);
  discount = discount > subtotal ? subtotal : discount;
  // Allocate discount proportionally, distributing leftover minor units by
  // largest remainder so taxable and exempt rows add up exactly.
  const allocations = amounts.map((amount) => (subtotal ? (amount * discount) / subtotal : 0n));
  let remainder = discount - allocations.reduce((a, b) => a + b, 0n);
  const order = amounts
    .map((amount, index) => ({ index, remainder: subtotal ? (amount * discount) % subtotal : 0n }))
    .sort((a, b) =>
      a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
    );
  for (const entry of order) {
    if (!remainder) break;
    allocations[entry.index]++;
    remainder--;
  }
  const shipping = minor(invoice.shipping),
    rate = scaled(invoice.taxRate, 2);
  const bases = amounts.map((amount, i) =>
    invoice.items[i].taxable ? amount - allocations[i] : 0n,
  );
  if (invoice.shippingTaxable) bases.push(shipping);
  const tax =
    invoice.taxMode === 'none'
      ? 0n
      : bases.reduce(
          (sum, base) =>
            sum + round(base * rate, invoice.taxMode === 'inclusive' ? 10000n + rate : 10000n),
          0n,
        );
  const total = subtotal - discount + shipping + (invoice.taxMode === 'exclusive' ? tax : 0n);
  const paid = minor(invoice.paid),
    balance = total > paid ? total - paid : 0n,
    credit = paid > total ? paid - total : 0n;
  return {
    amounts: amounts.map(Number),
    subtotal: Number(subtotal),
    discount: Number(discount),
    shipping: Number(shipping),
    tax: Number(tax),
    total: Number(total),
    paid: Number(paid),
    balance: Number(balance),
    credit: Number(credit),
  };
}
export function invoiceMoney(minor: number, currency: InvoiceCurrency) {
  const digits = invoiceCurrencies[currency];
  return `${currency} ${(minor / 10 ** digits).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
export function invoiceIssues(invoice: Invoice, tr = translator()) {
  const issues: string[] = [];
  if (!invoice.number.trim()) issues.push(tr('Add an invoice number.'));
  if (!invoice.from.name.trim()) issues.push(tr('Add your business name.'));
  if (!invoice.to.name.trim()) issues.push(tr('Add your customer’s name.'));
  if (invoice.due < invoice.issued)
    issues.push(tr('The due date cannot be before the invoice date.'));
  for (const [index, item] of invoice.items.entries()) {
    if (!item.description.trim()) issues.push(tr('Describe item {number}.', { number: index + 1 }));
    if (!(Number(item.quantity) > 0))
      issues.push(
        tr('Enter a quantity greater than zero for item {number}.', { number: index + 1 }),
      );
  }
  if (invoice.discountMode === 'percent' && Number(invoice.discount) > 100)
    issues.push(tr('The discount cannot exceed 100%.'));
  if (
    invoice.discountMode === 'fixed' &&
    Number(invoice.discount) * 10 ** invoiceCurrencies[invoice.currency] >
      invoiceTotals(invoice).subtotal
  )
    issues.push(tr('The discount cannot exceed the items subtotal.'));
  if (invoice.paymentQr && !invoice.paymentUrl)
    issues.push(tr('Add a payment link for the QR code, or turn the QR code off.'));
  return issues;
}
export function invoiceFilename(invoice: Invoice, extension = 'pdf') {
  return `invoice-${invoice.number.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'draft'}.${extension}`;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import {
  newInvoice,
  sampleInvoice,
  invoiceTotals,
  invoiceSchema,
  invoiceIssues,
  invoiceProFeatures,
  freeInvoice,
  invoiceMoney,
  dueAfter,
  invoiceSaveSchema,
} from '../src/lib/invoice';
import { createFreeInvoicePdf, renderInvoicePdf } from '../src/lib/invoice-pdf';
import { safeAuthDestination } from '../src/lib/auth-navigation';
import { invoiceTemplates, invoiceDesignColors } from '../src/lib/invoice-designs';

test('invoice totals apply discounts before tax and separate shipping and deposits', () => {
  const invoice = newInvoice('2026-09-29');
  invoice.items = [
    { id: 'a', description: 'Work', quantity: '8', rate: '75', taxable: true },
    { id: 'b', description: 'Deliverable', quantity: '1', rate: '200', taxable: true },
  ];
  Object.assign(invoice, {
    discount: '10',
    taxMode: 'exclusive',
    taxRate: '8',
    shipping: '20',
    paid: '200',
  });
  assert.deepEqual(invoiceTotals(invoice), {
    amounts: [60000, 20000],
    subtotal: 80000,
    discount: 8000,
    shipping: 2000,
    tax: 5760,
    total: 79760,
    paid: 20000,
    balance: 59760,
    credit: 0,
  });
  invoice.shippingTaxable = true;
  assert.equal(invoiceTotals(invoice).tax, 5920);
  invoice.items[1].taxable = false;
  assert.equal(invoiceTotals(invoice).tax, 4480);
});
test('integer money handles inclusive tax, currency precision, fractional hours, and overpayment', () => {
  const invoice = newInvoice('2026-09-29');
  invoice.items[0] = { id: 'a', description: 'Work', quantity: '1', rate: '120', taxable: true };
  Object.assign(invoice, { taxMode: 'inclusive', taxRate: '20', paid: '125' });
  assert.deepEqual(
    {
      tax: invoiceTotals(invoice).tax,
      total: invoiceTotals(invoice).total,
      balance: invoiceTotals(invoice).balance,
      credit: invoiceTotals(invoice).credit,
    },
    { tax: 2000, total: 12000, balance: 0, credit: 500 },
  );
  invoice.taxMode = 'none';
  invoice.items[0].quantity = '2.5';
  invoice.items[0].rate = '0.1';
  assert.equal(invoiceTotals(invoice).subtotal, 25);
  invoice.items[0].rate = '1.005';
  invoice.items[0].quantity = '1';
  assert.equal(invoiceTotals(invoice).subtotal, 101);
  invoice.currency = 'KWD';
  assert.equal(invoiceTotals(invoice).subtotal, 1005);
  assert.equal(invoiceMoney(1005, 'KWD'), 'KWD 1.005');
  invoice.currency = 'JPY';
  assert.equal(invoiceTotals(invoice).subtotal, 1);
  assert.equal(invoiceMoney(1, 'JPY'), 'JPY 1');
  assert.equal(dueAfter('2026-12-29', 7), '2027-01-05');
});
test('discount allocation conserves minor units and exempts the correct items', () => {
  const invoice = newInvoice('2026-09-29');
  invoice.items = [true, false, true].map((taxable, i) => ({
    id: String(i),
    description: 'Item',
    quantity: '1',
    rate: '0.01',
    taxable,
  }));
  Object.assign(invoice, {
    discountMode: 'fixed',
    discount: '0.01',
    taxMode: 'exclusive',
    taxRate: '100',
  });
  assert.deepEqual(
    {
      subtotal: invoiceTotals(invoice).subtotal,
      discount: invoiceTotals(invoice).discount,
      tax: invoiceTotals(invoice).tax,
      total: invoiceTotals(invoice).total,
    },
    { subtotal: 3, discount: 1, tax: 1, total: 3 },
  );
});
test('invoice schemas reject unsafe content, tampered ownership, overflow, and bad dates', () => {
  const invoice = sampleInvoice('2026-09-29');
  assert.equal(invoiceSchema.safeParse(invoice).success, true);
  for (const paymentUrl of [
    'javascript:alert(1)',
    'data:text/html,x',
    'https://user:pass@example.com',
    'http://example.com',
  ])
    assert.equal(invoiceSchema.safeParse({ ...invoice, paymentUrl }).success, false);
  for (const bad of [
    { issued: '2026-02-30' },
    { currency: 'FAKE' },
    { paid: 'Infinity' },
    { items: [] },
    { logo: 'data:image/svg+xml,<svg>' },
    { template: 'hacked' },
    { items: [{ ...invoice.items[0], rate: '1000000000' }] },
  ])
    assert.equal(invoiceSchema.safeParse({ ...invoice, ...bad }).success, false);
  assert.equal(
    invoiceSaveSchema.safeParse({ document: invoice, user_id: 'other', pro: true }).success,
    false,
  );
  assert.ok(invoiceIssues({ ...invoice, due: '2026-01-01' }).length);
  assert.equal(safeAuthDestination('/invoice-generator'), '/invoice-generator');
  assert.equal(safeAuthDestination('/invoice-editor'), '/invoice-editor');
  const invoicePath = '/invoice-editor?invoice=00000000-0000-4000-8000-000000000055';
  assert.equal(safeAuthDestination(`${invoicePath}&redirect=https://example.com`), invoicePath);
  assert.equal(safeAuthDestination('/invoice-editor?invoice=bad'), '/invoice-editor');
  assert.equal(safeAuthDestination('/dashboard?view=invoices'), '/dashboard?view=invoices');
});
test('every premium option is detected and free fallback preserves business data', () => {
  const invoice = {
    ...sampleInvoice('2026-09-29'),
    template: 'studio' as const,
    accent: '#112233',
    footer: 'My company',
    paymentQr: true,
    paymentUrl: 'https://example.com/pay',
  };
  assert.equal(invoiceProFeatures(invoice).length, 4);
  const free = freeInvoice(invoice);
  assert.deepEqual(invoiceProFeatures(free), []);
  assert.deepEqual(free.items, invoice.items);
  assert.deepEqual(invoiceTotals(free), invoiceTotals(invoice));
  assert.equal(free.paymentUrl, invoice.paymentUrl);
});

const fonts = async () => {
  const [regular, bold] = await Promise.all(
    ['Regular', 'Bold'].map((weight) => readFile(`public/fonts/pdf/LiberationSans-${weight}.ttf`)),
  );
  return { regular, bold };
};
async function readPdf(bytes: Uint8Array) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: bytes.slice(), useSystemFonts: true }),
    doc = await loading.promise;
  const texts: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i),
        { items } = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      for (const item of items)
        if ('str' in item && item.str.trim()) {
          assert.ok(
            item.transform[4] >= 0 && item.transform[4] + item.width <= viewport.width + 1,
            `Text exceeds page width: ${item.str}`,
          );
          assert.ok(
            item.transform[5] > 0 && item.transform[5] <= viewport.height,
            `Text exceeds page height: ${item.str}`,
          );
        }
      texts.push(items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    return texts;
  } finally {
    await loading.destroy();
  }
}
test('free PDF exports selectable text and exact totals with no watermark', async () => {
  const invoice = sampleInvoice('2026-09-29');
  const result = await createFreeInvoicePdf(invoice, await fonts());
  const text = (await readPdf(result.bytes)).join(' ');
  assert.match(text, /North & Form Studio/);
  assert.match(text, /The Sunday Company/);
  assert.match(text, /USD 2,350.00/);
  assert.match(text, /Balance due/);
  assert.ok(!text.includes('Folio'));
  assert.equal(result.filename, 'invoice-INV-001.pdf');
  const pdf = await PDFDocument.load(result.bytes);
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 595.28) < 0.01);
  await assert.rejects(
    createFreeInvoicePdf({ ...invoice, template: 'studio' }, await fonts()),
    /Pro/,
  );
});
test('long invoices wrap safely, repeat headers and full footers, and retain the final item and terms', async () => {
  const invoice = sampleInvoice('2026-09-29');
  invoice.paper = 'letter';
  invoice.footer = 'A carefully written footer '.repeat(5).trim();
  invoice.items = Array.from({ length: 50 }, (_, i) => ({
    id: String(i),
    description: `Milestone ${i + 1}: ` + 'Detailed agreed project deliverable. '.repeat(9),
    quantity: '2.5',
    rate: '125.1234',
    taxable: true,
  }));
  invoice.terms = 'Please include the invoice number. '.repeat(50) + 'FINAL_TERMS_MARKER';
  invoice.template = 'editorial';
  const result = await renderInvoicePdf(invoice, await fonts());
  const pages = await readPdf(result.bytes);
  assert.ok(pages.length > 5);
  assert.match(pages.join(' '), /Milestone 50:/);
  assert.match(pages.join(' '), /FINAL_TERMS_MARKER/);
  for (const page of pages) assert.ok(page.includes('carefully written footer'));
  assert.equal((await PDFDocument.load(result.bytes)).getPage(0).getWidth(), 612);
});
test('PDF rejects malformed or oversized logos and unsupported characters without silently dropping them', async () => {
  const invoice = sampleInvoice('2026-09-29');
  invoice.logo = 'data:image/png;base64,aGVsbG8=';
  await assert.rejects(createFreeInvoicePdf(invoice, await fonts()), /logo/);
  invoice.logo = '';
  invoice.from.name = 'Customer 🦊';
  await assert.rejects(createFreeInvoicePdf(invoice, await fonts()), /does not support/);
});

test('payment links remain clickable on every wrapped line of the exported PDF', async () => {
  const invoice = sampleInvoice('2026-09-29');
  invoice.paymentUrl = 'https://example.com/pay?reference=' + 'invoice-'.repeat(45);
  const result = await createFreeInvoicePdf(invoice, await fonts());
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: result.bytes.slice(), useSystemFonts: true });
  const doc = await loading.promise;
  const links: string[] = [];
  try {
    for (let page = 1; page <= doc.numPages; page++) {
      const annotations = await (await doc.getPage(page)).getAnnotations();
      for (const annotation of annotations)
        if (annotation.subtype === 'Link') links.push(annotation.url);
    }
    assert.ok(links.length > 1);
    assert.ok(links.every((url) => url === invoice.paymentUrl));
  } finally {
    await loading.destroy();
  }
});

test('all ten Pro designs validate, require Pro, and preserve invoice data in the free fallback', async () => {
  const premium = invoiceTemplates.filter((design) => design.pro);
  assert.ok(premium.length >= 10);
  assert.equal(new Set(invoiceTemplates.map((design) => design.id)).size, invoiceTemplates.length);
  const invoice = sampleInvoice('2026-09-29'),
    embeddedFonts = await fonts();
  for (const design of premium) {
    const styled = { ...invoice, template: design.id };
    assert.equal(invoiceSchema.safeParse(styled).success, true, design.name);
    assert.ok(invoiceProFeatures(styled).includes('premium template'), design.name);
    await assert.rejects(createFreeInvoicePdf(styled, embeddedFonts), /Pro/);
    const fallback = freeInvoice(styled);
    assert.equal(fallback.template, 'classic');
    assert.deepEqual(invoiceProFeatures(fallback), []);
    assert.deepEqual(fallback.from, styled.from);
    assert.deepEqual(fallback.items, styled.items);
    assert.deepEqual(invoiceTotals(fallback), invoiceTotals(styled));
  }
});

test('every Pro design exports complete multipage A4 and Letter invoices with readable totals', async () => {
  const embeddedFonts = {
    ...(await fonts()),
    heading: await readFile('public/fonts/pdf/LiberationSerif-Regular.ttf'),
  };
  for (const design of invoiceTemplates.filter((item) => item.pro)) {
    for (const paper of ['a4', 'letter'] as const) {
      const invoice = { ...sampleInvoice('2026-09-29'), template: design.id, paper };
      invoice.items = Array.from({ length: 20 }, (_, index) => ({
        id: `item-${index}`,
        description:
          `DELIVERABLE_${index + 1} ` + 'Detailed project work with an agreed scope. '.repeat(4),
        quantity: '2.5',
        rate: '125.1234',
        taxable: true,
      }));
      invoice.taxMode = 'exclusive';
      invoice.taxRate = '8';
      invoice.paid = '200';
      invoice.footer = 'REFERENCE_FOOTER Keep this invoice for your records.';
      invoice.terms = 'Please quote the invoice number when paying. FINAL_TERMS_MARKER';
      const result = await renderInvoicePdf(invoice, embeddedFonts);
      const pages = await readPdf(result.bytes);
      const text = pages.join(' ');
      assert.ok(pages.length >= 2, design.name);
      assert.match(text, /DELIVERABLE_20/);
      assert.match(text, /FINAL_TERMS_MARKER/);
      assert.ok(
        text.includes(invoiceMoney(invoiceTotals(invoice).balance, invoice.currency)),
        design.name,
      );
      for (const page of pages) assert.ok(page.includes('REFERENCE_FOOTER'), design.name);
      assert.ok(
        Math.abs(
          (await PDFDocument.load(result.bytes)).getPage(0).getWidth() -
            (paper === 'a4' ? 595.28 : 612),
        ) < 0.01,
      );
    }
  }
});

test('brand treatments keep light colors decorative and choose contrasting text', () => {
  function luminance(hex: string) {
    return [1, 3, 5]
      .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
      .reduce(
        (sum, channel, index) =>
          sum +
          (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) *
            [0.2126, 0.7152, 0.0722][index],
        0,
      );
  }
  for (const accent of ['#ffffff', '#ffff00', '#ff773d', '#000000', '#b84b20', '#7b7b7b']) {
    const colors = invoiceDesignColors(accent);
    assert.equal(colors.accent, accent);
    assert.ok(1.05 / (luminance(colors.text) + 0.05) >= 4.5);
    const background = luminance(accent),
      foreground = luminance(colors.onAccent);
    assert.ok(
      (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05) >= 4.5,
    );
  }
});

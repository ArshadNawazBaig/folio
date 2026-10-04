import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { sampleInvoice } from '../src/lib/invoice';

test('anonymous exports work while checkout and private account data stay protected', async ({
  request,
}) => {
  const plans = await request.get('/api/billing/plans');
  expect(await plans.json()).toEqual({ plans: [], ready: false, freeLaunch: true });
  const checkout = await request.post('/api/billing/checkout', {
    data: { plan: 'month', pricingVersion: 'initial' },
  });
  expect(checkout.status()).toBe(409);
  expect((await checkout.json()).error).toContain('No payment is required');
  for (const url of ['/api/account/files', '/api/account/invoices', '/api/account/links']) {
    expect((await request.get(url)).status()).toBe(401);
  }
  // Access reaches the document validation layer without requiring a subscription.
  expect((await request.post('/api/documents/export', { data: {} })).status()).toBe(400);
  const invoice = sampleInvoice('2026-10-04');
  invoice.template = 'studio';
  invoice.accent = '#234567';
  invoice.footer = 'A free custom footer';
  invoice.paymentUrl = 'https://example.com/pay';
  invoice.paymentQr = true;
  const exported = await request.post('/api/invoices/export', { data: { document: invoice } });
  expect(exported.status(), await exported.text()).toBe(200);
  const invoicePdf = await PDFDocument.load(await exported.body());
  expect(invoicePdf.getPageCount()).toBeGreaterThan(0);
  const source = await PDFDocument.create();
  source.addPage().drawText('Free password protection');
  const result = await request.post('/api/pro/pdf', {
    multipart: {
      file: {
        name: 'example.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(await source.save()),
      },
      job: JSON.stringify({ operation: 'protect', password: 'folio-test-password' }),
    },
  });
  expect(result.status(), result.status() === 200 ? '' : await result.text()).toBe(200);
  const bytes = await result.body();
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const locked = getDocument({ data: new Uint8Array(bytes) });
  await expect(locked.promise).rejects.toMatchObject({ name: 'PasswordException' });
  await locked.destroy();
  const unlocked = getDocument({
    data: new Uint8Array(bytes),
    password: 'folio-test-password',
    useSystemFonts: true,
  });
  try {
    expect((await unlocked.promise).numPages).toBe(1);
  } finally {
    await unlocked.destroy();
  }
});

test('public tool pages show free features and preserve processing disclosures', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('a[href$="/pricing"]')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('require a paid plan');
  await page.goto('/protect-pdf');
  await expect(page.getByText('Processed on Folio', { exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('All downloads and options are free');
  await page.goto('/url-shortener');
  await expect(page.getByRole('link', { name: 'Sign in to shorten' })).toBeVisible();
  await expect(page.locator('main')).toContainText('1,000');
  await expect(page.locator('main')).not.toContainText('PRO');
  await page.goto('/account');
  await expect(page.locator('main')).toContainText('1 GB');
});

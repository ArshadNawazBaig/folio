import { test, expect } from './fixtures/editor-storage';
import { mockGoogle } from './fixtures/auth';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PDFDocument } from 'pdf-lib';
import { renderInvoicePdf } from '../src/lib/invoice-pdf';
import { invoiceTotals, sampleInvoice, type SavedInvoice } from '../src/lib/invoice';
import { invoiceTemplates } from '../src/lib/invoice-designs';

async function downloadFrom(page: Page, mobile: boolean, action: () => Promise<void>) {
  const pending = page.waitForEvent('download');
  await action();
  if (mobile)
    await page
      .getByRole('dialog', { name: 'Your file is ready.' })
      .getByRole('link', { name: 'Download file' })
      .click();
  const downloaded = await pending;
  const bytes = await readFile((await downloaded.path())!);
  if (mobile) await page.getByRole('button', { name: 'Close download options' }).click();
  return { downloaded, bytes };
}
async function section(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Invoice sections' })
    .getByRole('button', { name: new RegExp(name) })
    .click();
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test('free invoice calculations, editable draft round-trip, and real mobile PDF download', async ({
  page,
  isMobile,
}, testInfo) => {
  const invoiceRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/(account\/)?invoices/.test(request.url())) invoiceRequests.push(request.url());
  });
  page.on('dialog', (dialog) => void dialog.accept());
  await page.goto('/invoice-generator');
  await expect(page.getByRole('button', { name: 'Try a sample' })).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Open invoice editor', exact: true }),
  ).toHaveAttribute('href', '/invoice-editor');
  await page.getByRole('link', { name: 'Open invoice editor', exact: true }).click();
  await expect(page).toHaveURL(/\/invoice-editor$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Invoice editor' })).toBeVisible();
  await expect(page.locator('.site-header, .site-footer')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'North & Form Studio',
  );
  await page.getByRole('combobox', { name: 'Currency', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search currencies', exact: true }).fill('PKR');
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toContainText('Pakistani Rupee');
  // Audit our popup content here and the main workspace after closing it below.
  // Base UI's off-screen VoiceOver focus sentinels sit outside the popup content.
  expect((await new AxeBuilder({ page }).include('.dropdown-popup').analyze()).violations).toEqual(
    [],
  );
  await page.getByRole('option').click();
  await expect(page.getByRole('combobox', { name: 'Currency', exact: true })).toContainText('PKR');
  await choose(page, 'Currency', 'USD · US Dollar');
  await section(page, 'Items');
  await choose(page, 'Discount type', 'Fixed amount (USD)');
  await expect(page.getByRole('combobox', { name: 'Discount type', exact: true })).toContainText(
    'Fixed amount (USD)',
  );
  await choose(page, 'Discount type', 'Percentage (%)');
  await page.getByLabel('Discount', { exact: true }).fill('10');
  await choose(page, 'Tax calculation', 'Add tax to prices');
  await page.getByLabel('Tax rate (%)').fill('8');
  await page.getByLabel('Shipping (USD)', { exact: true }).fill('20');
  await section(page, 'Payment');
  await page.getByLabel('Amount already paid (USD)').fill('200');
  await section(page, 'Design');
  await choose(page, 'Paper size', 'US Letter · 8.5 × 11 in');
  await expect(page.locator('main select:visible')).toHaveCount(0);
  await expect(page.getByRole('main', { name: 'Invoice editor', exact: true })).toContainText(
    'USD 2,104.20',
  );
  if (isMobile) await page.getByRole('button', { name: 'Live preview', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Invoice live preview' })).toContainText(
    'USD 2,104.20',
  );
  await page.screenshot({
    path: `test-results/invoice/${testInfo.project.name}-preview.png`,
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1),
  ).toBe(true);
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeInViewport();
  const preview = page.getByRole('region', { name: 'Scrollable invoice preview' });
  await preview.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeInViewport();
  const pdf = await downloadFrom(page, isMobile, () =>
    page.getByRole('button', { name: 'Download PDF', exact: true }).click(),
  );
  expect(pdf.downloaded.suggestedFilename()).toBe('invoice-INV-001.pdf');
  const pdfDocument = await PDFDocument.load(pdf.bytes);
  expect(pdfDocument.getPageCount()).toBeGreaterThan(0);
  expect(pdfDocument.getPage(0).getWidth()).toBe(612);
  expect(pdfDocument.getPage(0).getHeight()).toBe(792);
  await page.getByRole('button', { name: 'File actions' }).click();
  const draft = await downloadFrom(page, isMobile, () =>
    page.getByRole('menuitem', { name: /^Draft backup/ }).click(),
  );
  expect(JSON.parse(draft.bytes.toString()).paid).toBe('200');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Start a new invoice?' })
    .getByRole('button', { name: 'Start new invoice', exact: true })
    .click();
  await page
    .getByLabel('Import invoice draft')
    .setInputFiles({ name: 'draft.json', mimeType: 'application/json', buffer: draft.bytes });
  if (isMobile) await page.getByRole('button', { name: 'Edit invoice', exact: true }).click();
  await section(page, 'Details');
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'North & Form Studio',
  );
  expect(invoiceRequests).toEqual([]);
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }).includes('North & Form'),
    ),
  ).toBe(false);
});

test('premium design previews explain the paywall and offer a working free fallback', async ({
  page,
  isMobile,
}) => {
  await page.goto('/invoice-editor');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await section(page, 'Design');
  await page.getByRole('button', { name: /Studio PRO/ }).click();
  await page.getByRole('button', { name: 'Download with Pro', exact: true }).click();
  const gate = page.getByRole('dialog', { name: 'Take your work with you.' });
  await expect(gate).toBeVisible();
  await expect(gate).toContainText('invoice PDF');
  await gate.getByRole('button', { name: 'Keep editing', exact: true }).last().click();
  const free = await downloadFrom(page, isMobile, () =>
    page.getByRole('button', { name: 'Download free version', exact: true }).click(),
  );
  expect((await PDFDocument.load(free.bytes)).getPageCount()).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: /Studio PRO/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});

test('ten Pro designs are selectable, previewable on mobile, and keep the invoice intact', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/invoice-editor');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await section(page, 'Design');
  const premium = invoiceTemplates.filter((design) => design.pro);
  expect(premium.length).toBeGreaterThanOrEqual(10);
  await expect(
    page.getByText('2 free designs and 10 Pro designs.', { exact: false }),
  ).toBeVisible();
  const preview = page.getByRole('article', { name: 'Invoice live preview', includeHidden: true });
  for (const design of premium) {
    const choice = page.getByRole('button', { name: new RegExp(`^${design.name} PRO`) });
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(preview).toHaveAttribute('data-template', design.id);
    await expect(preview).toContainText('North & Form Studio');
    await expect(
      page.getByRole('button', { name: 'Download with Pro', exact: true }),
    ).toBeVisible();
    if (isMobile) await page.getByRole('button', { name: 'Live preview', exact: true }).click();
    await expect(preview).toBeVisible();
    expect(
      await preview.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    if (isMobile) await page.getByRole('button', { name: 'Edit invoice', exact: true }).click();
  }
  await page.getByRole('button', { name: /^Horizon PRO/ }).click();
  await page.getByLabel('Custom brand color', { exact: true }).fill('#ffffff');
  if (isMobile) await page.getByRole('button', { name: 'Live preview', exact: true }).click();
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Download with Pro', exact: true }).click();
  const gate = page.getByRole('dialog', { name: 'Take your work with you.' });
  await expect(gate).toBeVisible();
  await gate.getByRole('button', { name: 'Keep editing', exact: true }).last().click();
  const free = await downloadFrom(page, isMobile, () =>
    page.getByRole('button', { name: 'Download free version', exact: true }).click(),
  );
  expect((await PDFDocument.load(free.bytes)).getPageCount()).toBeGreaterThan(0);
  await expect(preview).toHaveAttribute('data-template', 'horizon');
  if (isMobile) await page.getByRole('button', { name: 'Edit invoice', exact: true }).click();
  await page.getByRole('button', { name: /^Studio PRO/ }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-results/invoice/${testInfo.project.name}-pro-designs.png`,
    fullPage: true,
  });
});

test('Pro saves, reopens, updates and deletes invoices; article explains actual functionality', async ({
  page,
  isMobile,
  baseURL,
}) => {
  await mockGoogle(page, false, false, baseURL);
  await page.route('**/api/account/access', (route) =>
    route.fulfill({
      json: {
        pro: true,
        trial: false,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        billingReady: false,
      },
    }),
  );
  let saved: SavedInvoice | null = null;
  await page.route('**/api/account/invoices{,?**,/**}', async (route) => {
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    const method = route.request().method(),
      url = new URL(route.request().url());
    if (method === 'DELETE') {
      saved = null;
      return route.fulfill({ status: 204 });
    }
    if (method === 'GET') {
      if (url.pathname.endsWith('/invoices'))
        return route.fulfill({
          json: {
            invoices: saved
              ? [
                  {
                    ...saved,
                    summary: {
                      number: saved.document.number,
                      customer: saved.document.to.name,
                      currency: saved.document.currency,
                      total: invoiceTotals(saved.document).total,
                      balance: invoiceTotals(saved.document).balance,
                      due: saved.document.due,
                    },
                  },
                ]
              : [],
            total: saved ? 1 : 0,
          },
        });
      return route.fulfill({ json: { invoice: saved } });
    }
    const body = route.request().postDataJSON();
    if (method === 'PATCH') expect(body.revision).toBe(saved?.revision);
    saved = {
      id: '00000000-0000-4000-8000-000000000055',
      document: body.document,
      revision: (saved?.revision || 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return route.fulfill({ status: method === 'POST' ? 201 : 200, json: { invoice: saved } });
  });
  await page.route('**/api/invoices/export', async (route) => {
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    const document = route.request().postDataJSON().document;
    const [regular, bold] = await Promise.all(
      ['Regular', 'Bold'].map((weight) =>
        readFile(`public/fonts/pdf/LiberationSans-${weight}.ttf`),
      ),
    );
    const result = await renderInvoicePdf(document, { regular, bold });
    return route.fulfill({ contentType: 'application/pdf', body: Buffer.from(result.bytes) });
  });
  await page.goto('/account?next=/invoice-editor');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/invoice-editor$/);
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await page.getByRole('button', { name: 'Save to account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Invoice saved privately');
  await section(page, 'Design');
  await page.getByRole('button', { name: /Studio PRO/ }).click();
  await downloadFrom(page, isMobile, () =>
    page.getByRole('button', { name: 'Download PDF', exact: true }).click(),
  );
  await page.getByRole('button', { name: 'Save to account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Invoice saved privately');
  await page.goto('/dashboard?view=invoices');
  await expect(page.getByRole('region', { name: 'Saved invoices' })).toContainText('INV-001');
  await page.getByRole('link', { name: 'Open', exact: true }).click();
  await expect(page).toHaveURL(/\/invoice-editor\?invoice=00000000-0000-4000-8000-000000000055$/);
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'North & Form Studio',
  );
  await page.goto('/invoice-generator?invoice=00000000-0000-4000-8000-000000000055');
  await expect(page).toHaveURL(/\/invoice-editor\?invoice=00000000-0000-4000-8000-000000000055$/);
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'North & Form Studio',
  );
  await page.goto('/dashboard?view=invoices');
  await page.getByRole('button', { name: 'Delete INV-001' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved invoices' })).toContainText('0 of 200');
  await page.goto('/guides/create-professional-invoice-online');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Professional Invoice');
  await expect(page.locator('main')).toContainText('597.60');
  expect((await page.locator('main').innerText()).split(/\s+/).length).toBeGreaterThan(1200);
});

test('editor navigation protects unsaved work and the layout fits small screens', async ({
  page,
  isMobile,
}, testInfo) => {
  const nativePrompts: string[] = [];
  page.on('dialog', (dialog) => {
    nativePrompts.push(dialog.type());
    void dialog.dismiss();
  });
  const response = await page.goto('/invoice-editor');
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  const back = page.getByRole('link', { name: 'Back to invoice generator' });
  await back.click();
  const confirmation = page.getByRole('dialog', { name: 'Leave this invoice?', exact: true });
  await expect(confirmation).toBeVisible();
  await expect(
    confirmation.getByRole('button', { name: 'Keep editing', exact: true }),
  ).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).include('.confirm-dialog[open]').analyze()).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/invoice/${testInfo.project.name}-leave-confirmation.png`,
  });
  await page.keyboard.press('Escape');
  await expect(confirmation).toHaveCount(0);
  if (!isMobile) await expect(back).toBeFocused();
  await back.click();
  await confirmation.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page).toHaveURL(/\/invoice-editor$/);
  await expect(page.getByLabel('Business name', { exact: true })).toHaveValue(
    'North & Form Studio',
  );
  if (!isMobile) {
    const currency = page.getByRole('combobox', { name: 'Currency', exact: true });
    await currency.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('combobox', { name: 'Search currencies', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(currency).toBeFocused();
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'File actions' }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: /^Import draft/ })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /^Saved invoices/ })).toBeVisible();
  const box = await menu.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeInViewport();
  const fields = page.getByRole('region', { name: 'Invoice editing fields' });
  expect(
    await fields.evaluate(
      (element) => element.scrollHeight > element.clientHeight && element.clientHeight > 100,
    ),
  ).toBe(true);
  await fields.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await back.click();
  const modalBox = await confirmation.boundingBox();
  expect(modalBox!.x).toBeGreaterThanOrEqual(0);
  expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(320);
  await confirmation.getByRole('button', { name: 'Leave invoice', exact: true }).click();
  await expect(page).toHaveURL(/\/invoice-generator$/);
  await expect(page.getByRole('link', { name: 'Open invoice editor', exact: true })).toBeVisible();
  expect(nativePrompts).toEqual([]);
});

test('draft replacement uses Folio confirmations and offers a working backup without discarding edits', async ({
  page,
  isMobile,
}) => {
  const nativePrompts: string[] = [];
  page.on('dialog', (dialog) => {
    nativePrompts.push(dialog.type());
    void dialog.dismiss();
  });
  await page.goto('/invoice-editor');
  const business = page.getByLabel('Business name', { exact: true });
  await business.fill('My current draft');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  const newDialog = page.getByRole('dialog', { name: 'Start a new invoice?', exact: true });
  await expect(newDialog).toBeVisible();
  // Tab stays in the modal; dismissing never applies the pending action.
  for (const key of [
    'Tab',
    'Tab',
    'Tab',
    'Tab',
    'Tab',
    'Shift+Tab',
    'Shift+Tab',
    'Shift+Tab',
    'Shift+Tab',
    'Shift+Tab',
  ]) {
    await page.keyboard.press(key);
    expect(await newDialog.evaluate((element) => element.contains(document.activeElement))).toBe(
      true,
    );
  }
  await page.keyboard.press('Escape');
  await expect(business).toHaveValue('My current draft');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  const sampleDialog = page.getByRole('dialog', { name: 'Replace with the sample?', exact: true });
  await sampleDialog.getByRole('button', { name: 'Close confirmation' }).click();
  await expect(business).toHaveValue('My current draft');
  await page.getByRole('button', { name: 'Try a sample' }).click();
  await sampleDialog.getByRole('button', { name: 'Load sample', exact: true }).click();
  await expect(business).toHaveValue('North & Form Studio');

  const imported = sampleInvoice('2026-09-29');
  imported.from.name = 'Imported studio';
  const file = {
    name: 'draft.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  };
  const upload = page.getByLabel('Import invoice draft');
  await upload.setInputFiles(file);
  const importDialog = page.getByRole('dialog', { name: 'Import this draft?', exact: true });
  await importDialog.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(business).toHaveValue('North & Form Studio');
  await upload.setInputFiles(file);
  await importDialog.getByRole('button', { name: 'Import draft', exact: true }).click();
  await expect(business).toHaveValue('Imported studio');

  await page.getByRole('button', { name: 'New', exact: true }).click();
  const backup = await downloadFrom(page, isMobile, () =>
    newDialog.getByRole('button', { name: 'Download draft backup', exact: true }).click(),
  );
  expect(JSON.parse(backup.bytes.toString()).from.name).toBe('Imported studio');
  await expect(newDialog).toHaveCount(0);
  await expect(business).toHaveValue('Imported studio');
  await expect(page).toHaveURL(/\/invoice-editor$/);
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await newDialog.getByRole('button', { name: 'Start new invoice', exact: true }).click();
  await expect(business).toHaveValue('');
  expect(nativePrompts).toEqual([]);
});

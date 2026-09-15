import { test, expect } from './fixtures/editor-storage';
import { readFile } from 'node:fs/promises';

test('free annotations download after selecting original text and after undoing premium edits', async ({
  page,
}) => {
  let paidRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/pro/pdf')) paidRequests++;
  });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  const added = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await added.fill('My free annotation');
  await added.press('Escape');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: A place to', exact: true });
  const original = page.getByRole('textbox', {
    name: 'Edit original text: A place to',
    exact: true,
  });
  await target.click();
  await expect(original).toBeFocused();
  await original.press('Enter');
  const firstDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await firstDownload;
  await expect(page.locator('.download-gate')).toBeHidden();

  await target.click();
  await original.fill('A different place');
  await original.press('Enter');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const gate = page.locator('.download-gate');
  await expect(gate).toBeVisible();
  await expect(
    gate.getByText('This document includes changes to original PDF text.', { exact: false }),
  ).toBeVisible();
  await gate
    .locator('.gate-actions')
    .getByRole('button', { name: 'Keep editing', exact: true })
    .click();
  await page.getByRole('toolbar').getByRole('button', { name: 'Undo', exact: true }).click();
  const lastDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const bytes = new Uint8Array(await readFile((await (await lastDownload).path())!));
  await expect(gate).toBeHidden();
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: bytes, useSystemFonts: true });
  try {
    const content = await (await (await task.promise).getPage(1)).getTextContent();
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    expect(text).toContain('My free annotation');
    expect(text).toContain('A place to');
    expect(text).not.toContain('A different place');
  } finally {
    await task.destroy();
  }
  expect(paidRequests).toBe(0);
});

test('pricing separates free downloads, available premium features and disconnected services', async ({
  page,
}) => {
  await page.goto('/pricing');
  const free = page
    .locator('.price-card')
    .filter({ has: page.getByRole('heading', { name: 'Folio Free', exact: true }) });
  await expect(free).toContainText('Compress images, adjust photos, and create QR codes');
  await expect(free).toContainText('Free downloads without a subscription or added watermark.');
  const paid = page.locator('.price-card.featured');
  await expect(paid).toContainText('Replace and delete existing PDF text');
  await expect(paid).not.toContainText('PDF to Word downloads');
  await page.getByText('Which premium tools can I use today?', { exact: true }).click();
  await expect(
    page.getByText('Available now: PDF text editor, Protect PDF.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Currently unavailable: Translate PDF, PDF to Word, PDF to Excel, PDF to PowerPoint.',
      { exact: false },
    ),
  ).toBeVisible();
  await page.getByText('When does my edited PDF need a premium plan?', { exact: true }).click();
  await expect(
    page.getByText(
      'Opening Edit Text or selecting a text block does not make a free document paid.',
      { exact: false },
    ),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Folio Free', exact: true })).toBeVisible();
});

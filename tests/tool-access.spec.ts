import { test, expect } from './fixtures/editor-storage';
import { readFile } from 'node:fs/promises';

test('annotations and original text edits both download free without opening a payment gate', async ({
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
  const editedDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const editedBytes = new Uint8Array(await readFile((await (await editedDownload).path())!));
  const { getDocument: readPdf } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const editedTask = readPdf({ data: editedBytes, useSystemFonts: true });
  try {
    const content = await (await (await editedTask.promise).getPage(1)).getTextContent();
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    expect(text).toContain('A different place');
    expect(text).toContain('My free annotation');
  } finally {
    await editedTask.destroy();
  }
  const gate = page.locator('.download-gate');
  await expect(gate).toBeHidden();
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
  expect(paidRequests).toBe(1);
});

test('pricing routes redirect to tools and no plan is advertised on desktop or mobile', async ({
  page,
}) => {
  for (const path of ['/pricing', '/fr/pricing']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path.replace('pricing', 'tools') + '$'));
    await expect(page.locator('a[href$="/pricing"]')).toHaveCount(0);
    await expect(page.locator('.price-card')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

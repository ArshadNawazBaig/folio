import { test, expect } from './fixtures/editor-storage';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createSample } from '../src/lib/sample';

const sample = await createSample();
const upload = { name: 'sample.pdf', mimeType: 'application/pdf', buffer: Buffer.from(sample) };

test('language menus support search, keyboard selection, dismissal, and accessible open states', async ({
  page,
}) => {
  await page.goto('/translate-pdf');
  const source = page.getByRole('combobox', { name: 'Original language', exact: true });
  const target = page.getByRole('combobox', { name: 'Translate into', exact: true });
  await expect(page.locator('select, datalist')).toHaveCount(0);
  await target.focus();
  await target.press('ArrowDown');
  const search = page.getByRole('combobox', { name: 'Search languages' });
  await expect(search).toBeFocused();
  await search.fill('port');
  await expect(page.getByRole('option')).toHaveCount(1);
  await search.press('Enter');
  await expect(target).toHaveText('Portuguese');
  await expect(target).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Translate into', exact: true })).toBeHidden();
  await target.click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('option', { name: 'Portuguese', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await search.fill('no-such-language');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('No languages found');
  await search.press('Escape');
  await expect(target).toBeFocused();
  await expect(target).toHaveText('Portuguese');
  await source.click();
  await search.fill('French');
  await page.getByRole('option', { name: 'French', exact: true }).click();
  await expect(source).toHaveText('French');
  await expect(target).toHaveText('Portuguese');
  await target.click();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(page.getByRole('dialog', { name: 'Translate into', exact: true })).toBeHidden();
  await target.click();
  await search.press('Tab');
  await expect(page.getByRole('dialog', { name: 'Translate into', exact: true })).toBeHidden();
});

test('language dropdowns fit small touch screens and keep their lists scrollable', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/translate-pdf');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 });
    const target = page.getByRole('combobox', { name: 'Translate into', exact: true });
    await target.tap();
    const popup = page.getByRole('dialog', { name: 'Translate into', exact: true });
    await expect(popup).toBeVisible();
    const bounds = await popup.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(740);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    const language = width === 320 ? 'Urdu' : 'Arabic';
    const option = page.getByRole('option', { name: language, exact: true });
    await option.scrollIntoViewIfNeeded();
    await option.tap();
    await expect(target).toHaveText(language);
    await expect(popup).toBeHidden();
  }
  await context.close();
});

test('custom tool settings change the exported PDF and ZIP', async ({ page }) => {
  await page.goto('/rotate-pdf');
  await page.locator('input[type=file]').first().setInputFiles(upload);
  const rotation = page.getByRole('combobox', { name: /Rotate clockwise/ });
  await expect(rotation).toBeEnabled();
  await rotation.click();
  await page.getByRole('option', { name: '180° — half turn', exact: true }).click();
  await expect(rotation).toContainText('180°');
  await page.getByRole('button', { name: 'Rotate pages', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const pdf = await PDFDocument.load(await readFile((await (await downloaded).path())!));
  expect(pdf.getPages().map((pdfPage) => pdfPage.getRotation().angle)).toEqual([180, 180, 180]);

  await page.goto('/split-pdf');
  await page.locator('input[type=file]').first().setInputFiles(upload);
  const output = page.getByRole('combobox', { name: /Output/ });
  await expect(output).toBeEnabled();
  await output.focus();
  await output.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(output).toContainText('ZIP');
  await page.getByRole('button', { name: 'Split PDF', exact: true }).click();
  const zipped = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  const zip = await JSZip.loadAsync(await readFile((await (await zipped).path())!));
  expect(Object.keys(zip.files)).toHaveLength(3);
});

test('PDF form dropdowns preserve read-only fields, export choices, and hand off to another tool', async ({
  page,
}) => {
  const pdf = await PDFDocument.create();
  const pdfPage = pdf.addPage();
  const status = pdf.getForm().createDropdown('Review status');
  status.addOptions(['Draft', 'Approved', 'Needs changes']);
  status.select('Draft');
  status.addToPage(pdfPage, { x: 40, y: 600, width: 200, height: 30 });
  const locked = pdf.getForm().createDropdown('Locked status');
  locked.addOptions(['Fixed', 'Other']);
  locked.select('Fixed');
  locked.addToPage(pdfPage, { x: 40, y: 540, width: 200, height: 30 });
  locked.enableReadOnly();
  await page.goto('/workspace?mode=form-fill');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'review.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    });
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  const review = page.getByRole('combobox', { name: /Review status/ });
  await expect(page.getByRole('combobox', { name: /Locked status/ })).toBeDisabled();
  await review.click();
  await page.getByRole('option', { name: 'Approved', exact: true }).click();
  await expect(review).toContainText('Approved');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const result = await PDFDocument.load(await readFile((await (await downloaded).path())!));
  expect(result.getForm().getDropdown('Review status').getSelected()).toEqual(['Approved']);
  expect(result.getForm().getDropdown('Locked status').getSelected()).toEqual(['Fixed']);
  const next = page.getByRole('combobox', { name: /Continue with another tool/ });
  await next.click();
  await expect(page.getByRole('option', { name: 'Compress this PDF', exact: true })).toBeVisible();
  const bounds = await page.locator('.dropdown-popup[data-open]').boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1000);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.getByRole('option', { name: 'Compress this PDF', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Leave editor', exact: true }).click();
  await expect(page).toHaveURL(/\/compress-pdf/);
  await expect(page.getByRole('button', { name: 'Optimize PDF', exact: true })).toBeEnabled();
});

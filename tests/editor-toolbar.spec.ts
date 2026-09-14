import { test, expect } from './fixtures/editor-storage';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import AxeBuilder from '@axe-core/playwright';

async function dragOnPage(page: Page, from: [number, number], to: [number, number]) {
  const bounds = (await page.locator('.editable-page').boundingBox())!;
  await page.mouse.move(bounds.x + from[0], bounds.y + from[1]);
  await page.mouse.down();
  await page.mouse.move(bounds.x + to[0], bounds.y + to[1], { steps: 6 });
  await page.mouse.up();
}

test('the reference toolbar adds, erases, undoes, and exports marks, comments, and links', async ({
  page,
}) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  const toolbar = page.getByRole('toolbar', { name: 'PDF editing tools' });
  for (const name of [
    'Move',
    'Undo',
    'Redo',
    'Add text',
    'Edit original text',
    'Eraser',
    'Highlight',
    'Pencil',
    'Image',
    'Ellipse',
    'Cross',
    'Check',
    'Sign',
    'Annotations',
    'Links',
    'More tools',
    'Page layout',
    'Manage pages',
  ]) {
    await expect(toolbar.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await toolbar.getByRole('button', { name: 'Ellipse', exact: true }).click();
  await dragOnPage(page, [70, 110], [190, 170]);
  await expect(page.locator('.annotation-ellipse')).toHaveCount(1);
  await toolbar.getByRole('button', { name: 'Cross', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 235, y: 110 } });
  await toolbar.getByRole('button', { name: 'Check', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 290, y: 110 } });
  await toolbar.getByRole('button', { name: 'Eraser options' }).click();
  await page.getByRole('menuitem', { name: 'Remove added items' }).click();
  await page.locator('.annotation-check').click();
  await expect(page.locator('.annotation-check')).toHaveCount(0);
  await toolbar.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.annotation-check')).toHaveCount(1);
  await toolbar.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.annotation-check')).toHaveCount(0);
  await toolbar.getByRole('button', { name: 'Undo', exact: true }).click();
  await toolbar.getByRole('button', { name: 'Eraser', exact: true }).click();
  await dragOnPage(page, [70, 215], [240, 245]);
  await expect(page.locator('.annotation-whiteout')).toHaveCount(1);
  await expect(page.getByText('This covers content visually.', { exact: false })).toBeVisible();
  await toolbar.getByRole('button', { name: 'Annotations', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 70, y: 320 } });
  await page
    .getByRole('textbox', { name: 'Comment', exact: true })
    .fill('Please approve this version.');
  await toolbar.getByRole('button', { name: 'Links', exact: true }).click();
  await dragOnPage(page, [220, 320], [385, 350]);
  await page.getByRole('textbox', { name: 'Link address' }).fill('https://example.com/approval');
  await toolbar.getByRole('button', { name: 'More tools', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Review annotations' }).click();
  await page
    .locator('.editor-annotation-list')
    .getByRole('button', { name: /Please approve/ })
    .click();
  await expect(page.getByRole('textbox', { name: 'Comment', exact: true })).toHaveValue(
    'Please approve this version.',
  );
  await expect(page.locator('.download-gate')).not.toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const exported = new Uint8Array(await readFile((await (await event).path())!));
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: exported, useSystemFonts: true });
  try {
    const document = await task.promise;
    const annotations = await (await document.getPage(1)).getAnnotations();
    expect(annotations.find((a) => a.subtype === 'Link')?.url).toBe('https://example.com/approval');
    expect(annotations.find((a) => a.subtype === 'Text')?.contentsObj.str).toBe(
      'Please approve this version.',
    );
    expect(document.numPages).toBe(3);
  } finally {
    await task.destroy();
  }
  await page.screenshot({ path: '/tmp/folio-editor-toolbar-desktop.png' });
});

test('custom page menus work by keyboard and page changes reach the exported PDF', async ({
  page,
}) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  const toolbar = page.getByRole('toolbar');
  await toolbar.getByRole('button', { name: 'Move', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(toolbar.getByRole('button', { name: 'Add text', exact: true })).toBeFocused();
  await toolbar.getByRole('button', { name: 'Page layout', exact: true }).click();
  await expect(page.getByRole('menu', { name: 'Page layout', exact: true })).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).not.toBeVisible();
  await toolbar.getByRole('button', { name: 'Manage pages', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Duplicate page', exact: true }).click();
  await expect(page.locator('.page-navigation')).toContainText('Page 2 of 4');
  await toolbar.getByRole('button', { name: 'Manage pages', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Move page later', exact: true }).click();
  await expect(page.locator('.page-navigation')).toContainText('Page 3 of 4');
  await toolbar.getByRole('button', { name: 'Manage pages', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Add a blank page', exact: true }).click();
  await expect(page.locator('.page-navigation')).toContainText('Page 4 of 5');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const doc = await PDFDocument.load(await readFile((await (await event).path())!));
  expect(doc.getPageCount()).toBe(5);
  expect(doc.getPage(0).getRotation().angle).toBe(90);
  expect(doc.getPage(2).getRotation().angle).toBe(90);
  expect(doc.getPage(3).getSize()).toEqual({ width: 595, height: 842 });
});

test('Move, Pencil, Sign, Image and shape menus operate on the document', async ({ page }) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  const toolbar = page.getByRole('toolbar');
  await dragOnPage(page, [60, 270], [60, 160]);
  expect(
    await page.getByRole('region', { name: 'Document canvas' }).evaluate((el) => el.scrollTop),
  ).toBeGreaterThan(50);
  await page.getByRole('region', { name: 'Document canvas' }).evaluate((el) => {
    el.scrollTop = 0;
  });
  await toolbar.getByRole('button', { name: 'Ellipse options' }).click();
  await page.getByRole('menuitem', { name: 'Rectangle', exact: true }).click();
  await dragOnPage(page, [70, 110], [190, 170]);
  await toolbar.getByRole('button', { name: 'Pencil', exact: true }).click();
  await dragOnPage(page, [85, 125], [170, 150]);
  await dragOnPage(page, [100, 130], [140, 165]);
  await expect(page.locator('.annotation-draw')).toHaveCount(2);
  await toolbar.getByRole('button', { name: 'Sign', exact: true }).click();
  await page.getByRole('dialog').getByRole('tab', { name: 'Type', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your signature', exact: true }).fill('Alex Morgan');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add signature', exact: true })
    .click();
  const picker = page.waitForEvent('filechooser');
  await toolbar.getByRole('button', { name: 'Image', exact: true }).click();
  await (
    await picker
  ).setFiles({
    name: 'stamp.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j26kAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('.annotation-image img')).toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const output = new Uint8Array(await readFile((await (await event).path())!));
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: output, useSystemFonts: true });
  try {
    const content = await (await (await task.promise).getPage(1)).getTextContent();
    expect(content.items.map((item) => ('str' in item ? item.str : '')).join(' ')).toContain(
      'Alex Morgan',
    );
  } finally {
    await task.destroy();
  }
});

test('all toolbar labels stay usable on mobile and menus stay within the screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  const toolbar = page.getByRole('toolbar');
  for (const name of [
    'Eraser options',
    'Ellipse options',
    'Sign options',
    'More tools',
    'Page layout',
    'Manage pages',
  ]) {
    const trigger = toolbar.getByRole('button', { name, exact: true });
    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
  await toolbar.getByRole('button', { name: 'More tools', exact: true }).click();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.screenshot({ path: '/tmp/folio-editor-toolbar-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

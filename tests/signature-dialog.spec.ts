import { test, expect } from './fixtures/editor-storage';
import type { Page } from '@playwright/test';
import { PDFDocument, PDFRawStream, PDFName } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import AxeBuilder from '@axe-core/playwright';

async function open(page: Page, tab?: 'Draw' | 'Image' | 'Type') {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add your signature' });
  await expect(dialog).toBeVisible();
  if (tab) await dialog.getByRole('tab', { name: tab, exact: true }).click();
  return dialog;
}
async function stroke(page: Page) {
  const rect = (await page.getByLabel('Draw your signature', { exact: true }).boundingBox())!;
  const points = [
    [0.15, 0.65],
    [0.23, 0.35],
    [0.21, 0.73],
    [0.3, 0.49],
    [0.38, 0.62],
    [0.47, 0.43],
    [0.57, 0.59],
    [0.73, 0.34],
  ];
  await page.mouse.move(rect.x + rect.width * points[0][0], rect.y + rect.height * points[0][1]);
  await page.mouse.down();
  for (const [x, y] of points.slice(1))
    await page.mouse.move(rect.x + rect.width * x, rect.y + rect.height * y, { steps: 5 });
  await page.mouse.up();
}

test('drawn signatures are transparent, movable, resizable, recover after refresh, and export', async ({
  page,
  workspaceStorage,
}) => {
  const dialog = await open(page);
  await expect(dialog.getByRole('button', { name: 'Add signature', exact: true })).toBeDisabled();
  await stroke(page);
  await dialog.getByRole('button', { name: 'Undo stroke' }).click();
  await expect(dialog.getByRole('button', { name: 'Add signature', exact: true })).toBeDisabled();
  await stroke(page);
  await dialog.getByRole('button', { name: 'Blue ink' }).click();
  await page.screenshot({ path: '/tmp/folio-signature-draw-desktop.png' });
  const violations = (
    await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  ).violations;
  expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  await dialog.getByRole('button', { name: 'Add signature', exact: true }).click();
  const annotation = page.getByRole('button', { name: 'signature: Drawn signature', exact: true });
  await expect(annotation).toBeVisible();
  const before = (await annotation.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 55, before.y + before.height / 2 + 35, {
    steps: 6,
  });
  await page.mouse.up();
  expect((await annotation.boundingBox())!.x).toBeGreaterThan(before.x + 40);
  const moved = (await annotation.boundingBox())!;
  await annotation.locator('.resize-handle').hover();
  await page.mouse.down();
  await page.mouse.move(moved.x + moved.width + 35, moved.y + moved.height + 20, { steps: 6 });
  await page.mouse.up();
  const resized = (await annotation.boundingBox())!;
  expect(resized.width).toBeGreaterThan(moved.width);
  expect(resized.width / resized.height).toBeCloseTo(moved.width / moved.height, 1);
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect
    .poll(
      () =>
        [...workspaceStorage.records.values()][0]?.snapshot?.state.annotations[0]?.signatureSource,
    )
    .toBe('draw');
  const saved = [...workspaceStorage.records.values()][0].snapshot!.state.annotations[0];
  const png = PNG.sync.read(Buffer.from(saved.dataUrl!.split(',')[1], 'base64'));
  expect(png.data[3]).toBe(0);
  expect([...png.data].some((value, i) => i % 4 === 3 && value > 0)).toBe(true);
  await page.reload();
  await expect(annotation).toBeVisible();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const pdf = await PDFDocument.load(await readFile((await (await exported).path())!));
  expect(pdf.getPageCount()).toBe(3);
  expect(
    pdf.context
      .enumerateIndirectObjects()
      .some(
        ([, value]) =>
          value instanceof PDFRawStream &&
          value.dict.get(PDFName.of('Subtype'))?.toString() === '/Image' &&
          value.dict.get(PDFName.of('Width'))?.toString() === String(png.width) &&
          value.dict.get(PDFName.of('Height'))?.toString() === String(png.height),
      ),
  ).toBe(true);
});

test('typed signature styles handle a font failure and preserve text and appearance after saving', async ({
  page,
  workspaceStorage,
}) => {
  const dialog = await open(page, 'Type');
  await dialog.getByRole('textbox', { name: 'Your signature', exact: true }).fill('Alex Morgan');
  await page.route('**/api/fonts/file?*', (route) => route.fulfill({ status: 503 }));
  await dialog.getByRole('button', { name: 'Flowing', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('could not load');
  await expect(dialog.getByRole('button', { name: 'Add signature', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Classic', exact: true }).click();
  await dialog.getByRole('button', { name: 'Green ink' }).click();
  await page.screenshot({ path: '/tmp/folio-signature-type-desktop.png' });
  await dialog.getByRole('button', { name: 'Add signature', exact: true }).click();
  const annotation = page.getByRole('button', { name: 'signature: Alex Morgan', exact: true });
  await expect(annotation).toBeVisible();
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect
    .poll(() => [...workspaceStorage.records.values()][0]?.snapshot?.state.annotations[0]?.font)
    .toBe('Times-Italic');
  await page.reload();
  await expect(annotation).toBeVisible();
  await expect(annotation.locator('.annotation-content')).toHaveCSS('color', 'rgb(62, 104, 82)');
  await expect(annotation.locator('.annotation-content')).toHaveCSS('font-style', 'italic');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(await readFile((await (await event).path())!)),
    useSystemFonts: true,
  });
  try {
    const content = await (await (await task.promise).getPage(1)).getTextContent();
    expect(content.items.map((item) => ('str' in item ? item.str : '')).join(' ')).toContain(
      'Alex Morgan',
    );
  } finally {
    await task.destroy();
  }
});

test('image signatures validate uploads and remove white background without changing the document until confirmed', async ({
  page,
}) => {
  const dialog = await open(page, 'Image');
  const input = dialog.getByLabel('Upload signature image', { exact: true });
  await input.setInputFiles({
    name: 'bad.png',
    mimeType: 'image/png',
    buffer: Buffer.from('invalid'),
  });
  await expect(dialog.getByRole('alert')).toContainText('could not be opened');
  const png = new PNG({ width: 240, height: 80 });
  png.data.fill(255);
  for (let x = 25; x < 215; x++)
    for (let y = 35; y < 42; y++) {
      const i = (y * 240 + x) * 4;
      png.data[i] = 32;
      png.data[i + 1] = 37;
      png.data[i + 2] = 34;
    }
  await input.setInputFiles({
    name: 'My signature.png',
    mimeType: 'image/png',
    buffer: PNG.sync.write(png),
  });
  const preview = dialog.getByAltText('Uploaded signature preview');
  await expect(preview).toBeVisible();
  const transparent = await preview.getAttribute('src');
  expect(PNG.sync.read(Buffer.from(transparent!.split(',')[1], 'base64')).width).toBeLessThan(240);
  await dialog.getByRole('checkbox', { name: 'Remove white background' }).uncheck();
  const opaque = await preview.getAttribute('src');
  expect(opaque).not.toBe(transparent);
  await dialog.getByRole('checkbox', { name: 'Remove white background' }).check();
  await page.screenshot({ path: '/tmp/folio-signature-image-desktop.png' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.annotation-image')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign', exact: true })).toBeFocused();
});

test('mobile signature dialog keeps actions visible, supports touch drawing and keyboard tabs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await open(page);
  const canvas = dialog.getByLabel('Draw your signature', { exact: true });
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const box = (await canvas.boundingBox())!;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width * 0.2, y: box.y + box.height * 0.6 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: box.x + box.width * 0.5, y: box.y + box.height * 0.3 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: box.x + box.width * 0.8, y: box.y + box.height * 0.6 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(dialog.getByRole('button', { name: 'Add signature', exact: true })).toBeEnabled();
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await client.detach();
  await dialog.getByRole('tab', { name: 'Draw', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'Image', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'Type', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await dialog.getByRole('textbox', { name: 'Your signature', exact: true }).fill('Alex Morgan');
  const preview = dialog.getByLabel('Typed signature preview');
  expect(await preview.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  await expect(preview.locator('span')).toHaveCSS('white-space', 'nowrap');
  await page.screenshot({ path: '/tmp/folio-signature-mobile.png' });
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.height).toBeLessThanOrEqual(844 * 0.8 + 1);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  const footer = (await dialog.locator('footer').boundingBox())!;
  const add = dialog.getByRole('button', { name: 'Add signature', exact: true });
  await expect(add).toBeInViewport();
  await dialog
    .locator('[role=tabpanel]')
    .evaluate((element) => (element.parentElement!.scrollTop = 1000));
  expect((await dialog.locator('footer').boundingBox())!.y).toBe(footer.y);
  const violations = (
    await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  ).violations;
  expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.annotation-signature')).toHaveCount(0);
});

test('handwritten signature fonts load on demand and embed in the downloaded PDF', async ({
  page,
}) => {
  const dialog = await open(page, 'Type');
  await dialog.getByRole('textbox', { name: 'Your signature', exact: true }).fill('Arshad Nawaz');
  await dialog.getByRole('button', { name: 'Handwritten', exact: true }).click();
  const preview = dialog.getByLabel('Typed signature preview');
  await expect(preview.locator('span')).toHaveCSS('font-family', /FolioDoc_caveat_500_normal/, {
    timeout: 35000,
  });
  await page.screenshot({ path: '/tmp/folio-signature-handwritten.png' });
  await dialog.getByRole('button', { name: 'Add signature', exact: true }).click();
  const annotation = page.getByRole('button', { name: 'signature: Arshad Nawaz', exact: true });
  await expect(annotation.locator('.annotation-content')).toHaveCSS(
    'font-family',
    /FolioDoc_caveat_500_normal/,
  );
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(await readFile((await (await event).path())!)),
    useSystemFonts: true,
  });
  try {
    const content = await (await (await task.promise).getPage(1)).getTextContent();
    expect(content.items.map((item) => ('str' in item ? item.str : '')).join(' ')).toContain(
      'Arshad Nawaz',
    );
  } finally {
    await task.destroy();
  }
});

import { test, expect } from './fixtures/editor-storage';
import { createScaledTextPdf } from './fixtures/scaled-text-pdf';
import { workspaceSchema } from '../src/lib/workspace-types';
import { PDFDocument } from 'pdf-lib';
import {
  disableBrowserTextPreview,
  useBrowserTextPreviewOnly,
} from './fixtures/text-preview-worker';

test('original text copies retain formatting, remain independent and survive undo and refresh', async ({
  page,
  workspaceStorage,
}) => {
  await useBrowserTextPreviewOnly(page);
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Copy receipt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await createScaledTextPdf()),
  });
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: Receipt total', exact: true }).click();
  const original = page.getByRole('textbox', {
    name: 'Edit original text: Receipt total',
    exact: true,
  });
  await original.fill('Copied receipt');
  const appearance = await original.evaluate((el) => ({
    font: getComputedStyle(el).fontFamily,
    color: getComputedStyle(el).color,
    size: getComputedStyle(el).fontSize,
  }));
  await page.getByRole('button', { name: 'Copy text box', exact: true }).click();
  await page.getByRole('button', { name: 'Paste text box', exact: true }).click();
  // Stable IDs distinguish the new editable object from its source, even with identical text.
  const copied = page
    .locator('.inline-text-node')
    .filter({ has: page.locator('.inline-text-move') });
  const copiedId = await copied.getAttribute('data-text-block');
  expect(copiedId!.split(':')).toHaveLength(3);
  const node = page.locator(`[data-text-block="${copiedId}"]`);
  await expect(node.getByRole('button', { name: /^Move text:/ })).toBeEnabled();
  await node.locator('.inline-text-target').click();
  const pastedInput = node.locator('input');
  await expect(pastedInput).toHaveValue('Copied receipt');
  expect(
    await pastedInput.evaluate((el) => ({
      font: getComputedStyle(el).fontFamily,
      color: getComputedStyle(el).color,
      size: getComputedStyle(el).fontSize,
    })),
  ).toEqual(appearance);
  await pastedInput.fill('Independent copy');
  await pastedInput.press('Enter');
  await node.getByRole('button', { name: /^Move text:/ }).focus();
  const before = (await node.boundingBox())!;
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(async () => (await node.boundingBox())!.x).toBeGreaterThan(before.x);
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  let snapshot = [...workspaceStorage.records.values()][0].snapshot!;
  expect(workspaceSchema.parse(snapshot)).toEqual(snapshot);
  let changes = Object.values(snapshot.state.textChanges![snapshot.state.pages[0].id]);
  expect(changes.find((change) => change.copy)?.text).toBe('Independent copy');
  expect(changes.find((change) => !change.copy)?.text).toBe('Copied receipt');
  await page.reload();
  await expect(node.locator('.inline-text-target')).toBeVisible();
  await node.locator('.inline-text-target').click();
  await expect(node.locator('input')).toHaveValue('Independent copy');
  await node.locator('input').press('Enter');
  await node.getByRole('button', { name: /^Move text:/ }).focus();
  await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('ControlOrMeta+v');
  await expect(page.locator('.inline-text-node')).toHaveCount(6);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.inline-text-node')).toHaveCount(5);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.inline-text-node')).toHaveCount(6);
  await page.screenshot({ path: '/tmp/folio-text-copy-original.png', fullPage: true });
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.locator('.download-gate')).toBeVisible();
});

test('added text copy/paste preserves formatting and normal clipboard editing still works inside a text box', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 100, y: 140 } });
  const input = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await input.fill('Reusable label');
  await page.getByRole('button', { name: 'Copy text box', exact: true }).click();
  await page.getByRole('button', { name: 'Paste text box', exact: true }).click();
  await expect(page.locator('.annotation-text')).toHaveCount(2);
  await page.locator('.annotation-text.selected').dblclick();
  await expect(input).toHaveValue('Reusable label');
  await input.fill('Second label');
  await input.press('ControlOrMeta+a');
  await input.press('ControlOrMeta+c');
  await input.press('ArrowRight');
  await input.press('ControlOrMeta+v');
  await expect(input).toHaveValue('Second labelSecond label');
  await expect(page.locator('.annotation-text')).toHaveCount(2);
  await input.press('Escape');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  const annotations = [...workspaceStorage.records.values()][0].snapshot!.state.annotations;
  expect(annotations[0].text).toBe('Reusable label');
  expect(annotations[1].text).toBe('Second labelSecond label');
  expect(annotations[1].font).toBe(annotations[0].font);
  expect(annotations[1].color).toBe(annotations[0].color);
  expect(annotations[1].size).toBe(annotations[0].size);
  await page.reload();
  await expect(page.locator('.annotation-text')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.annotation-text').last().click();
  await page.getByRole('button', { name: 'Copy text box', exact: true }).click();
  await page.getByRole('button', { name: 'Paste text box', exact: true }).click();
  await expect(page.locator('.annotation-text')).toHaveCount(3);
  await page.screenshot({ path: '/tmp/folio-text-copy-mobile.png', fullPage: true });
});

test('text can be pasted onto another PDF page using server previews', async ({
  page,
  workspaceStorage,
}) => {
  await disableBrowserTextPreview(page);
  const pdf = await PDFDocument.load(await createScaledTextPdf());
  pdf.addPage([500, 500]);
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Across pages.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: Receipt total', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Edit original text: Receipt total', exact: true })
    .fill('Across pages');
  await page.getByRole('button', { name: 'Copy text box', exact: true }).click();
  await page.getByRole('button', { name: 'Go to page 2', exact: true }).click();
  await page.getByRole('button', { name: 'Paste text box', exact: true }).click();
  const node = page.locator('.inline-text-node');
  await expect(node).toHaveCount(1);
  await expect(node.getByRole('button', { name: /^Move text:/ })).toBeEnabled();
  await node.locator('.inline-text-target').click();
  await expect(node.locator('input')).toHaveValue('Across pages');
  await node.locator('input').fill('Second page copy');
  await node.locator('input').press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  const snapshot = [...workspaceStorage.records.values()][0].snapshot!;
  const change = Object.values(snapshot.state.textChanges![snapshot.state.pages[1].id])[0];
  expect(change.copy?.page).toBe(0);
  expect(change.text).toBe('Second page copy');
  await page.reload();
  await expect(node).toHaveCount(1);
  await node.locator('.inline-text-target').click();
  await expect(node.locator('input')).toHaveValue('Second page copy');
});

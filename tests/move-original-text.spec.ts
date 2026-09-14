import { test, expect } from './fixtures/editor-storage';
import { createScaledTextPdf } from './fixtures/scaled-text-pdf';
import { workspaceSchema } from '../src/lib/workspace-types';
import { createSubsetFontPdf } from './fixtures/subset-font-pdf';

test('edited original text can be dragged, undone and restored after refresh', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Move receipt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await createScaledTextPdf()),
  });
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: Receipt total', exact: true });
  await target.click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Receipt total',
    exact: true,
  });
  await input.fill('Moved receipt');
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  const before = (await target.boundingBox())!;
  const handle = page.getByRole('button', { name: 'Move text: Receipt total', exact: true });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 80, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  let after = (await target.boundingBox())!;
  expect(after.x - before.x).toBeCloseTo(70, 0);
  expect(after.y - before.y).toBeCloseTo(80, 0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await target.boundingBox())!.x).toBeCloseTo(before.x, 0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(async () => (await target.boundingBox())!.x).toBeCloseTo(after.x, 0);
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const snapshot = [...workspaceStorage.records.values()][0].snapshot!;
  expect(workspaceSchema.parse(snapshot)).toEqual(snapshot);
  const change = Object.values(Object.values(snapshot.state.textChanges!)[0])[0];
  expect(change.offset!.x).toBeGreaterThan(0);
  expect(change.offset!.y).toBeLessThan(0);
  await page.reload();
  await expect(target).toBeVisible();
  const restored = (await target.boundingBox())!;
  expect(restored.x).toBeCloseTo(after.x, 0);
  expect(restored.y).toBeCloseTo(after.y, 0);
  await target.click();
  await expect(input).toHaveValue('Moved receipt');
  await input.press('Enter');
  await handle.focus();
  await handle.press('ArrowRight');
  await expect.poll(async () => (await target.boundingBox())!.x).toBeGreaterThan(restored.x);
  await expect(page.locator('.inline-text-pending')).toHaveCount(0);
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await page.screenshot({ path: '/tmp/folio-text-move.png', fullPage: true });
});

test('dragging on a rotated page follows the pointer at a different zoom and can be cancelled', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Rotated.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await createSubsetFontPdf('Serif', 'Italic', 90)),
  });
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: Original receipt', exact: true });
  await target.click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Original receipt',
    exact: true,
  });
  await input.fill('Original 4 receipt');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const handle = page.getByRole('button', { name: 'Move text: Original receipt', exact: true });
  const before = (await target.boundingBox())!;
  const start = (await handle.boundingBox())!;
  await page.mouse.move(start.x + 12, start.y + 12);
  await page.mouse.down();
  await page.mouse.move(start.x + 62, start.y + 47, { steps: 5 });
  await page.mouse.up();
  const after = (await target.boundingBox())!;
  expect(after.x - before.x).toBeCloseTo(50, 0);
  expect(after.y - before.y).toBeCloseTo(35, 0);
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  const next = (await handle.boundingBox())!;
  await page.mouse.move(next.x + 12, next.y + 12);
  await page.mouse.down();
  await page.mouse.move(next.x + 42, next.y + 42, { steps: 3 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await target.boundingBox())!.x).toBeCloseTo(after.x, 0);
  expect((await target.boundingBox())!.y).toBeCloseTo(after.y, 0);
});

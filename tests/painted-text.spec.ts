import { test, expect } from './fixtures/editor-storage';
import { paintedTextPdf } from './fixtures/painted-text';

test.use({ deviceScaleFactor: 2 });
test('purple text keeps its color while typing, moving, saving and upgrading a legacy workspace', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Purple document.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await paintedTextPdf()),
  });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: scale', exact: true });
  await target.click();
  const input = page.getByRole('textbox', { name: 'Edit original text: scale', exact: true });
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS('color', 'rgb(124, 58, 237)');
  await input.fill('scale faster');
  await input.press('Escape');
  const handle = page.getByRole('button', { name: 'Move text: scale', exact: true });
  await handle.focus();
  await handle.press('Shift+ArrowRight');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const record = [...workspaceStorage.records.values()][0];
  const inspection = record.snapshot!.inspection!;
  const block = inspection.blocks.find((b) => b.text === 'scale')!;
  const changes = record.snapshot!.state.textChanges!['page-0'];
  expect(changes[block.id].offset!.x).toBeGreaterThan(0);
  // Existing workspaces contain the old invisible black metadata and must be repaired on open.
  delete inspection.version;
  delete block.paint;
  block.color = '#000000';
  delete changes[block.id].preservePaint;
  changes[block.id].color = '#000000';
  await page.reload();
  await target.click();
  await expect(input).toHaveValue('scale faster');
  await expect(input).toHaveCSS('color', 'rgb(124, 58, 237)');
  await expect(page.getByLabel('Text color', { exact: true })).toHaveValue('#7c3aed');
  await page.getByLabel('Text color', { exact: true }).fill('#245ba8');
  await target.click();
  await expect(input).toHaveCSS('color', 'rgb(36, 91, 168)');
});

test('real gradient text uses its gradient while typing instead of a black input', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Gradient document.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await paintedTextPdf(true)),
  });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: scale', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Edit original text: scale', exact: true });
  await input.fill('scale faster');
  await expect(input).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  const visible = page.locator('.inline-text-value');
  await expect(visible).toHaveText('scale faster');
  await expect(visible).toHaveCSS('background-clip', 'text');
});

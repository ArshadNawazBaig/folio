import { test, expect } from './fixtures/editor-storage';
import { createEmbeddedFontPdf } from './fixtures/embedded-font-pdf';
import { workspaceSchema } from '../src/lib/workspace-types';

test('original embedded font is used while typing and survives save and refresh', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Embedded fonts.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await createEmbeddedFontPdf()),
  });
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', {
    name: 'Edit text: Original BoldItalic receipt',
    exact: true,
  });
  await target.click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Original BoldItalic receipt',
    exact: true,
  });
  await expect(input).toHaveCSS('font-family', /g_d\d+_f\d+/);
  await expect(input).toHaveCSS('font-synthesis', 'none');
  await expect(page.getByRole('combobox', { name: 'Text font', exact: true })).toContainText(
    'Original · LiberationSans-BoldItalic',
  );
  await input.fill('Updated BoldItalic receipt');
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const record = [...workspaceStorage.records.values()][0];
  expect(workspaceSchema.parse(record.snapshot)).toEqual(record.snapshot);
  const edit = Object.values(Object.values(record.snapshot!.state.textChanges!)[0])[0];
  expect(edit.font).toBe('original');
  await page.reload();
  await target.click();
  await expect(input).toHaveValue('Updated BoldItalic receipt');
  await expect(input).toHaveCSS('font-family', /g_d\d+_f\d+/);
  await input.fill('Updated again');
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/folio-original-font-fixed.png', fullPage: true });
});

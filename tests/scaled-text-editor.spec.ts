import { test, expect } from './fixtures/editor-storage';
import { createScaledTextPdf } from './fixtures/scaled-text-pdf';
import { workspaceSchema } from '../src/lib/workspace-types';

test('scaled receipt text can be edited, resized, saved and edited again after refresh', async ({
  page,
  workspaceStorage,
}) => {
  const failedPreviews: number[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/pro/preview') && !response.ok())
      failedPreviews.push(response.status());
  });
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Scaled receipt.pdf',
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
  const size = page.getByRole('spinbutton', { name: 'Text size', exact: true });
  await expect(size).toHaveValue('14');
  await input.fill('Updated receipt total');
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const record = [...workspaceStorage.records.values()][0];
  expect(workspaceSchema.safeParse(record.snapshot).success).toBe(true);
  const originalSize = Object.values(Object.values(record.snapshot!.state.textChanges!)[0])[0].size;
  expect(originalSize).toBe(1);

  await page.reload();
  await target.click();
  await expect(input).toHaveValue('Updated receipt total');
  await expect(size).toHaveValue('14');
  await input.fill('Saved after refresh');
  await input.press('Enter');
  await size.fill('');
  await expect(size).toHaveAttribute('aria-invalid', 'true');
  await size.press('Tab');
  await expect(size).toHaveValue('14');
  await size.fill('18');
  await size.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  await page.reload();
  await target.click();
  await expect(input).toHaveValue('Saved after refresh');
  await expect(size).toHaveValue('18');
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
  expect(failedPreviews).toEqual([]);
  expect(workspaceStorage.uploads).toBe(1);
  await page.screenshot({ path: '/tmp/folio-scaled-receipt-fixed.png', fullPage: true });
});

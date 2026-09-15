import { PDFDocument, StandardFonts } from 'pdf-lib';
import { test, expect } from './fixtures/editor-storage';
import { observeBrowserTextPreview } from './fixtures/text-preview-worker';

async function sample() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 2; i++) {
    const page = doc.addPage([500, 500]);
    page.drawText(`First line on page ${i + 1}`, { x: 40, y: 400, size: 18, font });
    page.drawText(`Second line on page ${i + 1}`, { x: 40, y: 300, size: 18, font });
  }
  return {
    name: 'Interactive pages.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await doc.save()),
  };
}

test('local inspection and pixel previews work without the processing API and hovering does not change the file', async ({
  page,
  workspaceStorage,
}) => {
  await observeBrowserTextPreview(page);
  await page.route('**/api/pro/preview', (route) => route.abort());
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles(await sample());
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: First line on page 1', exact: true });
  await expect(target).toBeVisible();
  await target.hover();
  await expect
    .poll(() =>
      page.evaluate(() => window.previewDiagnostics!.results.some((result) => result.bytes > 0)),
    )
    .toBe(true);
  await expect(page.locator('.inline-pdf-preview')).toHaveCount(0);
  await expect(page.locator('.inline-text-input')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  const before = await page.evaluate(
    () => window.previewDiagnostics!.jobs.filter((job) => job.operation === 'preview').length,
  );
  await target.click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: First line on page 1',
    exact: true,
  });
  await expect(input).toBeFocused();
  await expect(page.locator('.inline-pdf-preview canvas')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => window.previewDiagnostics!.jobs.filter((job) => job.operation === 'preview').length,
    ),
  ).toBe(before);
  await input.fill('First change');
  await input.press('Tab');
  const second = page.getByRole('textbox', {
    name: 'Edit original text: Second line on page 1',
    exact: true,
  });
  await expect(second).toBeFocused();
  await second.fill('Second change');
  await second.press('Shift+Tab');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('First change');
  await input.fill('Latest first change');
  await input.press('Tab');
  await expect(second).toBeFocused();
  await expect(second).toHaveValue('Second change');
  await second.press('Escape');
  const secondTarget = page.getByRole('button', {
    name: 'Edit text: Second line on page 1',
    exact: true,
  });
  await expect(secondTarget).toBeFocused();
  await secondTarget.press('Enter');
  await expect(second).toBeFocused();
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const record = [...workspaceStorage.records.values()][0];
  const changes = Object.values(record.snapshot!.state.textChanges!['page-0']);
  expect(changes.map((change) => change.text)).toEqual(['Latest first change', 'Second change']);
  await page.reload();
  await page.getByRole('button', { name: 'Edit text: First line on page 1', exact: true }).click();
  await expect(input).toHaveValue('Latest first change');
  await page.getByRole('button', { name: 'Go to page 2', exact: true }).click();
  const next = page.getByRole('button', { name: 'Edit text: First line on page 2', exact: true });
  await next.click();
  await expect(
    page.getByRole('textbox', { name: 'Edit original text: First line on page 2', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Go to page 1', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: Second line on page 1', exact: true }).click();
  await expect(second).toHaveValue('Second change');
});

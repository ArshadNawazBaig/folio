import { test, expect } from './fixtures/editor-storage';
import { groupedTextPdf } from './fixtures/grouped-text-pdf';
import {
  useBrowserTextPreviewOnly,
  disableBrowserTextPreview,
} from './fixtures/text-preview-worker';

for (const server of [false, true]) {
  test(`grouped text edits, saves, copies and restores with ${server ? 'server' : 'browser'} previews`, async ({
    page,
    workspaceStorage,
  }) => {
    if (server) await disableBrowserTextPreview(page);
    else await useBrowserTextPreviewOnly(page);
    await page.goto('/workspace');
    await page.locator('.editor-empty input[type=file]').setInputFiles({
      name: 'Grouped resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await groupedTextPdf({ deep: true })),
    });
    await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
    const target = page.getByRole('button', { name: 'Edit text: Grouped heading', exact: true });
    await target.click();
    const input = page.getByRole('textbox', {
      name: 'Edit original text: Grouped heading',
      exact: true,
    });
    await expect(input).toBeFocused();
    await expect(input).toHaveCSS('color', 'rgb(102, 51, 179)');
    await input.fill('Updated grouped heading');
    await input.press('Enter');
    await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
    await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    const record = [...workspaceStorage.records.values()][0];
    // Recover a document whose previous inspection said no text was available.
    record.snapshot!.inspection!.version = 3;
    record.snapshot!.inspection!.blocks = [];
    await page.reload();
    await target.click();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Updated grouped heading');
    await input.press('Enter');
    await page.getByRole('button', { name: 'Edit text: Nested job title', exact: true }).click();
    const nested = page.getByRole('textbox', {
      name: 'Edit original text: Nested job title',
      exact: true,
    });
    await expect(nested).toBeFocused();
    await nested.fill('Updated job title');
    await nested.press('Enter');
    await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
    await page.getByRole('button', { name: 'Copy text box', exact: true }).click();
    await page.getByRole('button', { name: 'Paste text box', exact: true }).click();
    const copied = page
      .locator('.inline-text-node')
      .filter({ has: page.locator('.inline-text-move') });
    await copied.locator('.inline-text-target').click();
    await expect(copied.locator('input')).toHaveValue('Updated job title');
    await copied.locator('input').fill('Independent grouped copy');
    await copied.locator('input').press('Enter');
    await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
    await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    expect(
      Object.values(record.snapshot!.state.textChanges![record.snapshot!.state.pages[0].id]).find(
        (change) => change.copy,
      )?.copy?.objectPath,
    ).toBeDefined();
    await page.screenshot({ path: `/tmp/folio-grouped-text-${server ? 'server' : 'browser'}.png` });
  });
}

test('the supplied reproduction PDF supports editing after refresh', async ({ page }) => {
  test.skip(
    !process.env.FOLIO_REPRO_PDF,
    'Set FOLIO_REPRO_PDF to inspect a private local reproduction without adding it to the repository.',
  );
  await useBrowserTextPreviewOnly(page);
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles(process.env.FOLIO_REPRO_PDF!);
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', {
    name: 'Edit text: Fullstack Web Developer',
    exact: true,
  });
  await target.click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Fullstack Web Developer',
    exact: true,
  });
  await expect(input).toBeFocused();
  await input.fill('Senior Fullstack Developer');
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.reload();
  await target.click();
  await expect(input).toHaveValue('Senior Fullstack Developer');
  await expect(input).toBeFocused();
  await page.screenshot({ path: '/tmp/folio-resume-editing.png' });
});

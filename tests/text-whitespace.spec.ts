import { test, expect } from './fixtures/editor-storage';
import { adjacentTextPdf } from './fixtures/adjacent-text-pdf';
import {
  disableBrowserTextPreview,
  useBrowserTextPreviewOnly,
} from './fixtures/text-preview-worker';

for (const browserPreview of [true, false])
  test(`saved labels with trailing spaces allow adjacent text editing (${browserPreview ? 'browser' : 'server'})`, async ({
    page,
    workspaceStorage,
  }) => {
    if (browserPreview) await useBrowserTextPreviewOnly(page);
    else await disableBrowserTextPreview(page);
    await page.goto('/workspace');
    await page.locator('.editor-empty input[type=file]').setInputFiles({
      name: 'Adjacent text.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await adjacentTextPdf()),
    });
    await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
    await page.getByRole('button', { name: 'Edit text: PROFILE NAME', exact: true }).click();
    const label = page.getByRole('textbox', {
      name: 'Edit original text: PROFILE NAME',
      exact: true,
    });
    await label.fill('UPDATED PROFILE ');
    await label.press('Enter');
    await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    await page.reload();
    const target = page.getByRole('button', { name: 'Edit text: @[your-username]', exact: true });
    await target.click();
    const input = page.getByRole('textbox', {
      name: 'Edit original text: @[your-username]',
      exact: true,
    });
    await expect(input).toBeFocused();
    await expect(page.getByRole('button', { name: 'Retry editing', exact: true })).toHaveCount(0);
    await input.fill('@updated-profile');
    await input.press('Enter');
    await page
      .getByRole('button', { name: 'Edit text: Another editable section', exact: true })
      .click();
    const other = page.getByRole('textbox', {
      name: 'Edit original text: Another editable section',
      exact: true,
    });
    await other.fill('Updated section');
    await other.press('Enter');
    await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    await page.reload();
    await target.click();
    await expect(input).toHaveValue('@updated-profile');
    await expect(page.locator('.inline-text-status [role=alert]')).toHaveCount(0);
    const snapshot = [...workspaceStorage.records.values()][0].snapshot!;
    const texts = Object.values(snapshot.state.textChanges![snapshot.state.pages[0].id]).map(
      (change) => change.text,
    );
    expect(texts).toEqual(['UPDATED PROFILE ', '@updated-profile', 'Updated section']);
  });

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/editor-storage';

const exitDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Are you sure you want to leave?' });

async function openDocument(page: Page) {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
}

async function addText(page: Page, text: string, y = 130) {
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y } });
  await page.getByRole('textbox', { name: 'Edit added text', exact: true }).fill(text);
}

test('saved documents confirm leaving, keep edits on cancel and fit mobile screens', async ({
  page,
}) => {
  await openDocument(page);
  await addText(page, 'Keep this text');
  const back = page.getByRole('link', { name: 'Back to all tools' });
  await back.click();
  const dialog = exitDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep editing', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.annotation-text')).toContainText('Keep this text');
  await expect(back).toBeFocused();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');

  // The logo and back arrow must keep their own destinations after cancellation.
  await page.getByRole('link', { name: 'Folio home' }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await back.click();
  await expect(dialog).toContainText('Guest files remain available for 24 hours');
  expect(
    (await new AxeBuilder({ page }).include('.editor-exit-dialog').analyze()).violations,
  ).toEqual([]);

  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(size);
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.width).toBeLessThanOrEqual(size.width - 32);
    expect(bounds.height).toBeLessThanOrEqual(size.height * 0.8 + 1);
    await expect(
      dialog.getByRole('button', { name: 'Keep editing', exact: true }),
    ).toBeInViewport();
    await expect(
      dialog.getByRole('button', { name: 'Leave editor', exact: true }),
    ).toBeInViewport();
    await page.screenshot({ path: `/tmp/folio-editor-exit-${size.width}.png` });
  }
  await dialog.getByRole('button', { name: 'Leave editor', exact: true }).click();
  await expect(page).toHaveURL(/\/tools$/);
});

test('pending edits save before leaving and canceling a slow save never navigates later', async ({
  page,
  workspaceStorage,
}) => {
  await openDocument(page);
  const workspaceUrl = page.url();
  let release = () => {};
  workspaceStorage.holdSave = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await addText(page, 'Save before leaving');
    await page.getByRole('link', { name: 'Folio home' }).click();
    const dialog = exitDialog(page);
    await dialog.getByRole('button', { name: 'Leave editor', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
    await expect(page).toHaveURL(workspaceUrl);
    await dialog.getByRole('button', { name: 'Keep editing', exact: true }).click();
    release();
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    await expect(page).toHaveURL(workspaceUrl);
    await expect(dialog).toBeHidden();

    await addText(page, 'The very latest edit', 250);
    await page.getByRole('link', { name: 'Folio home' }).click();
    await dialog.getByRole('button', { name: 'Leave editor', exact: true }).click();
    await expect(page).toHaveURL(/:\d+\/$/);
    const saved = [...workspaceStorage.records.values()][0];
    expect(saved.snapshot?.state.annotations.map((annotation) => annotation.text)).toEqual([
      'Save before leaving',
      'The very latest edit',
    ]);
    await page.goto(workspaceUrl);
    await expect(page.locator('.annotation-text')).toContainText([
      'Save before leaving',
      'The very latest edit',
    ]);
  } finally {
    release();
  }
});

test('failed saves keep the editor open and can be retried before leaving', async ({
  page,
  workspaceStorage,
}) => {
  await openDocument(page);
  workspaceStorage.failSaves = true;
  await addText(page, 'Retry this save');
  await page.getByRole('link', { name: 'Back to all tools' }).click();
  const dialog = exitDialog(page);
  await dialog.getByRole('button', { name: 'Leave editor', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Your latest changes couldn’t be saved');
  await expect(page).toHaveURL(/\/workspace\?cloud=/);
  await expect(dialog.getByRole('button', { name: 'Leave without saving' })).toBeVisible();
  workspaceStorage.failSaves = false;
  await dialog.getByRole('button', { name: 'Retry & leave', exact: true }).click();
  await expect(page).toHaveURL(/\/tools$/);
  expect([...workspaceStorage.records.values()][0].snapshot?.state.annotations[0].text).toBe(
    'Retry this save',
  );
});

test('leaving without saving requires an explicit choice after a failed save', async ({
  page,
  workspaceStorage,
}) => {
  await openDocument(page);
  workspaceStorage.failSaves = true;
  await addText(page, 'An unsaved change');
  await page.getByRole('link', { name: 'Back to all tools' }).click();
  const dialog = exitDialog(page);
  await expect(dialog.getByRole('button', { name: 'Leave without saving' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Leave editor', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'Leave without saving' }).click();
  await expect(page).toHaveURL(/\/tools$/);
});

test('browser back confirms before changing the URL and preserves forward history', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Try the selection tool' }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  const workspaceUrl = page.url();
  const historyLength = await page.evaluate(() => history.length);
  await page.evaluate(() => history.back());
  const dialog = exitDialog(page);
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(workspaceUrl);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page.evaluate(() => history.back());
  await dialog.getByRole('button', { name: 'Leave editor', exact: true }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  await page.goForward();
  await expect(page).toHaveURL(workspaceUrl);
  await expect(page.locator('.editable-page canvas')).toBeVisible();
});

test('tool handoffs confirm, while downloads and new-tab sign-in keep the editor open', async ({
  page,
}) => {
  await openDocument(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await downloadEvent;
  await expect(exitDialog(page)).toBeHidden();
  await page.getByRole('button', { name: 'Sign in to keep', exact: true }).click();
  const signIn = page.getByRole('dialog', { name: 'Keep this document in your account.' });
  const popupEvent = page.waitForEvent('popup');
  await signIn.getByRole('link', { name: 'Sign in to keep' }).click();
  const popup = await popupEvent;
  await expect(exitDialog(page)).toBeHidden();
  await popup.close();
  await signIn.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await page.getByRole('combobox', { name: 'Continue with another tool' }).click();
  await page.getByRole('option', { name: 'Split or extract pages', exact: true }).click();
  await expect(exitDialog(page)).toBeVisible();
  await exitDialog(page).getByRole('button', { name: 'Leave editor', exact: true }).click();
  await expect(page).toHaveURL(/\/split-pdf$/);
  await expect(page.getByText('Studio North — Proposal-edited.pdf', { exact: true })).toBeVisible();
});

test('an empty editor leaves without confirmation; unsaved reloads retain the native guard', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace');
  await expect(page.getByText('Add a PDF to open your workspace.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to all tools' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await openDocument(page);
  workspaceStorage.failSaves = true;
  await addText(page, 'Stay on refresh');
  const nativePrompt = page.waitForEvent('dialog');
  const reload = page.evaluate(() => window.location.reload());
  const prompt = await nativePrompt;
  expect(prompt.type()).toBe('beforeunload');
  await prompt.dismiss();
  await reload;
  await expect(page.getByRole('textbox', { name: 'Edit added text', exact: true })).toHaveValue(
    'Stay on refresh',
  );
});

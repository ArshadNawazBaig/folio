import { test, expect } from './fixtures/editor-storage';
import { createSample } from '../src/lib/sample';

test('restored added text opens inline on click without selecting another tool', async ({
  page,
}) => {
  await page.goto('/workspace?sample=proposal');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  const input = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await input.fill('Click to keep editing');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  await page.reload();
  const text = page.locator('.annotation-text');
  await expect(text).toContainText('Click to keep editing');
  await text.click();
  await expect(input).toBeFocused({ timeout: 3000 });
  await input.fill('Edited directly after refresh');
  await input.press('ControlOrMeta+s');
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  await page.reload();
  await expect(text).toContainText('Edited directly after refresh');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await text.click();
  await expect(input).toHaveValue('Edited directly after refresh');
  await expect(text).toHaveCount(1);
  await input.press('Escape');
  const before = (await text.boundingBox())!;
  await page.mouse.move(before.x + 10, before.y + 10);
  await page.mouse.down();
  await page.mouse.move(before.x + 50, before.y + 40, { steps: 8 });
  await page.mouse.up();
  expect((await text.boundingBox())!.x - before.x).toBeCloseTo(40, 0);
  await expect(input).toHaveCount(0);
  await text.focus();
  await text.press('Enter');
  await expect(input).toBeFocused();
});

test('restored original text can be clicked beyond the original words after a longer replacement', async ({
  page,
}) => {
  await page.goto('/workspace?sample=proposal');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: A place to', exact: true });
  await target.click();
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await input.fill('A place to create and enjoy');
  // Adding text leaves the editor in Move mode. Restoring that mode must not
  // make previously edited original text inert.
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 100 } });
  await page.getByRole('textbox', { name: 'Edit added text', exact: true }).fill('An added note');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  await page.reload();
  await expect(target).toBeVisible();
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  const box = (await target.boundingBox())!;
  const canvas = (await page.locator('.editable-page').boundingBox())!;
  // Click on the added words past the old text's bounding box, as a person
  // would when reopening the PDF, instead of locating an invisible target.
  await page.mouse.click(
    Math.min(canvas.x + canvas.width - 10, box.x + 260),
    box.y + box.height / 2,
  );
  await expect(input).toBeFocused({ timeout: 3000 });
  await expect(input).toHaveValue('A place to create and enjoy');
});

test('Save now verifies stored text and an immediate refresh recovers both text layers', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Edit original text: A place to', exact: true })
    .fill('Saved original words');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('Added words to recover');
  const save = page.getByRole('button', { name: 'Save to cloud', exact: true });
  const success = page.locator('.editor-notifications [role=status]');
  await save.click();
  await expect(success).toHaveText('Your document has been saved.');
  await page.reload();
  await expect(page.locator('.annotation-text')).toContainText('Added words to recover');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true }),
  ).toHaveValue('Saved original words');
  await save.click();
  await expect(success).toHaveText('Your document has been saved.');
  // A successful HTTP response is insufficient when the stored snapshot has
  // lost an edit. Keep the live text and let the user retry that same document.
  workspaceStorage.dropEdits = true;
  await page.locator('.annotation-text').click();
  const added = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await added.fill('Changed after refresh');
  await expect(success).toHaveCount(0);
  await save.click();
  await expect(page.locator('.editor-notifications [role=alert]')).toContainText(
    'saved edits could not be verified',
  );
  await expect(success).toHaveCount(0);
  await expect(page.locator('.annotation-text')).toContainText('Changed after refresh');
  workspaceStorage.dropEdits = false;
  await save.click();
  await expect(success).toHaveText('Your document has been saved.');
  await page.reload();
  await expect(page.locator('.annotation-text')).toContainText('Changed after refresh');
  expect(workspaceStorage.records.size).toBe(1);
});

test('opening a guest PDF uploads once and refresh restores original text edits, annotations, page order and names', async ({
  page,
  workspaceStorage,
}) => {
  const source = Buffer.from(await createSample());
  await page.goto('/');
  await page
    .getByLabel('Choose document files')
    .setInputFiles({ name: 'Customer.pdf', mimeType: 'application/pdf', buffer: source });
  await expect(page).toHaveURL(/\/workspace\?cloud=[a-f0-9-]+$/);
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  expect(workspaceStorage.uploads).toBe(1);
  const url = page.url();
  expect(workspaceStorage.records.values().next().value!.bytes).toEqual(source);
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  await page.reload();
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('Customer.pdf');
  await expect(page.getByRole('button', { name: 'Add text', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('Survives refresh');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Edit original text: A place to', exact: true })
    .fill('Saved original edit');
  await page.getByRole('textbox', { name: 'Document name' }).fill('Renamed.pdf');
  await page.getByRole('button', { name: 'Duplicate page', exact: true }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  expect(workspaceStorage.uploads).toBe(1);
  await page.reload();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('Renamed.pdf');
  await expect(page.locator('.annotation-text')).toContainText('Survives refresh');
  await expect(page.locator('.page-navigation')).toContainText('Page 2 of 4');
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true }),
  ).toHaveValue('Saved original edit');
  await expect(page.locator('.download-gate')).toBeHidden();
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name)),
  ).not.toContain('folio-local');
  // Both existing text layers remain editable after restoring the saved workspace.
  const original = page.getByRole('textbox', {
    name: 'Edit original text: A place to',
    exact: true,
  });
  await original.fill('Original edited after refresh');
  await original.press('ControlOrMeta+s');
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  await original.press('Enter');
  await page.locator('.annotation-text').click();
  const annotation = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await expect(annotation).toBeFocused();
  await annotation.fill('Annotation edited after refresh');
  await annotation.press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 240 } });
  await annotation.fill('Added after refresh');
  await annotation.press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.reload();
  await expect(page.locator('.annotation-text')).toHaveCount(2);
  await expect(
    page.locator('.annotation-text').filter({ hasText: 'Annotation edited after refresh' }),
  ).toBeVisible();
  await expect(
    page.locator('.annotation-text').filter({ hasText: 'Added after refresh' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(original).toHaveValue('Original edited after refresh');
});

test('manual saving confirms success only after the latest edits reach storage and reports failures once', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  const save = page.getByRole('button', { name: 'Save to cloud', exact: true });
  const success = page.locator('.editor-notifications [role=status]');
  await save.click();
  await expect(success).toHaveText('Your document has been saved.');
  workspaceStorage.failSaves = true;
  await page.getByRole('textbox', { name: 'Document name' }).fill('Retry this save.pdf');
  await save.click();
  await expect(page.locator('.editor-notifications [role=alert]')).toHaveText(
    /Storage temporarily unavailable/,
  );
  await expect(success).toHaveCount(0);
  workspaceStorage.failSaves = false;
  let release!: () => void;
  workspaceStorage.holdSave = new Promise<void>((resolve) => {
    release = resolve;
  });
  await save.click();
  await expect(save).toBeDisabled();
  await expect(success).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Document name' }).fill('Latest changes.pdf');
  release();
  workspaceStorage.holdSave = null;
  await expect(success).toHaveText('Your document has been saved.');
  await expect(save).toBeEnabled();
  expect([...workspaceStorage.records.values()][0].name).toBe('Latest changes.pdf');
  await expect(page.locator('.editor-notifications [role=alert]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue(
    'Latest changes.pdf',
  );
  expect(workspaceStorage.uploads).toBe(1);
});

test('upload failures and edits made during a delayed save remain retryable without creating copies', async ({
  page,
  workspaceStorage,
}) => {
  workspaceStorage.failUploads = true;
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('main [role=alert]')).toContainText('upload failed');
  await expect(page.locator('.editor-file-title')).not.toContainText('All changes saved');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('Keep despite failure');
  workspaceStorage.failUploads = false;
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  expect(workspaceStorage.records.size).toBe(1);
  let release!: () => void;
  workspaceStorage.holdSave = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.getByRole('textbox', { name: 'Your text', exact: true }).fill('First request');
  await expect(page.locator('.editor-file-title')).toContainText('Saving changes');
  // Ensure a save has entered transport before typing a newer value.
  await page.waitForRequest(
    (request) =>
      request.url().includes('/api/workspaces/') &&
      request.postData()?.includes('First request') === true,
  );
  await page.getByRole('textbox', { name: 'Your text', exact: true }).fill('Latest request');
  release();
  workspaceStorage.holdSave = null;
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.reload();
  await expect(page.locator('.annotation-text')).toContainText('Latest request');
  expect(workspaceStorage.uploads).toBe(1);
});

test('an older tab cannot silently overwrite a newer saved workspace', async ({
  page,
  context,
}) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page).toHaveURL(/cloud=/);
  const second = await context.newPage();
  await second.goto(page.url());
  await expect(second.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('textbox', { name: 'Document name' }).fill('Newer name.pdf');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await second.getByRole('textbox', { name: 'Document name' }).fill('Older tab.pdf');
  await expect(second.locator('main [role=alert]')).toContainText('changed in another tab');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue('Newer name.pdf');
});

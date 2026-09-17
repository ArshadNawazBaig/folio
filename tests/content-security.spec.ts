import { test, expect } from './fixtures/editor-storage';

test('production CSP keeps PDF editing functional and blocks inline event handlers', async ({
  page,
}) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/violates.*content security policy|refused.*content security policy/i.test(message.text()))
      violations.push(message.text());
  });
  const response = await page.goto('/workspace?sample=proposal');
  const policy = response!.headers()['content-security-policy'];
  expect(policy).toContain("'wasm-unsafe-eval'");
  expect(policy).not.toContain("'unsafe-eval'");
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await input.fill('A clear workspace');
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  expect(violations).toEqual([]);
  // This intentional violation comes after the real editing flow has passed without violations.
  const executed = await page.evaluate(() => {
    const node = document.createElement('button');
    node.setAttribute('onclick', 'window.__unexpectedHandler = true');
    document.body.append(node);
    node.click();
    node.remove();
    return (window as unknown as { __unexpectedHandler?: boolean }).__unexpectedHandler === true;
  });
  expect(executed).toBe(false);
});

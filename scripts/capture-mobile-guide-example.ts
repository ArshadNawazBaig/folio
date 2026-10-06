// Run against the local fixture: node scripts/test-blog-server.mjs
// Captures fictional practice files only; regenerates guide screenshots and verification data.
import { chromium, expect } from '@playwright/test';
import { mockWorkspaceStorage } from '../tests/fixtures/editor-storage';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await mockWorkspaceStorage(context);
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.on('pageerror', (error) => console.error('Browser error:', error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error(msg.text());
});
try {
  await page.goto('http://127.0.0.1:3001/edit-pdf');
  console.log('Loaded editor landing');
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose a file', exact: true }).click();
  await (await picker).setFiles('public/samples/a4-portrait-practice.pdf');
  console.log('Chose sample');
  await page.getByRole('button', { name: 'Open in editor', exact: true }).click();
  await expect(page.locator('.editable-page canvas')).toBeVisible({ timeout: 90000 });
  console.log('Opened workspace');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 35, y: 230 } });
  const added = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await added.fill('Reviewed on my phone');
  await added.press('Escape');
  await expect(page.locator('.annotation-text')).toContainText('Reviewed on my phone');
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await mkdir('public/images/guides', { recursive: true });
  await page.locator('.editable-page').click({ position: { x: 240, y: 350 } });
  console.log('Saved note');
  await sharp(await page.screenshot({ style: 'nextjs-portal { display: none }' }))
    .webp({ quality: 88 })
    .toFile('public/images/guides/mobile-add-text.webp');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const ready = page.getByRole('dialog', { name: 'Your file is ready.' });
  await expect(ready).toBeVisible();
  await sharp(await page.screenshot({ style: 'nextjs-portal { display: none }' }))
    .webp({ quality: 88 })
    .toFile('public/images/guides/mobile-download.webp');
  const downloaded = page.waitForEvent('download');
  await ready.getByRole('link', { name: 'Download file', exact: true }).click();
  const file = await downloaded;
  const bytes = await readFile((await file.path())!);
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const pdf = await task.promise;
  const words = (await (await pdf.getPage(1)).getTextContent()).items
    .map((i) => ('str' in i ? i.str : ''))
    .join(' ');
  expect(words).toContain('Reviewed on my phone');
  await task.destroy();
  const evidence = {
    checkedAt: new Date().toISOString(),
    browser: await browser.version(),
    mode: 'Chromium mobile emulation; 390×844 CSS pixels; local application with storage fixture',
    source: '/samples/a4-portrait-practice.pdf',
    downloadFilename: file.suggestedFilename(),
    downloadBytes: bytes.length,
    downloadSha256: createHash('sha256').update(bytes).digest('hex'),
    verified: [
      'file selected from editor landing page',
      'new annotation present in downloaded PDF',
      'editor remains open after download',
    ],
  };
  await expect(page).toHaveURL(/\/workspace\?cloud=/);
  await writeFile('src/lib/mobile-guide-example.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(evidence);
} finally {
  await browser.close();
}

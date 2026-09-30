// Verify deployment traces, including running the PDF worker without access to
// the repository's full node_modules. Run after a production build.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PNG } from 'pngjs';

const root = process.cwd();
const build = path.resolve(process.argv[2] || '.next');
const workerRoutes = [
  '/api/pro/pdf',
  '/api/pro/preview',
  '/api/pro/demo',
  '/api/documents/process',
  '/api/documents/preview',
];
async function traceFiles(route) {
  const trace = path.join(build, 'server/app', route, 'route.js.nft.json');
  const { files } = JSON.parse(await readFile(trace, 'utf8'));
  return [...new Set(files.map((file) => path.resolve(path.dirname(trace), file)))];
}
async function report(route, files) {
  let size = 0;
  for (const file of files) size += (await stat(file)).size;
  console.log(`${route}: ${(size / 1024 / 1024).toFixed(2)} MiB in ${files.length} traced files`);
}
const worker = path.join(root, 'scripts/pro-pdf-worker.mjs');
const traces = await Promise.all(workerRoutes.map(traceFiles));
// Every worker route must carry the same worker runtime dependencies.
const runtimeFiles = traces[1].filter((file) => !file.startsWith(build + path.sep));
for (let index = 0; index < traces.length; index++) {
  const files = new Set(traces[index]);
  for (const file of runtimeFiles)
    assert.ok(files.has(file), `${workerRoutes[index]} is missing ${path.relative(root, file)}`);
  assert.ok(files.has(worker), `${workerRoutes[index]} is missing the PDF worker`);
  await report(workerRoutes[index], traces[index]);
}
const exported = await traceFiles('/api/documents/export');
assert.ok(!exported.includes(worker), 'Prepared downloads must not bundle the PDF worker');
assert.ok(
  !exported.some((file) => file.includes('/node_modules/@embedpdf/pdfium/')),
  'Prepared downloads must not bundle PDFium',
);
await report('/api/documents/export', exported);
const prerender = JSON.parse(await readFile(path.join(build, 'prerender-manifest.json'), 'utf8'));
assert.ok(prerender.routes['/api/capabilities'], 'Capabilities must be prerendered');
for (const tool of ['translate-pdf', 'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint'])
  assert.ok(prerender.routes[`/${tool}`], `${tool} must be prerendered`);

const isolated = await mkdtemp(path.join(tmpdir(), 'folio-worker-bundle-'));
try {
  for (const file of runtimeFiles) {
    const relative = path.relative(root, file);
    assert.ok(!relative.startsWith('..'), 'Worker dependency is outside the project');
    const target = path.join(isolated, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(file, target);
  }
  function run(bytes, job) {
    const result = JSON.parse(
      execFileSync(process.execPath, ['scripts/pro-pdf-worker.mjs'], {
        cwd: isolated,
        env: { LANG: 'C.UTF-8', NODE_ENV: 'production', TMPDIR: isolated },
        input: JSON.stringify({ bytes: Buffer.from(bytes).toString('base64'), job }),
        timeout: 30_000,
        maxBuffer: 42 * 1024 * 1024,
      }).toString(),
    );
    assert.equal(result.error, undefined);
    return result;
  }
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(
    await readFile(path.join(root, 'public/fonts/pdf/LiberationSans-Regular.ttf')),
    { subset: true },
  );
  document.addPage([300, 150]).drawText('Original invoice', { x: 20, y: 80, size: 18, font });
  const source = await document.save();
  assert.equal(run(source, { operation: 'info' }).pageCount, 1);
  const inspected = run(source, { operation: 'inspect' });
  const block = inspected.blocks.find((block) => block.text === 'Original invoice');
  assert.ok(block, 'The packaged worker must inspect embedded fonts');
  const changes = [
    {
      id: block.id,
      original: block.text,
      text: 'Updated invoice 42',
      font: 'original',
      size: block.size,
      color: block.color,
    },
  ];
  const preview = run(source, { operation: 'preview', page: 0, changes, pixelWidth: 600 });
  assert.equal(PNG.sync.read(Buffer.from(preview.preview, 'base64')).width, 600);
  const edited = Buffer.from(run(source, { operation: 'edit', changes }).bytes, 'base64');
  assert.ok(
    run(edited, { operation: 'inspect' }).blocks.some((block) => block.text === changes[0].text),
    'The packaged worker must export and reopen edited text with missing subset glyphs',
  );
  const protectedFile = run(source, { operation: 'protect', password: 'bundle-test-password' });
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(Buffer.from(protectedFile.bytes, 'base64')),
    password: 'bundle-test-password',
    useSystemFonts: true,
  });
  try {
    const content = await (await (await task.promise).getPage(1)).getTextContent();
    assert.ok(content.items.some((item) => 'str' in item && item.str === 'Original invoice'));
  } finally {
    await task.destroy();
  }
  console.log(
    'Isolated worker passed: inspection, PNG preview, font completion, edit, protection.',
  );
} finally {
  await rm(isolated, { recursive: true, force: true });
}

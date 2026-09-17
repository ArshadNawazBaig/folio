import { copyFile, mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
await mkdir('public/pdfjs', { recursive: true });
await copyFile(
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  'public/pdfjs/pdf.worker.min.mjs',
);

for (const folder of ['cmaps', 'standard_fonts', 'wasm'])
  await cp(`node_modules/pdfjs-dist/${folder}`, `public/pdfjs/${folder}`, { recursive: true });
await mkdir('public/pdfium', { recursive: true });
await copyFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm', 'public/pdfium/pdfium.wasm');
// Keep the legacy URL for existing tabs; new workers use a compressed,
// content-addressed asset that can remain in the browser cache across refreshes.
const engine = await readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm');
const hash = createHash('sha256').update(engine).digest('hex').slice(0, 16);
const browserAsset = `/pdfium/pdfium-${hash}.wasm.gz`;
await writeFile(`public${browserAsset}`, gzipSync(engine, { level: 9 }));
await writeFile('src/lib/pdfium-asset.json', `${JSON.stringify({ browserAsset }, null, 2)}\n`);

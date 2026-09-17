// Regenerate the raster icons from Folio's existing vector mark. No new artwork is introduced.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = await readFile(new URL('../src/app/icon.svg', import.meta.url));
const png = (size) => sharp(source).resize(size, size).png().toBuffer();
for (const size of [192, 512])
  await writeFile(new URL(`../public/icon-${size}.png`, import.meta.url), await png(size));
await writeFile(new URL('../public/apple-touch-icon.png', import.meta.url), await png(180));
await writeFile(new URL('../src/app/apple-icon.png', import.meta.url), await png(180));

// ICO accepts PNG frames; include a 48px frame suitable for search results and smaller browser sizes.
const sizes = [16, 32, 48, 64];
const frames = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i];
  header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(
  new URL('../src/app/favicon.ico', import.meta.url),
  Buffer.concat([header, ...frames]),
);

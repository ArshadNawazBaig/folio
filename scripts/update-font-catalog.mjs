import { readFile, writeFile } from 'node:fs/promises';

// Metadata only: font binaries are fetched when a document uses a face.
const source = JSON.parse(
  await readFile(
    new URL(
      '../node_modules/next/dist/compiled/@next/font/dist/google/font-data.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const families = Object.entries(source)
  .filter(([, font]) => font.subsets.includes('latin'))
  .map(([family, font]) => ({
    id: family
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    family,
    weights: font.weights.filter((weight) => /^\d+$/.test(weight)).map(Number),
    styles: font.styles,
  }))
  .filter((font) => font.weights.length);
if (new Set(families.map((font) => font.id)).size !== families.length)
  throw new Error('Duplicate font identifiers.');
await writeFile(
  new URL('../src/lib/document-font-catalog.json', import.meta.url),
  JSON.stringify(families) + '\n',
);
console.log(`Updated ${families.length} Latin font families. No font binaries downloaded.`);

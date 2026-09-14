import { findDocumentFont } from '../document-font-registry.mjs';
export {
  findDocumentFont,
  isDocumentFont,
  documentFontFamily,
  searchDocumentFonts,
} from '../document-font-registry.mjs';
import { readFile, writeFile, mkdir, rename, readdir, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const directory = path.join(tmpdir(), 'folio-document-fonts-v1');
const memory = new Map(),
  pending = new Map();
const MAX_FILE = 8 * 1024 * 1024,
  MAX_MEMORY = 32 * 1024 * 1024;
const MAX_DISK = 128 * 1024 * 1024,
  TTL = 7 * 24 * 60 * 60 * 1000;
let memorySize = 0,
  pruning = null;
const unavailable = () =>
  new Error('This font could not be loaded. Try again or choose another font.');
async function validate(bytes) {
  if (bytes.length > MAX_FILE || bytes.length < 12 || bytes.readUInt32BE(0) !== 0x00010000)
    throw unavailable();
  const { default: fontkit } = await import('@pdf-lib/fontkit');
  const font = fontkit.create(bytes);
  if (
    !font.hasGlyphForCodePoint(65) ||
    !font.hasGlyphForCodePoint(97) ||
    Object.keys(font.variationAxes || {}).length
  )
    throw unavailable();
}
async function boundedFetch(url, limit, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok || Number(response.headers.get('content-length')) > limit) throw unavailable();
  const reader = response.body?.getReader();
  if (!reader) throw unavailable();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw unavailable();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}
async function prune() {
  const files = await Promise.all(
    (await readdir(directory))
      .filter((name) => name.endsWith('.ttf'))
      .map(async (name) => ({
        name,
        info: await stat(path.join(directory, name)).catch(() => null),
      })),
  );
  let size = files.reduce((sum, file) => sum + (file.info?.size || 0), 0);
  for (const file of files.sort((a, b) => (a.info?.mtimeMs || 0) - (b.info?.mtimeMs || 0))) {
    if (size <= MAX_DISK) break;
    await unlink(path.join(directory, file.name)).catch(() => {});
    size -= file.info?.size || 0;
  }
}
async function load(value) {
  const face = findDocumentFont(value);
  if (!face) throw new Error('Choose an available font and style.');
  const file = path.join(directory, `${createHash('sha256').update(value).digest('hex')}.ttf`);
  const info = await stat(file).catch(() => null);
  if (info && info.size <= MAX_FILE && Date.now() - info.mtimeMs < TTL) {
    try {
      const bytes = await readFile(file);
      await validate(bytes);
      return bytes;
    } catch {
      /* Fetch a fresh copy if a cache entry is damaged. */
    }
  }
  // Request a static TrueType instance, shared by the browser and PDF engines.
  // Never send document text or a user-supplied URL to the font provider.
  const spec = `${face.family}:ital,wght@${face.style === 'italic' ? 1 : 0},${face.weight}`;
  const css = (
    await boundedFetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(spec)}`,
      128 * 1024,
      { headers: { 'User-Agent': 'Folio-PDF-Fonts/1.0' } },
    )
  ).toString('utf8');
  const urls = [
    ...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/s\/[a-zA-Z0-9/_-]+\.ttf)\)/g),
  ];
  if (urls.length !== 1) throw unavailable();
  const bytes = await boundedFetch(urls[0][1], MAX_FILE);
  await validate(bytes);
  await mkdir(directory, { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes);
    await rename(temporary, file);
    pruning ??= prune()
      .catch(() => {})
      .finally(() => {
        pruning = null;
      });
    await pruning;
  } finally {
    await unlink(temporary).catch(() => {});
  }
  return bytes;
}
export async function loadDocumentFont(value) {
  // Validate before cache lookup and network access, including direct PDF worker jobs.
  if (!findDocumentFont(value)) throw new Error('Choose an available font and style.');
  const cached = memory.get(value);
  if (cached && Date.now() - cached.time < TTL) {
    memory.delete(value);
    memory.set(value, cached);
    return cached.bytes;
  }
  if (pending.has(value)) return pending.get(value);
  if (pending.size >= 4) throw new Error('Fonts are still loading. Please try again in a moment.');
  const task = load(value)
    .then((bytes) => {
      const previous = memory.get(value);
      if (previous) {
        memorySize -= previous.bytes.length;
        memory.delete(value);
      }
      while (memorySize + bytes.length > MAX_MEMORY && memory.size) {
        const first = memory.keys().next().value;
        memorySize -= memory.get(first).bytes.length;
        memory.delete(first);
      }
      memory.set(value, { bytes, time: Date.now() });
      memorySize += bytes.length;
      return bytes;
    })
    .catch((error) => {
      throw error.message?.startsWith('Choose an available') ? error : unavailable();
    })
    .finally(() => pending.delete(value));
  pending.set(value, task);
  return task;
}

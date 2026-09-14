import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { init } from '@embedpdf/pdfium';
import {
  findDocumentFont,
  isDocumentFont,
  loadDocumentFont,
} from '../src/lib/server/document-fonts.mjs';
import { isPdfTextSize } from '../src/lib/pdf-text-size.mjs';
import { isPdfTextOffset, moveTextMatrix } from '../src/lib/pdf-text-position.mjs';
import { pdfPreviewLayout } from '../src/lib/pdf-preview.mjs';
import {
  completeOriginalFont,
  matchingOriginalFont,
  originalFontWeight,
  originalFontCategory,
  pdfEditCharacters,
} from '../src/lib/pdf-original-fonts.mjs';

const fonts = [
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Courier',
  'Courier-Bold',
];
let instance;
async function engine() {
  instance ??= init({
    wasmBinary: await readFile(new URL(import.meta.resolve('@embedpdf/pdfium/pdfium.wasm'))),
    print: () => {},
    printErr: () => {},
  }).then((api) => {
    api.PDFiumExt_Init();
    return api;
  });
  return instance;
}
function fallbackFont(name) {
  if (fonts.includes(name)) return name;
  const bold = /bold|black|heavy/i.test(name),
    italic = /italic|oblique/i.test(name);
  if (/times|serif|georgia/i.test(name))
    return bold ? 'Times-Bold' : italic ? 'Times-Italic' : 'Times-Roman';
  if (/courier|mono/i.test(name)) return bold ? 'Courier-Bold' : 'Courier';
  return bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica';
}
export async function processTextPdf(bytes, job) {
  if (
    !bytes.length ||
    bytes.length > (['preview', 'info'].includes(job.operation) ? 20 : 10) * 1024 * 1024 ||
    !Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from('%PDF-'))
  )
    throw new Error('Choose a PDF smaller than 10 MB.');
  const api = await engine(),
    heap = api.pdfium;
  const alloc = (size) => {
    const ptr = heap.wasmExports.malloc(size);
    if (!ptr) throw new Error('This document needs too much memory.');
    return ptr;
  };
  const free = (ptr) => heap.wasmExports.free(ptr);
  const source = alloc(bytes.length);
  heap.HEAPU8.set(bytes, source);
  const doc = api.FPDF_LoadMemDocument(source, bytes.length, '');
  if (!doc) {
    free(source);
    throw new Error('This PDF cannot be opened. Use an unencrypted, undamaged PDF.');
  }
  const fontPrograms = new Map(),
    loadedFonts = new Map(),
    characterSets = new Map();
  const missingCharacters = () =>
    new Error(
      'The original font does not contain some of these characters. Choose another font in Text appearance to use them.',
    );
  async function fontProgram(handle) {
    if (fontPrograms.has(handle)) return fontPrograms.get(handle);
    let parsed = null;
    const sizePtr = alloc(4);
    let dataPtr = 0;
    try {
      if (
        api.FPDFFont_GetIsEmbedded(handle) === 1 &&
        api.FPDFFont_GetFontData(handle, 0, 0, sizePtr)
      ) {
        const size = heap.getValue(sizePtr, 'i32');
        if (size > 0 && size <= 4 * 1024 * 1024) {
          dataPtr = alloc(size);
          if (api.FPDFFont_GetFontData(handle, dataPtr, size, sizePtr)) {
            const { default: fontkit } = await import('@pdf-lib/fontkit');
            parsed = fontkit.create(heap.HEAPU8.slice(dataPtr, dataPtr + size));
            // Fontkit reads cmap lazily. Some PDF subsets intentionally omit this table.
            parsed.hasGlyphForCodePoint(32);
          }
        }
      }
    } catch {
      // Some Type 1 fonts have no Unicode cmap; retain the PDF text round-trip check.
      parsed = null;
    } finally {
      if (dataPtr) free(dataPtr);
      free(sizePtr);
    }
    fontPrograms.set(handle, parsed);
    return parsed;
  }
  const hasGlyph = (font, char) => font.hasGlyphForCodePoint(char.codePointAt(0));
  function glyphSignature(handle, character) {
    const path = api.FPDFFont_GetGlyphPath(handle, character, 1);
    const count = path ? api.FPDFGlyphPath_CountGlyphSegments(path) : 0;
    if (count <= 0 || count > 10000) return '';
    const scratch = alloc(8),
      points = [];
    try {
      for (let i = 0; i < count; i++) {
        const point = api.FPDFGlyphPath_GetGlyphPathSegment(path, i);
        if (!api.FPDFPathSegment_GetPoint(point, scratch, scratch + 4)) return '';
        points.push(
          api.FPDFPathSegment_GetType(point),
          heap.getValue(scratch, 'float'),
          heap.getValue(scratch + 4, 'float'),
        );
      }
      return points.join(',');
    } finally {
      free(scratch);
    }
  }
  function availableCharacters(handle, program) {
    if (!characterSets.has(handle)) {
      const notdef = glyphSignature(handle, 0);
      characterSets.set(
        handle,
        [...pdfEditCharacters]
          .filter((char) => {
            if (program && !hasGlyph(program, char)) return false;
            if (/\s/u.test(char)) return true;
            const signature = glyphSignature(handle, char.codePointAt(0));
            return !!signature && signature !== notdef;
          })
          .join(''),
      );
    }
    return characterSets.get(handle);
  }
  async function loadFontFace(face, text) {
    if (!loadedFonts.has(face.name)) {
      const data = face.google
        ? await loadDocumentFont(face.name)
        : await readFile(new URL(`../public${face.url}`, import.meta.url));
      const { default: fontkit } = await import('@pdf-lib/fontkit');
      const parsed = fontkit.create(data);
      const ptr = alloc(data.length);
      try {
        heap.HEAPU8.set(data, ptr);
        const handle = api.FPDFText_LoadFont(doc, ptr, data.length, 2, true);
        if (!handle) throw missingCharacters();
        loadedFonts.set(face.name, { handle, parsed });
      } finally {
        free(ptr);
      }
    }
    const loaded = loadedFonts.get(face.name);
    if ([...text].some((char) => !/\s/u.test(char) && !hasGlyph(loaded.parsed, char)))
      throw missingCharacters();
    return loaded.handle;
  }
  try {
    const pageCount = api.FPDF_GetPageCount(doc);
    if (pageCount < 1 || pageCount > 100)
      throw new Error(
        'Text editing supports up to 100 pages per document. Split a larger PDF first.',
      );
    if (api.EPDF_IsEncrypted(doc))
      throw new Error('Open a copy without password protection to use these tools.');
    if (api.FPDF_GetSignatureCount(doc))
      throw new Error('Digitally signed PDFs cannot be edited here. Use an unsigned original.');
    if ([2, 3].includes(api.FPDF_GetFormType(doc)))
      throw new Error('This PDF uses XFA forms, which are not supported by this editor.');
    if (job.operation === 'info') return { pageCount };
    if (job.operation === 'protect') {
      if (
        typeof job.password !== 'string' ||
        job.password.length < 8 ||
        Buffer.byteLength(job.password, 'utf8') > 64 ||
        /[\u0000-\u001f]/.test(job.password)
      )
        throw new Error('Use a password of at least 8 characters and at most 64 UTF-8 bytes.');
      if (!api.EPDF_SetEncryption(doc, job.password, randomBytes(32).toString('hex'), 3900))
        throw new Error('Password protection could not be applied.');
      return save();
    }
    const blocks = [];
    let skipped = 0;
    const changes = new Map();
    if (job.operation === 'edit' || job.operation === 'preview') {
      if (
        !Array.isArray(job.changes) ||
        (job.operation === 'edit' && !job.changes.length) ||
        job.changes.length > 5000
      )
        throw new Error('Choose at least one text change.');
      for (const change of job.changes) {
        if (changes.has(change.id))
          throw new Error('A text block was changed more than once in this request.');
        if (change.font !== 'original' && !isDocumentFont(change.font))
          throw new Error('Choose an available text font.');
        if (!isPdfTextSize(change.size)) throw new Error('Choose a valid positive text size.');
        if (!isPdfTextOffset(change.offset)) throw new Error('Choose a valid text position.');
        if (!/^#[\da-f]{6}$/i.test(change.color)) throw new Error('Choose a valid text color.');
        if (typeof change.text !== 'string' || change.text.length > 2000)
          throw new Error('Text blocks support up to 2,000 characters.');
        // Moving/resizing an existing object never rewrites its encoded text. PDF
        // extraction can expose control codes or non-Latin glyphs that are valid
        // in that original font. Only newly encoded text needs this restriction.
        // The original string is still checked against the actual object below.
        if (
          (change.font !== 'original' || change.text !== change.original) &&
          /[^\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]/u.test(
            change.text,
          )
        )
          throw new Error(
            'New text supports Latin characters on a single line. Remove unsupported characters from the replacement text.',
          );
        changes.set(change.id, change);
      }
    } else if (job.operation !== 'inspect') throw new Error('Unknown PDF operation.');
    // Inspection needs every text object. An edit/preview only needs objects on
    // changed pages; the original bytes already contain all untouched content.
    // Keep validating changes on other pages too, including stale object IDs.
    const pages =
      job.operation === 'inspect'
        ? Array.from({ length: pageCount }, (_, index) => index)
        : [...new Set([...changes.keys()].map((id) => Number(String(id).split(':')[0])))];
    if (pages.some((p) => !Number.isInteger(p) || p < 0 || p >= pageCount))
      throw new Error('Some selected text could not be edited. Reopen the original PDF.');
    let applied = 0;
    for (const p of pages) {
      const page = api.FPDF_LoadPage(doc, p);
      if (!page) throw new Error(`Page ${p + 1} could not be opened.`);
      let textPage = api.FPDFText_LoadPage(page);
      try {
        const count = api.FPDFPage_CountObjects(page);
        if (count > 30000) throw new Error('This page is too complex to edit. Try a simpler PDF.');
        const pending = [];
        for (let i = 0; i < count; i++) {
          if (job.operation !== 'inspect' && !changes.has(`${p}:${i}`)) continue;
          const object = api.FPDFPage_GetObject(page, i),
            type = api.FPDFPageObj_GetType(object);
          if (type === 5) {
            skipped++;
            continue;
          }
          if (type !== 1) continue;
          const clip = api.FPDFPageObj_GetClipPath(object);
          if (
            api.FPDFTextObj_GetTextRenderMode(object) !== 0 ||
            (clip && api.FPDFClipPath_CountPaths(clip) > 0)
          ) {
            skipped++;
            continue;
          }
          const len = api.FPDFTextObj_GetText(object, textPage, 0, 0);
          if (len <= 2 || len > 20000) {
            skipped++;
            continue;
          }
          const textPtr = alloc(len);
          api.FPDFTextObj_GetText(object, textPage, textPtr, len);
          const text = heap.UTF16ToString(textPtr);
          free(textPtr);
          if (!text.trim()) continue;
          const id = `${p}:${i}`;
          const change = changes.get(id);
          if (change && text !== change.original)
            throw new Error(
              'The PDF changed since it was opened. Reopen the original and try again.',
            );
          if (change?.text === '') {
            // Selecting text only removes its original ink from the background.
            // There is no replacement font to inspect, load or validate here.
            pending.push({ object, index: i, change, runs: [], complete: 0 });
            continue;
          }
          const scratch = alloc(64);
          try {
            if (
              !api.FPDFPageObj_GetBounds(object, scratch, scratch + 4, scratch + 8, scratch + 12) ||
              !api.FPDFTextObj_GetFontSize(object, scratch + 16) ||
              !api.FPDFPageObj_GetMatrix(object, scratch + 24) ||
              !api.FPDFPageObj_GetFillColor(
                object,
                scratch + 48,
                scratch + 52,
                scratch + 56,
                scratch + 60,
              )
            ) {
              skipped++;
              continue;
            }
            const bounds = [0, 4, 8, 12].map((offset) => heap.getValue(scratch + offset, 'float'));
            const size = heap.getValue(scratch + 16, 'float');
            const matrix = [0, 4, 8, 12, 16, 20].map((offset) =>
              heap.getValue(scratch + 24 + offset, 'float'),
            );
            if (!isPdfTextSize(size) || !matrix.every(Number.isFinite)) {
              skipped++;
              continue;
            }
            const rgba = [48, 52, 56, 60].map((offset) => heap.getValue(scratch + offset, 'i32'));
            const fontHandle = api.FPDFTextObj_GetFont(object);
            const fontLen = api.FPDFFont_GetBaseFontName(fontHandle, 0, 0);
            const fontPtr = alloc(Math.max(1, fontLen));
            api.FPDFFont_GetBaseFontName(fontHandle, fontPtr, fontLen);
            const font = fontLen ? heap.UTF8ToString(fontPtr) : 'Helvetica';
            free(fontPtr);
            const program = await fontProgram(fontHandle);
            const fontWeight = Math.max(
              1,
              Math.min(1000, program?.['OS/2']?.usWeightClass || originalFontWeight(font)),
            );
            const fontItalic =
              !!(api.FPDFFont_GetFlags(fontHandle) & 64) || /italic|oblique/i.test(font);
            const fontCategory = originalFontCategory(font, api.FPDFFont_GetFlags(fontHandle));
            const fontCharacters = availableCharacters(fontHandle, program);
            if (blocks.length >= 5000)
              throw new Error(
                'This PDF has too many text blocks. Split it into smaller documents.',
              );
            blocks.push({
              id,
              page: p,
              objectIndex: i,
              text,
              font,
              fontWeight,
              fontItalic,
              fontCategory,
              fontCharacters,
              replacementFont: fallbackFont(font),
              size,
              color: `#${rgba
                .slice(0, 3)
                .map((n) => n.toString(16).padStart(2, '0'))
                .join('')}`,
              bounds,
              matrix,
            });
            if (change) {
              const missing = new Set(
                change.font === 'original'
                  ? [...change.text].filter(
                      (char) => !text.includes(char) && !fontCharacters.includes(char),
                    )
                  : [],
              );
              const exactFace = completeOriginalFont(font);
              const complete =
                findDocumentFont(change.font) && change.text
                  ? await loadFontFace({ name: change.font, google: true }, change.text)
                  : missing.size && exactFace
                    ? await loadFontFace(exactFace, change.text)
                    : 0;
              const runs = [];
              if (missing.size && !complete) {
                const fallback = await loadFontFace(
                  matchingOriginalFont(font, fontWeight, fontItalic, fontCategory),
                  [...missing].join(''),
                );
                for (const char of change.text) {
                  const handle = missing.has(char) ? fallback : fontHandle;
                  if (runs.at(-1)?.handle === handle) runs.at(-1).text += char;
                  else runs.push({ handle, text: char });
                }
              }
              pending.push({
                object,
                index: i,
                change,
                matrix,
                size,
                color: blocks.at(-1).color,
                alpha: rgba[3],
                // A Unicode round-trip can succeed for glyph 0 (.notdef). Validate the
                // font program too, and complete known subsets with the exact named face.
                complete,
                runs,
              });
            }
          } finally {
            free(scratch);
          }
        }
        api.FPDFText_ClosePage(textPage);
        textPage = 0;
        // Remove and insert at the same drawing position, from last to first, to retain stacking order.
        const preserved = [];
        for (const {
          object,
          index,
          change,
          matrix,
          size,
          color,
          alpha,
          complete,
          runs,
        } of pending.reverse()) {
          if (runs.length) {
            const replacements = [],
              scratch = alloc(28);
            let advance = 0;
            try {
              for (const run of runs) {
                if (!run.text.trim()) {
                  for (const char of run.text) {
                    if (
                      !api.FPDFFont_GetGlyphWidth(
                        run.handle,
                        char.codePointAt(0),
                        change.size,
                        scratch + 24,
                      )
                    )
                      throw missingCharacters();
                    advance += heap.getValue(scratch + 24, 'float');
                  }
                  continue;
                }
                const replacement = api.FPDFPageObj_CreateTextObj(doc, run.handle, change.size);
                if (!replacement) throw missingCharacters();
                replacements.push({ object: replacement, text: run.text, trimWhitespace: true });
                const ptr = alloc((run.text.length + 1) * 2);
                try {
                  heap.stringToUTF16(run.text, ptr, (run.text.length + 1) * 2);
                  const placed = moveTextMatrix(matrix, change.offset);
                  placed[4] += matrix[0] * advance;
                  placed[5] += matrix[1] * advance;
                  placed.forEach((n, i) => heap.setValue(scratch + i * 4, n, 'float'));
                  const rgb = change.color.match(/[\da-f]{2}/gi).map((hex) => parseInt(hex, 16));
                  if (
                    !api.FPDFText_SetText(replacement, ptr) ||
                    !api.FPDFPageObj_SetMatrix(replacement, scratch) ||
                    !api.FPDFPageObj_SetFillColor(replacement, ...rgb, alpha)
                  )
                    throw missingCharacters();
                  for (const char of run.text) {
                    if (
                      !api.FPDFFont_GetGlyphWidth(
                        run.handle,
                        char.codePointAt(0),
                        change.size,
                        scratch + 24,
                      )
                    )
                      throw missingCharacters();
                    advance += heap.getValue(scratch + 24, 'float');
                  }
                } finally {
                  free(ptr);
                }
              }
              if (!api.FPDFPage_RemoveObject(page, object))
                throw new Error('The original text could not be moved.');
              api.FPDFPageObj_Destroy(object);
              for (const [offset, replacement] of replacements.entries()) {
                if (!api.FPDFPage_InsertObjectAtIndex(page, replacement.object, index + offset))
                  throw new Error('The changed text could not be inserted.');
                replacement.inserted = true;
                preserved.push(replacement);
              }
            } finally {
              for (const replacement of replacements)
                if (!replacement.inserted) api.FPDFPageObj_Destroy(replacement.object);
              free(scratch);
            }
            applied++;
            continue;
          }
          if (change.font === 'original' && change.text && !complete) {
            // Keep the actual PDF font resource and the object's rendering state. Loading a
            // standard font here loses embedded families, intermediate weights and italics.
            const textPtr = alloc((change.text.length + 1) * 2),
              matrixPtr = alloc(24);
            try {
              heap.stringToUTF16(change.text, textPtr, (change.text.length + 1) * 2);
              if (change.text !== change.original && !api.FPDFText_SetText(object, textPtr))
                throw new Error(
                  'This text could not be updated using its original font. Choose another font and try again.',
                );
              if (change.size !== size || change.offset?.x || change.offset?.y) {
                moveTextMatrix(matrix, change.offset, change.size / size).forEach((number, index) =>
                  heap.setValue(matrixPtr + index * 4, number, 'float'),
                );
                if (!api.FPDFPageObj_SetMatrix(object, matrixPtr))
                  throw new Error('This text could not be resized.');
              }
              if (change.color !== color) {
                const rgb = change.color.match(/[\da-f]{2}/gi).map((hex) => parseInt(hex, 16));
                if (!api.FPDFPageObj_SetFillColor(object, ...rgb, alpha))
                  throw new Error('This text color could not be updated.');
              }
              // Matrix/color-only edits leave the font's encoded glyphs untouched.
              if (change.text !== change.original) preserved.push({ object, text: change.text });
            } finally {
              free(textPtr);
              free(matrixPtr);
            }
            applied++;
            continue;
          }
          let replacement = 0;
          if (change.text) {
            replacement = complete
              ? api.FPDFPageObj_CreateTextObj(doc, complete, change.size)
              : api.FPDFPageObj_NewTextObj(doc, change.font, change.size);
            if (!replacement) throw new Error('The replacement font could not be loaded.');
            const textPtr = alloc((change.text.length + 1) * 2),
              matrixPtr = alloc(24);
            try {
              heap.stringToUTF16(change.text, textPtr, (change.text.length + 1) * 2);
              moveTextMatrix(matrix, change.offset).forEach((number, index) =>
                heap.setValue(matrixPtr + index * 4, number, 'float'),
              );
              const rgb = change.color.match(/[\da-f]{2}/gi).map((hex) => parseInt(hex, 16));
              if (
                !api.FPDFText_SetText(replacement, textPtr) ||
                !api.FPDFPageObj_SetMatrix(replacement, matrixPtr) ||
                !api.FPDFPageObj_SetFillColor(replacement, ...rgb, alpha)
              )
                throw new Error('This text block could not be replaced.');
            } catch (error) {
              api.FPDFPageObj_Destroy(replacement);
              throw error;
            } finally {
              free(textPtr);
              free(matrixPtr);
            }
          }
          if (!api.FPDFPage_RemoveObject(page, object)) {
            if (replacement) api.FPDFPageObj_Destroy(replacement);
            throw new Error('The original text could not be removed.');
          }
          api.FPDFPageObj_Destroy(object);
          if (replacement && !api.FPDFPage_InsertObjectAtIndex(page, replacement, index)) {
            api.FPDFPageObj_Destroy(replacement);
            throw new Error('The replacement text could not be inserted.');
          }
          if (complete) preserved.push({ object: replacement, text: change.text });
          applied++;
        }
        if (pending.length && !api.FPDFPage_GenerateContent(page))
          throw new Error('The changed page could not be saved.');
        if (preserved.length) {
          // SetText can report success even if a subset font cannot encode a new character.
          // Never return a successful export with missing or silently substituted letters.
          textPage = api.FPDFText_LoadPage(page);
          let objectCharacters;
          const encodedText = (object) => {
            if (!objectCharacters) {
              objectCharacters = new Map();
              const wanted = new Set(preserved.map((item) => item.object));
              const count = api.FPDFText_CountChars(textPage);
              if (count < 0 || count > 1000000)
                throw new Error(
                  'This page has too much text to verify. Split the PDF and try again.',
                );
              for (let i = 0; i < count; i++) {
                const owner = api.FPDFText_GetTextObject(textPage, i);
                if (!wanted.has(owner) || api.FPDFText_IsGenerated(textPage, i) === 1) continue;
                const code = api.FPDFText_GetUnicode(textPage, i);
                objectCharacters.set(
                  owner,
                  (objectCharacters.get(owner) || '') + String.fromCodePoint(code),
                );
              }
            }
            return objectCharacters.get(object) || '';
          };
          for (const { object, text, trimWhitespace } of preserved) {
            const len = api.FPDFTextObj_GetText(object, textPage, 0, 0);
            const ptr = alloc(Math.max(2, len));
            try {
              api.FPDFTextObj_GetText(object, textPage, ptr, len);
              const actual = len > 2 ? heap.UTF16ToString(ptr) : '';
              // PDFium can assign a space inferred between adjacent font runs to either
              // object. Check their characters while allowing those boundary spaces.
              const matches = (value) =>
                trimWhitespace ? value.trim() === text.trim() : value === text;
              // Moving text beside other objects can add layout-generated spaces or
              // line breaks to extracted text. Verify the encoded characters instead.
              if (!matches(actual) && !matches(encodedText(object)))
                throw new Error(
                  'The original font does not contain some of these characters. Choose another font in Text appearance to use them.',
                );
            } finally {
              free(ptr);
            }
          }
        }
      } finally {
        if (textPage) api.FPDFText_ClosePage(textPage);
        api.FPDF_ClosePage(page);
      }
    }
    if (job.operation === 'inspect') return { pageCount, blocks, skipped };
    if (applied !== changes.size)
      throw new Error('Some selected text could not be edited. Reopen the original PDF.');
    if (job.operation === 'preview') return await renderPreview();
    return save();
    async function renderPreview() {
      if (!Number.isInteger(job.page) || job.page < 0 || job.page >= pageCount)
        throw new Error('Choose a valid preview page.');
      const { default: sharp } = await import('sharp');
      const page = api.FPDF_LoadPage(doc, job.page);
      if (!page) throw new Error('This page could not be previewed.');
      if ([0, 90, 180, 270].includes(job.rotation))
        api.FPDFPage_SetRotation(page, job.rotation / 90);
      try {
        const pageWidth = api.FPDF_GetPageWidthF(page),
          pageHeight = api.FPDF_GetPageHeightF(page);
        const {
          width,
          height,
          tiles: regions,
        } = pdfPreviewLayout(pageWidth, pageHeight, job.pixelWidth);
        const tiles = [];
        let outputSize = 0;
        for (const region of regions) {
          const bitmap = api.FPDFBitmap_Create(width, region.height, 1);
          if (!bitmap) throw new Error('The preview could not be rendered.');
          try {
            api.FPDFBitmap_FillRect(bitmap, 0, 0, width, region.height, 0xffffffff);
            // Render the same full-page transform into each section; no resampling or seams.
            api.FPDF_RenderPageBitmap(bitmap, page, 0, -region.top, width, height, 0, 1);
            const source = api.FPDFBitmap_GetBuffer(bitmap),
              stride = api.FPDFBitmap_GetStride(bitmap);
            const rgba = Buffer.alloc(width * region.height * 4);
            for (let y = 0; y < region.height; y++)
              for (let x = 0; x < width; x++) {
                const from = source + y * stride + x * 4,
                  to = (y * width + x) * 4;
                rgba[to] = heap.HEAPU8[from + 2];
                rgba[to + 1] = heap.HEAPU8[from + 1];
                rgba[to + 2] = heap.HEAPU8[from];
                rgba[to + 3] = heap.HEAPU8[from + 3];
              }
            // Native lossless compression keeps the exact pixels and avoids
            // spending hundreds of milliseconds filtering rows in JavaScript.
            const preview = (
              await sharp(rgba, { raw: { width, height: region.height, channels: 4 } })
                .png({ compressionLevel: 3, adaptiveFiltering: false })
                .toBuffer()
            ).toString('base64');
            outputSize += preview.length;
            if (outputSize > 32 * 1024 * 1024)
              throw new Error('The page preview is too large. Reduce the zoom and retry.');
            tiles.push({ ...region, preview });
          } finally {
            api.FPDFBitmap_Destroy(bitmap);
          }
        }
        return {
          preview: tiles[0].preview,
          width,
          height,
          page: job.page,
          ...(tiles.length > 1 ? { tiles } : {}),
        };
      } finally {
        api.FPDF_ClosePage(page);
      }
    }
    function save() {
      const writer = api.PDFiumExt_OpenFileWriter();
      try {
        // A complete rewrite, never an incremental append of original page content.
        if (!api.FPDF_SaveAsCopy(doc, writer, 2)) throw new Error('The PDF could not be saved.');
        const size = api.PDFiumExt_GetFileWriterSize(writer);
        if (!size || size > 30 * 1024 * 1024)
          throw new Error('The output is too large. Try a smaller PDF.');
        const ptr = alloc(size);
        try {
          if (api.PDFiumExt_GetFileWriterData(writer, ptr, size) !== size)
            throw new Error('The PDF output is incomplete.');
          return heap.HEAPU8.slice(ptr, ptr + size);
        } finally {
          free(ptr);
        }
      } finally {
        api.PDFiumExt_CloseFileWriter(writer);
      }
    }
  } finally {
    for (const { handle } of loadedFonts.values()) api.FPDFFont_Close(handle);
    api.FPDF_CloseDocument(doc);
    free(source);
  }
}

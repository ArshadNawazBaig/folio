import { findDocumentFont, isDocumentFont } from './document-font-registry.mjs';
import { isPdfTextSize } from './pdf-text-size.mjs';
import { isPdfTextOffset, moveTextMatrix } from './pdf-text-position.mjs';
import { pdfPreviewLayout } from './pdf-preview.mjs';
import { visibleClippedText } from './pdf-text-clip.mjs';
import { copyTextObjects } from './pdf-text-copy.mjs';
import { pageTextObjects, liftTextObject, regenerateTextForms } from './pdf-text-objects.mjs';
import { prepareFormTextSource } from './pdf-form-source.mjs';
import {
  sourcePaints,
  markedPaint,
  paintColor,
  movedPaint,
  drawGradientText,
} from './pdf-text-paint.mjs';
import {
  completeOriginalFont,
  matchingOriginalFont,
  originalFontWeight,
  originalFontCategory,
  pdfEditCharacters,
} from './pdf-original-fonts.mjs';

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
function fallbackFont(name) {
  if (fonts.includes(name)) return name;
  const bold = /bold|black|heavy/i.test(name),
    italic = /italic|oblique/i.test(name);
  if (/times|serif|georgia/i.test(name))
    return bold ? 'Times-Bold' : italic ? 'Times-Italic' : 'Times-Roman';
  if (/courier|mono/i.test(name)) return bold ? 'Courier-Bold' : 'Courier';
  return bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica';
}
export async function processTextPdf(bytes, job, platform) {
  if (!['inspect', 'preview', 'info'].includes(job.operation) && !platform.allowExport)
    throw new Error('Use the download action to export a finished PDF.');
  if (
    !bytes.length ||
    bytes.length > (['preview', 'info'].includes(job.operation) ? 20 : 10) * 1024 * 1024 ||
    !new TextDecoder('latin1').decode(bytes.subarray(0, 1024)).includes('%PDF-')
  )
    throw new Error('Choose a PDF smaller than 10 MB.');
  const api = await platform.engine(),
    heap = api.pdfium;
  const alloc = (size) => {
    const ptr = heap.wasmExports.malloc(size);
    if (!ptr) throw new Error('This document needs too much memory.');
    return ptr;
  };
  const free = (ptr) => heap.wasmExports.free(ptr);
  const objectBounds = (object) => {
    const ptr = alloc(16);
    try {
      if (!api.FPDFPageObj_GetBounds(object, ptr, ptr + 4, ptr + 8, ptr + 12)) return null;
      return [0, 4, 8, 12].map((v) => heap.getValue(ptr + v, 'float'));
    } finally {
      free(ptr);
    }
  };
  const dirtyBounds = [];
  const dirty = (object, p) => {
    if (job.operation === 'preview' && job.partial === true && p === job.page) {
      const bounds = objectBounds(object);
      if (bounds) dirtyBounds.push(bounds);
    }
  };
  let source = alloc(bytes.length);
  heap.HEAPU8.set(bytes, source);
  let doc = api.FPDF_LoadMemDocument(source, bytes.length, '');
  if (!doc) {
    free(source);
    throw new Error('This PDF cannot be opened. Use an unencrypted, undamaged PDF.');
  }
  const copiedPages = new Map();
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
      const data = await platform.loadFont(face);
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
        new TextEncoder().encode(job.password).length > 64 ||
        [...job.password].some((char) => char.charCodeAt(0) < 32)
      )
        throw new Error('Use a password of at least 8 characters and at most 64 UTF-8 bytes.');
      if (!api.EPDF_SetEncryption(doc, job.password, platform.passwordSeed(), 3900))
        throw new Error('Password protection could not be applied.');
      return save();
    }
    let grouped = false;
    const candidates =
      job.page !== undefined
        ? [job.page]
        : job.changes?.length
          ? [...new Set(job.changes.map((change) => Number(String(change.id).split(':')[0])))]
          : Array.from({ length: pageCount }, (_, index) => index);
    for (const index of candidates) {
      if (!Number.isInteger(index) || index < 0 || index >= pageCount) continue;
      const page = api.FPDF_LoadPage(doc, index);
      if (!page) continue;
      try {
        const count = api.FPDFPage_CountObjects(page);
        for (let i = 0; i < count && !grouped; i++)
          grouped = api.FPDFPageObj_GetType(api.FPDFPage_GetObject(page, i)) === 5;
      } finally {
        api.FPDF_ClosePage(page);
      }
      if (grouped) break;
    }
    if (grouped) {
      const prepared = await prepareFormTextSource(bytes);
      grouped = prepared.nested;
      if (grouped) {
        api.FPDF_CloseDocument(doc);
        doc = 0;
        free(source);
        source = 0;
        bytes = prepared.bytes;
        source = alloc(bytes.length);
        heap.HEAPU8.set(bytes, source);
        doc = api.FPDF_LoadMemDocument(source, bytes.length, '');
        if (!doc) throw new Error('The PDF groups could not be prepared for editing.');
      }
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
    if ([...changes.values()].some((change) => change.copy)) {
      const mapped = copyTextObjects(
        api,
        heap,
        doc,
        source,
        bytes.length,
        [...changes.values()],
        pageCount,
        alloc,
        free,
        copiedPages,
      );
      changes.clear();
      for (const change of mapped) {
        if (changes.has(change.id)) throw new Error('Choose distinct text boxes to edit.');
        changes.set(change.id, change);
      }
    }
    // Inspection needs every text object. An edit/preview only needs objects on
    // changed pages; the original bytes already contain all untouched content.
    // Keep validating changes on other pages too, including stale object IDs.
    const pages =
      job.operation === 'inspect'
        ? job.page === undefined
          ? Array.from({ length: pageCount }, (_, index) => index)
          : [job.page]
        : [...new Set([...changes.keys()].map((id) => Number(String(id).split(':')[0])))];
    if (pages.some((p) => !Number.isInteger(p) || p < 0 || p >= pageCount))
      throw new Error('Some selected text could not be edited. Reopen the original PDF.');
    let applied = 0;
    for (const p of pages) {
      const page = copiedPages.get(p) || api.FPDF_LoadPage(doc, p);
      copiedPages.delete(p);
      if (!page) throw new Error(`Page ${p + 1} could not be opened.`);
      let textPage = api.FPDFText_LoadPage(page);
      try {
        const entries = pageTextObjects(api, heap, page, textPage, alloc, free, grouped);
        const pending = [];
        for (const entry of entries) {
          const i = entry.index,
            id = `${p}:${entry.path.join('.')}`;
          if (job.operation !== 'inspect' && !changes.has(id)) continue;
          const object = entry.object,
            type = api.FPDFPageObj_GetType(object);
          if (type === 5) {
            skipped++;
            continue;
          }
          if (type !== 1) continue;
          const clip = api.FPDFPageObj_GetClipPath(object);
          const clipped = !!clip && api.FPDFClipPath_CountPaths(clip) > 0;
          if (
            api.FPDFTextObj_GetTextRenderMode(object) !== 0 ||
            (clipped && !visibleClippedText(api, heap, clip, objectBounds(object), alloc, free))
          ) {
            skipped++;
            continue;
          }
          const copied = changes.get(id)?.copy;
          const len = api.FPDFTextObj_GetText(object, textPage, 0, 0);
          if ((!copied && len <= 2) || len > 20000) {
            skipped++;
            continue;
          }
          const textPtr = alloc(Math.max(2, len));
          api.FPDFTextObj_GetText(object, textPage, textPtr, len);
          // PDFium suppresses overlapping duplicate glyphs during extraction. The
          // copy source was verified against its own page before it was inserted.
          const text = copied
            ? changes.get(id).original
            : (entry.text ?? heap.UTF16ToString(textPtr));
          free(textPtr);
          if (!text.trim()) continue;
          let change = changes.get(id);
          if (change && text !== change.original)
            throw new Error(
              'The PDF changed since it was opened. Reopen the original and try again.',
            );
          let painted = null;
          const colorPtr = alloc(16);
          let transparent;
          try {
            transparent =
              api.FPDFPageObj_GetFillColor(
                object,
                colorPtr,
                colorPtr + 4,
                colorPtr + 8,
                colorPtr + 12,
              ) && heap.getValue(colorPtr + 12, 'i32') === 0;
          } finally {
            free(colorPtr);
          }
          if (transparent) {
            const companion = i > 0 ? api.FPDFPage_GetObject(page, i - 1) : 0;
            const companionType = companion && api.FPDFPageObj_GetType(companion);
            const bounds = objectBounds(object),
              graphicBounds = companion && objectBounds(companion);
            if (
              bounds &&
              graphicBounds &&
              [3, 5].includes(companionType) &&
              bounds[0] >= graphicBounds[0] - 2 &&
              bounds[1] >= graphicBounds[1] - 2 &&
              bounds[2] <= graphicBounds[2] + 2 &&
              bounds[3] <= graphicBounds[3] + 2 &&
              graphicBounds[2] - graphicBounds[0] <= (bounds[2] - bounds[0]) * 2 + 10 &&
              graphicBounds[3] - graphicBounds[1] <= (bounds[3] - bounds[1]) * 2 + 10
            ) {
              const candidates =
                companionType === 5
                  ? (await sourcePaints(bytes)).filter((entry) =>
                      entry.bounds.every((n, index) => Math.abs(n - graphicBounds[index]) < 1),
                    )
                  : [];
              const paint =
                companionType === 3
                  ? markedPaint(api, heap, companion, alloc, free)
                  : candidates.length &&
                      candidates.every(
                        (entry) =>
                          JSON.stringify(entry.paint) === JSON.stringify(candidates[0].paint),
                      )
                    ? candidates[0].paint
                    : null;
              if (paint) painted = { object: companion, paint };
            }
            // An invisible OCR/selection layer is not the visible lettering.
            if (!painted) {
              skipped++;
              continue;
            }
            if (change && change.preservePaint === undefined && change.color === '#000000') {
              // Upgrade edits saved before transparent text was identified correctly.
              change = { ...change, color: paintColor(painted.paint, bounds), preservePaint: true };
            }
          }
          if (change) {
            if (
              entry.members &&
              job.operation === 'preview' &&
              job.partial === true &&
              p === job.page
            )
              dirtyBounds.push(entry.bounds);
            else dirty(object, p);
            if (painted) dirty(painted.object, p);
          }
          if (change?.text === '') {
            // Selecting text only removes its original ink from the background.
            // There is no replacement font to inspect, load or validate here.
            pending.push({ object, entry, change, runs: [], complete: 0, painted });
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
            const bounds =
              entry.bounds ??
              [0, 4, 8, 12].map((offset) => heap.getValue(scratch + offset, 'float'));
            const size = heap.getValue(scratch + 16, 'float');
            const matrix =
              entry.matrix ??
              [0, 4, 8, 12, 16, 20].map((offset) => heap.getValue(scratch + 24 + offset, 'float'));
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
              ...(entry.members ? { objectPath: entry.path } : {}),
              text,
              font,
              fontWeight,
              fontItalic,
              fontCategory,
              fontCharacters,
              replacementFont: fallbackFont(font),
              size,
              color: painted
                ? paintColor(painted.paint, bounds)
                : `#${rgba
                    .slice(0, 3)
                    .map((n) => n.toString(16).padStart(2, '0'))
                    .join('')}`,
              ...(painted ? { paint: painted.paint } : {}),
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
                entry,
                change,
                matrix,
                size,
                color: blocks.at(-1).color,
                alpha: painted ? 255 : rgba[3],
                painted,
                clipped,
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
          entry,
          change,
          matrix,
          size,
          color,
          alpha,
          complete,
          runs,
          painted,
          clipped,
        } of pending.reverse()) {
          const sourceIndex = liftTextObject(api, heap, page, entry, alloc, free);
          const regrouped = (entry.members?.length || 0) > 1;
          const index = sourceIndex - (painted ? 1 : 0);
          if (painted) {
            if (!api.FPDFPage_RemoveObject(page, painted.object))
              throw new Error('The original text appearance could not be removed.');
            api.FPDFPageObj_Destroy(painted.object);
          }
          const finishAppearance = (objects) => {
            for (const object of objects) dirty(object, p);
            if (!painted || !change.text) return;
            if (
              change.preservePaint !== false &&
              (change.preservePaint || change.color === color)
            ) {
              const appearance = movedPaint(
                painted.paint,
                [matrix[4], matrix[5]],
                change.size / size,
                change.offset,
              );
              if (appearance.colors.every((color) => color === appearance.colors[0])) {
                // A constant gradient is a solid fill. Keep it as sharp, native PDF text.
                const rgb = appearance.colors[0].match(/[\da-f]{2}/gi).map((v) => parseInt(v, 16));
                for (const object of objects) api.FPDFPageObj_SetFillColor(object, ...rgb, 255);
                return;
              }
              for (const [offset, object] of objects.entries()) {
                // Pair each font run with its own appearance so it remains editable
                // after export, including words that need a missing-glyph fallback.
                const image = drawGradientText(
                  api,
                  heap,
                  doc,
                  page,
                  [object],
                  appearance,
                  alloc,
                  free,
                );
                if (!api.FPDFPage_InsertObjectAtIndex(page, image, index + offset * 2)) {
                  api.FPDFPageObj_Destroy(image);
                  throw new Error('The text appearance could not be inserted.');
                }
                dirty(image, p);
              }
            } else {
              const rgb = change.color.match(/[\da-f]{2}/gi).map((v) => parseInt(v, 16));
              for (const object of objects) api.FPDFPageObj_SetFillColor(object, ...rgb, 255);
            }
          };
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
                replacements.push({ object: replacement, text: run.text });
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
              finishAppearance(replacements.map((replacement) => replacement.object));
            } finally {
              for (const replacement of replacements)
                if (!replacement.inserted) api.FPDFPageObj_Destroy(replacement.object);
              free(scratch);
            }
            applied++;
            continue;
          }
          if (change.font === 'original' && change.text && !complete && !painted && !clipped) {
            // Keep the actual PDF font resource and the object's rendering state. Loading a
            // standard font here loses embedded families, intermediate weights and italics.
            const textPtr = alloc((change.text.length + 1) * 2),
              matrixPtr = alloc(24);
            try {
              heap.stringToUTF16(change.text, textPtr, (change.text.length + 1) * 2);
              if (
                (change.text !== change.original || regrouped) &&
                !api.FPDFText_SetText(object, textPtr)
              )
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
              if (change.text !== change.original || regrouped)
                preserved.push({ object, text: change.text });
              finishAppearance([object]);
            } finally {
              free(textPtr);
              free(matrixPtr);
            }
            applied++;
            continue;
          }
          let replacement = 0;
          if (change.text) {
            replacement =
              complete || ((painted || clipped) && change.font === 'original')
                ? api.FPDFPageObj_CreateTextObj(
                    doc,
                    complete || api.FPDFTextObj_GetFont(object),
                    change.size,
                  )
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
          if (complete || ((painted || clipped) && replacement))
            preserved.push({ object: replacement, text: change.text });
          if (replacement) finishAppearance([replacement]);
          applied++;
        }
        if (pending.length && grouped) regenerateTextForms(api, heap, page, alloc, free);
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
          for (const { object, text } of preserved) {
            const len = api.FPDFTextObj_GetText(object, textPage, 0, 0);
            const ptr = alloc(Math.max(2, len));
            try {
              api.FPDFTextObj_GetText(object, textPage, ptr, len);
              const actual = len > 2 ? heap.UTF16ToString(ptr) : '';
              // PDFium infers boundary spaces from neighboring objects and can omit
              // encoded leading/trailing spaces when those neighbors are removed for
              // editing. This affects whole text objects as well as fallback font runs.
              // Ignore only boundary whitespace; letters, symbols and internal spaces
              // must still match so missing glyphs cannot silently pass verification.
              const matches = (value) => value.trim() === text.trim();
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
    if (job.operation === 'inspect')
      return {
        version: 4,
        pageCount,
        blocks,
        skipped,
        ...(job.page === undefined ? {} : { pages }),
      };
    if (applied !== changes.size)
      throw new Error('Some selected text could not be edited. Reopen the original PDF.');
    if (job.operation === 'preview') return await renderPreview();
    return save();
    async function renderPreview() {
      if (!Number.isInteger(job.page) || job.page < 0 || job.page >= pageCount)
        throw new Error('Choose a valid preview page.');
      const page = api.FPDF_LoadPage(doc, job.page);
      if (!page) throw new Error('This page could not be previewed.');
      if ([0, 90, 180, 270].includes(job.rotation))
        api.FPDFPage_SetRotation(page, job.rotation / 90);
      try {
        const pageWidth = api.FPDF_GetPageWidthF(page),
          pageHeight = api.FPDF_GetPageHeightF(page);
        let {
          width,
          height,
          tiles: regions,
        } = pdfPreviewLayout(pageWidth, pageHeight, job.pixelWidth);
        const partial = job.partial === true;
        if (partial) {
          // Selection/edits only replace strips containing old or new ink. The
          // existing PDF canvas supplies the rest of a long page without repainting it.
          const scale = Math.min((job.pixelWidth || width) / pageWidth, 65536 / pageHeight);
          width = Math.max(1, Math.floor(pageWidth * scale));
          height = Math.max(1, Math.floor(pageHeight * scale));
          const ptr = alloc(8),
            intervals = [];
          try {
            for (const bounds of dirtyBounds) {
              const ys = [];
              for (const [x, y] of [
                [bounds[0], bounds[1]],
                [bounds[2], bounds[3]],
              ]) {
                if (!api.FPDF_PageToDevice(page, 0, 0, width, height, 0, x, y, ptr, ptr + 4))
                  throw new Error('The text preview position could not be read.');
                ys.push(heap.getValue(ptr + 4, 'i32'));
              }
              const padding = Math.max(4, Math.ceil(scale * 2));
              const top = Math.max(0, Math.min(...ys) - padding),
                bottom = Math.min(height, Math.max(...ys) + padding);
              if (bottom > top) intervals.push([top, bottom]);
            }
          } finally {
            free(ptr);
          }
          const merged = [];
          for (const interval of intervals.sort((a, b) => a[0] - b[0])) {
            const last = merged.at(-1);
            if (last && interval[0] <= last[1] + 8) last[1] = Math.max(last[1], interval[1]);
            else merged.push(interval);
          }
          regions = [];
          const tileHeight = Math.max(1, Math.min(4096, Math.floor((4 * 1024 * 1024) / width)));
          for (const [top, bottom] of merged)
            for (let y = top; y < bottom; y += tileHeight)
              regions.push({ top: y, height: Math.min(tileHeight, bottom - y) });
          if (regions.reduce((size, region) => size + width * region.height, 0) > 64 * 1024 * 1024)
            throw new Error('The edited area is too large to preview at this zoom.');
        }
        const tiles = [];
        // Keep browser selections out of the PNG encode/base64/decode pipeline.
        // Long pages retain the bounded PNG path to limit transferred pixel memory.
        const directPixels =
          platform.transferPixels &&
          regions.reduce((n, r) => n + width * r.height, 0) <= 16 * 1024 * 1024;
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
            const rgba = new Uint8Array(width * region.height * 4);
            for (let y = 0; y < region.height; y++)
              for (let x = 0; x < width; x++) {
                const from = source + y * stride + x * 4,
                  to = (y * width + x) * 4;
                rgba[to] = heap.HEAPU8[from + 2];
                rgba[to + 1] = heap.HEAPU8[from + 1];
                rgba[to + 2] = heap.HEAPU8[from];
                rgba[to + 3] = heap.HEAPU8[from + 3];
              }
            if (directPixels) tiles.push({ ...region, data: rgba });
            else {
              const preview = await platform.encodeRgba(rgba, width, region.height);
              outputSize += preview.length;
              if (outputSize > 32 * 1024 * 1024)
                throw new Error('The page preview is too large. Reduce the zoom and retry.');
              tiles.push({ ...region, preview });
            }
          } finally {
            api.FPDFBitmap_Destroy(bitmap);
          }
        }
        if (directPixels)
          return {
            pixels: tiles,
            width,
            height,
            page: job.page,
            ...(partial ? { partial: true } : {}),
          };
        return {
          preview: tiles[0]?.preview || '',
          width,
          height,
          page: job.page,
          ...(tiles.length > 1 || partial ? { tiles } : {}),
          ...(partial ? { partial: true } : {}),
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
    for (const page of copiedPages.values()) api.FPDF_ClosePage(page);
    for (const { handle } of loadedFonts.values()) api.FPDFFont_Close(handle);
    api.FPDF_CloseDocument(doc);
    free(source);
  }
}

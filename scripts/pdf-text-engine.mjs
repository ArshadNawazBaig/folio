import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { init } from '@embedpdf/pdfium';
import { PNG } from 'pngjs';
import { isPdfTextSize } from '../src/lib/pdf-text-size.mjs';

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
        if (
          !fonts.includes(change.font) ||
          !isPdfTextSize(change.size) ||
          !/^#[\da-f]{6}$/i.test(change.color) ||
          typeof change.text !== 'string' ||
          change.text.length > 2000 ||
          /[^\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]/u.test(
            change.text,
          )
        )
          throw new Error(
            'Replacement text supports Latin characters on a single line and needs a valid positive font size.',
          );
        changes.set(change.id, change);
      }
    } else if (job.operation !== 'inspect') throw new Error('Unknown PDF operation.');
    let applied = 0;
    for (let p = 0; p < pageCount; p++) {
      const page = api.FPDF_LoadPage(doc, p);
      if (!page) throw new Error(`Page ${p + 1} could not be opened.`);
      let textPage = api.FPDFText_LoadPage(page);
      try {
        const count = api.FPDFPage_CountObjects(page);
        if (count > 30000) throw new Error('This page is too complex to edit. Try a simpler PDF.');
        const pending = [];
        for (let i = 0; i < count; i++) {
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
            const id = `${p}:${i}`;
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
              replacementFont: fallbackFont(font),
              size,
              color: `#${rgba
                .slice(0, 3)
                .map((n) => n.toString(16).padStart(2, '0'))
                .join('')}`,
              bounds,
              matrix,
            });
            const change = changes.get(id);
            if (change) {
              if (text !== change.original)
                throw new Error(
                  'The PDF changed since it was opened. Reopen the original and try again.',
                );
              pending.push({ object, index: i, change, matrix, alpha: rgba[3] });
            }
          } finally {
            free(scratch);
          }
        }
        api.FPDFText_ClosePage(textPage);
        textPage = 0;
        // Remove and insert at the same drawing position, from last to first, to retain stacking order.
        for (const { object, index, change, matrix, alpha } of pending.reverse()) {
          let replacement = 0;
          if (change.text) {
            replacement = api.FPDFPageObj_NewTextObj(doc, change.font, change.size);
            if (!replacement) throw new Error('The replacement font could not be loaded.');
            const textPtr = alloc((change.text.length + 1) * 2),
              matrixPtr = alloc(24);
            try {
              heap.stringToUTF16(change.text, textPtr, (change.text.length + 1) * 2);
              matrix.forEach((number, index) =>
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
          applied++;
        }
        if (pending.length && !api.FPDFPage_GenerateContent(page))
          throw new Error('The changed page could not be saved.');
      } finally {
        if (textPage) api.FPDFText_ClosePage(textPage);
        api.FPDF_ClosePage(page);
      }
    }
    if (job.operation === 'inspect') return { pageCount, blocks, skipped };
    if (applied !== changes.size)
      throw new Error('Some selected text could not be edited. Reopen the original PDF.');
    if (job.operation === 'preview') return renderPreview();
    return save();
    function renderPreview() {
      if (!Number.isInteger(job.page) || job.page < 0 || job.page >= pageCount)
        throw new Error('Choose a valid preview page.');
      const page = api.FPDF_LoadPage(doc, job.page);
      if (!page) throw new Error('This page could not be previewed.');
      if ([0, 90, 180, 270].includes(job.rotation))
        api.FPDFPage_SetRotation(page, job.rotation / 90);
      let bitmap = 0;
      try {
        const pageWidth = api.FPDF_GetPageWidthF(page),
          pageHeight = api.FPDF_GetPageHeightF(page);
        const scale = Math.min(1000 / pageWidth, 1400 / pageHeight);
        const width = Math.max(1, Math.round(pageWidth * scale)),
          height = Math.max(1, Math.round(pageHeight * scale));
        if (!Number.isFinite(scale) || width * height > 1400000)
          throw new Error('This page is too large to preview.');
        bitmap = api.FPDFBitmap_Create(width, height, 1);
        if (!bitmap) throw new Error('The preview could not be rendered.');
        api.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff);
        api.FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, 1);
        const source = api.FPDFBitmap_GetBuffer(bitmap),
          stride = api.FPDFBitmap_GetStride(bitmap);
        const rgba = Buffer.alloc(width * height * 4);
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) {
            const from = source + y * stride + x * 4,
              to = (y * width + x) * 4;
            rgba[to] = heap.HEAPU8[from + 2];
            rgba[to + 1] = heap.HEAPU8[from + 1];
            rgba[to + 2] = heap.HEAPU8[from];
            rgba[to + 3] = heap.HEAPU8[from + 3];
          }
        return {
          preview: PNG.sync.write({ width, height, data: rgba }).toString('base64'),
          width,
          height,
          page: job.page,
        };
      } finally {
        if (bitmap) api.FPDFBitmap_Destroy(bitmap);
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
    api.FPDF_CloseDocument(doc);
    free(source);
  }
}

import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
  PDFName,
  PDFHexString,
  PDFString,
  type PDFPage,
} from 'pdf-lib';
import JSZip from 'jszip';
import type {
  Annotation,
  EditorState,
  PdfInput,
  PdfOperation,
  PdfOptions,
  PdfOutput,
  PageModel,
} from './types';
import { baseName } from './utils';
import { annotationUrl } from './annotation-url';
import { hasTextChanges } from './editor-text';

function color(hex = '#202522') {
  const value = hex.replace('#', '');
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}
export async function inspectPdf(bytes: Uint8Array): Promise<{
  state: EditorState;
  fields: {
    name: string;
    type: string;
    value: string | boolean;
    options?: string[];
    required: boolean;
    readonly: boolean;
  }[];
}> {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages().map((p, i) => ({
    id: `page-${i}`,
    sourceIndex: i,
    rotation: p.getRotation().angle,
    width: p.getCropBox().width,
    height: p.getCropBox().height,
  }));
  const fields = doc
    .getForm()
    .getFields()
    .flatMap((f) => {
      const common = { name: f.getName(), required: f.isRequired(), readonly: f.isReadOnly() };
      if (f instanceof PDFTextField)
        return [
          { ...common, type: f.isMultiline() ? 'multiline' : 'text', value: f.getText() || '' },
        ];
      if (f instanceof PDFCheckBox)
        return [{ ...common, type: 'checkbox', value: f.isChecked() }] as {
          name: string;
          type: string;
          value: string | boolean;
          required: boolean;
          readonly: boolean;
        }[];
      if (f instanceof PDFDropdown || f instanceof PDFOptionList)
        return [
          { ...common, type: 'select', value: f.getSelected()[0] || '', options: f.getOptions() },
        ];
      if (f instanceof PDFRadioGroup)
        return [
          { ...common, type: 'select', value: f.getSelected() || '', options: f.getOptions() },
        ];
      return [];
    });
  return {
    state: {
      pages,
      annotations: [],
      formValues: Object.fromEntries(fields.map((f) => [f.name, f.value])),
    },
    fields,
  };
}
// Coordinates in the editor use the rotated crop box, with an origin at top left.
export function pagePoint(page: PDFPage, rotation: number, x: number, y: number) {
  const { x: cx, y: cy, width: w, height: h } = page.getCropBox();
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return { x: cx + y, y: cy + x };
    case 180:
      return { x: cx + w - x, y: cy + y };
    case 270:
      return { x: cx + w - y, y: cy + h - x };
    default:
      return { x: cx + x, y: cy + h - y };
  }
}
async function annotate(
  doc: PDFDocument,
  page: PDFPage,
  model: PageModel,
  a: Annotation,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
) {
  const rotation = ((model.rotation % 360) + 360) % 360;
  const pos = pagePoint(page, rotation, a.x, a.y + a.height);
  const common = { ...pos, rotate: degrees(rotation), color: color(a.color), opacity: a.opacity };
  if (a.kind === 'text' || a.kind === 'signature') {
    const chosen =
      a.kind === 'signature' ? await doc.embedFont(StandardFonts.TimesRomanItalic) : font;
    const start = pagePoint(page, rotation, a.x, a.y + a.size);
    page.drawText(a.text, {
      ...common,
      ...start,
      size: a.size,
      font: chosen,
      maxWidth: a.width,
      lineHeight: a.size * 1.25,
    });
  } else if (a.kind === 'rectangle' || a.kind === 'highlight' || a.kind === 'whiteout') {
    page.drawRectangle({
      ...common,
      width: a.width,
      height: a.height,
      color: a.kind === 'rectangle' ? undefined : color(a.color),
      borderColor: color(a.color),
      borderWidth: a.kind === 'rectangle' ? 1.5 : 0,
      borderOpacity: a.opacity,
    });
  } else if (a.kind === 'ellipse') {
    const center = pagePoint(page, rotation, a.x + a.width / 2, a.y + a.height / 2);
    page.drawEllipse({
      ...center,
      xScale: a.width / 2,
      yScale: a.height / 2,
      rotate: degrees(rotation),
      borderColor: color(a.color),
      borderWidth: 1.5,
      borderOpacity: a.opacity,
    });
  } else if (['cross', 'check', 'line'].includes(a.kind)) {
    const segments =
      a.kind === 'cross'
        ? [
            [0.12, 0.12, 0.88, 0.88],
            [0.12, 0.88, 0.88, 0.12],
          ]
        : a.kind === 'check'
          ? [
              [0.1, 0.52, 0.38, 0.82],
              [0.38, 0.82, 0.9, 0.15],
            ]
          : [[0, 0.5, 1, 0.5]];
    for (const [x1, y1, x2, y2] of segments)
      page.drawLine({
        start: pagePoint(page, rotation, a.x + x1 * a.width, a.y + y1 * a.height),
        end: pagePoint(page, rotation, a.x + x2 * a.width, a.y + y2 * a.height),
        thickness: a.size,
        color: color(a.color),
        opacity: a.opacity,
      });
  } else if (a.kind === 'link' || a.kind === 'comment') {
    const corners = [
      pagePoint(page, rotation, a.x, a.y),
      pagePoint(page, rotation, a.x + a.width, a.y + a.height),
    ];
    const rect = [
      Math.min(...corners.map((p) => p.x)),
      Math.min(...corners.map((p) => p.y)),
      Math.max(...corners.map((p) => p.x)),
      Math.max(...corners.map((p) => p.y)),
    ];
    const annotation = doc.context.obj({
      Type: 'Annot',
      Subtype: a.kind === 'link' ? 'Link' : 'Text',
      Rect: rect,
      P: page.ref,
      F: 4,
      NM: PDFHexString.fromText(a.id),
      ...(a.kind === 'link'
        ? {
            Border: [0, 0, 0],
            A: { S: 'URI', URI: PDFString.of(annotationUrl(a.url || '')) },
          }
        : {
            Contents: PDFHexString.fromText(a.text),
            T: PDFHexString.fromText('Folio'),
            Name: PDFName.of('Comment'),
            Open: false,
            CA: a.opacity,
            C: [1, 0.85, 0.4],
          }),
    });
    page.node.addAnnot(doc.context.register(annotation));
    if (a.kind === 'comment') {
      // Keep the note location visible in viewers that render page content without annotation layers.
      page.drawRectangle({
        ...common,
        width: a.width,
        height: a.height,
        color: rgb(1, 0.95, 0.77),
        borderColor: color(a.color),
        borderWidth: 1,
        borderOpacity: a.opacity,
      });
      for (const y of [0.3, 0.5, 0.7])
        page.drawLine({
          start: pagePoint(page, rotation, a.x + a.width * 0.22, a.y + a.height * y),
          end: pagePoint(page, rotation, a.x + a.width * 0.78, a.y + a.height * y),
          thickness: 1,
          color: color(a.color),
          opacity: a.opacity,
        });
    }
  } else if (a.kind === 'draw' && a.points) {
    for (let i = 1; i < a.points.length; i++)
      page.drawLine({
        start: pagePoint(page, rotation, a.x + a.points[i - 1].x, a.y + a.points[i - 1].y),
        end: pagePoint(page, rotation, a.x + a.points[i].x, a.y + a.points[i].y),
        thickness: a.size,
        color: color(a.color),
        opacity: a.opacity,
      });
  } else if (a.kind === 'image' && a.dataUrl) {
    const image = a.dataUrl.startsWith('data:image/png')
      ? await doc.embedPng(a.dataUrl)
      : await doc.embedJpg(a.dataUrl);
    page.drawImage(image, { ...pos, rotate: degrees(rotation), width: a.width, height: a.height });
  } else if (a.kind === 'field' || a.kind === 'checkbox') {
    const form = doc.getForm();
    if (form.getFieldMaybe(a.text))
      throw new Error(
        `A form field named “${a.text}” already exists. Give each field a unique name.`,
      );
    const field = a.kind === 'field' ? form.createTextField(a.text) : form.createCheckBox(a.text);
    if (a.required) field.enableRequired();
    field.addToPage(page, {
      ...pos,
      rotate: degrees(rotation),
      width: a.width,
      height: a.height,
      borderWidth: 0.8,
      borderColor: rgb(0.5, 0.56, 0.52),
      backgroundColor: rgb(0.96, 0.98, 0.96),
      textColor: rgb(0.12, 0.14, 0.13),
    });
    if (field instanceof PDFTextField) field.setFontSize(a.size);
  }
}
export async function exportEditor(bytes: Uint8Array, state: EditorState, flatten = false) {
  if (hasTextChanges(state))
    throw new Error('Original text changes must be included through the finished-document export.');
  if (!state.pages.length) throw new Error('Your document needs at least one page.');
  const doc = await PDFDocument.load(bytes);
  const originals = doc.getPages();
  const prepared: PDFPage[] = [];
  const used = new Set<number>();
  for (const model of state.pages) {
    if (model.sourceIndex === null) {
      prepared.push(doc.addPage([model.width, model.height]));
      continue;
    }
    if (!originals[model.sourceIndex])
      throw new Error('A source page is missing. Reopen the original PDF.');
    if (used.has(model.sourceIndex))
      prepared.push((await doc.copyPages(doc, [model.sourceIndex]))[0]);
    else {
      prepared.push(originals[model.sourceIndex]);
      used.add(model.sourceIndex);
    }
  }
  while (doc.getPageCount()) doc.removePage(0);
  for (let i = 0; i < prepared.length; i++) {
    doc.addPage(prepared[i]);
    prepared[i].setRotation(degrees(state.pages[i].rotation));
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < state.pages.length; i++)
    for (const a of state.annotations.filter((a) => a.pageId === state.pages[i].id))
      await annotate(doc, prepared[i], state.pages[i], a, font);
  const form = doc.getForm();
  for (const [name, value] of Object.entries(state.formValues)) {
    const f = form.getFieldMaybe(name);
    if (!f || f.isReadOnly()) continue;
    if (f instanceof PDFTextField) f.setText(String(value));
    if (f instanceof PDFCheckBox) {
      if (value) f.check();
      else f.uncheck();
    }
    if (
      (f instanceof PDFDropdown || f instanceof PDFOptionList || f instanceof PDFRadioGroup) &&
      value
    )
      f.select(String(value));
  }
  form.updateFieldAppearances(font);
  if (flatten && form.getFields().length) form.flatten();
  doc.setProducer('Folio');
  return doc.save();
}
export async function processPdf(
  operation: PdfOperation,
  inputs: PdfInput[],
  options: PdfOptions = {},
): Promise<PdfOutput> {
  if (!inputs.length) throw new Error('Choose a file first.');
  const name = baseName(inputs[0].name);
  if (operation === 'edit')
    return {
      bytes: await exportEditor(inputs[0].bytes, options.state!, options.flatten),
      name: `${name}-edited.pdf`,
      type: 'application/pdf',
    };
  if (operation === 'merge' || operation === 'images') {
    if (operation === 'merge' && inputs.length < 2)
      throw new Error('Add at least two PDFs to merge.');
    const out = await PDFDocument.create();
    for (const input of inputs) {
      if (operation === 'merge') {
        const source = await PDFDocument.load(input.bytes);
        for (const page of await out.copyPages(source, source.getPageIndices())) out.addPage(page);
      } else {
        const image =
          input.type === 'image/png' || /\.png$/i.test(input.name)
            ? await out.embedPng(input.bytes)
            : await out.embedJpg(input.bytes);
        const page = out.addPage(
          options.a4 ? [595.28, 841.89] : [image.width * 0.75, image.height * 0.75],
        );
        const scale = Math.min(
          (page.getWidth() - (options.a4 ? 48 : 0)) / image.width,
          (page.getHeight() - (options.a4 ? 48 : 0)) / image.height,
        );
        page.drawImage(image, {
          x: (page.getWidth() - image.width * scale) / 2,
          y: (page.getHeight() - image.height * scale) / 2,
          width: image.width * scale,
          height: image.height * scale,
        });
      }
    }
    return {
      bytes: await out.save(),
      name: operation === 'merge' ? 'combined-document.pdf' : `${name}.pdf`,
      type: 'application/pdf',
    };
  }
  const doc = await PDFDocument.load(inputs[0].bytes);
  const indices = options.pages || doc.getPageIndices();
  if (
    !indices.length ||
    indices.some((i) => !Number.isInteger(i) || i < 0 || i >= doc.getPageCount())
  )
    throw new Error('Select a valid page range.');
  if (operation === 'extract') {
    const out = await PDFDocument.create();
    for (const page of await out.copyPages(doc, indices)) out.addPage(page);
    return { bytes: await out.save(), name: `${name}-selected.pdf`, type: 'application/pdf' };
  }
  if (operation === 'split') {
    const zip = new JSZip();
    for (const index of indices) {
      const out = await PDFDocument.create();
      out.addPage((await out.copyPages(doc, [index]))[0]);
      zip.file(`${name}-page-${String(index + 1).padStart(3, '0')}.pdf`, await out.save());
    }
    return {
      bytes: await zip.generateAsync({ type: 'uint8array' }),
      name: `${name}-pages.zip`,
      type: 'application/zip',
    };
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let n = 0; n < indices.length; n++) {
    const p = doc.getPage(indices[n]);
    if (operation === 'rotate')
      p.setRotation(degrees((p.getRotation().angle + (options.rotation || 90)) % 360));
    if (operation === 'crop') {
      const { x, y, width, height } = p.getCropBox();
      const m = options.margin ?? 20;
      if (!Number.isFinite(m) || m < 0 || m * 2 >= Math.min(width, height))
        throw new Error('The crop margin must leave a visible area on every selected page.');
      p.setCropBox(x + m, y + m, width - m * 2, height - m * 2);
    }
    if (operation === 'watermark' || operation === 'numbers') {
      const rotation = p.getRotation().angle;
      const crop = p.getCropBox();
      const sideways = rotation % 180 !== 0;
      const w = sideways ? crop.height : crop.width;
      const h = sideways ? crop.width : crop.height;
      const text =
        operation === 'numbers' ? String((options.start || 1) + n) : options.text || 'DRAFT';
      const size = operation === 'numbers' ? 11 : options.size || 48;
      if (!Number.isFinite(size) || size < 1 || !Number.isFinite(options.opacity ?? 0.18))
        throw new Error('Choose a valid text size and opacity.');
      const tw = font.widthOfTextAtSize(text, size);
      if (tw > w - 24)
        throw new Error(
          'This watermark is wider than the page. Shorten the text or reduce its size.',
        );
      const pos = pagePoint(p, rotation, (w - tw) / 2, operation === 'numbers' ? h - 24 : h / 2);
      p.drawText(text, {
        ...pos,
        rotate: degrees(rotation),
        font,
        size,
        color: color(options.color),
        opacity: operation === 'numbers' ? 1 : (options.opacity ?? 0.18),
      });
    }
  }
  const bytes = await doc.save({ useObjectStreams: true });
  if (operation === 'compress' && bytes.length >= inputs[0].bytes.length)
    return {
      bytes: inputs[0].bytes,
      name: inputs[0].name,
      type: 'application/pdf',
      note: 'This PDF is already efficiently structured. Optimization did not make it smaller, so your original is available below.',
    };
  return {
    bytes,
    name: `${name}-${operation === 'compress' ? 'optimized' : operation}.pdf`,
    type: 'application/pdf',
  };
}

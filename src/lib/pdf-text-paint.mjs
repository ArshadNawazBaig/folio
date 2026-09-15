// Chrome prints gradient text as a masked graphic followed by transparent text.
// Read only the small, supported axial-gradient forms; arbitrary graphics and OCR
// layers are never inferred to be editable text.
const cache = new WeakMap();
const identity = [1, 0, 0, 1, 0, 0];
const multiply = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
const point = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const hex = (rgb) =>
  '#' +
  rgb
    .map((n) =>
      Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

export function paintSampler(paint) {
  const [x1, y1, x2, y2] = paint.coords;
  const dx = x2 - x1,
    dy = y2 - y1,
    length = dx * dx + dy * dy || 1;
  const colors = paint.colors.map((color) =>
    color.match(/[\da-f]{2}/gi).map((v) => parseInt(v, 16)),
  );
  return (x, y) => {
    const t =
      Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length)) * (colors.length - 1);
    const index = Math.min(colors.length - 2, Math.floor(t)),
      mix = t - index;
    return colors[index].map((v, c) => Math.round(v + (colors[index + 1][c] - v) * mix));
  };
}
export const paintColor = (paint, bounds) =>
  hex(paintSampler(paint)((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2));
export function movedPaint(paint, origin, ratio = 1, offset = { x: 0, y: 0 }) {
  return {
    colors: paint.colors,
    coords: paint.coords.map(
      (v, i) => (v - origin[i % 2]) * ratio + origin[i % 2] + (i % 2 ? offset.y : offset.x),
    ),
  };
}
export function validPaint(paint) {
  return (
    paint &&
    Array.isArray(paint.coords) &&
    paint.coords.length === 4 &&
    paint.coords.every((v) => Number.isFinite(v) && Math.abs(v) < 1e6) &&
    Array.isArray(paint.colors) &&
    paint.colors.length >= 2 &&
    paint.colors.length <= 65 &&
    paint.colors.every((v) => /^#[\da-f]{6}$/i.test(v))
  );
}

export function sourcePaints(bytes) {
  if (!cache.has(bytes)) cache.set(bytes, readPaints(bytes));
  return cache.get(bytes);
}
async function readPaints(bytes) {
  const { PDFDocument, PDFDict, PDFRawStream, PDFName, decodePDFRawStream } =
    await import('pdf-lib');
  let pdf;
  try {
    pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    // Unsupported paint metadata must not prevent editing ordinary PDF text.
    return [];
  }
  const lookup = (value) => pdf.context.lookup(value);
  const get = (dict, key) =>
    dict instanceof PDFDict ? lookup(dict.get(PDFName.of(key))) : undefined;
  const numbers = (value) => value?.asArray?.().map((v) => lookup(v)?.asNumber?.());
  const decode = (stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode());
  function colors(fn) {
    const dict = fn instanceof PDFRawStream ? fn.dict : fn;
    const type = get(dict, 'FunctionType')?.asNumber();
    const domain = numbers(get(dict, 'Domain'));
    if (domain?.length !== 2 || domain[0] !== 0 || domain[1] !== 1) return null;
    if (type === 0 && fn instanceof PDFRawStream) {
      const size = numbers(get(dict, 'Size'));
      if (
        get(dict, 'BitsPerSample')?.asNumber() !== 8 ||
        size?.length !== 1 ||
        size[0] < 2 ||
        size[0] > 65536
      )
        return null;
      const range = numbers(get(dict, 'Range'));
      if (range?.join(',') !== '0,1,0,1,0,1') return null;
      const order = get(dict, 'Order')?.asNumber(),
        encode = numbers(get(dict, 'Encode')),
        decoded = numbers(get(dict, 'Decode'));
      if (
        (order !== undefined && order !== 1) ||
        (encode && encode.join(',') !== `0,${size[0] - 1}`) ||
        (decoded && decoded.join(',') !== range.join(','))
      )
        return null;
      const values = decodePDFRawStream(fn).decode();
      if (values.length !== size[0] * 3) return null;
      return Array.from({ length: 33 }, (_, i) => {
        const p = (i / 32) * (size[0] - 1),
          low = Math.floor(p),
          high = Math.min(size[0] - 1, low + 1);
        return hex(
          [0, 1, 2].map(
            (c) => values[low * 3 + c] + (values[high * 3 + c] - values[low * 3 + c]) * (p - low),
          ),
        );
      });
    }
    if (type === 2) {
      const a = numbers(get(dict, 'C0')),
        b = numbers(get(dict, 'C1')),
        power = get(dict, 'N')?.asNumber();
      if (a?.length !== 3 || b?.length !== 3 || !Number.isFinite(power) || power <= 0) return null;
      return Array.from({ length: 33 }, (_, i) =>
        hex(a.map((v, c) => (v + (b[c] - v) * (i / 32) ** power) * 255)),
      );
    }
    return null;
  }
  function gradient(form, parent = identity, depth = 0, masked = false) {
    if (!(form instanceof PDFRawStream) || depth > 6 || form.getContentsSize() > 8192) return null;
    const resources = get(form.dict, 'Resources');
    if (!resources) return null;
    let matrix = multiply(parent, numbers(get(form.dict, 'Matrix')) || identity);
    const content = decode(form);
    if (content.length > 32768) return null;
    // These wrappers contain one form/shading draw and simple clipping/placement.
    const draws = [...content.matchAll(/\/([^\s/]+)\s+(Do|sh)\b/g)];
    if (draws.length !== 1) return null;
    const stack = [];
    for (const match of content
      .slice(0, draws[0].index)
      .matchAll(/((?:[-+\d.eE]+\s+){6})cm\b|\b(q|Q)\b|\/([^\s/]+)\s+gs\b/g)) {
      if (match[1]) {
        const next = match[1].trim().split(/\s+/).map(Number);
        if (!next.every(Number.isFinite)) return null;
        matrix = multiply(matrix, next);
      } else if (match[2] === 'q') stack.push({ matrix, masked });
      else if (match[2] === 'Q') {
        const saved = stack.pop();
        if (!saved) return null;
        ({ matrix, masked } = saved);
      } else {
        const state = get(get(resources, 'ExtGState'), match[3]);
        const mask = get(state, 'SMask');
        if (mask) masked = mask.toString() !== '/None';
      }
    }
    const [, name, operation] = draws[0];
    if (operation === 'Do')
      return gradient(get(get(resources, 'XObject'), name), matrix, depth + 1, masked);
    if (!masked) return null;
    const shade = get(get(resources, 'Shading'), name);
    if (get(shade, 'ShadingType')?.asNumber() !== 2) return null;
    const space = get(shade, 'ColorSpace');
    const rgb =
      space?.toString() === '/DeviceRGB' ||
      (space?.asArray?.()[0]?.toString() === '/ICCBased' &&
        get(lookup(space.asArray()[1])?.dict, 'N')?.asNumber() === 3);
    const coords = numbers(get(shade, 'Coords')),
      stops = colors(get(shade, 'Function'));
    if (!rgb || coords?.length !== 4 || !stops) return null;
    const paint = {
      coords: [...point(matrix, coords[0], coords[1]), ...point(matrix, coords[2], coords[3])],
      colors: stops,
    };
    return validPaint(paint) ? paint : null;
  }
  const result = [];
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream) || get(object.dict, 'Subtype')?.toString() !== '/Form')
      continue;
    const bounds = numbers(get(object.dict, 'BBox'));
    if (bounds?.length !== 4) continue;
    try {
      const paint = gradient(object);
      if (paint) result.push({ bounds, paint });
    } catch {
      // A malformed or unsupported form is not a safely editable paint layer.
    }
  }
  return result;
}

export function markedPaint(api, heap, object, alloc, free) {
  const scratch = alloc(16388);
  try {
    for (let i = 0; i < Math.min(32, api.FPDFPageObj_CountMarks(object)); i++) {
      const mark = api.FPDFPageObj_GetMark(object, i);
      if (
        !api.FPDFPageObjMark_GetParamStringValue(
          mark,
          'FolioGradient',
          scratch,
          16384,
          scratch + 16384,
        )
      )
        continue;
      const length = heap.getValue(scratch + 16384, 'i32');
      if (length < 2 || length > 16384) continue;
      try {
        const paint = JSON.parse(heap.UTF16ToString(scratch));
        if (validPaint(paint)) return paint;
      } catch {
        /* Not a Folio paint mark. */
      }
    }
  } finally {
    free(scratch);
  }
  return null;
}

// The source effect already uses an image mask. Rebuild only that small mask at
// high resolution; retain the actual invisible PDF text for search and re-editing.
export function drawGradientText(api, heap, doc, page, objects, paint, alloc, free) {
  const scratch = alloc(32),
    previous = [],
    rotation = api.FPDFPage_GetRotation(page);
  let bitmap = 0,
    image = 0;
  try {
    api.FPDFPage_SetRotation(page, 0);
    const bounds = [Infinity, Infinity, -Infinity, -Infinity];
    for (const object of objects) {
      if (!api.FPDFPageObj_GetBounds(object, scratch, scratch + 4, scratch + 8, scratch + 12))
        throw new Error('The text bounds could not be read.');
      const b = [0, 4, 8, 12].map((v) => heap.getValue(scratch + v, 'float'));
      bounds[0] = Math.min(bounds[0], b[0]);
      bounds[1] = Math.min(bounds[1], b[1]);
      bounds[2] = Math.max(bounds[2], b[2]);
      bounds[3] = Math.max(bounds[3], b[3]);
      api.FPDFPageObj_SetFillColor(object, 255, 255, 255, 255);
    }
    const widthPoints = bounds[2] - bounds[0] + 2,
      heightPoints = bounds[3] - bounds[1] + 2;
    if (!(widthPoints > 0 && heightPoints > 0)) throw new Error('The text bounds are invalid.');
    const scale = Math.min(
      4,
      4096 / widthPoints,
      4096 / heightPoints,
      Math.sqrt((8 * 1024 * 1024) / (widthPoints * heightPoints)),
    );
    const pageWidth = api.FPDF_GetPageWidthF(page),
      pageHeight = api.FPDF_GetPageHeightF(page);
    const fullWidth = Math.ceil(pageWidth * scale),
      fullHeight = Math.ceil(pageHeight * scale);
    api.FPDF_PageToDevice(
      page,
      0,
      0,
      fullWidth,
      fullHeight,
      0,
      bounds[0] - 1,
      bounds[3] + 1,
      scratch,
      scratch + 4,
    );
    const left = heap.getValue(scratch, 'i32'),
      top = heap.getValue(scratch + 4, 'i32');
    const width = Math.ceil((widthPoints * fullWidth) / pageWidth),
      height = Math.ceil((heightPoints * fullHeight) / pageHeight);
    for (let i = 0; i < api.FPDFPage_CountObjects(page); i++) {
      const object = api.FPDFPage_GetObject(page, i);
      api.FPDFPageObj_GetIsActive(object, scratch);
      previous.push([object, !!heap.getValue(scratch, 'i32')]);
      api.FPDFPageObj_SetIsActive(object, objects.includes(object));
    }
    bitmap = api.FPDFBitmap_Create(width, height, 1);
    if (!bitmap) throw new Error('The text appearance could not be rendered.');
    api.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0);
    api.FPDF_RenderPageBitmap(bitmap, page, -left, -top, fullWidth, fullHeight, 0, 0);
    api.FPDF_DeviceToPage(
      page,
      0,
      0,
      fullWidth,
      fullHeight,
      0,
      left,
      top + height,
      scratch,
      scratch + 8,
    );
    const x = heap.getValue(scratch, 'double'),
      y = heap.getValue(scratch + 8, 'double');
    const w = (width * pageWidth) / fullWidth,
      h = (height * pageHeight) / fullHeight;
    const buffer = api.FPDFBitmap_GetBuffer(bitmap),
      stride = api.FPDFBitmap_GetStride(bitmap),
      sample = paintSampler(paint);
    for (let row = 0; row < height; row++)
      for (let col = 0; col < width; col++) {
        const index = buffer + row * stride + col * 4;
        if (!heap.HEAPU8[index + 3]) continue;
        const color = sample(x + ((col + 0.5) * w) / width, y + h - ((row + 0.5) * h) / height);
        heap.HEAPU8[index] = color[2];
        heap.HEAPU8[index + 1] = color[1];
        heap.HEAPU8[index + 2] = color[0];
      }
    image = api.FPDFPageObj_NewImageObj(doc);
    if (
      !image ||
      !api.FPDFImageObj_SetBitmap(0, 0, image, bitmap) ||
      !api.FPDFImageObj_SetMatrix(image, w, 0, 0, h, x, y)
    )
      throw new Error('The text appearance could not be saved.');
    const mark = api.FPDFPageObj_AddMark(image, 'FolioPaint');
    if (
      !mark ||
      !api.FPDFPageObjMark_SetStringParam(doc, image, mark, 'FolioGradient', JSON.stringify(paint))
    )
      throw new Error('The text appearance could not be saved.');
    const output = image;
    image = 0;
    return output;
  } finally {
    for (const [object, active] of previous) api.FPDFPageObj_SetIsActive(object, active);
    for (const object of objects) api.FPDFPageObj_SetFillColor(object, 0, 0, 0, 0);
    api.FPDFPage_SetRotation(page, rotation);
    if (bitmap) api.FPDFBitmap_Destroy(bitmap);
    if (image) api.FPDFPageObj_Destroy(image);
    free(scratch);
  }
}

import { visibleClippedText } from './pdf-text-clip.mjs';
import { formTextMarker } from './pdf-form-source.mjs';

const identity = [1, 0, 0, 1, 0, 0];
export function multiplyTextMatrices(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
function transformBounds(bounds, matrix) {
  const points = [
    [bounds[0], bounds[1]],
    [bounds[0], bounds[3]],
    [bounds[2], bounds[1]],
    [bounds[2], bounds[3]],
  ].map(([x, y]) => [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ]);
  return [
    Math.min(...points.map((p) => p[0])),
    Math.min(...points.map((p) => p[1])),
    Math.max(...points.map((p) => p[0])),
    Math.max(...points.map((p) => p[1])),
  ];
}

// Preserve legacy page-object IDs. Nested IDs describe the actual object path,
// so restoring a workspace never confuses a grouped object with a page object.
export function pageTextObjects(api, heap, page, textPage, alloc, free, allowForms = true) {
  const entries = [];
  const ptr = alloc(64);
  let visited = 0;
  let characters;
  const matrixOf = (object) => {
    if (!api.FPDFPageObj_GetMatrix(object, ptr)) return null;
    const matrix = [0, 4, 8, 12, 16, 20].map((n) => heap.getValue(ptr + n, 'float'));
    return matrix.every(Number.isFinite) ? matrix : null;
  };
  const boundsOf = (object) =>
    api.FPDFPageObj_GetBounds(object, ptr, ptr + 4, ptr + 8, ptr + 12)
      ? [0, 4, 8, 12].map((n) => heap.getValue(ptr + n, 'float'))
      : null;
  const textOf = (object) => {
    if (!characters) {
      characters = new Map();
      const count = api.FPDFText_CountChars(textPage);
      if (count > 1000000) throw new Error('This page has too much text to edit.');
      for (let i = 0; i < count; i++) {
        if (api.FPDFText_IsGenerated(textPage, i) === 1) continue;
        const owner = api.FPDFText_GetTextObject(textPage, i),
          code = api.FPDFText_GetUnicode(textPage, i);
        if (owner && code > 0 && code <= 0x10ffff)
          characters.set(owner, (characters.get(owner) || '') + String.fromCodePoint(code));
      }
    }
    if (characters.has(object)) return characters.get(object);
    const length = api.FPDFTextObj_GetText(object, textPage, 0, 0);
    if (length <= 2 || length > 20000) return '';
    const buffer = alloc(length);
    try {
      api.FPDFTextObj_GetText(object, textPage, buffer, length);
      return heap.UTF16ToString(buffer);
    } finally {
      free(buffer);
    }
  };
  function walk(parent, ancestors, transform, path) {
    if (path.length > 16) throw new Error('This page contains too many nested PDF groups.');
    const count = path.length
      ? api.FPDFFormObj_CountObjects(parent)
      : api.FPDFPage_CountObjects(parent);
    let previous = null;
    for (let index = 0; index < count; index++) {
      if (++visited > 30000)
        throw new Error('This page is too complex to edit. Try a simpler PDF.');
      const object = path.length
        ? api.FPDFFormObj_GetObject(parent, index)
        : api.FPDFPage_GetObject(parent, index);
      const objectPath = [...path, index],
        type = api.FPDFPageObj_GetType(object);
      if (type === 5) {
        previous = null;
        if (!allowForms) {
          entries.push({ object, index, path: objectPath });
          continue;
        }
        const matrix = matrixOf(object);
        if (matrix)
          walk(
            object,
            [...ancestors, { object, matrix }],
            multiplyTextMatrices(transform, matrix),
            objectPath,
          );
        continue;
      }
      if (!path.length) {
        entries.push({ object, index, path: objectPath });
        continue;
      }
      if (type !== 1) {
        previous = null;
        continue;
      }
      const bounds = boundsOf(object),
        localMatrix = matrixOf(object),
        text = textOf(object);
      if (!bounds || !localMatrix || !text || api.FPDFTextObj_GetTextRenderMode(object) !== 0) {
        previous = null;
        continue;
      }
      // Test every ancestor's clip in its own coordinate system. Hidden overflow
      // must not become editable just because it lives inside a Form XObject.
      let visible = visibleClippedText(
        api,
        heap,
        api.FPDFPageObj_GetClipPath(object),
        bounds,
        alloc,
        free,
      );
      let enclosingBounds = bounds;
      for (const ancestor of [...ancestors].reverse()) {
        enclosingBounds = transformBounds(enclosingBounds, ancestor.matrix);
        visible &&= visibleClippedText(
          api,
          heap,
          api.FPDFPageObj_GetClipPath(ancestor.object),
          enclosingBounds,
          alloc,
          free,
        );
      }
      if (!visible) {
        previous = null;
        continue;
      }
      const matrix = multiplyTextMatrices(transform, localMatrix),
        worldBounds = transformBounds(bounds, transform);
      api.FPDFTextObj_GetFontSize(object, ptr);
      const size = heap.getValue(ptr, 'float'),
        font = api.FPDFTextObj_GetFont(object);
      api.FPDFPageObj_GetFillColor(object, ptr, ptr + 4, ptr + 8, ptr + 12);
      const rgba = [0, 4, 8, 12].map((n) => heap.getValue(ptr + n, 'i32'));
      // Invisible selection/OCR text is not the visible lettering.
      if (rgba[3] === 0) {
        previous = null;
        continue;
      }
      const entry = {
        object,
        index: objectPath[0],
        path: objectPath,
        ancestors,
        members: [{ object, parent }],
        text,
        bounds: worldBounds,
        matrix,
        font,
        size,
        rgba,
      };
      // Design exports often store every letter as a separate text object. Join
      // adjacent glyphs on the same baseline, never separate lines or columns.
      const single = [...text].length === 1;
      const last = previous?.last;
      const scale = Math.hypot(matrix[0], matrix[1]);
      const dx = last ? matrix[4] - last.matrix[4] : 0,
        dy = last ? matrix[5] - last.matrix[5] : 0;
      const along = scale ? (dx * matrix[0] + dy * matrix[1]) / scale : 0;
      const across = scale ? Math.abs(dx * matrix[1] - dy * matrix[0]) / scale : Infinity;
      const gap = last ? along - last.advance : 0;
      const join =
        single &&
        previous &&
        previous.font === font &&
        previous.size === size &&
        matrix.slice(0, 4).every((n, i) => Math.abs(n - previous.matrix[i]) < 0.0001) &&
        rgba.every((n, i) => n === previous.rgba[i]) &&
        across < 0.1 &&
        along >= 0 &&
        gap >= -size * scale * 0.2 &&
        gap <= size * scale * 0.65 &&
        previous.text.length < 2000;
      let advance = 0;
      if (single && api.FPDFFont_GetGlyphWidth(font, text.codePointAt(0), size, ptr))
        advance = heap.getValue(ptr, 'float') * scale;
      const tail = { matrix, advance };
      if (join) {
        if (gap > size * scale * 0.2 && !/\s$/.test(previous.text) && !/^\s/.test(text))
          previous.text += ' ';
        previous.text += text;
        previous.members.push(...entry.members);
        previous.bounds = [
          Math.min(previous.bounds[0], worldBounds[0]),
          Math.min(previous.bounds[1], worldBounds[1]),
          Math.max(previous.bounds[2], worldBounds[2]),
          Math.max(previous.bounds[3], worldBounds[3]),
        ];
        previous.last = tail;
      } else {
        entries.push(entry);
        previous = single ? entry : null;
        if (previous) previous.last = tail;
      }
    }
  }
  try {
    walk(page, [], identity, []);
    return entries;
  } finally {
    free(ptr);
  }
}

export function liftTextObject(api, heap, page, entry, alloc, free) {
  if (!entry.members) return entry.index;
  for (const member of entry.members) {
    if (!api.FPDFFormObj_RemoveObject(member.parent, member.object))
      throw new Error('The original grouped text could not be removed.');
    if (member.object !== entry.object) api.FPDFPageObj_Destroy(member.object);
  }
  const ptr = alloc(24);
  try {
    entry.matrix.forEach((n, i) => heap.setValue(ptr + i * 4, n, 'float'));
    if (!api.FPDFPageObj_SetMatrix(entry.object, ptr))
      throw new Error('The grouped text could not be positioned.');
    // Mark the complete ancestor chain dirty so nested removals are serialized.
    for (const ancestor of entry.ancestors) {
      ancestor.matrix.forEach((n, i) => heap.setValue(ptr + i * 4, n, 'float'));
      api.FPDFPageObj_SetMatrix(ancestor.object, ptr);
    }
    const index = entry.index + 1;
    if (!api.FPDFPage_InsertObjectAtIndex(page, entry.object, index))
      throw new Error('The grouped text could not be placed.');
    return index;
  } finally {
    free(ptr);
  }
}

export function regenerateTextForms(api, heap, page, alloc, free) {
  const ptr = alloc(256),
    size = alloc(4);
  function walk(parent, form = false) {
    const count = form ? api.FPDFFormObj_CountObjects(parent) : api.FPDFPage_CountObjects(parent);
    for (let i = count - 1; i >= 0; i--) {
      const object = form
        ? api.FPDFFormObj_GetObject(parent, i)
        : api.FPDFPage_GetObject(parent, i);
      if (api.FPDFPageObj_GetType(object) === 5) walk(object, true);
      else if (form && api.FPDFPageObj_GetType(object) === 2) {
        if (
          !api.FPDFPageObj_GetBounds(object, ptr, ptr + 4, ptr + 8, ptr + 12) ||
          Math.abs(heap.getValue(ptr + 8, 'float') - heap.getValue(ptr, 'float')) > 0.001 ||
          Math.abs(heap.getValue(ptr + 12, 'float') - heap.getValue(ptr + 4, 'float')) > 0.001
        )
          continue;
        for (let m = 0; m < api.FPDFPageObj_CountMarks(object); m++) {
          const mark = api.FPDFPageObj_GetMark(object, m);
          if (
            api.FPDFPageObjMark_GetName(mark, ptr, 256, size) &&
            heap.UTF16ToString(ptr) === formTextMarker
          ) {
            if (!api.FPDFFormObj_RemoveObject(parent, object))
              throw new Error('The edited PDF group could not be saved.');
            api.FPDFPageObj_Destroy(object);
            break;
          }
        }
      }
    }
  }
  try {
    walk(page);
  } finally {
    free(ptr);
    free(size);
  }
}

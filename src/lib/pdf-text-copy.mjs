// Import a temporary source page to retain the actual text object, font resource,
// glyph spacing and paint. Only the selected object is moved into the target page.
// The temporary page is removed before preview/export; the original stays intact.
import { pageTextObjects, liftTextObject } from './pdf-text-objects.mjs';
export function copyTextObjects(
  api,
  heap,
  doc,
  source,
  length,
  changes,
  pageCount,
  alloc,
  free,
  pages,
) {
  if (!changes.some((change) => change.copy)) return changes;
  const original = api.FPDF_LoadMemDocument(source, length, '');
  if (!original) throw new Error('The source text could not be copied.');
  const mapped = [];
  try {
    for (const change of changes) {
      if (!change.copy) {
        mapped.push(change);
        continue;
      }
      const targetIndex = Number(change.id.split(':')[0]);
      const { page: sourceIndex, objectIndex } = change.copy;
      if (
        ![sourceIndex, targetIndex].every((n) => Number.isInteger(n) && n >= 0 && n < pageCount) ||
        !Number.isInteger(objectIndex) ||
        objectIndex < 0
      )
        throw new Error('Choose a valid text box to copy.');
      if (!api.FPDF_ImportPages(doc, original, String(sourceIndex + 1), pageCount))
        throw new Error('The source text could not be copied.');
      let temporary = 0,
        target = 0,
        textPage = 0;
      try {
        temporary = api.FPDF_LoadPage(doc, pageCount);
        target = pages.get(targetIndex) || api.FPDF_LoadPage(doc, targetIndex);
        if (target) pages.set(targetIndex, target);
        if (!temporary || !target || objectIndex >= api.FPDFPage_CountObjects(temporary))
          throw new Error('The source text could not be found.');
        textPage = api.FPDFText_LoadPage(temporary);
        const entry = change.copy.objectPath
          ? pageTextObjects(api, heap, temporary, textPage, alloc, free).find(
              (entry) => entry.path.join('.') === change.copy.objectPath.join('.'),
            )
          : null;
        const object =
          entry?.object ||
          (!change.copy.objectPath && api.FPDFPage_GetObject(temporary, objectIndex));
        if (!object) throw new Error('The source text could not be found.');
        if (api.FPDFPageObj_GetType(object) !== 1) throw new Error('Choose a text box to copy.');
        const length = api.FPDFTextObj_GetText(object, textPage, 0, 0);
        const scratch = alloc(Math.max(length, 16));
        const objects = [];
        try {
          api.FPDFTextObj_GetText(object, textPage, scratch, length);
          if (length < 2 || (entry?.text ?? heap.UTF16ToString(scratch)) !== change.original)
            throw new Error('The source text changed. Copy the text box again.');
          if (
            api.FPDFPageObj_GetFillColor(object, scratch, scratch + 4, scratch + 8, scratch + 12) &&
            heap.getValue(scratch + 12, 'i32') === 0 &&
            objectIndex > 0
          ) {
            const paint = api.FPDFPage_GetObject(temporary, objectIndex - 1);
            if ([3, 5].includes(api.FPDFPageObj_GetType(paint))) objects.push(paint);
          }
        } finally {
          free(scratch);
        }
        api.FPDFText_ClosePage(textPage);
        textPage = 0;
        if (entry) {
          liftTextObject(api, heap, temporary, entry, alloc, free);
          if (entry.members.length > 1) {
            const buffer = alloc((entry.text.length + 1) * 2);
            try {
              heap.stringToUTF16(entry.text, buffer, (entry.text.length + 1) * 2);
              if (!api.FPDFText_SetText(object, buffer))
                throw new Error('The grouped text could not be copied.');
            } finally {
              free(buffer);
            }
          }
        }
        objects.push(object);
        for (const item of objects) {
          const index = api.FPDFPage_CountObjects(target);
          if (!api.FPDFPage_RemoveObject(temporary, item))
            throw new Error('The text box could not be copied.');
          if (!api.FPDFPage_InsertObjectAtIndex(target, item, index)) {
            api.FPDFPageObj_Destroy(item);
            throw new Error('The copied text could not be placed.');
          }
          if (item === object) mapped.push({ ...change, id: `${targetIndex}:${index}` });
        }
        if (!api.FPDFPage_GenerateContent(target)) throw new Error('Copy could not be saved.');
      } finally {
        if (textPage) api.FPDFText_ClosePage(textPage);
        if (temporary) api.FPDF_ClosePage(temporary);
        api.FPDFPage_Delete(doc, pageCount);
      }
    }
    return mapped;
  } finally {
    api.FPDF_CloseDocument(original);
  }
}

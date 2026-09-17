// PDFium edits a Form XObject's shared stream. Give every drawn instance its own
// stream first, so changing one occurrence cannot alter another page or copy.
// A removable, zero-area path lets every enclosing form be regenerated after
// nested removals (PDFium otherwise reuses unchanged ancestor streams).
export const formTextMarker = 'FolioTextContainerV4';
const cache = new WeakMap();
const latin = (bytes) => {
  let value = '';
  for (let i = 0; i < bytes.length; i += 32768)
    value += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return value;
};
const binary = (text) => Uint8Array.from(text, (c) => c.charCodeAt(0));

// Read PDF tokens, not regex matches inside literal strings, hex strings,
// comments or property dictionaries. Inline image streams are left untouched:
// their binary boundaries cannot safely be inferred from an EI substring.
export function formInvocations(text, onText = () => {}) {
  const result = [];
  const whitespace = (c) => c === '\0' || /[\t\n\f\r ]/.test(c);
  const delimiter = (c) => !c || whitespace(c) || '()<>[]{}/%'.includes(c);
  let i = 0,
    depth = 0,
    previous = null;
  while (i < text.length) {
    if (whitespace(text[i])) {
      i++;
      continue;
    }
    if (text[i] === '%') {
      while (i < text.length && !/[\r\n]/.test(text[i])) i++;
      continue;
    }
    const start = i;
    if (text[i] === '(') {
      let nesting = 1;
      i++;
      while (i < text.length && nesting) {
        if (text[i] === '\\') i += 2;
        else {
          if (text[i] === '(') nesting++;
          if (text[i] === ')') nesting--;
          i++;
        }
      }
      previous = null;
      continue;
    }
    if (text[i] === '<' && text[i + 1] !== '<') {
      i = text.indexOf('>', i + 1);
      if (i < 0) throw new Error('Malformed PDF content.');
      i++;
      previous = null;
      continue;
    }
    if (text[i] === '[' || text.slice(i, i + 2) === '<<') {
      depth++;
      i += text[i] === '[' ? 1 : 2;
      previous = null;
      continue;
    }
    if (text[i] === ']' || text.slice(i, i + 2) === '>>') {
      depth--;
      i += text[i] === ']' ? 1 : 2;
      previous = null;
      continue;
    }
    const name = text[i] === '/';
    i++;
    while (i < text.length && !delimiter(text[i])) i++;
    const value = text.slice(start, i);
    if (!depth && value === 'BI') return null;
    if (!depth && value === 'BT') onText?.();
    if (!depth && value === 'Do' && previous?.name) result.push(previous);
    previous = { name, value, start, end: i };
  }
  return result;
}

export function prepareFormTextSource(bytes) {
  let pending = cache.get(bytes);
  if (!pending) {
    pending = prepare(bytes);
    cache.set(bytes, pending);
    pending.catch(() => cache.delete(bytes));
  }
  return pending;
}
async function prepare(bytes) {
  const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray, decodePDFRawStream } =
    await import('pdf-lib');
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const context = pdf.context;
  let count = 0,
    decoded = 0;
  const unsupported = new Error('Inline PDF image content');
  const streamText = (stream) => {
    const data = decodePDFRawStream(stream).decode();
    decoded += data.length;
    if (decoded > 32 * 1024 * 1024)
      throw new Error('This PDF contains too much grouped content to edit.');
    return latin(data);
  };
  function rewrite(text, inherited, level = 0) {
    if (level > 16) throw new Error('This page contains too many nested PDF groups.');
    let hasText = false;
    const uses = formInvocations(text, () => {
      hasText = true;
    });
    if (!uses) throw unsupported;
    const resources = inherited?.clone(context) || context.obj({});
    const originals = resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
    if (!originals) return { text, resources, hasText };
    const objects = originals.clone(context);
    resources.set(PDFName.of('XObject'), objects);
    let result = '',
      at = 0;
    for (const use of uses) {
      const name = PDFName.of(
        use.value
          .slice(1)
          .replace(/#([\da-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
      );
      const stream = originals.lookupMaybe(name, PDFRawStream);
      if (!stream || stream.dict.get(PDFName.of('Subtype')) !== PDFName.of('Form')) continue;
      if (++count > 2000) throw new Error('This PDF contains too many repeated groups to edit.');
      const child = rewrite(
        streamText(stream),
        stream.dict.lookupMaybe(PDFName.of('Resources'), PDFDict) || inherited,
        level + 1,
      );
      hasText ||= child.hasText;
      const dictionary = stream.dict.clone(context);
      dictionary.delete(PDFName.of('Filter'));
      dictionary.delete(PDFName.of('DecodeParms'));
      dictionary.set(PDFName.of('Resources'), child.resources);
      const marker = `\n/${formTextMarker} BMC q 0 0 0 0 re f Q EMC\n`;
      const replacement = context.flateStream(binary(child.text + (child.hasText ? marker : '')));
      for (const [key, value] of dictionary.entries())
        if (key !== PDFName.of('Length')) replacement.dict.set(key, value);
      let unique;
      do {
        unique = PDFName.of(`FolioTextGroup${count++}`);
      } while (objects.has(unique));
      objects.set(unique, context.register(replacement));
      result += text.slice(at, use.start) + unique.toString();
      at = use.end;
    }
    return { text: result + text.slice(at), resources, hasText };
  }
  try {
    for (const page of pdf.getPages()) {
      const contents = page.node.Contents();
      const streams =
        contents instanceof PDFArray
          ? contents.asArray().map((ref) => context.lookup(ref))
          : [contents];
      const raw = streams.filter((stream) => stream instanceof PDFRawStream);
      if (!raw.length) continue;
      const rewritten = rewrite(raw.map(streamText).join('\n'), page.node.Resources());
      page.node.set(PDFName.of('Resources'), rewritten.resources);
      page.node.set(
        PDFName.of('Contents'),
        context.register(context.flateStream(binary(rewritten.text))),
      );
    }
  } catch (error) {
    if (error === unsupported) return { bytes, nested: false };
    throw error;
  }
  return count
    ? { bytes: new Uint8Array(await pdf.save()), nested: true }
    : { bytes, nested: false };
}

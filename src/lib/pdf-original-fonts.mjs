// Complete known families first. Other fonts use a matching face only for missing glyphs.
export const pdfEditCharacters = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i))
  .concat(Array.from({ length: 96 }, (_, i) => String.fromCharCode(160 + i)))
  .concat(['–', '—', '‘', '’', '“', '”', '•', '…', '€'])
  .join('');
/** @type {Array<[string, number]>} */
const faces = [
  ['Geist-Regular', 400],
  ['Geist-Medium', 500],
  ['Geist-SemiBold', 600],
  ['GeistMono-SemiBold', 600],
];
export function completeOriginalFont(name) {
  const normalized = name
    .replace(/^[A-Z]{6}\+/, '')
    .replace(/-\d+$/, '')
    .toLowerCase();
  const face = faces.find(([name]) => name.toLowerCase() === normalized);
  if (face)
    return { name: face[0], weight: face[1], italic: false, url: `/fonts/pdf/${face[0]}.ttf` };
  const liberation = /^(liberation(?:sans|serif|mono))(?:-(regular|bold|italic|bolditalic))?$/.exec(
    normalized,
  );
  if (liberation) {
    const family = /mono/.test(liberation[1])
      ? 'Mono'
      : /serif/.test(liberation[1])
        ? 'Serif'
        : 'Sans';
    const weight = /bold/.test(liberation[2] || '') ? 700 : 400;
    const italic = /italic/.test(liberation[2] || '');
    const style = weight === 700 ? (italic ? 'BoldItalic' : 'Bold') : italic ? 'Italic' : 'Regular';
    const name = `Liberation${family}-${style}`;
    return { name, weight, italic, url: `/fonts/pdf/${name}.ttf` };
  }
  return null;
}
export function originalFontCategory(name, flags = 0) {
  if (flags & 1 || /mono|courier|consolas|menlo|monaco|typewriter/i.test(name)) return 'mono';
  if (
    flags & 2 ||
    (!/sans/i.test(name) && /serif|times|georgia|garamond|baskerville|cambria|palatino/i.test(name))
  )
    return 'serif';
  return 'sans';
}
export function matchingOriginalFont(
  name,
  weight = originalFontWeight(name),
  italic = /italic|oblique/i.test(name),
  category = originalFontCategory(name),
) {
  const family = category === 'mono' ? 'Mono' : category === 'serif' ? 'Serif' : 'Sans';
  const style = weight >= 550 ? (italic ? 'BoldItalic' : 'Bold') : italic ? 'Italic' : 'Regular';
  const matched = `Liberation${family}-${style}`;
  return {
    name: matched,
    weight: weight >= 550 ? 700 : 400,
    italic,
    url: `/fonts/pdf/${matched}.ttf`,
  };
}
export function originalFontWeight(name) {
  if (/thin/i.test(name)) return 100;
  if (/extra.?light|ultra.?light/i.test(name)) return 200;
  if (/light/i.test(name)) return 300;
  if (/medium/i.test(name)) return 500;
  if (/semi.?bold|demi.?bold/i.test(name)) return 600;
  if (/extra.?bold|ultra.?bold/i.test(name)) return 800;
  if (/black|heavy/i.test(name)) return 900;
  return /bold/i.test(name) ? 700 : 400;
}

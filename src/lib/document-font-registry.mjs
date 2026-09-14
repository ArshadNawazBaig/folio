import catalog from './document-font-catalog.json' with { type: 'json' };
import { parseDocumentFont, standardDocumentFonts } from './document-fonts.mjs';

const families = new Map(catalog.map((font) => [font.id, font]));
const popular = [
  'inter',
  'roboto',
  'open-sans',
  'lato',
  'montserrat',
  'poppins',
  'lora',
  'merriweather',
  'source-sans-3',
  'nunito',
  'raleway',
  'oswald',
  'playfair-display',
  'libre-baskerville',
  'fira-sans',
  'ibm-plex-mono',
  'dancing-script',
  'pacifico',
];
const ordered = [...catalog].sort((a, b) => {
  const rank = (id) => (popular.includes(id) ? popular.indexOf(id) : popular.length);
  return rank(a.id) - rank(b.id) || a.family.localeCompare(b.family);
});
export function findDocumentFont(value) {
  const face = parseDocumentFont(value),
    family = face && families.get(face.id);
  return family && family.weights.includes(face.weight) && family.styles.includes(face.style)
    ? { ...family, ...face }
    : null;
}
export function isDocumentFont(value) {
  return standardDocumentFonts.includes(value) || !!findDocumentFont(value);
}
export function searchDocumentFonts(query = '', page = 0) {
  const normalized = query.toLowerCase().trim();
  const matches = ordered.filter((font) => font.family.toLowerCase().includes(normalized));
  return {
    fonts: matches.slice(page * 24, (page + 1) * 24),
    total: matches.length,
    count: catalog.length,
    page,
  };
}
export function documentFontFamily(id) {
  return families.get(id) || null;
}

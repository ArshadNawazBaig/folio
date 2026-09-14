export const standardDocumentFonts = [
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Courier',
  'Courier-Bold',
];

export function parseDocumentFont(value) {
  if (typeof value !== 'string') return null;
  const match = /^google:([a-z0-9-]{1,100}):(\d{2,4}):(normal|italic)$/.exec(value);
  return match ? { id: match[1], weight: Number(match[2]), style: match[3] } : null;
}

export function documentFontUrl(value) {
  return `/api/fonts/file?font=${encodeURIComponent(value)}`;
}

export function documentFontStyle(value) {
  const face = parseDocumentFont(value);
  if (face)
    return {
      fontFamily: `"FolioDoc_${face.id}_${face.weight}_${face.style}"`,
      fontWeight: face.weight,
      fontStyle: face.style,
      fontSynthesis: 'none',
      // PDFium positions individual glyphs without browser ligature/kerning substitutions.
      fontKerning: 'none',
      fontVariantLigatures: 'none',
    };
  return {
    fontFamily: /Courier/.test(value)
      ? '"Courier New", monospace'
      : /Times/.test(value)
        ? '"Times New Roman", serif'
        : 'Arial, sans-serif',
    fontWeight: /Bold/.test(value) ? 700 : 400,
    fontStyle: /Italic|Oblique/.test(value) ? 'italic' : 'normal',
  };
}

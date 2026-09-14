export const MAX_PREVIEW_WIDTH = 4096;
export const PREVIEW_TILE_PIXELS = 4 * 1024 * 1024;
export const MAX_PREVIEW_PIXELS = 64 * 1024 * 1024;

// Size edited previews for the display, then split tall pages into bounded bitmaps.
// The default remains a small preview for callers that do not request a display size.
export function pdfPreviewLayout(pageWidth, pageHeight, pixelWidth) {
  if (![pageWidth, pageHeight].every((n) => Number.isFinite(n) && n > 0))
    throw new Error('This page has invalid dimensions.');
  if (
    pixelWidth !== undefined &&
    (!Number.isInteger(pixelWidth) || pixelWidth < 1 || pixelWidth > MAX_PREVIEW_WIDTH)
  )
    throw new Error('Choose a valid preview resolution.');
  const requested =
    pixelWidth === undefined
      ? Math.min(1000 / pageWidth, 1400 / pageHeight)
      : pixelWidth / pageWidth;
  const scale = Math.min(
    requested,
    Math.sqrt(MAX_PREVIEW_PIXELS / (pageWidth * pageHeight)),
    65536 / pageHeight,
  );
  const width = Math.max(1, Math.floor(pageWidth * scale));
  const height = Math.max(1, Math.floor(pageHeight * scale));
  const tileHeight = Math.max(1, Math.min(4096, Math.floor(PREVIEW_TILE_PIXELS / width)));
  const tiles = [];
  for (let top = 0; top < height; top += tileHeight)
    tiles.push({ top, height: Math.min(tileHeight, height - top) });
  return { width, height, tiles };
}

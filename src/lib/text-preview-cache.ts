import type { InteractiveTextImage } from './pro-types';

export function previewMemory(image: InteractiveTextImage) {
  if ('pixels' in image) return image.pixels.reduce((size, tile) => size + tile.data.byteLength, 0);
  return (
    image.width *
      (image.partial
        ? (image.tiles || []).reduce((height, tile) => height + tile.height, 0)
        : image.height) *
      4 +
    (image.tiles || [image]).reduce((size, tile) => size + tile.preview.length * 2, 0)
  );
}

/** Bound both the number of backgrounds and their actual pixel memory. */
export function trimPreviews<T>(
  entries: Map<string, T>,
  image: (value: T) => InteractiveTextImage,
) {
  let memory = [...entries.values()].reduce((size, value) => size + previewMemory(image(value)), 0);
  while (entries.size > 4 || memory > 48 * 1024 * 1024) {
    const oldest = entries.keys().next().value!;
    memory -= previewMemory(image(entries.get(oldest)!));
    entries.delete(oldest);
  }
}

export async function decodeTextPreview(image: InteractiveTextImage) {
  if ('pixels' in image) return; // The canvas paints transferred pixels before the input is shown.
  await Promise.all(
    (image.tiles || [image]).map(async (tile) => {
      const decoded = new Image();
      decoded.src = `data:image/png;base64,${tile.preview}`;
      await decoded.decode();
    }),
  );
}

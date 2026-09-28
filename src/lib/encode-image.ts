let webpEncoder: Promise<typeof import('@jsquash/webp/encode.js')> | undefined;
let nativeWebp: boolean | undefined;

/** Worker-only encoding; image pixels never leave the device. */
export async function encodeImage(
  canvas: OffscreenCanvas,
  context: OffscreenCanvasRenderingContext2D,
  type: string,
  quality: number,
) {
  if (type !== 'image/webp' || nativeWebp !== false) {
    const blob = await canvas.convertToBlob({ type, quality });
    if (type === 'image/webp') nativeWebp = blob.type === type;
    if (blob.type === type) return blob;
    if (type !== 'image/webp')
      throw new Error('Your browser cannot export this format. Try PNG or JPG.');
  }

  // Safari can decode WebP but its canvas encoder returns PNG for a WebP request.
  // Load libwebp only when needed, with both code and WASM served by this site.
  webpEncoder ??= import('@jsquash/webp/encode.js')
    .then(async (encoder) => {
      await encoder.init({
        locateFile: (name: string) => new URL(`/codecs/webp/${name}`, self.location.href).href,
      });
      return encoder;
    })
    .catch(() => {
      webpEncoder = undefined;
      throw new Error('The WebP encoder could not load. Try again, or choose PNG or JPG.');
    });
  const encoder = await webpEncoder;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return new Blob([await encoder.default(pixels, { quality: quality * 100 })], { type });
}

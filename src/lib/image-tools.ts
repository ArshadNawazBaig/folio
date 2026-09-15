export type ImageSettings = {
  mode: 'convert' | 'compress' | 'enhance';
  format: 'original' | 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number;
  maxDimension: number;
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
};
export type ImageResult = {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  keptOriginal: boolean;
};
export const defaultImageSettings: ImageSettings = {
  mode: 'convert',
  format: 'original',
  quality: 0.85,
  maxDimension: 0,
  brightness: 0,
  contrast: 0,
  saturation: 1,
  sharpness: 0,
};
export function imageExtension(type: string) {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
}
// JPEG EXIF orientation is not applied by PDF embedding. Read only the bounded TIFF header;
// malformed/missing metadata defaults to the pixel orientation instead of blocking the image.
export function jpegOrientation(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return 1;
  try {
    for (let offset = 2; offset + 4 < Math.min(bytes.length, 256 * 1024);) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      const start = offset + 4;
      if (
        marker === 0xe1 &&
        length >= 16 &&
        view.getUint32(start) === 0x45786966 &&
        view.getUint16(start + 4) === 0
      ) {
        const tiff = start + 6;
        const endian = view.getUint16(tiff);
        if (endian !== 0x4949 && endian !== 0x4d4d) return 1;
        const little = endian === 0x4949;
        if (view.getUint16(tiff + 2, little) !== 42) return 1;
        const directory = tiff + view.getUint32(tiff + 4, little);
        const end = offset + 2 + length;
        if (directory < tiff + 8 || directory + 2 > end) return 1;
        const entries = view.getUint16(directory, little);
        for (let i = 0; i < entries; i++) {
          const entry = directory + 2 + i * 12;
          if (entry + 12 > end) return 1;
          if (
            view.getUint16(entry, little) === 0x0112 &&
            view.getUint16(entry + 2, little) === 3 &&
            view.getUint32(entry + 4, little) === 1
          ) {
            const orientation = view.getUint16(entry + 8, little);
            return orientation >= 1 && orientation <= 8 ? orientation : 1;
          }
        }
      }
      offset += 2 + length;
    }
  } catch {
    /* Truncated or invalid metadata. */
  }
  return 1;
}
export function processImage(
  file: File,
  settings: ImageSettings,
  signal?: AbortSignal,
): Promise<ImageResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/image.worker.ts', import.meta.url));
    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener('abort', cancel);
      clearTimeout(timer);
    };
    const cancel = () => {
      cleanup();
      reject(new Error('Processing cancelled.'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('This image took too long. Try a smaller image.'));
    }, 90000);
    worker.onmessage = ({ data }) => {
      cleanup();
      if (data.error) reject(new Error(data.error));
      else resolve(data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('Image processing could not start. Refresh and try again.'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    worker.postMessage({ file, settings });
  });
}

import type { ImageSettings } from '../lib/image-tools';

self.onmessage = async ({ data }: MessageEvent<{ file: File; settings: ImageSettings }>) => {
  let bitmap: ImageBitmap | undefined;
  try {
    const { file, settings: s } = data;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      !file.size ||
      file.size > 50 * 1024 * 1024
    )
      throw new Error('Choose a JPG, PNG or WEBP image of up to 50 MB.');
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    if (bitmap.width * bitmap.height > 25_000_000)
      throw new Error('Use images with up to 25 million pixels. Resize this image first.');
    const scale = s.maxDimension
      ? Math.min(1, s.maxDimension / Math.max(bitmap.width, bitmap.height))
      : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale)),
      height = Math.max(1, Math.round(bitmap.height * scale));
    const type = s.format === 'original' ? file.type : s.format;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not prepare this image.');
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (s.mode === 'enhance') {
      const pixels = ctx.getImageData(0, 0, width, height),
        p = pixels.data;
      const factor = (259 * (s.contrast + 255)) / (255 * (259 - s.contrast));
      for (let i = 0; i < p.length; i += 4) {
        const luminance = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
        for (let c = 0; c < 3; c++)
          p[i + c] =
            factor * (luminance + (p[i + c] - luminance) * s.saturation - 128) + 128 + s.brightness;
      }
      if (s.sharpness > 0) {
        const source = p.slice();
        for (let y = 1; y < height - 1; y++)
          for (let x = 1; x < width - 1; x++) {
            const i = (y * width + x) * 4;
            if (source[i + 3] < 255) continue;
            for (let c = 0; c < 3; c++)
              p[i + c] =
                source[i + c] * (1 + 4 * s.sharpness) -
                s.sharpness *
                  (source[i - 4 + c] +
                    source[i + 4 + c] +
                    source[i - width * 4 + c] +
                    source[i + width * 4 + c]);
          }
      }
      ctx.putImageData(pixels, 0, 0);
    }
    let blob = await canvas.convertToBlob({ type, quality: s.quality });
    if (blob.type !== type)
      throw new Error('Your browser cannot export this format. Try PNG or JPG.');
    const keptOriginal =
      s.mode === 'compress' && type === file.type && scale === 1 && blob.size >= file.size;
    if (keptOriginal) blob = file;
    self.postMessage({
      result: {
        blob,
        width,
        height,
        originalWidth: bitmap.width,
        originalHeight: bitmap.height,
        keptOriginal,
      },
    });
  } catch (e) {
    self.postMessage({
      error: e instanceof Error ? e.message : 'The image could not be processed.',
    });
  } finally {
    bitmap?.close();
  }
};

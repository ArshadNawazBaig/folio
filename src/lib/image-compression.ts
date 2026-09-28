export const compressionPresets = [10, 15, 20, 30, 40, 50, 100, 200, 500, 1000] as const;
export const compressionFileLimit = 35_000_000;
export type CompressionFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export function targetBytesFromKB(value: string) {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value.trim()))
    throw new Error('Enter a target from 1 to 35,000 KB, using numbers only.');
  const kb = Number(value);
  if (!Number.isFinite(kb) || kb < 1 || kb > 35000)
    throw new Error('Enter a target from 1 to 35,000 KB.');
  return Math.round(kb * 1000);
}

export function compressionSize(bytes: number) {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(2)} MB`
    : `${(bytes / 1000).toFixed(1)} KB`;
}

type Candidate = { blob: Blob; width: number; height: number; quality: number };

/** Search measured encoder output, first quality, then proportional dimensions. */
export async function compressToTarget({
  width,
  height,
  targetBytes,
  formats,
  encode,
}: {
  width: number;
  height: number;
  targetBytes: number;
  formats: CompressionFormat[];
  encode: (
    width: number,
    height: number,
    type: CompressionFormat,
    quality: number,
  ) => Promise<Blob | null>;
}): Promise<Candidate> {
  if (!Number.isInteger(targetBytes) || targetBytes < 1000 || targetBytes > compressionFileLimit)
    throw new Error('Choose a target between 1 and 35,000 KB.');
  const originalWidth = width,
    originalHeight = height;
  let scale = 1;
  for (let round = 0; round < 12; round++) {
    const fitting: Candidate[] = [];
    let smallest = Infinity;
    for (const type of formats) {
      const highQuality = type === 'image/png' ? 1 : 0.92;
      const high = await encode(width, height, type, highQuality);
      if (!high) continue; // Browsers must fall back to PNG for unsupported encoders.
      smallest = Math.min(smallest, high.size);
      if (high.size <= targetBytes) {
        fitting.push({ blob: high, width, height, quality: highQuality });
        continue;
      }
      if (type === 'image/png') continue; // PNG does not support the quality argument.
      let lowQuality = 0.4,
        upperQuality = highQuality;
      let best = await encode(width, height, type, lowQuality);
      if (!best) continue;
      smallest = Math.min(smallest, best.size);
      if (best.size > targetBytes) continue;
      let quality = lowQuality;
      for (let step = 0; step < 5; step++) {
        const middle = (lowQuality + upperQuality) / 2;
        const blob = await encode(width, height, type, middle);
        if (!blob) break;
        if (blob.size <= targetBytes) {
          best = blob;
          quality = middle;
          lowQuality = middle;
        } else upperQuality = middle;
      }
      fitting.push({ blob: best, width, height, quality });
    }
    // Auto compares the smallest suitable result from each supported format at this size.
    if (fitting.length) return fitting.sort((a, b) => a.blob.size - b.blob.size)[0];
    if (!Number.isFinite(smallest))
      throw new Error('Your browser cannot export this format. Try PNG or JPG.');
    if (width === 1 && height === 1) break;
    scale *= Math.max(0.1, Math.min(0.85, Math.sqrt(targetBytes / smallest) * 0.9));
    width = Math.max(1, Math.floor(originalWidth * scale));
    height = Math.max(1, Math.floor(originalHeight * scale));
  }
  throw new Error('This target could not be reached. Choose a larger size or another format.');
}

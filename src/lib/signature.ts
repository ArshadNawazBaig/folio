import type { DocumentFont } from './pro-types';

export type SignatureTab = 'draw' | 'image' | 'type';
export type SignaturePoint = { x: number; y: number };
export type SignatureResult =
  | {
      source: 'type';
      text: string;
      font: DocumentFont;
      color: string;
      width: number;
      height: number;
      size: number;
    }
  | { source: 'draw' | 'image'; dataUrl: string; width: number; height: number };

export function paintSignature(
  canvas: HTMLCanvasElement,
  strokes: SignaturePoint[][],
  color: string,
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = (2.6 * canvas.width) / Math.max(1, canvas.clientWidth || canvas.width);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    const points = stroke.map((p) => ({ x: p.x * canvas.width, y: p.y * canvas.height }));
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    if (points.length === 1) {
      context.arc(points[0].x, points[0].y, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
      continue;
    }
    for (let i = 1; i < points.length - 1; i++) {
      const next = points[i + 1];
      context.quadraticCurveTo(
        points[i].x,
        points[i].y,
        (points[i].x + next.x) / 2,
        (points[i].y + next.y) / 2,
      );
    }
    const last = points[points.length - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
  }
}

/** Crop transparent margins so the selection fits the actual signature. */
export function signatureImage(canvas: HTMLCanvasElement, removeWhite = false) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The signature preview could not be created.');
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width,
    top = canvas.height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (removeWhite) {
        const light = Math.min(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
        if (light > 230) pixels.data[i + 3] *= (255 - light) / 25;
      }
      if (pixels.data[i + 3] > 8) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left)
    throw new Error('No signature is visible. Draw a signature or choose another image.');
  const padding = 12;
  const output = document.createElement('canvas');
  output.width = right - left + 1 + padding * 2;
  output.height = bottom - top + 1 + padding * 2;
  const target = output.getContext('2d');
  if (!target) throw new Error('The signature could not be created.');
  target.putImageData(
    pixels,
    padding - left,
    padding - top,
    left,
    top,
    right - left + 1,
    bottom - top + 1,
  );
  const dataUrl = output.toDataURL('image/png');
  if (dataUrl.length > 2 * 1024 * 1024)
    throw new Error('This image is too detailed. Choose a smaller image of just your signature.');
  return { dataUrl, width: output.width, height: output.height };
}

export async function readSignatureImage(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('Choose a PNG, JPG, or WebP image smaller than 5 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 25000000
    )
      throw new Error('Choose a smaller image of your signature (up to 25 megapixels).');
    const ratio = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This image could not be opened.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch (error) {
    if (error instanceof Error && error.name === 'Error') throw error;
    throw new Error('This image could not be opened. Try another PNG, JPG, or WebP file.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

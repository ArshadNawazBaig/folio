import type { CSSProperties } from 'react';
import type { TextBlock, TextChange } from './pro-types';

export function textPaintStyle(
  block: TextBlock,
  value: TextChange,
  transform: number[],
  scale: number,
  left: number,
  top: number,
  angle: number,
  width: number,
  height: number,
): CSSProperties | null {
  const paint = block.paint;
  if (!paint || value.preservePaint === false || paint.colors.every((c) => c === paint.colors[0]))
    return null;
  const ratio = value.size / block.size,
    baseline = block.matrix?.slice(4) || [0, 0];
  const coords = paint.coords.map(
    (v, i) =>
      (v - baseline[i % 2]) * ratio +
      baseline[i % 2] +
      (i % 2 ? value.offset?.y || 0 : value.offset?.x || 0),
  );
  const radians = (angle * Math.PI) / 180,
    cos = Math.cos(radians),
    sin = Math.sin(radians);
  const local = (x: number, y: number) => {
    const dx = (transform[0] * x + transform[2] * y + transform[4]) * scale - left;
    const dy = (transform[1] * x + transform[3] * y + transform[5]) * scale - top;
    return [dx * cos + dy * sin, -dx * sin + dy * cos];
  };
  const [x1, y1] = local(coords[0], coords[1]),
    [x2, y2] = local(coords[2], coords[3]);
  const stops = paint.colors
    .map((c, i) => `<stop offset="${i / (paint.colors.length - 1)}" stop-color="${c}"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return {
    color: 'transparent',
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    backgroundRepeat: 'no-repeat',
  };
}

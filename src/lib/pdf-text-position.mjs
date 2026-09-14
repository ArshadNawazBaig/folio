export const MAX_TEXT_OFFSET = 100000;
export function isPdfTextOffset(offset) {
  return (
    offset === undefined ||
    (offset !== null &&
      typeof offset === 'object' &&
      ['x', 'y'].every(
        (key) =>
          typeof offset[key] === 'number' &&
          Number.isFinite(offset[key]) &&
          Math.abs(offset[key]) <= MAX_TEXT_OFFSET,
      ))
  );
}
export function moveTextMatrix(matrix, offset, ratio = 1) {
  return matrix.map((number, index) =>
    index < 4 ? number * ratio : number + (index === 4 ? offset?.x || 0 : offset?.y || 0),
  );
}
export function screenTextOffset(x, y, transform) {
  const [a, b, c, d] = transform;
  const determinant = a * d - b * c;
  return { x: (d * x - c * y) / determinant, y: (a * y - b * x) / determinant };
}
export function viewportTextOffset(offset, transform) {
  return {
    x: transform[0] * (offset?.x || 0) + transform[2] * (offset?.y || 0),
    y: transform[1] * (offset?.x || 0) + transform[3] * (offset?.y || 0),
  };
}

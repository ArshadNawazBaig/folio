// PDF text-space size is separate from the scale in its text matrix. A receipt
// may use 1 Tf with a 14x matrix to display ordinary 14-point text. Keep these
// raw sizes in saved workspaces so existing edits and PDF object IDs stay valid.
export const MAX_PDF_TEXT_SIZE = 10000;

/** @param {number} value */
export function isPdfTextSize(value) {
  return Number.isFinite(value) && value > 0 && value <= MAX_PDF_TEXT_SIZE;
}

/** @param {{ matrix?: number[] }} block */
export function pdfTextScale(block) {
  const matrix = block.matrix;
  const scale = matrix ? Math.hypot(matrix[2], matrix[3]) : 1;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** @param {{ matrix?: number[] }} block @param {number} size */
export function pdfTextSizeInPoints(block, size) {
  return size * pdfTextScale(block);
}

/** @param {{ matrix?: number[] }} block @param {number} points */
export function pdfTextSizeFromPoints(block, points) {
  return points / pdfTextScale(block);
}

'use client';

import { useState } from 'react';
import type { TextBlock } from '@/lib/pro-types';
import {
  isPdfTextSize,
  MAX_PDF_TEXT_SIZE,
  pdfTextSizeFromPoints,
  pdfTextSizeInPoints,
} from '@/lib/pdf-text-size.mjs';

export function PdfTextSizeInput({
  block,
  size,
  onChange,
}: {
  block: TextBlock;
  size: number;
  onChange: (size: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const points = pdfTextSizeInPoints(block, size);
  // Round only the display. Selecting text or leaving the field unchanged must
  // not alter the source size or the stored transformation.
  const display = Number(points.toPrecision(6));
  const invalid = draft !== null && !isPdfTextSize(pdfTextSizeFromPoints(block, Number(draft)));
  return (
    <input
      type="number"
      min={0}
      max={pdfTextSizeInPoints(block, MAX_PDF_TEXT_SIZE)}
      step="any"
      value={draft ?? display}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = pdfTextSizeFromPoints(block, event.target.valueAsNumber);
        // Incomplete number entry must never put NaN, zero, or a negative size
        // into a preview request or the cloud save queue.
        if (isPdfTextSize(next)) onChange(next);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

'use client';
import { useEffect, useState } from 'react';
import { MAX_PREVIEW_WIDTH } from './pdf-preview.mjs';

export function usePdfPreviewWidth(width: number) {
  const [density, setDensity] = useState(1);
  useEffect(() => {
    let media: MediaQueryList;
    const update = () => {
      setDensity(Math.max(1, Math.min(window.devicePixelRatio || 1, 2)));
      media?.removeEventListener('change', update);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      media.addEventListener('change', update);
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      media.removeEventListener('change', update);
    };
  }, []);
  // Small width changes share a resolution; zoom and Retina displays still get enough pixels.
  return Math.min(MAX_PREVIEW_WIDTH, Math.max(64, Math.ceil((width * density) / 64) * 64));
}

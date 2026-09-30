'use client';

import { useEffect, useState } from 'react';
import { friendlyError } from '@/lib/utils';

/** Prepare both files before the tap so mobile downloads keep the user's gesture. */
export function useQrDownloads(svg: string, size = 1024) {
  const svgUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : '';
  const [png, setPng] = useState({ source: '', size: 0, url: '', error: '' });

  useEffect(() => {
    if (!svgUrl) return;
    let cancelled = false;
    async function prepare() {
      try {
        const image = new Image();
        image.src = svgUrl;
        await image.decode();
        if (cancelled) return;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Your browser could not export the QR code.');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, size, size);
        const url = canvas.toDataURL('image/png');
        if (!url.startsWith('data:image/png')) throw new Error('Could not export the QR code.');
        setPng({ source: svgUrl, size, url, error: '' });
      } catch (error) {
        if (!cancelled) setPng({ source: svgUrl, size, url: '', error: friendlyError(error) });
      }
    }
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [svgUrl, size]);

  // Never offer an older code or resolution while its replacement is being prepared.
  const current = png.source === svgUrl && png.size === size;
  return { svgUrl, pngUrl: current ? png.url : '', error: current ? png.error : '' };
}

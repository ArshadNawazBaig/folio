'use client';
import { useEffect, useState } from 'react';
import { documentFontStyle, documentFontUrl, parseDocumentFont } from './document-fonts.mjs';

const faces = new Map<string, Promise<FontFace>>();
const pinned = new Map<string, number>();
let loading = 0;
const queue: (() => void)[] = [];
async function slot() {
  if (loading >= 2) await new Promise<void>((resolve) => queue.push(resolve));
  loading++;
}
function trimFaces() {
  for (const [value, pending] of faces) {
    if (faces.size <= 64) break;
    if (pinned.has(value)) continue;
    faces.delete(value);
    void pending.then(
      (face) => {
        if (!faces.has(value)) document.fonts.delete(face);
      },
      () => {},
    );
  }
}
export function loadBrowserDocumentFont(value: string): Promise<FontFace | null> {
  const parsed = parseDocumentFont(value);
  if (!parsed) return Promise.resolve(null);
  const previous = faces.get(value);
  if (previous) {
    faces.delete(value);
    faces.set(value, previous);
    return previous;
  }
  const pending = (async () => {
    await slot();
    try {
      const response = await fetch(documentFontUrl(value), { signal: AbortSignal.timeout(20000) });
      if (!response.ok)
        throw new Error('This font could not be loaded. Try again or choose another font.');
      const family = documentFontStyle(value).fontFamily.replaceAll('"', '');
      const face = await new FontFace(family, await response.arrayBuffer(), {
        weight: String(parsed.weight),
        style: parsed.style,
      }).load();
      document.fonts.add(face);
      trimFaces();
      return face;
    } catch (error) {
      faces.delete(value);
      throw error;
    } finally {
      loading--;
      queue.shift()?.();
    }
  })();
  faces.set(value, pending);
  return pending;
}

/** Keep only document fonts in memory; unused picker previews may be evicted. */
export function useDocumentFonts(values: string[]) {
  const key = JSON.stringify(
    [...new Set(values.filter((value) => parseDocumentFont(value)))].sort(),
  );
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const fonts = JSON.parse(key) as string[];
    fonts.forEach((value) => pinned.set(value, (pinned.get(value) || 0) + 1));
    setError('');
    void Promise.all(fonts.map(loadBrowserDocumentFont)).catch(() => {
      if (!cancelled)
        setError('A document font could not be loaded. Retry to restore its appearance.');
    });
    return () => {
      cancelled = true;
      fonts.forEach((value) => {
        const count = (pinned.get(value) || 1) - 1;
        if (count) pinned.set(value, count);
        else pinned.delete(value);
      });
      trimFaces();
    };
  }, [key, retry]);
  return { error, retry: () => setRetry((value) => value + 1) };
}

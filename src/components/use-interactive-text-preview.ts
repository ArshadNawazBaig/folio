'use client';
import { useEffect, useState } from 'react';
import { InteractiveTextPreview } from '@/lib/interactive-text-preview';
export function useInteractiveTextPreview(bytes: Uint8Array | null, pageCount?: number) {
  const [value, setValue] = useState<{
    bytes: Uint8Array;
    client: InteractiveTextPreview | null;
  } | null>(null);
  useEffect(() => {
    if (!bytes || !pageCount) return;
    if (pageCount > 100 || bytes.length > 10 * 1024 * 1024) {
      setValue({ bytes, client: null });
      return;
    }
    try {
      const client = new InteractiveTextPreview(bytes);
      setValue({ bytes, client });
      return () => client.dispose();
    } catch {
      /* Fall back to server previews when browser workers are unavailable. */
      setValue({ bytes, client: null });
    }
  }, [bytes, pageCount]);
  return {
    client: value?.bytes === bytes ? value.client : null,
    starting: !!bytes && value?.bytes !== bytes,
  };
}

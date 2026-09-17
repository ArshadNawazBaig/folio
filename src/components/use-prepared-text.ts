'use client';
import { useEffect, useRef, useState } from 'react';
import {
  inspectInteractiveText,
  type InteractiveTextPreview,
} from '@/lib/interactive-text-preview';
import type { TextInspection } from '@/lib/pro-types';

export function hasInspectedPage(inspection: TextInspection | null, page: number | null) {
  return (
    inspection?.version === 4 &&
    page !== null &&
    (!inspection.pages || inspection.pages.includes(page))
  );
}

/** Prepare the visible page without blocking the toolbar or inspecting unrelated pages. */
export function usePreparedText(
  bytes: Uint8Array | null,
  name: string,
  pageCount: number | undefined,
  page: number | null,
  restored: TextInspection | null,
  previewClient: InteractiveTextPreview | null,
  starting: boolean,
) {
  // Re-inspect older metadata so text inside PDF groups is also available.
  const currentRestored = restored?.version === 4 ? restored : null;
  const cache = useRef<{ bytes: Uint8Array; inspection: TextInspection | null } | null>(null);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    inspection: TextInspection;
  } | null>(null);
  const [failure, setFailure] = useState<{
    bytes: Uint8Array;
    page: number;
    message: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!bytes || !pageCount || page === null || bytes.length > 10 * 1024 * 1024 || pageCount > 100)
      return;
    if (cache.current?.bytes !== bytes) cache.current = { bytes, inspection: currentRestored };
    const entry = cache.current;
    if (
      currentRestored &&
      (!entry.inspection ||
        !currentRestored.pages ||
        entry.inspection.pages?.every((p) => currentRestored.pages!.includes(p)))
    )
      entry.inspection = currentRestored;
    if (hasInspectedPage(entry.inspection, page)) return;
    // A restored snapshot may arrive after the viewer opens. Keep its existing
    // object IDs and fonts instead of requesting that source page again.
    if (hasInspectedPage(currentRestored, page)) {
      entry.inspection = currentRestored;
      setResult({ bytes, inspection: currentRestored! });
      return;
    }
    if (starting) return;
    const controller = new AbortController();
    setFailure(null);
    void inspectInteractiveText(previewClient, bytes, name, page, controller.signal)
      .then((inspection: TextInspection) => {
        if (controller.signal.aborted || cache.current !== entry) return;
        const previous = entry.inspection;
        const merged = previous
          ? {
              pageCount: inspection.pageCount,
              version: inspection.version,
              pages: [...new Set([...(previous.pages || []), page])].sort((a, b) => a - b),
              blocks: [
                ...previous.blocks.filter((block) => block.page !== page),
                ...inspection.blocks,
              ],
              skipped: previous.skipped + inspection.skipped,
            }
          : inspection;
        if (merged.blocks.length > 5000)
          throw new Error('This PDF has too many text blocks. Split it into smaller documents.');
        entry.inspection = merged;
        setResult({ bytes, inspection: merged });
      })
      .catch((error) => {
        if (!controller.signal.aborted && cache.current === entry)
          setFailure({
            bytes,
            page,
            message:
              error instanceof Error ? error.message : 'Editable text could not be prepared.',
          });
      });
    return () => controller.abort();
  }, [bytes, name, pageCount, page, currentRestored, retry, previewClient, starting]);
  // Never expose a previous document's cached text during a file change.
  const prepared = result?.bytes === bytes ? result.inspection : null;
  const inspection =
    currentRestored &&
    (!currentRestored.pages ||
      !prepared ||
      prepared.pages?.every((p) => currentRestored.pages!.includes(p)))
      ? currentRestored
      : prepared;
  return {
    inspection,
    ready: hasInspectedPage(inspection, page),
    error: failure?.bytes === bytes && failure.page === page ? failure.message : '',
    retry: () => setRetry((value) => value + 1),
  };
}

'use client';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { PdfPageSkeleton } from './editor-skeleton';
import { LoadingLabel } from './skeleton';
export function PdfCanvas({
  document,
  page = 1,
  width = 560,
  rotation,
  decorative = false,
  onPreviewError,
  aspectRatio,
}: {
  document: PDFDocumentProxy;
  page?: number;
  width?: number;
  rotation?: number;
  decorative?: boolean;
  onPreviewError?: (message: string) => void;
  aspectRatio?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('Loading page text…');
  const [retry, setRetry] = useState(0);
  const [rendered, setRendered] = useState<{
    document: PDFDocumentProxy;
    page: number;
    rotation?: number;
  } | null>(null);
  const [pageRatio, setPageRatio] = useState(595 / 842);
  const hasPreview =
    rendered?.document === document && rendered.page === page && rendered.rotation === rotation;
  useEffect(() => {
    // A failed page change must not leave the previous page's image underneath
    // the current page's annotations. Zooming can keep the previous resolution.
    container.current?.replaceChildren();
    setRendered(null);
  }, [document, page, rotation]);
  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | undefined;
    (async () => {
      try {
        setError('');
        onPreviewError?.('');
        const pdfPage = await document.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1, rotation });
        setPageRatio(base.width / base.height);
        const density = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = pdfPage.getViewport({ scale: (width / base.width) * density, rotation });
        const canvas = window.document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.setAttribute('aria-hidden', 'true');
        task = pdfPage.render({ canvas, viewport, background: '#ffffff' });
        await task.promise;
        if (!cancelled && container.current) {
          container.current.replaceChildren(canvas);
          setRendered({ document, page, rotation });
        }
      } catch (e) {
        if (!cancelled && !(e instanceof Error && e.name === 'RenderingCancelledException')) {
          const message = 'This page could not be previewed. Your edits are still here.';
          setError(message);
          onPreviewError?.(message);
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
      onPreviewError?.('');
    };
  }, [document, page, width, rotation, retry, onPreviewError]);
  useEffect(() => {
    if (decorative) return;
    let cancelled = false;
    setText('Loading page text…');
    // Accessibility text is independent of the rendered image and does not
    // need to be extracted again on every zoom. Its failure is not a preview error.
    void document
      .getPage(page)
      .then((pdfPage) => pdfPage.getTextContent())
      .then((content) => {
        if (!cancelled)
          setText(
            content.items.map((item) => ('str' in item ? item.str : '')).join(' ') ||
              'This page has no selectable text.',
          );
      })
      .catch(() => {
        if (!cancelled) setText('Text is unavailable for this page.');
      });
    return () => {
      cancelled = true;
    };
  }, [document, page, decorative, retry]);
  return (
    <div
      className="pdf-canvas"
      style={{ width, ...(!hasPreview ? { aspectRatio: aspectRatio ?? pageRatio } : {}) }}
      aria-busy={!hasPreview && !error}
    >
      <div ref={container} />
      {!hasPreview && !error && (
        <>
          <PdfPageSkeleton />
          {!decorative && <LoadingLabel>Rendering page {String(page)}…</LoadingLabel>}
        </>
      )}
      {error && !onPreviewError && !decorative && (
        <div className="pdf-preview-error error-message" role="alert">
          <span>{error}</span>
          <button
            className="text-link"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setRetry((value) => value + 1);
            }}
          >
            Retry preview
          </button>
        </div>
      )}
      {!decorative && (
        <span className="sr-only">
          Page {page}: {text}
        </span>
      )}
    </div>
  );
}

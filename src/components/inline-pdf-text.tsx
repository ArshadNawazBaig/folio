'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageModel } from '@/lib/types';
import type { TextBlock, TextChange, TextInspection, TextPreview } from '@/lib/pro-types';
import { defaultTextChange } from '@/lib/editor-text';
import { requestTextPdf } from '@/lib/editor-text-client';

type Geometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  fontScale: number;
};
function textFont(font: string) {
  return {
    fontFamily: /courier|mono/i.test(font)
      ? 'Courier New, monospace'
      : /times|serif/i.test(font)
        ? 'Times New Roman, serif'
        : 'Arial, sans-serif',
    fontWeight: /bold|black/i.test(font) ? 700 : 400,
    fontStyle: /italic|oblique/i.test(font) ? 'italic' : 'normal',
  } as const;
}

export function InlinePdfText({
  document,
  bytes,
  name,
  page,
  width,
  inspection,
  changes,
  enabled,
  disabled,
  update,
  select,
  undo,
  redo,
  save,
}: {
  document: PDFDocumentProxy;
  bytes: Uint8Array;
  name: string;
  page: PageModel;
  width: number;
  inspection: TextInspection;
  changes: Record<string, TextChange>;
  enabled: boolean;
  disabled: boolean;
  update: (block: TextBlock, patch: Partial<TextChange>, group?: string) => void;
  select: (block: TextBlock) => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
}) {
  const [geometry, setGeometry] = useState<Record<string, Geometry>>({});
  const [baseWidth, setBaseWidth] = useState(1);
  const [active, setActive] = useState('');
  const [preview, setPreview] = useState<{
    image: TextPreview;
    changes: Record<string, TextChange>;
    key: string;
  } | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const editGroup = useRef('');
  const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});
  const blocks = inspection.blocks.filter((block) => block.page === page.sourceIndex);
  const scale = width / baseWidth;
  const activeBlock = enabled ? blocks.find((block) => block.id === active) : undefined;
  const desiredChanges = { ...changes };
  // Remove the selected object's ink in the image behind the live input. Typing itself is immediate,
  // and doesn't send a request for each keystroke. Blur automatically renders the finished text.
  if (activeBlock)
    desiredChanges[activeBlock.id] = {
      ...(changes[activeBlock.id] || defaultTextChange(activeBlock)),
      text: '',
    };
  const requestKey = JSON.stringify({ changes: desiredChanges, rotation: page.rotation });
  const renderedKey = preview?.key;
  const needsImage = !!activeBlock || Object.keys(changes).length > 0 || !!preview;

  useEffect(() => {
    let cancelled = false;
    if (page.sourceIndex === null) return;
    void document
      .getPage(page.sourceIndex + 1)
      .then((pdfPage) => {
        const viewport = pdfPage.getViewport({ scale: 1, rotation: page.rotation });
        const boxes: Record<string, Geometry> = {};
        for (const block of inspection.blocks.filter((block) => block.page === page.sourceIndex)) {
          const [left, bottom, right, top] = block.bounds;
          const p = viewport.convertToViewportPoint(left, bottom);
          const q = viewport.convertToViewportPoint(right, top);
          const matrix = block.matrix || [1, 0, 0, 1, 0, 0];
          const transform = viewport.transform;
          const vx = transform[0] * matrix[0] + transform[2] * matrix[1];
          const vy = transform[1] * matrix[0] + transform[3] * matrix[1];
          const heightX = transform[0] * matrix[2] + transform[2] * matrix[3];
          const heightY = transform[1] * matrix[2] + transform[3] * matrix[3];
          boxes[block.id] = {
            left: Math.min(p[0], q[0]),
            top: Math.min(p[1], q[1]),
            width: Math.abs(q[0] - p[0]),
            height: Math.abs(q[1] - p[1]),
            angle: (Math.atan2(vy, vx) * 180) / Math.PI,
            fontScale: Math.hypot(heightX, heightY) || 1,
          };
        }
        if (!cancelled) {
          setGeometry(boxes);
          setBaseWidth(viewport.width);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError('Text positions could not be loaded. Reopen this document to try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [document, inspection, page.sourceIndex, page.rotation]);

  useEffect(() => {
    if (!needsImage || page.sourceIndex === null || requestKey === renderedKey) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus('Updating page preview…');
      setError('');
      const desired = JSON.parse(requestKey) as {
        changes: Record<string, TextChange>;
        rotation: number;
      };
      void requestTextPdf(
        bytes,
        name,
        {
          operation: 'preview',
          page: page.sourceIndex,
          changes: Object.values(desired.changes),
          rotation: desired.rotation,
        },
        false,
        controller.signal,
      )
        .then((response) => response.json())
        .then((image: TextPreview) => {
          if (!controller.signal.aborted) {
            setPreview({ image, changes: desired.changes, key: requestKey });
            setStatus('Page preview updated.');
          }
        })
        .catch((reason) => {
          if (!controller.signal.aborted) {
            setError(
              reason instanceof Error ? reason.message : 'The page preview could not be updated.',
            );
            setStatus('');
          }
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bytes, name, page.sourceIndex, needsImage, requestKey, renderedKey]);

  function background(box: Geometry) {
    const canvas = root.current?.closest('.editable-page')?.querySelector('canvas');
    if (!canvas) return '#ffffff';
    try {
      const context = canvas.getContext('2d');
      const x = Math.max(
        0,
        Math.min(canvas.width - 1, Math.round(((box.left - 2) / baseWidth) * canvas.width)),
      );
      const y = Math.max(
        0,
        Math.min(canvas.height - 1, Math.round(((box.top - 2) / baseWidth) * canvas.width)),
      );
      const pixel = context?.getImageData(x, y, 1, 1).data;
      if (pixel) return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    } catch {
      /* The server preview supplies the exact background when ready. */
    }
    return '#ffffff';
  }
  function start(block: TextBlock) {
    editGroup.current = crypto.randomUUID();
    const box = geometry[block.id];
    if (box) setBackgrounds((current) => ({ ...current, [block.id]: background(box) }));
    setActive(block.id);
    select(block);
  }
  return (
    <>
      {preview && (
        <img
          className="inline-pdf-preview"
          src={`data:image/png;base64,${preview.image.preview}`}
          alt="PDF page with your text changes"
          draggable={false}
        />
      )}
      <div ref={root} className={`inline-pdf-text ${enabled ? 'enabled' : ''}`}>
        {blocks.map((block) => {
          const box = geometry[block.id];
          if (!box) return null;
          const value = changes[block.id] || defaultTextChange(block);
          const editing = activeBlock?.id === block.id;
          const painted = preview?.changes[block.id]?.text ?? block.text;
          const pending = painted !== value.text;
          const rotated = Math.abs(Math.sin((box.angle * Math.PI) / 180)) > 0.7;
          const localWidth = (rotated ? box.height : box.width) * scale;
          const localHeight = (rotated ? box.width : box.height) * scale;
          const angle = (Math.round(box.angle / 90) * 90 + 360) % 360;
          const originX = angle === 90 || angle === 180 ? box.width * scale : 0;
          const originY = angle === 180 || angle === 270 ? box.height * scale : 0;
          const style = {
            ...textFont(value.font),
            fontSize: value.size * box.fontScale * scale,
            color: value.color,
            left: originX,
            top: originY,
            width: Math.max(
              localWidth + 6,
              Math.min(
                width - box.left * scale,
                value.text.length * value.size * box.fontScale * scale * 0.65,
              ),
              24,
            ),
            height: Math.max(localHeight, value.size * box.fontScale * scale * 1.15),
            transform: `rotate(${box.angle}deg)`,
            background:
              preview?.changes[block.id]?.text === ''
                ? 'transparent'
                : backgrounds[block.id] || '#ffffff',
          };
          return (
            <div
              key={block.id}
              className="inline-text-node"
              style={{
                left: box.left * scale,
                top: box.top * scale,
                width: Math.max(12, box.width * scale),
                height: Math.max(12, box.height * scale),
              }}
            >
              {editing ? (
                <input
                  className="inline-text-input"
                  aria-label={`Edit original text: ${block.text}`}
                  autoFocus
                  value={value.text}
                  maxLength={2000}
                  style={style}
                  disabled={disabled}
                  onPointerDown={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    update(block, { text: event.target.value }, editGroup.current)
                  }
                  onBlur={() => setActive('')}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                      event.preventDefault();
                      if (event.shiftKey) redo();
                      else undo();
                      editGroup.current = crypto.randomUUID();
                    } else if (
                      (event.ctrlKey || event.metaKey) &&
                      event.key.toLowerCase() === 's'
                    ) {
                      event.preventDefault();
                      save();
                    } else if (event.key === 'Enter' || event.key === 'Escape') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
              ) : (
                <>
                  {pending && (
                    <span className="inline-text-pending" style={style}>
                      {value.text || '\u00a0'}
                    </span>
                  )}
                  {enabled && (
                    <button
                      className="inline-text-target"
                      disabled={disabled}
                      style={
                        changes[block.id]
                          ? {
                              ...style,
                              width: 'max-content',
                              minWidth: Math.max(12, localWidth),
                              background: 'transparent',
                            }
                          : undefined
                      }
                      aria-label={`Edit text: ${block.text}`}
                      title="Click to edit this text"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => start(block)}
                    >
                      {changes[block.id] && (
                        <span aria-hidden="true" style={{ opacity: 0 }}>
                          {value.text || '\u00a0'}
                        </span>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="inline-text-status" aria-live="polite">
        {error ? <span role="alert">{error}</span> : status}
      </div>
    </>
  );
}

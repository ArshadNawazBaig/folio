'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Move } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageModel } from '@/lib/types';
import type { TextBlock, TextChange, TextInspection, InteractiveTextImage } from '@/lib/pro-types';
import { defaultTextChange, resolvedTextChange } from '@/lib/editor-text';
import {
  interactiveTextPreview,
  type InteractiveTextPreview,
} from '@/lib/interactive-text-preview';
import {
  completeOriginalFont,
  matchingOriginalFont,
  originalFontWeight,
  pdfEditCharacters,
} from '@/lib/pdf-original-fonts.mjs';
import { screenTextOffset, viewportTextOffset } from '@/lib/pdf-text-position.mjs';
import { PdfPageSkeleton } from './editor-skeleton';
import { documentFontStyle } from '@/lib/document-fonts.mjs';
import { useDocumentFonts } from '@/lib/document-font-client';
import { usePdfPreviewWidth } from '@/lib/use-pdf-preview-width';
import { TextPreviewImage } from './text-preview-image';
import { decodeTextPreview, trimPreviews } from '@/lib/text-preview-cache';
import { textPaintStyle } from '@/lib/text-paint-style';

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
const fontKey = (name: string) => name.replace(/^[A-Z]{6}\+/, '').toLowerCase();
function originalTextFont(block: TextBlock): CSSProperties {
  return {
    ...textFont(block.font),
    fontWeight: block.fontWeight || originalFontWeight(block.font),
    fontStyle: block.fontItalic ? 'italic' : textFont(block.font).fontStyle,
  };
}
const completeFaces = new Map<string, Promise<CSSProperties>>();
function loadCompleteFace(name: string) {
  const face = completeOriginalFont(name);
  if (!face) return null;
  let pending = completeFaces.get(face.name);
  if (!pending) {
    const family = `FolioPdf_${face.name}`;
    pending = new FontFace(family, `url("${face.url}")`, {
      weight: String(face.weight),
      style: face.italic ? 'italic' : 'normal',
    })
      .load()
      .then((font) => {
        globalThis.document.fonts.add(font);
        return {
          fontFamily: `"${family}"`,
          fontWeight: face.weight,
          fontStyle: face.italic ? 'italic' : 'normal',
          fontSynthesis: 'none',
        } as CSSProperties;
      })
      .catch((error) => {
        completeFaces.delete(face.name);
        throw error;
      });
    completeFaces.set(face.name, pending);
  }
  return pending;
}
type ViewerFont = {
  name?: string;
  loadedName?: string;
  missingFile?: boolean;
  disableFontFace?: boolean;
  data?: Uint8Array;
};
let mixedFontId = 0;
async function loadMixedFace(block: TextBlock, font: ViewerFont | undefined) {
  const fallback = matchingOriginalFont(
    block.font,
    block.fontWeight,
    block.fontItalic,
    block.fontCategory,
  );
  const family = `FolioPdf_Mixed_${++mixedFontId}`;
  const weight = block.fontWeight || originalFontWeight(block.font);
  const style = block.fontItalic ? 'italic' : 'normal';
  const available = new Set([...(block.fontCharacters || ''), ...block.text]);
  const range = (characters: string[]) =>
    characters.map((c) => `U+${c.codePointAt(0)!.toString(16)}`).join(',');
  const original = font?.data && !font.disableFontFace && !font.missingFile;
  const missing = [...pdfEditCharacters].filter((c) => !available.has(c));
  const descriptors = { weight: String(weight), style };
  const faces: FontFace[] = [];
  if (original && available.size)
    faces.push(
      new FontFace(family, font.data!.slice().buffer, {
        ...descriptors,
        unicodeRange: range([...available]),
      }),
    );
  if (!original || missing.length)
    faces.push(
      new FontFace(family, `url("${fallback.url}")`, {
        ...descriptors,
        ...(original ? { unicodeRange: range(missing) } : {}),
      }),
    );
  await Promise.all(faces.map((face) => face.load()));
  faces.forEach((face) => globalThis.document.fonts.add(face));
  return {
    faces,
    style: {
      fontFamily: `"${family}"`,
      fontWeight: weight,
      fontStyle: style,
      fontSynthesis: 'none',
      fontKerning: 'none',
    } as CSSProperties,
  };
}
function needsCompleteFont(block: TextBlock, text: string) {
  return [...text].some(
    (char) =>
      !block.text.includes(char) && (!block.fontCharacters || !block.fontCharacters.includes(char)),
  );
}

export function InlinePdfText({
  document,
  bytes,
  name,
  previewClient = null,
  page,
  width,
  inspection,
  selected,
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
  previewClient?: InteractiveTextPreview | null;
  page: PageModel;
  width: number;
  inspection: TextInspection;
  selected: string;
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
  const documentFonts = useDocumentFonts(Object.values(changes).map((change) => change.font));
  const copySourcesKey = JSON.stringify([
    ...new Set(
      Object.values(changes).flatMap((change) =>
        change.copy && change.copy.page !== page.sourceIndex ? [change.copy.page] : [],
      ),
    ),
  ]);
  const copySources = useMemo(() => JSON.parse(copySourcesKey) as number[], [copySourcesKey]);
  const [originalFonts, setOriginalFonts] = useState<Record<string, CSSProperties>>({});
  const [expandedFonts, setExpandedFonts] = useState<Record<string, CSSProperties>>({});
  const [baseWidth, setBaseWidth] = useState(1);
  const [viewport, setViewport] = useState({ transform: [1, 0, 0, -1, 0, 0], height: 1 });
  const [active, setActive] = useState('');
  const [dragged, setDragged] = useState<{ id: string; offset: { x: number; y: number } } | null>(
    null,
  );
  const drag = useRef<{
    block: TextBlock;
    x: number;
    y: number;
    offset: { x: number; y: number };
    pointer: number;
  } | null>(null);
  type Preview = {
    image: InteractiveTextImage;
    changes: Record<string, TextChange>;
    key: string;
    rotation: number;
  };
  const [preview, setPreview] = useState<Preview | null>(null);
  // Keep a few decoded backgrounds in this document's memory. Returning to a
  // previously selected text box must not require another server round trip.
  const previewCache = useRef<{
    bytes: Uint8Array;
    page: number | null;
    entries: Map<string, Preview>;
  } | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [previewRetry, setPreviewRetry] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const returnFocus = useRef('');
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editGroup = useRef('');
  const blocks = inspection.blocks.filter((block) => block.page === page.sourceIndex);
  const scale = width / baseWidth;
  const selectedBlock = enabled ? blocks.find((block) => block.id === selected) : undefined;
  const activeBlock = selectedBlock?.id === active ? selectedBlock : undefined;
  const hiddenBlock = selectedBlock;
  const desiredChanges = { ...changes };
  const changesKey = JSON.stringify(changes);
  // The selected object is removed from the PDF background throughout typing and dragging.
  // Its live text is drawn once, over that clean background. Deselecting renders it into
  // the page again. Geometry and appearance changes never expose the old ink underneath.
  if (hiddenBlock)
    desiredChanges[hiddenBlock.id] = {
      ...defaultTextChange(hiddenBlock),
      ...(changes[hiddenBlock.id]?.copy ? { copy: changes[hiddenBlock.id].copy } : {}),
      text: '',
    };
  const pixelWidth = usePdfPreviewWidth(width);
  const requestKey = JSON.stringify({
    changes: desiredChanges,
    rotation: page.rotation,
    pixelWidth,
  });
  const visiblePreview = preview?.rotation === page.rotation ? preview : null;
  const renderedKey = visiblePreview?.key;
  const needsImage = !!hiddenBlock || Object.keys(changes).length > 0 || !!preview;
  const readyToEdit = !!activeBlock && visiblePreview?.changes[activeBlock.id]?.text === '';
  const clearingSelectedInk = !!hiddenBlock && visiblePreview?.changes[hiddenBlock.id]?.text !== '';

  useEffect(() => {
    if (readyToEdit)
      root.current
        ?.querySelector<HTMLInputElement>('.inline-text-input')
        ?.focus({ preventScroll: true });
    else if (!activeBlock?.id && returnFocus.current) {
      const id = returnFocus.current;
      returnFocus.current = '';
      root.current
        ?.querySelector<HTMLButtonElement>(
          `[data-text-block="${CSS.escape(id)}"] .inline-text-target`,
        )
        ?.focus({ preventScroll: true });
    }
  }, [activeBlock?.id, readyToEdit]);

  useEffect(() => {
    let cancelled = false;
    const mixedFaces: FontFace[] = [];
    const mixedCache = new Map<string, ReturnType<typeof loadMixedFace>>();
    if (page.sourceIndex === null) return;
    void document
      .getPage(page.sourceIndex + 1)
      .then(async (pdfPage) => {
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
          setViewport({ transform: viewport.transform, height: viewport.height });
        }
        // The viewer already loads the PDF's font programs into the browser. Reuse those
        // same faces for typing, including their actual bold/italic outlines.
        // Font reuse is optional: inspected geometry remains valid when the viewer
        // cannot extract accessibility text. Matching fonts can still be loaded below.
        await pdfPage.getOperatorList().catch(() => null);
        const content = await pdfPage.getTextContent().catch(() => ({ items: [] }));
        const faces: Record<string, CSSProperties> = {};
        const candidates: { font: ViewerFont; x: number; y: number }[] = [];
        for (const item of content.items) {
          if (!('fontName' in item) || !pdfPage.commonObjs.has(item.fontName)) continue;
          const font = pdfPage.commonObjs.get(item.fontName) as ViewerFont;
          candidates.push({ font, x: item.transform[4], y: item.transform[5] });
        }
        for (const index of copySources) {
          const source = await document.getPage(index + 1);
          await source.getOperatorList().catch(() => null);
          for (const item of (await source.getTextContent().catch(() => ({ items: [] }))).items) {
            if ('fontName' in item && source.commonObjs.has(item.fontName))
              candidates.push({
                font: source.commonObjs.get(item.fontName) as ViewerFont,
                x: item.transform[4],
                y: item.transform[5],
              });
          }
        }
        const expanded: Record<string, CSSProperties> = {};
        await Promise.all(
          inspection.blocks
            .filter((block) => block.page === page.sourceIndex)
            .map(async (block) => {
              const candidate = candidates
                .filter(({ font }) => font.name && fontKey(font.name) === fontKey(block.font))
                .sort(
                  (a, b) =>
                    Math.hypot(a.x - (block.matrix?.[4] || 0), a.y - (block.matrix?.[5] || 0)) -
                    Math.hypot(b.x - (block.matrix?.[4] || 0), b.y - (block.matrix?.[5] || 0)),
                )[0]?.font;
              if (candidate?.loadedName && !candidate.missingFile && !candidate.disableFontFace)
                faces[block.id] = {
                  // The embedded outlines already carry their weight and italic angle.
                  fontFamily: `"${candidate.loadedName.replace(/["\\]/g, '')}"`,
                  fontWeight: 400,
                  fontStyle: 'normal',
                  fontSynthesis: 'none',
                  fontKerning: 'none',
                };
              const pending = loadCompleteFace(block.font);
              try {
                if (pending) expanded[block.id] = await pending;
                else {
                  const key = `${candidate?.loadedName || block.font}:${block.fontWeight}:${block.fontItalic}:${block.fontCharacters || block.text}`;
                  let request = mixedCache.get(key);
                  if (!request) {
                    request = loadMixedFace(block, candidate).then((mixed) => {
                      if (cancelled)
                        mixed.faces.forEach((face) => globalThis.document.fonts.delete(face));
                      else mixedFaces.push(...mixed.faces);
                      return mixed;
                    });
                    mixedCache.set(key, request);
                  }
                  const mixed = await request;
                  expanded[block.id] = mixed.style;
                }
              } catch {
                // The original face stays usable if a font asset cannot be fetched.
              }
            }),
        );
        if (!cancelled) {
          setOriginalFonts(faces);
          setExpandedFonts(expanded);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError('Text positions could not be loaded. Reopen this document to try again.');
      });
    return () => {
      cancelled = true;
      mixedFaces.forEach((face) => globalThis.document.fonts.delete(face));
    };
  }, [document, inspection, page.sourceIndex, page.rotation, copySources]);

  useEffect(() => {
    if (previewCache.current?.bytes !== bytes || previewCache.current.page !== page.sourceIndex)
      previewCache.current = { bytes, page: page.sourceIndex, entries: new Map() };
    const cache = previewCache.current.entries;
    if (!needsImage || page.sourceIndex === null || requestKey === renderedKey) return;
    const previous = cache.get(requestKey);
    if (previous) {
      cache.delete(requestKey);
      cache.set(requestKey, previous);
      setPreview(previous);
      setStatus('Page preview updated.');
      setError('');
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        setStatus('Updating page preview…');
        setError('');
        const desired = JSON.parse(requestKey) as {
          changes: Record<string, TextChange>;
          rotation: number;
          pixelWidth: number;
        };
        void interactiveTextPreview(
          previewClient,
          bytes,
          name,
          {
            operation: 'preview',
            partial: true,
            page: page.sourceIndex,
            changes: Object.values(desired.changes).map((change) => ({
              ...change,
              id: `${page.sourceIndex}:${change.id.split(':').slice(1).join(':')}`,
            })),
            rotation: desired.rotation,
            pixelWidth: desired.pixelWidth,
          },
          controller.signal,
        )
          .then(async (image: InteractiveTextImage) => {
            // Decode first so removing the live overlay and swapping the background are atomic.
            await decodeTextPreview(image);
            if (!controller.signal.aborted) {
              const next = {
                image,
                changes: desired.changes,
                key: requestKey,
                rotation: desired.rotation,
              };
              cache.set(requestKey, next);
              trimPreviews(cache, (entry) => entry.image);
              setPreview(next);
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
      },
      clearingSelectedInk ? 0 : 150,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    bytes,
    previewClient,
    name,
    page.sourceIndex,
    needsImage,
    requestKey,
    renderedKey,
    clearingSelectedInk,
    previewRetry,
    previewCache,
  ]);

  useEffect(
    () => () => {
      clearTimeout(prefetchTimer.current);
      previewClient?.cancelPrefetch();
    },
    [previewClient, page.id, changesKey, pixelWidth, enabled, disabled],
  );

  function prepareSelection(block: TextBlock) {
    clearTimeout(prefetchTimer.current);
    if (!previewClient || disabled || !enabled || selected === block.id) return;
    // A short dwell avoids work while passing across lines or scrolling. This
    // never alters the visible page, selection, history, or saved document.
    prefetchTimer.current = setTimeout(() => {
      previewClient.prefetch({
        operation: 'preview',
        partial: true,
        page: page.sourceIndex,
        changes: Object.values({
          ...changes,
          [block.id]: {
            ...defaultTextChange(block),
            ...(changes[block.id]?.copy ? { copy: changes[block.id].copy } : {}),
            text: '',
          },
        }).map((change) => ({
          ...change,
          id: `${page.sourceIndex}:${change.id.split(':').slice(1).join(':')}`,
        })),
        rotation: page.rotation,
        pixelWidth,
      });
    }, 70);
  }

  function start(block: TextBlock) {
    clearTimeout(prefetchTimer.current);
    editGroup.current = crypto.randomUUID();
    setActive(block.id);
    select(block);
  }
  function boundedOffset(block: TextBlock, offset: { x: number; y: number }) {
    const box = geometry[block.id];
    const shift = viewportTextOffset(offset, viewport.transform);
    return screenTextOffset(
      Math.min(Math.max(0, baseWidth - box.width), Math.max(0, box.left + shift.x)) - box.left,
      Math.min(Math.max(0, viewport.height - box.height), Math.max(0, box.top + shift.y)) - box.top,
      viewport.transform,
    );
  }
  function dragOffset(event: ReactPointerEvent) {
    const gesture = drag.current!;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 0.5)
      return gesture.offset;
    const delta = screenTextOffset(
      (event.clientX - gesture.x) / scale,
      (event.clientY - gesture.y) / scale,
      viewport.transform,
    );
    return boundedOffset(gesture.block, {
      x: gesture.offset.x + delta.x,
      y: gesture.offset.y + delta.y,
    });
  }
  function startDrag(event: ReactPointerEvent<HTMLButtonElement>, block: TextBlock) {
    if (
      disabled ||
      event.button !== 0 ||
      selected !== block.id ||
      visiblePreview?.changes[block.id]?.text !== ''
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const offset = changes[block.id]?.offset || { x: 0, y: 0 };
    drag.current = { block, x: event.clientX, y: event.clientY, offset, pointer: event.pointerId };
    setActive('');
    setDragged({ id: block.id, offset });
    select(block);
  }
  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.pointer) return;
    event.stopPropagation();
    const offset = dragOffset(event);
    drag.current = null;
    setDragged(null);
    if (offset.x !== gesture.offset.x || offset.y !== gesture.offset.y)
      update(gesture.block, { offset }, crypto.randomUUID());
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <>
      {visiblePreview && (
        <TextPreviewImage
          className="inline-pdf-preview"
          image={visiblePreview.image}
          alt="PDF page with your text changes"
        />
      )}
      {needsImage && !visiblePreview && Object.keys(changes).length > 0 && !error && (
        <div
          className="inline-preview-loading"
          aria-label="Restoring your text edits"
          aria-busy="true"
        >
          <PdfPageSkeleton />
        </div>
      )}
      <div ref={root} className={`inline-pdf-text ${enabled ? 'enabled' : ''}`}>
        {blocks.map((block) => {
          const box = geometry[block.id];
          if (!box) return null;
          const savedValue = resolvedTextChange(block, changes[block.id]);
          const moving = dragged?.id === block.id;
          const value = moving ? { ...savedValue, offset: dragged.offset } : savedValue;
          const editing = activeBlock?.id === block.id;
          const painted = visiblePreview?.changes[block.id]?.text ?? block.text;
          const paintedOffset = visiblePreview?.changes[block.id]?.offset;
          const inkRemoved = painted === '';
          const pending =
            painted !== value.text ||
            moving ||
            (paintedOffset?.x || 0) !== (value.offset?.x || 0) ||
            (paintedOffset?.y || 0) !== (value.offset?.y || 0);
          const shift = viewportTextOffset(value.offset, viewport.transform);
          const rotated = Math.abs(Math.sin((box.angle * Math.PI) / 180)) > 0.7;
          const localWidth = (rotated ? box.height : box.width) * scale;
          const localHeight = (rotated ? box.width : box.height) * scale;
          const angle = (Math.round(box.angle / 90) * 90 + 360) % 360;
          const originX = angle === 90 || angle === 180 ? box.width * scale : 0;
          const originY = angle === 180 || angle === 270 ? box.height * scale : 0;
          const style = {
            ...(value.font === 'original'
              ? needsCompleteFont(block, value.text)
                ? expandedFonts[block.id] || originalTextFont(block)
                : originalFonts[block.id] || originalTextFont(block)
              : (documentFontStyle(value.font) as CSSProperties)),
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
            background: 'transparent',
          };
          const paintStyle = textPaintStyle(
            block,
            value,
            viewport.transform,
            scale,
            (box.left + shift.x) * scale + originX,
            (box.top + shift.y) * scale + originY,
            box.angle,
            style.width,
            style.height,
          );
          return (
            <div
              key={block.id}
              data-text-block={block.id}
              className={`inline-text-node ${selected === block.id ? 'selected' : ''} ${moving ? 'moving' : ''}`}
              style={{
                left: (box.left + shift.x) * scale,
                top: (box.top + shift.y) * scale,
                width: Math.max(1, box.width * scale),
                height: Math.max(1, box.height * scale),
              }}
            >
              {enabled && selected === block.id && (
                <button
                  type="button"
                  className="inline-text-move"
                  style={{
                    left: Math.max(-27, -(box.left + shift.x) * scale),
                    top: Math.max(-5, -(box.top + shift.y) * scale),
                  }}
                  aria-label={`Move text: ${block.text}`}
                  title="Drag to move text. Arrow keys move it; Shift moves farther."
                  disabled={disabled || !inkRemoved}
                  onPointerDown={(event) => startDrag(event, block)}
                  onPointerMove={(event) => {
                    if (drag.current?.pointer !== event.pointerId) return;
                    event.stopPropagation();
                    setDragged({ id: block.id, offset: dragOffset(event) });
                  }}
                  onPointerUp={finishDrag}
                  onPointerCancel={() => {
                    drag.current = null;
                    setDragged(null);
                  }}
                  onLostPointerCapture={() => {
                    drag.current = null;
                    setDragged(null);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      drag.current = null;
                      setDragged(null);
                      return;
                    }
                    const steps: Record<string, [number, number]> = {
                      ArrowLeft: [-1, 0],
                      ArrowRight: [1, 0],
                      ArrowUp: [0, -1],
                      ArrowDown: [0, 1],
                    };
                    const direction = steps[event.key];
                    if (!direction) return;
                    event.preventDefault();
                    event.stopPropagation();
                    const step = event.shiftKey ? 10 : 1;
                    const delta = screenTextOffset(
                      direction[0] * step,
                      direction[1] * step,
                      viewport.transform,
                    );
                    update(block, {
                      offset: boundedOffset(block, {
                        x: (value.offset?.x || 0) + delta.x,
                        y: (value.offset?.y || 0) + delta.y,
                      }),
                    });
                  }}
                >
                  <Move size={14} />
                </button>
              )}
              {editing ? (
                <>
                  {!inkRemoved && (
                    <span
                      className="inline-text-preparing"
                      aria-label="Preparing text for editing"
                    />
                  )}
                  {!inkRemoved && error && (
                    <button
                      className="inline-text-retry"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => setPreviewRetry((attempt) => attempt + 1)}
                    >
                      Retry editing
                    </button>
                  )}
                  <input
                    className="inline-text-input"
                    aria-label={`Edit original text: ${block.text}`}
                    value={value.text}
                    maxLength={2000}
                    style={{
                      ...style,
                      ...(paintStyle ? { color: 'transparent', caretColor: value.color } : {}),
                      visibility: inkRemoved ? 'visible' : 'hidden',
                    }}
                    readOnly={!inkRemoved}
                    disabled={disabled}
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      update(block, { text: event.target.value }, editGroup.current)
                    }
                    onBlur={() => setActive((current) => (current === block.id ? '' : current))}
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
                      } else if (event.key === 'Tab') {
                        const next =
                          blocks[
                            blocks.findIndex((item) => item.id === block.id) +
                              (event.shiftKey ? -1 : 1)
                          ];
                        if (next) {
                          event.preventDefault();
                          start(next);
                        }
                      } else if (event.key === 'Enter' || event.key === 'Escape') {
                        event.preventDefault();
                        returnFocus.current = block.id;
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  {inkRemoved && paintStyle && (
                    <span
                      aria-hidden="true"
                      className="inline-text-value"
                      style={{ ...style, ...paintStyle, pointerEvents: 'none' }}
                    >
                      {value.text || '\u00a0'}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {pending && inkRemoved && (
                    <span
                      className={
                        selected === block.id ? 'inline-text-value' : 'inline-text-pending'
                      }
                      style={{ ...style, ...paintStyle }}
                    >
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
                              minWidth: Math.max(1, localWidth),
                              background: 'transparent',
                            }
                          : undefined
                      }
                      aria-label={`Edit text: ${block.text}`}
                      title="Click to edit this text"
                      onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse' || event.pointerType === 'pen')
                          prepareSelection(block);
                      }}
                      onPointerLeave={() => clearTimeout(prefetchTimer.current)}
                      onFocus={() => prepareSelection(block)}
                      onBlur={() => clearTimeout(prefetchTimer.current)}
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
        {documentFonts.error && (
          <span role="alert">
            {documentFonts.error}
            <button className="text-link" onClick={documentFonts.retry}>
              Retry fonts
            </button>
          </span>
        )}
        {error ? (
          <>
            <span role="alert">
              {error}{' '}
              {!visiblePreview && Object.keys(changes).length > 0
                ? 'Showing the original page. Your edits are still here.'
                : 'Your edits are still here.'}
            </span>
            <button
              className="text-link"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setPreviewRetry((attempt) => attempt + 1)}
            >
              Retry text preview
            </button>
          </>
        ) : (
          status
        )}
      </div>
    </>
  );
}

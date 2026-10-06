'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Tool } from '@/lib/tools';
import { editorTools } from '@/lib/tools';
import { UploadArea } from './upload';
import { useUiTranslation } from './ui-language';
import { stageDocumentHandoff, takeDocumentHandoff } from '@/lib/document-handoff';
import { splitLanguagePath } from '@/lib/i18n/config';
import { PdfCanvas } from './pdf-canvas';
import { useRecordPagination } from './use-record-pagination';
import { defaultImageSettings, jpegOrientation, processImage } from '@/lib/image-tools';
import { withImageResolution } from '@/lib/image-resolution';
import { runPdf } from '@/lib/pdf-client';
import { loadViewer } from '@/lib/pdf-viewer';
import { getPendingDocument, setPendingDocument } from '@/lib/storage';
import {
  MAX_FILE_SIZE,
  MAX_BATCH_SIZE,
  formatBytes,
  friendlyError,
  parsePages,
  download,
  baseName,
} from '@/lib/utils';
import type { PdfInput, PdfOperation, PdfOptions, PdfOutput } from '@/lib/types';

// These controls are only used after file selection; keep their UI library off the upload screen.
const Dropdown = dynamic(() => import('./dropdown').then((module) => module.Dropdown));
const Pagination = dynamic(() => import('./pagination').then((module) => module.Pagination));

export function ToolProcessor({ tool }: { tool: Tool }) {
  const t = useUiTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const slug = tool.processor || tool.slug;
  const [files, setFiles] = useState<PdfInput[]>([]);
  const [count, setCount] = useState(0);
  const [viewer, setViewer] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<PdfOutput | null>(null);
  const [resultViewer, setResultViewer] = useState<PDFDocumentProxy | null>(null);
  const [previewTab, setPreviewTab] = useState('original');
  const [imageOutputs, setImageOutputs] = useState<{ name: string; blob: Blob }[]>([]);
  const [outputUrls, setOutputUrls] = useState<string[]>([]);
  const [previewWidth, setPreviewWidth] = useState(360);
  const previewRoot = useRef<HTMLDivElement>(null);
  const filePagination = useRecordPagination(files.length);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [rotation, setRotation] = useState(90);
  const [text, setText] = useState('DRAFT');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.18);
  const [textColor, setTextColor] = useState('#202522');
  const [margin, setMargin] = useState(20);
  const [start, setStart] = useState(1);
  const [split, setSplit] = useState('range');
  const [a4, setA4] = useState(true);
  const [resolution, setResolution] = useState(1.5);
  const [imageQuality, setImageQuality] = useState(0.9);
  const abort = useRef<AbortController | null>(null);
  const incomingHandoff = useRef<ReturnType<typeof takeDocumentHandoff> | null>(null);
  const version = useRef(0);
  const images = slug === 'image-to-pdf';
  const hasFiles = files.length > 0;
  const multi = slug === 'merge-pdf' || images;
  const editor = editorTools.includes(slug);
  const displayedViewer = previewTab === 'result' && resultViewer ? resultViewer : viewer;
  const displayingImages = previewTab === 'result' && imageOutputs.length > 0;
  const previewCount = displayingImages ? imageOutputs.length : displayedViewer?.numPages || 0;
  const previewPage = Math.min(page, previewCount || 1);
  const selectedPages = (() => {
    try {
      return images || !count ? [] : parsePages(range, count);
    } catch {
      return null;
    }
  })();
  useEffect(() => {
    const urls = imageOutputs.map((image) => URL.createObjectURL(image.blob));
    setOutputUrls(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [imageOutputs]);
  useEffect(() => {
    if (!result) {
      setImageOutputs([]);
      setPreviewTab('original');
    }
    if (result?.type !== 'application/pdf') {
      setResultViewer(null);
      return;
    }
    let cancelled = false;
    let loaded: PDFDocumentProxy | undefined;
    void loadViewer(result.bytes)
      .then((doc) => {
        loaded = doc;
        if (cancelled) void doc.loadingTask.destroy();
        else {
          setResultViewer(doc);
          setPreviewTab('result');
          setPage(1);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(friendlyError(e));
      });
    return () => {
      cancelled = true;
      void loaded?.loadingTask.destroy();
      setResultViewer(null);
    };
  }, [result]);
  useEffect(() => {
    const element = previewRoot.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setPreviewWidth(Math.max(180, element.clientWidth - 42)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasFiles]);
  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.search).get('handoff');
    const pending = token
      ? (incomingHandoff.current ??= takeDocumentHandoff(token))
      : Promise.resolve(getPendingDocument());
    pending
      .then((file) => {
        if (!active || images) return;
        if (file) setFiles([{ ...file, type: 'application/pdf' }]);
        else if (token)
          setError('This file transfer has expired. Choose your PDF again to open it.');
      })
      .catch((error) => {
        if (active) setError(friendlyError(error));
      });
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, [images]);
  useEffect(() => {
    if (!files[0] || images) {
      setCount(0);
      return;
    }
    let cancelled = false;
    let pdf: PDFDocumentProxy | undefined;
    setViewer(null);
    setCount(0);
    loadViewer(files[0].bytes)
      .then((doc) => {
        pdf = doc;
        if (cancelled) {
          void doc.loadingTask.destroy();
          return;
        }
        setViewer(doc);
        setCount(doc.numPages);
        setPage(1);
      })
      .catch((e) => {
        if (!cancelled) setError(friendlyError(e));
      });
    return () => {
      cancelled = true;
      void pdf?.loadingTask.destroy();
    };
  }, [files, images]);
  async function addFiles(selected: File[]) {
    if (!selected.length || busy) return;
    setError('');
    setResult(null);
    const token = ++version.current;
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    try {
      if (selected.length + (multi ? files.length : 0) > 20)
        throw new Error(t('Add up to 20 files at a time.'));
      const incoming = multi ? selected : selected.slice(0, 1);
      if (
        incoming.reduce((s, f) => s + f.size, 0) +
          (multi ? files.reduce((s, f) => s + f.bytes.length, 0) : 0) >
        MAX_BATCH_SIZE
      )
        throw new Error(t('Keep the combined file size under 150 MB.'));
      for (const f of incoming) {
        if (f.size > MAX_FILE_SIZE) throw new Error(`${f.name} is larger than 50 MB.`);
        if (!f.size) throw new Error(`${f.name} is empty. Choose a file with content.`);
        if (!(images ? /\.(png|jpe?g|webp)$/i : /\.pdf$/i).test(f.name))
          throw new Error(
            `${f.name}: choose ${images ? 'a JPG, PNG or WEBP image' : 'a PDF file'}.`,
          );
        if (images && tool.accept && !tool.accept.split(',').includes(f.type))
          throw new Error(`${f.name}: choose one of the image formats listed above.`);
      }
      setBusy(true);
      setStatus(t('Reading your files…'));
      const next: PdfInput[] = [];
      for (const f of incoming) {
        controller.signal.throwIfAborted();
        let input = {
          name: f.name,
          bytes: new Uint8Array(await f.arrayBuffer()),
          type: f.type || (f.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'),
        };
        if (
          images &&
          (/\.webp$/i.test(f.name) ||
            (f.type === 'image/jpeg' && jpegOrientation(input.bytes) !== 1))
        ) {
          const converted = await processImage(
            f,
            { ...defaultImageSettings, format: 'image/png' },
            controller.signal,
          );
          input = {
            ...input,
            bytes: new Uint8Array(await converted.blob.arrayBuffer()),
            type: 'image/png',
          };
        }
        if (!images) await runPdf('inspect', [input], {}, controller.signal);
        next.push(input);
      }
      controller.signal.throwIfAborted();
      if (token === version.current) setFiles((current) => (multi ? [...current, ...next] : next));
    } catch (e) {
      if (token === version.current)
        setError(controller.signal.aborted ? t('Processing cancelled.') : friendlyError(e));
    } finally {
      if (token === version.current) {
        setBusy(false);
        setStatus('');
      }
    }
  }
  function move(i: number, dir: number) {
    setFiles((current) => {
      const copy = [...current];
      [copy[i], copy[i + dir]] = [copy[i + dir], copy[i]];
      return copy;
    });
    setResult(null);
  }
  async function openEditor(bytes = files[0]?.bytes, name = files[0]?.name) {
    if (!bytes) return;
    setError('');
    setBusy(true);
    try {
      const query = new URLSearchParams({
        mode: slug === 'sign-pdf' ? 'signature' : slug === 'create-pdf-form' ? 'field' : 'select',
      });
      if (splitLanguagePath(pathname).locale !== 'en')
        query.set('handoff', await stageDocumentHandoff({ bytes, name }));
      else setPendingDocument({ bytes, name });
      router.push(`/workspace?${query}`);
    } catch (error) {
      setError(friendlyError(error));
      setBusy(false);
    }
  }
  async function process() {
    if (busy) return;
    if (editor) {
      await openEditor();
      return;
    }
    setError('');
    setResult(null);
    setBusy(true);
    setStatus(t('Working on your document…'));
    setProgress(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const selected = images ? [] : parsePages(range, count);
      if (slug === 'pdf-to-jpg' || slug === 'pdf-to-png' || slug === 'pdf-to-text') {
        if (!viewer) throw new Error('Wait for the preview to load, then try again.');
        if (selected.length > 200)
          throw new Error('Export up to 200 pages at a time. Choose a smaller page range.');
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const previews: { name: string; blob: Blob }[] = [];
        let outputBytes = 0;
        let extracted = '';
        for (const [n, index] of selected.entries()) {
          controller.signal.throwIfAborted();
          setStatus(`Processing page ${n + 1} of ${selected.length}…`);
          setProgress({ done: n, total: selected.length });
          const p = await viewer.getPage(index + 1);
          if (slug === 'pdf-to-text') {
            const content = await p.getTextContent();
            extracted +=
              `--- Page ${index + 1} ---\n` +
              content.items
                .map((i) => ('str' in i ? i.str + (i.hasEOL ? '\n' : ' ') : ''))
                .join('') +
              '\n\n';
          } else {
            const viewport = p.getViewport({ scale: resolution });
            if (viewport.width * viewport.height > 25_000_000)
              throw new Error(
                'This page is too large at this resolution. Choose standard resolution or fewer pages.',
              );
            const canvas = document.createElement('canvas');
            // Fractional DPI scales can turn an exact pixel size into e.g.
            // 3300.0000000000005. Keep real partial pixels without adding a
            // blank edge solely because of floating-point arithmetic.
            canvas.width = Math.ceil(viewport.width - 1e-6);
            canvas.height = Math.ceil(viewport.height - 1e-6);
            const task = p.render({ canvas, viewport, background: '#ffffff' });
            const cancel = () => task.cancel();
            controller.signal.addEventListener('abort', cancel, { once: true });
            try {
              await task.promise;
            } finally {
              controller.signal.removeEventListener('abort', cancel);
            }
            const png = slug === 'pdf-to-png';
            const rendered = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error('Could not create this image.'))),
                png ? 'image/png' : 'image/jpeg',
                imageQuality,
              ),
            );
            const blob = await withImageResolution(rendered, resolution * 72);
            outputBytes += blob.size;
            if (outputBytes > MAX_BATCH_SIZE)
              throw new Error(
                'The exported images exceed 150 MB. Choose fewer pages or a lower resolution.',
              );
            const filename = `${baseName(files[0].name)}-${String(index + 1).padStart(3, '0')}.${png ? 'png' : 'jpg'}`;
            previews.push({ name: filename, blob });
            zip.file(filename, await blob.arrayBuffer());
            canvas.width = 0;
            canvas.height = 0;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
          setProgress({ done: n + 1, total: selected.length });
        }
        controller.signal.throwIfAborted();
        if (slug === 'pdf-to-text') {
          if (!extracted.replace(/--- Page \d+ ---/g, '').trim())
            throw new Error(
              'No selectable text was found. This document may be a scan and needs OCR, which is not connected yet.',
            );
          setResult({
            bytes: new TextEncoder().encode(extracted),
            name: `${baseName(files[0].name)}.txt`,
            type: 'text/plain;charset=utf-8',
          });
        } else {
          const output =
            previews.length === 1
              ? {
                  bytes: new Uint8Array(await previews[0].blob.arrayBuffer()),
                  name: previews[0].name,
                  type: previews[0].blob.type,
                }
              : {
                  bytes: await zip.generateAsync({ type: 'uint8array' }),
                  name: `${baseName(files[0].name)}-images.zip`,
                  type: 'application/zip',
                };
          controller.signal.throwIfAborted();
          setImageOutputs(previews);
          setPreviewTab('result');
          setPage(1);
          setResult(output);
        }
      } else {
        const operation: Record<string, PdfOperation> = {
          'merge-pdf': 'merge',
          'compress-pdf': 'compress',
          'split-pdf': split === 'all' ? 'split' : 'extract',
          'rotate-pdf': 'rotate',
          'crop-pdf': 'crop',
          'watermark-pdf': 'watermark',
          'page-numbers': 'numbers',
          'image-to-pdf': 'images',
        };
        const options: PdfOptions = {
          pages: selected,
          rotation,
          text,
          size: fontSize,
          opacity,
          color: textColor,
          start,
          margin,
          a4,
        };
        if (!Number.isInteger(start) || start < 1)
          throw new Error('Choose a positive whole starting number.');
        const output = await runPdf(operation[slug], files, options, controller.signal);
        controller.signal.throwIfAborted();
        setResult(output);
      }
      setStatus(t('Your document is ready.'));
    } catch (e) {
      setError(controller.signal.aborted ? t('Processing cancelled.') : friendlyError(e));
      setStatus('');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setResult(null);
  }, [
    range,
    rotation,
    text,
    fontSize,
    opacity,
    textColor,
    margin,
    start,
    split,
    a4,
    resolution,
    imageQuality,
  ]);
  const canRun =
    files.length > 0 &&
    (images || count > 0) &&
    selectedPages !== null &&
    (slug !== 'merge-pdf' || files.length >= 2);
  return (
    <div className={`processor ${files.length ? 'has-files' : ''}`}>
      <ol className="processor-steps" aria-label={t('Document workflow')}>
        {[t('Choose files'), t('Adjust & preview'), t('Download')].map((label, index) => (
          <li
            key={label}
            aria-current={index === (result ? 2 : files.length ? 1 : 0) ? 'step' : undefined}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {!files.length ? (
        <>
          <UploadArea
            onFiles={addFiles}
            multiple={multi}
            accept={images ? tool.accept || 'image/jpeg,image/png,image/webp' : 'application/pdf'}
            formatsLabel={
              images
                ? tool.accept === 'image/png'
                  ? 'PNG images'
                  : tool.accept === 'image/jpeg'
                    ? 'JPG images'
                    : t('JPG, PNG and WEBP')
                : undefined
            }
            busy={busy}
          />
          {busy && (
            <button className="button ghost" onClick={() => abort.current?.abort()}>
              {t('Cancel processing')}
            </button>
          )}
          <div className="local-notice">
            <ShieldCheck size={15} />
            {editor
              ? t('Your document will be saved privately when you open the editor.')
              : t('Processed on your device. Your document stays yours.')}
          </div>
        </>
      ) : (
        <div className="processor-grid">
          <div className="processor-controls">
            <div className="panel-heading">
              <h2>{multi ? t('Your files') : t('Your document')}</h2>
              <span>
                {multi
                  ? t(files.length === 1 ? '{count} file' : '{count} files', {
                      count: files.length,
                    })
                  : count
                    ? t(count === 1 ? '{count} page' : '{count} pages', { count })
                    : t('Reading…')}
              </span>
            </div>
            <div className="file-list">
              {files.slice(filePagination.start, filePagination.end).map((f, offset) => {
                const i = filePagination.start + offset;
                return (
                  <div className="file-row" key={`${i}-${f.name}`}>
                    <span className="file-type-icon">
                      {images ? <ImageThumbnail input={f} /> : <FileText size={22} />}
                    </span>
                    <div>
                      <strong title={f.name}>{f.name}</strong>
                      <small>{formatBytes(f.bytes.length)}</small>
                    </div>
                    {multi && (
                      <>
                        <button
                          className="icon-button"
                          aria-label={t('Move {name} up', { name: f.name })}
                          disabled={i === 0 || busy}
                          onClick={() => move(i, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t('Move {name} down', { name: f.name })}
                          disabled={i === files.length - 1 || busy}
                          onClick={() => move(i, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </>
                    )}
                    <button
                      className="icon-button"
                      aria-label={t('Remove {name}', { name: f.name })}
                      disabled={busy}
                      onClick={() => {
                        setFiles(files.filter((_, n) => n !== i));
                        setResult(null);
                        setError('');
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            {multi && files.length > 1 && (
              <Pagination {...filePagination} disabled={busy} label="Source files pagination" />
            )}
            {multi && (
              <label className="add-file-button">
                <Plus size={16} />
                {t('Add more files')}
                <input
                  type="file"
                  accept={
                    images ? tool.accept || 'image/jpeg,image/png,image/webp' : 'application/pdf'
                  }
                  multiple
                  hidden
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.files) void addFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
              </label>
            )}
            <fieldset className="tool-settings" disabled={busy}>
              <legend>{t('Make it your own')}</legend>
              {!editor && !['merge-pdf', 'compress-pdf', 'image-to-pdf'].includes(slug) && (
                <label>
                  {t('Pages')}
                  <input
                    aria-label={t('Pages')}
                    aria-describedby="page-range-help"
                    value={range}
                    onChange={(e) => {
                      setRange(e.target.value);
                      setResult(null);
                    }}
                    placeholder={t('All {count} pages', { count: count || '' })}
                    aria-invalid={selectedPages === null}
                  />
                  <small id="page-range-help">
                    {selectedPages === null
                      ? t('Enter a valid range within this document, such as 1-3, 5.')
                      : t(
                          'Leave blank for all pages, or use 1-3, 5, 8-10. {count} pages selected.',
                          { count: selectedPages.length },
                        )}
                  </small>
                </label>
              )}
              {slug === 'split-pdf' && (
                <Dropdown
                  label={t('Output')}
                  value={split}
                  onValueChange={setSplit}
                  disabled={busy}
                  options={[
                    { value: 'range', label: t('Selected pages in one PDF') },
                    { value: 'all', label: t('One PDF per selected page (ZIP)') },
                  ]}
                />
              )}
              {slug === 'rotate-pdf' && (
                <Dropdown
                  label="Rotate clockwise"
                  value={String(rotation)}
                  onValueChange={(value) => setRotation(Number(value))}
                  disabled={busy}
                  options={[
                    { value: '90', label: '90° — quarter turn' },
                    { value: '180', label: '180° — half turn' },
                    { value: '270', label: '270° — three-quarter turn' },
                  ]}
                />
              )}
              {slug === 'watermark-pdf' && (
                <>
                  <label>
                    {t('Watermark text')}
                    <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} />
                  </label>
                  <label>
                    {t('Watermark color')}
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                    />
                  </label>
                  <div className="two-fields">
                    <label>
                      {t('Text size')}
                      <input
                        type="number"
                        min="8"
                        max="120"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                      />
                    </label>
                    <Dropdown
                      label="Opacity"
                      value={String(opacity)}
                      onValueChange={(value) => setOpacity(Number(value))}
                      disabled={busy}
                      options={[
                        { value: '0.1', label: '10% — very light' },
                        { value: '0.18', label: '18% — subtle' },
                        { value: '0.35', label: '35% — visible' },
                        { value: '0.6', label: '60% — strong' },
                      ]}
                    />
                  </div>
                </>
              )}
              {slug === 'page-numbers' && (
                <label>
                  {t('Start numbering at')}
                  <input
                    type="number"
                    min="1"
                    value={start}
                    onChange={(e) => setStart(Number(e.target.value))}
                  />
                </label>
              )}
              {slug === 'crop-pdf' && (
                <label>
                  {t('Trim each edge (points)')}
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                  />
                  <small>{t('72 points = 1 inch. Cropping does not redact hidden content.')}</small>
                </label>
              )}
              {images && (
                <Dropdown
                  label={t('Page size')}
                  value={a4 ? 'a4' : 'fit'}
                  onValueChange={(value) => setA4(value === 'a4')}
                  disabled={busy}
                  options={[
                    { value: 'a4', label: t('A4 — centered with margins') },
                    { value: 'fit', label: t('Fit each image') },
                  ]}
                />
              )}
              {['pdf-to-jpg', 'pdf-to-png'].includes(slug) && (
                <Dropdown
                  label="Resolution"
                  value={String(resolution)}
                  onValueChange={(value) => setResolution(Number(value))}
                  disabled={busy}
                  options={[
                    { value: '1.5', label: 'Standard — 108 DPI' },
                    { value: '2', label: 'High — 144 DPI' },
                    { value: '3', label: 'Extra high — 216 DPI' },
                    { value: String(300 / 72), label: 'Print — 300 DPI' },
                  ]}
                />
              )}
              {slug === 'pdf-to-jpg' && (
                <Dropdown
                  label="JPG quality"
                  value={String(imageQuality)}
                  onValueChange={(value) => setImageQuality(Number(value))}
                  disabled={busy}
                  options={[
                    { value: '0.75', label: 'Compact — 75%' },
                    { value: '0.9', label: 'Balanced — 90%' },
                    { value: '1', label: 'Maximum — 100%' },
                  ]}
                />
              )}
              {slug === 'compress-pdf' && (
                <div className="setting-note">
                  <strong>{t('Lossless optimization')}</strong>
                  <p>
                    {t(
                      'Keep text and image resolution intact. Already optimized files may not get smaller.',
                    )}
                  </p>
                </div>
              )}
              {editor && (
                <div className="setting-note">
                  <strong>{t('Your workspace is ready.')}</strong>
                  <p>
                    {t(
                      'Add your finishing touches, arrange pages, and export when it feels right.',
                    )}
                  </p>
                </div>
              )}
            </fieldset>
            <button className="button primary full" disabled={busy || !canRun} onClick={process}>
              {busy ? <Loader2 className="spin" size={18} /> : null}
              {busy ? t('Working on it…') : tool.action}
              {!busy && <ArrowRight size={17} />}
            </button>
            {busy && (
              <button className="button ghost full" onClick={() => abort.current?.abort()}>
                {t('Cancel processing')}
              </button>
            )}
            <div className="local-notice">
              <ShieldCheck size={14} />
              {editor
                ? t('Open the editor to save privately and start editing.')
                : t('No upload. No account. Just your document.')}
            </div>
          </div>
          <div className="processor-preview" ref={previewRoot}>
            {(resultViewer || imageOutputs.length > 0) && (
              <div className="processor-compare" aria-label={t('Compare document')}>
                <button
                  aria-pressed={previewTab === 'original'}
                  onClick={() => {
                    setPreviewTab('original');
                    setPage(1);
                  }}
                >
                  {t('Original')}
                </button>
                <button
                  aria-pressed={previewTab === 'result'}
                  onClick={() => {
                    setPreviewTab('result');
                    setPage(1);
                  }}
                >
                  {t('Result')}
                </button>
              </div>
            )}
            {displayedViewer || displayingImages ? (
              <>
                <div className="preview-heading">
                  <span>
                    {previewTab === 'result' ? t('Result preview') : t('Original preview')}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label={t('Previous preview page')}
                      disabled={previewPage === 1}
                      onClick={() => setPage(previewPage - 1)}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span>
                      {previewPage} / {previewCount}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={t('Next preview page')}
                      disabled={previewPage >= previewCount}
                      onClick={() => setPage(previewPage + 1)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
                <div
                  className="processor-page"
                  tabIndex={0}
                  role="region"
                  aria-label={
                    previewTab === 'result' ? t('Result preview') : t('Original PDF preview')
                  }
                >
                  {displayingImages ? (
                    <img
                      className="processor-image-output"
                      src={outputUrls[previewPage - 1]}
                      alt={imageOutputs[previewPage - 1]?.name}
                    />
                  ) : (
                    displayedViewer && (
                      <PdfCanvas
                        document={displayedViewer}
                        page={previewPage}
                        width={previewWidth}
                      />
                    )
                  )}
                </div>
              </>
            ) : images ? (
              <div className="image-summary">
                <span className="tool-icon">
                  <FileText size={40} />
                </span>
                <h3>{t('{count} images. One document.', { count: files.length })}</h3>
                <p>{t('Each image gets its own page, in the order shown.')}</p>
              </div>
            ) : (
              <div className="preview-loading">
                <Loader2 className="spin" />
                <p>{t('Preparing your preview…')}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="error-message processor-message" role="alert">
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label={t('Dismiss error')}
            onClick={() => setError('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
      {busy && status && (
        <div className="processing-status">
          <Loader2 size={16} className="spin" />
          {status}
          {progress && (
            <progress
              value={progress.done}
              max={progress.total}
              aria-label={t('Pages processed')}
            />
          )}
        </div>
      )}
      {result && (
        <div className="result-panel">
          <div className="result-check">
            <Check size={24} />
          </div>
          <div>
            <h3>
              {result.note ? t('Your original is the best fit.') : t('All done. Nicely handled.')}
            </h3>
            <p>
              {(result.note && t(result.note)) ||
                `${result.name} · ${formatBytes(result.bytes.length)}`}
            </p>
            {slug === 'compress-pdf' && !result.note && (
              <small>
                {formatBytes(files[0].bytes.length)} → {formatBytes(result.bytes.length)} ·{' '}
                {t('{percent}% smaller', {
                  percent: Math.round((1 - result.bytes.length / files[0].bytes.length) * 100),
                })}
              </small>
            )}
          </div>
          <div className="result-actions">
            <button
              className="button primary"
              onClick={() => download(result.bytes, result.name, result.type)}
            >
              <Download size={16} />
              {t('Download')}{' '}
              {result.type === 'application/pdf'
                ? 'PDF'
                : result.type.includes('zip')
                  ? 'ZIP'
                  : result.type.startsWith('image/')
                    ? result.type === 'image/png'
                      ? 'PNG'
                      : 'JPG'
                    : t('text')}
            </button>
            {result.type === 'application/pdf' && (
              <button
                className="button ghost"
                onClick={() => openEditor(result.bytes, result.name)}
              >
                {t('Continue in editor')}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function ImageThumbnail({ input }: { input: PdfInput }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(new Blob([input.bytes.slice().buffer], { type: input.type }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [input]);
  return <img className="processor-file-thumbnail" src={url || undefined} alt="" />;
}

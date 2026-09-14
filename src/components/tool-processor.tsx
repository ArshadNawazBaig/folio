'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { PdfCanvas } from './pdf-canvas';
import { Dropdown } from './dropdown';
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
export function ToolProcessor({ tool }: { tool: Tool }) {
  const router = useRouter();
  const [files, setFiles] = useState<PdfInput[]>([]);
  const [count, setCount] = useState(0);
  const [viewer, setViewer] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<PdfOutput | null>(null);
  const [rotation, setRotation] = useState(90);
  const [text, setText] = useState('DRAFT');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.18);
  const [margin, setMargin] = useState(20);
  const [start, setStart] = useState(1);
  const [split, setSplit] = useState('range');
  const [a4, setA4] = useState(true);
  const [resolution, setResolution] = useState(1.5);
  const abort = useRef<AbortController | null>(null);
  const version = useRef(0);
  const images = tool.slug === 'image-to-pdf';
  const multi = tool.slug === 'merge-pdf' || images;
  const editor = editorTools.includes(tool.slug);
  useEffect(() => {
    const pending = getPendingDocument();
    if (pending && !images) setFiles([{ ...pending, type: 'application/pdf' }]);
    return () => abort.current?.abort();
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
    setError('');
    setResult(null);
    const token = ++version.current;
    try {
      if (selected.length + (multi ? files.length : 0) > 20)
        throw new Error('Add up to 20 files at a time.');
      const incoming = multi ? selected : selected.slice(0, 1);
      if (
        incoming.reduce((s, f) => s + f.size, 0) +
          (multi ? files.reduce((s, f) => s + f.bytes.length, 0) : 0) >
        MAX_BATCH_SIZE
      )
        throw new Error('Keep the combined file size under 150 MB.');
      for (const f of incoming) {
        if (f.size > MAX_FILE_SIZE) throw new Error(`${f.name} is larger than 50 MB.`);
        if (!(images ? /\.(png|jpe?g)$/i : /\.pdf$/i).test(f.name))
          throw new Error(`${f.name}: choose ${images ? 'a JPG or PNG image' : 'a PDF file'}.`);
      }
      setBusy(true);
      setStatus('Reading your files…');
      const next: PdfInput[] = [];
      for (const f of incoming) {
        const input = {
          name: f.name,
          bytes: new Uint8Array(await f.arrayBuffer()),
          type: f.type || (f.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'),
        };
        if (!images) await runPdf('inspect', [input]);
        next.push(input);
      }
      if (token === version.current) setFiles((current) => (multi ? [...current, ...next] : next));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
      setStatus('');
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
  function openEditor(bytes = files[0]?.bytes, name = files[0]?.name) {
    if (!bytes) return;
    setPendingDocument({ bytes, name });
    router.push(
      `/workspace?mode=${tool.slug === 'sign-pdf' ? 'signature' : tool.slug === 'create-pdf-form' ? 'field' : 'select'}`,
    );
  }
  async function process() {
    if (editor) {
      openEditor();
      return;
    }
    setError('');
    setResult(null);
    setBusy(true);
    setStatus('Working on your document…');
    abort.current = new AbortController();
    try {
      const selected = images ? [] : parsePages(range, count);
      if (tool.slug === 'pdf-to-jpg' || tool.slug === 'pdf-to-png' || tool.slug === 'pdf-to-text') {
        if (!viewer) throw new Error('Wait for the preview to load, then try again.');
        if (selected.length > 200)
          throw new Error('Export up to 200 pages at a time. Choose a smaller page range.');
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        let extracted = '';
        for (const [n, index] of selected.entries()) {
          if (abort.current.signal.aborted) throw new Error('Processing cancelled.');
          setStatus(`Processing page ${n + 1} of ${selected.length}…`);
          const p = await viewer.getPage(index + 1);
          if (tool.slug === 'pdf-to-text') {
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
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const task = p.render({ canvas, viewport, background: '#ffffff' });
            const cancel = () => task.cancel();
            abort.current.signal.addEventListener('abort', cancel, { once: true });
            try {
              await task.promise;
            } finally {
              abort.current.signal.removeEventListener('abort', cancel);
            }
            const png = tool.slug === 'pdf-to-png';
            const blob = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error('Could not create this image.'))),
                png ? 'image/png' : 'image/jpeg',
                0.9,
              ),
            );
            zip.file(
              `${baseName(files[0].name)}-${String(index + 1).padStart(3, '0')}.${png ? 'png' : 'jpg'}`,
              await blob.arrayBuffer(),
            );
            canvas.width = 0;
            canvas.height = 0;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (abort.current.signal.aborted) throw new Error('Processing cancelled.');
        if (tool.slug === 'pdf-to-text') {
          if (!extracted.replace(/--- Page \d+ ---/g, '').trim())
            throw new Error(
              'No selectable text was found. This document may be a scan and needs OCR, which is not connected yet.',
            );
          setResult({
            bytes: new TextEncoder().encode(extracted),
            name: `${baseName(files[0].name)}.txt`,
            type: 'text/plain;charset=utf-8',
          });
        } else
          setResult({
            bytes: await zip.generateAsync({ type: 'uint8array' }),
            name: `${baseName(files[0].name)}-images.zip`,
            type: 'application/zip',
          });
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
          start,
          margin,
          a4,
        };
        if (!Number.isInteger(start) || start < 1)
          throw new Error('Choose a positive whole starting number.');
        const output = await runPdf(operation[tool.slug], files, options, abort.current.signal);
        setResult(output);
      }
      setStatus('Your document is ready.');
    } catch (e) {
      setError(friendlyError(e));
      setStatus('');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setResult(null);
  }, [range, rotation, text, fontSize, opacity, margin, start, split, a4, resolution]);
  const canRun =
    files.length > 0 && (images || count > 0) && (tool.slug !== 'merge-pdf' || files.length >= 2);
  return (
    <div className={`processor ${files.length ? 'has-files' : ''}`}>
      {!files.length ? (
        <>
          <UploadArea
            onFiles={addFiles}
            multiple={multi}
            accept={images ? 'image/jpeg,image/png' : 'application/pdf'}
            busy={busy}
          />
          <div className="local-notice">
            <ShieldCheck size={15} />
            Processed on your device. Your document stays yours.
          </div>
        </>
      ) : (
        <div className="processor-grid">
          <div className="processor-controls">
            <div className="panel-heading">
              <h2>{multi ? 'Your files' : 'Your document'}</h2>
              <span>{multi ? `${files.length} files` : count ? `${count} pages` : 'Reading…'}</span>
            </div>
            <div className="file-list">
              {files.map((f, i) => (
                <div className="file-row" key={`${i}-${f.name}`}>
                  <span className="file-type-icon">
                    <FileText size={22} />
                  </span>
                  <div>
                    <strong title={f.name}>{f.name}</strong>
                    <small>{formatBytes(f.bytes.length)}</small>
                  </div>
                  {multi && (
                    <>
                      <button
                        className="icon-button"
                        aria-label={`Move ${f.name} up`}
                        disabled={i === 0 || busy}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Move ${f.name} down`}
                        disabled={i === files.length - 1 || busy}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Remove ${f.name}`}
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
              ))}
            </div>
            {multi && (
              <label className="add-file-button">
                <Plus size={16} />
                Add more files
                <input
                  type="file"
                  accept={images ? 'image/jpeg,image/png' : 'application/pdf'}
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
              <legend>Make it your own</legend>
              {!editor && !['merge-pdf', 'compress-pdf', 'image-to-pdf'].includes(tool.slug) && (
                <label>
                  Pages
                  <input
                    aria-label="Pages"
                    aria-describedby="page-range-help"
                    value={range}
                    onChange={(e) => {
                      setRange(e.target.value);
                      setResult(null);
                    }}
                    placeholder={`All ${count || ''} pages`}
                  />
                  <small id="page-range-help">
                    Leave blank for all pages, or use 1-3, 5, 8-10.
                  </small>
                </label>
              )}
              {tool.slug === 'split-pdf' && (
                <Dropdown
                  label="Output"
                  value={split}
                  onValueChange={setSplit}
                  disabled={busy}
                  options={[
                    { value: 'range', label: 'Selected pages in one PDF' },
                    { value: 'all', label: 'One PDF per selected page (ZIP)' },
                  ]}
                />
              )}
              {tool.slug === 'rotate-pdf' && (
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
              {tool.slug === 'watermark-pdf' && (
                <>
                  <label>
                    Watermark text
                    <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} />
                  </label>
                  <div className="two-fields">
                    <label>
                      Text size
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
              {tool.slug === 'page-numbers' && (
                <label>
                  Start numbering at
                  <input
                    type="number"
                    min="1"
                    value={start}
                    onChange={(e) => setStart(Number(e.target.value))}
                  />
                </label>
              )}
              {tool.slug === 'crop-pdf' && (
                <label>
                  Trim each edge (points)
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                  />
                  <small>72 points = 1 inch. Cropping does not redact hidden content.</small>
                </label>
              )}
              {images && (
                <Dropdown
                  label="Page size"
                  value={a4 ? 'a4' : 'fit'}
                  onValueChange={(value) => setA4(value === 'a4')}
                  disabled={busy}
                  options={[
                    { value: 'a4', label: 'A4 — centered with margins' },
                    { value: 'fit', label: 'Fit each image' },
                  ]}
                />
              )}
              {['pdf-to-jpg', 'pdf-to-png'].includes(tool.slug) && (
                <Dropdown
                  label="Resolution"
                  value={String(resolution)}
                  onValueChange={(value) => setResolution(Number(value))}
                  disabled={busy}
                  options={[
                    { value: '1.5', label: 'Standard — 108 DPI' },
                    { value: '2', label: 'High — 144 DPI' },
                    { value: '3', label: 'Extra high — 216 DPI' },
                  ]}
                />
              )}
              {tool.slug === 'compress-pdf' && (
                <div className="setting-note">
                  <strong>Lossless optimization</strong>
                  <p>
                    Keep text and image resolution intact. Already optimized files may not get
                    smaller.
                  </p>
                </div>
              )}
              {editor && (
                <div className="setting-note">
                  <strong>Your workspace is ready.</strong>
                  <p>Add your finishing touches, arrange pages, and export when it feels right.</p>
                </div>
              )}
            </fieldset>
            <button className="button primary full" disabled={busy || !canRun} onClick={process}>
              {busy ? <Loader2 className="spin" size={18} /> : null}
              {busy ? 'Working on it…' : tool.action}
              {!busy && <ArrowRight size={17} />}
            </button>
            {busy && (
              <button className="button ghost full" onClick={() => abort.current?.abort()}>
                Cancel processing
              </button>
            )}
            <div className="local-notice">
              <ShieldCheck size={14} />
              No upload. No account. Just your document.
            </div>
          </div>
          <div className="processor-preview">
            {viewer ? (
              <>
                <div className="preview-heading">
                  <span>Original preview</span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label="Previous preview page"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span>
                      {page} / {count}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Next preview page"
                      disabled={page >= count}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
                <div
                  className="processor-page"
                  tabIndex={0}
                  role="region"
                  aria-label="Original PDF preview"
                >
                  <PdfCanvas document={viewer} page={page} width={360} />
                </div>
              </>
            ) : images ? (
              <div className="image-summary">
                <span className="tool-icon orange">
                  <FileText size={40} />
                </span>
                <h3>
                  {files.length} image{files.length !== 1 ? 's' : ''}. One document.
                </h3>
                <p>Each image gets its own page, in the order shown.</p>
              </div>
            ) : (
              <div className="preview-loading">
                <Loader2 className="spin" />
                <p>Preparing your preview…</p>
              </div>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="error-message processor-message" role="alert">
          <span>{error}</span>
          <button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}>
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
        </div>
      )}
      {result && (
        <div className="result-panel">
          <div className="result-check">
            <Check size={24} />
          </div>
          <div>
            <h3>{result.note ? 'Your original is the best fit.' : 'All done. Nicely handled.'}</h3>
            <p>{result.note || `${result.name} · ${formatBytes(result.bytes.length)}`}</p>
            {tool.slug === 'compress-pdf' && !result.note && (
              <small>
                {formatBytes(files[0].bytes.length)} → {formatBytes(result.bytes.length)} ·{' '}
                {Math.round((1 - result.bytes.length / files[0].bytes.length) * 100)}% smaller
              </small>
            )}
          </div>
          <div className="result-actions">
            <button
              className="button primary"
              onClick={() => download(result.bytes, result.name, result.type)}
            >
              <Download size={16} />
              Download{' '}
              {result.type === 'application/pdf'
                ? 'PDF'
                : result.type.includes('zip')
                  ? 'ZIP'
                  : 'text'}
            </button>
            {result.type === 'application/pdf' && (
              <button
                className="button ghost"
                onClick={() => openEditor(result.bytes, result.name)}
              >
                Continue in editor <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

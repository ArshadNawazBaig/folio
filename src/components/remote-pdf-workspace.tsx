'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  FileText,
  Languages,
  Loader2,
  ScanText,
  Upload,
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  languageOptions,
  outputFormats,
  REMOTE_MAX_INPUT,
  type RemoteTool,
  type RemoteResult,
} from '@/lib/remote-types';
import { loadViewer } from '@/lib/pdf-viewer';
import { getPendingDocument } from '@/lib/storage';
import { download, formatBytes, friendlyError } from '@/lib/utils';
import { accountFetch, AccountRequestError } from '@/lib/auth-client';
import { saveRemoteDraft, readRemoteDraft, clearRemoteDraft } from '@/lib/remote-draft';
import type { TextPreview } from '@/lib/pro-types';
import { useAccount } from './account-provider';
import { Dropdown } from './dropdown';
import { DownloadGate } from './download-gate';
import { PdfCanvas } from './pdf-canvas';
const sourceOptions = [{ value: 'auto', label: 'Auto-detect' }, ...languageOptions];
export function RemotePdfWorkspace({
  tool,
  initialReady = false,
  provider = 'ConvertAPI',
}: {
  tool: RemoteTool;
  initialReady?: boolean;
  provider?: 'CloudConvert' | 'ConvertAPI';
}) {
  const translation = tool === 'translate-pdf',
    format = outputFormats[tool];
  const { user, access } = useAccount();
  const userId = user?.id;
  const [ready, setReady] = useState(initialReady),
    [file, setFile] = useState<{ bytes: Uint8Array; name: string } | undefined>(),
    [doc, setDoc] = useState<PDFDocumentProxy | null>(null),
    [source, setSource] = useState('auto'),
    [target, setTarget] = useState('es'),
    [page, setPage] = useState(1),
    [tab, setTab] = useState('original'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [result, setResult] = useState<RemoteResult | null>(null),
    [images, setImages] = useState<Record<number, TextPreview>>({}),
    [gate, setGate] = useState(false),
    [saved, setSaved] = useState(false),
    [notice, setNotice] = useState('');
  const abort = useRef<AbortController | null>(null),
    version = useRef(0),
    initialized = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/capabilities')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setReady(data.tools?.[tool] === true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tool]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const pending = getPendingDocument();
    if (pending) {
      setFile(pending);
      return;
    }
    void readRemoteDraft(tool)
      .then((draft) => {
        if (draft && alive.current && version.current === 0) {
          setResult(draft);
          setSource(draft.source || 'auto');
          setTarget(draft.target || 'es');
          setSaved(true);
          setImages(draft.preview ? { 1: draft.preview } : {});
          setNotice('Recovered your prepared document from cloud storage.');
          setTab('translation');
        }
      })
      .catch(() => {});
  }, [tool]);
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let viewer: PDFDocumentProxy | undefined;
    setDoc(null);
    loadViewer(file.bytes)
      .then((d) => {
        viewer = d;
        if (cancelled) void d.loadingTask.destroy();
        else {
          setDoc(d);
          setPage(1);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(friendlyError(e));
      });
    return () => {
      cancelled = true;
      void viewer?.loadingTask.destroy();
    };
  }, [file]);
  useEffect(() => {
    if (!userId || !gate || !result) return;
    let active = true;
    saveRemoteDraft(result)
      .then((saved) => {
        if (active) setSaved(saved);
      })
      .catch(() => {
        if (active) setSaved(false);
      });
    return () => {
      active = false;
    };
  }, [userId, gate, result]);
  function reset() {
    version.current++;
    abort.current?.abort();
    setResult(null);
    setImages({});
    setSaved(false);
    setNotice('');
    setError('');
    setBusy('');
    setPage(1);
    setTab('original');
    void clearRemoteDraft(tool).catch(() => {});
  }
  async function open(next?: File) {
    if (!next) return;
    if (!/\.pdf$/i.test(next.name) || !next.size || next.size > REMOTE_MAX_INPUT) {
      setError('Choose a PDF smaller than 10 MB.');
      return;
    }
    reset();
    const current = version.current;
    try {
      const bytes = new Uint8Array(await next.arrayBuffer());
      if (alive.current && current === version.current) setFile({ bytes, name: next.name });
    } catch {
      setError('This PDF could not be read. Try choosing it again.');
    }
  }
  async function process() {
    if (!file || busy) return;
    setError('');
    setNotice('');
    if (!ready) {
      setError('This document service is not connected yet. Your original PDF is unchanged.');
      return;
    }
    if (!doc || doc.numPages > (translation ? 20 : 100)) {
      setError(`Choose a readable PDF with up to ${translation ? 20 : 100} pages.`);
      return;
    }
    const current = ++version.current;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(translation ? 'Translating your PDF…' : 'Converting your PDF…');
    try {
      const form = new FormData();
      form.append(
        'file',
        new File([file.bytes.slice().buffer], file.name, { type: 'application/pdf' }),
      );
      form.append('options', JSON.stringify({ tool, source, target }));
      const response = await fetch('/api/documents/process', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your PDF could not be processed.');
      if (!alive.current || current !== version.current) return;
      setResult(data);
      setPage(1);
      setImages(data.preview ? { 1: data.preview } : {});
      setTab('translation');
      setNotice(
        translation
          ? 'Your translation is ready. Review every page before downloading.'
          : `Your ${format.label} file is ready to download.`,
      );
    } catch (e) {
      if (alive.current && current === version.current)
        setError(e instanceof Error ? e.message : 'Your PDF could not be processed.');
    } finally {
      if (alive.current && current === version.current) setBusy('');
    }
  }
  async function askForDownload() {
    if (!result) return;
    setSaved(false);
    setGate(true);
  }
  async function exportResult(verified = false) {
    if (!result) return;
    if (result.expiresAt <= Date.now()) {
      setError('This prepared file has expired. Process your original PDF again.');
      return;
    }
    if (!access.pro && !verified) {
      await askForDownload();
      return;
    }
    setBusy('Preparing your download…');
    setError('');
    try {
      const response = await accountFetch('/api/documents/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact: result.artifact }),
      });
      download(new Uint8Array(await response.arrayBuffer()), result.filename);
      void clearRemoteDraft(tool).catch(() => {});
      setNotice('Your finished document has been downloaded.');
    } catch (e) {
      if (e instanceof AccountRequestError && [401, 402].includes(e.status)) await askForDownload();
      else setError(e instanceof Error ? e.message : 'Your document could not be downloaded.');
    } finally {
      setBusy('');
    }
  }
  async function changePage(next: number) {
    setPage(next);
    if (!translation || !result || images[next]) return;
    const current = version.current;
    setBusy('Loading the translated page…');
    setError('');
    try {
      const response = await fetch('/api/documents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact: result.artifact, page: next - 1 }),
      });
      const image = await response.json();
      if (!response.ok) throw new Error(image.error || 'The preview could not be loaded.');
      if (alive.current && current === version.current) setImages((v) => ({ ...v, [next]: image }));
    } catch (e) {
      if (alive.current && current === version.current)
        setError(e instanceof Error ? e.message : 'The preview could not be loaded.');
    } finally {
      if (alive.current && current === version.current) setBusy('');
    }
  }
  const pages = translation && result ? result.pages : doc?.numPages || 1;
  return (
    <div className="translation-workspace">
      <div className="translation-settings">
        {translation ? (
          <div className="translation-language">
            <Dropdown
              label="Original language"
              value={source}
              onValueChange={(v) => {
                reset();
                setSource(v);
              }}
              options={sourceOptions}
              searchPlaceholder="Search languages…"
              searchLabel="Search languages"
              emptyMessage="No languages found. Try another spelling."
              disabled={!!busy}
              icon={source === 'auto' ? <ScanText size={18} /> : <Languages size={18} />}
            />
            <ArrowRight size={21} aria-hidden="true" />
            <Dropdown
              label="Translate into"
              value={target}
              onValueChange={(v) => {
                reset();
                setTarget(v);
              }}
              options={languageOptions}
              searchPlaceholder="Search languages…"
              searchLabel="Search languages"
              emptyMessage="No languages found. Try another spelling."
              disabled={!!busy}
              icon={<Languages size={18} />}
            />
          </div>
        ) : (
          <div>
            <span className="eyebrow">A NEW FORMAT FOR YOUR IDEAS</span>
            <h2 className="remote-title">PDF to {format.label}</h2>
          </div>
        )}
        <label className="button secondary">
          <Upload size={16} />
          {file ? 'Change PDF' : 'Choose a PDF'}
          <input
            type="file"
            accept="application/pdf"
            hidden
            disabled={!!busy}
            onChange={(e) => {
              void open(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {file && (
        <div className="translation-file">
          <FileText size={16} />
          <strong>{file.name}</strong>
          <span>
            {formatBytes(file.bytes.length)}
            {doc ? ` · ${doc.numPages} pages` : ''}
          </span>
        </div>
      )}
      <div className="mobile-preview-tabs">
        <button className={tab === 'original' ? 'active' : ''} onClick={() => setTab('original')}>
          Original
        </button>
        <button
          className={tab === 'translation' ? 'active' : ''}
          onClick={() => setTab('translation')}
        >
          {translation ? 'Translation' : 'Converted file'}
        </button>
      </div>
      <div className="translation-panes">
        <div className={`translation-pane ${tab === 'original' ? 'mobile-active' : ''}`}>
          <div className="translation-pane-header">
            <span>Original document</span>
            <span className="status-label">LOCAL PREVIEW</span>
          </div>
          <div
            className="translation-canvas"
            tabIndex={0}
            role="region"
            aria-label="Original document preview"
          >
            {doc ? (
              <PdfCanvas document={doc} page={Math.min(page, doc.numPages)} width={400} />
            ) : (
              <div className="translation-empty">
                <FileText size={38} strokeWidth={1.2} />
                <h3>A new perspective starts here.</h3>
                <p>Choose a PDF to preview it on your device.</p>
                <button
                  className="text-link"
                  onClick={async () => {
                    const { createSample } = await import('@/lib/sample');
                    reset();
                    setFile({ name: 'Studio North — Proposal.pdf', bytes: await createSample() });
                  }}
                >
                  Or explore a sample <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={`translation-pane ${tab === 'translation' ? 'mobile-active' : ''}`}>
          <div className="translation-pane-header">
            <span>
              {translation
                ? `${languageOptions.find((l) => l.value === target)?.label || 'Translated'} document`
                : `${format.label} document`}
            </span>
            <Languages size={17} />
          </div>
          <div
            className="translation-canvas"
            tabIndex={0}
            role="region"
            aria-label={translation ? 'Translated document preview' : 'Conversion result'}
          >
            {result && translation && images[page] ? (
              <img
                className="remote-preview-image"
                src={`data:image/png;base64,${images[page].preview}`}
                width={images[page].width}
                height={images[page].height}
                alt={`Translated PDF, page ${page}`}
              />
            ) : result ? (
              <div className="translation-empty">
                <span className="tool-icon sage">
                  <Check size={32} />
                </span>
                <h3>
                  {translation
                    ? 'Your translated document is ready.'
                    : `Your ${format.label} file is ready.`}
                </h3>
                <p>{result.filename}</p>
                <span className="status-label">{formatBytes(result.size)}</span>
                {!translation && (
                  <p>Open the downloaded file in {format.label} to review its converted layout.</p>
                )}
                {translation && !busy && (
                  <button className="text-link" onClick={() => void changePage(page)}>
                    Load this page <ArrowRight size={15} />
                  </button>
                )}
              </div>
            ) : (
              <div className="translation-empty">
                <span className="tool-icon blue">
                  <Languages size={32} />
                </span>
                <h3>
                  {translation
                    ? 'Another language. The same big idea.'
                    : `Make room for ${format.label}.`}
                </h3>
                <p>
                  {translation
                    ? 'Your translated pages will appear here.'
                    : 'Your converted file will be ready here after processing.'}
                </p>
                <span className="status-label">
                  {ready ? 'READY WHEN YOU ARE' : 'SERVICE NOT CONNECTED'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="translation-bottom">
        <span>
          <FileText size={15} />
          Original PDF stays unchanged.
          {file && (
            <button className="text-link" onClick={() => download(file.bytes, file.name)}>
              Save original
            </button>
          )}
        </span>
        {(doc || result) && (
          <div className="page-navigation">
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={page <= 1 || !!busy}
              onClick={() => void changePage(page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {page} / {pages}
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={page >= pages || !!busy}
              onClick={() => void changePage(page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        {result ? (
          <button className="button primary" disabled={!!busy} onClick={() => void exportResult()}>
            <Download size={16} />
            Download {format.label}
          </button>
        ) : (
          <button
            className="button primary"
            disabled={!file || !doc || !ready || !!busy || (translation && source === target)}
            onClick={() => void process()}
          >
            {busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
            {busy || (translation ? 'Translate PDF' : `Convert to ${format.label}`)}
          </button>
        )}
      </div>
      <p className="service-note service-note--footer">
        {ready
          ? `${translation ? 'Translation sends this PDF to Google Cloud Translation.' : `Conversion sends this PDF to ${provider}.`} Processing starts when you choose ${translation ? 'Translate PDF' : 'Convert'}. Prepared files remain available for 24 hours; layout and recognition quality depend on your source document.`
          : 'This processing service is not connected yet. Local previews work, and your file is not uploaded.'}{' '}
        Maximum 10 MB and {translation ? 20 : 100} pages.
      </p>
      {busy && (
        <p className="pro-processing" role="status">
          <Loader2 size={16} className="spin" />
          {busy}
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="pro-notice" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      <DownloadGate
        tool={tool}
        open={gate}
        onClose={() => setGate(false)}
        onReady={() => void exportResult(true)}
        saved={saved}
      />
    </div>
  );
}

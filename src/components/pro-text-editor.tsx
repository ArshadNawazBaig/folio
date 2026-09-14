'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PencilLine,
  Redo2,
  ReplaceAll,
  Search,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useAccount } from './account-provider';
import { DownloadGate } from './download-gate';
import { Dropdown } from './dropdown';
import { PdfCanvas } from './pdf-canvas';
import { accountFetch, AccountRequestError } from '@/lib/auth-client';
import { saveProDraft, readProDraft, clearProDraft } from '@/lib/pro-draft';
import { loadViewer } from '@/lib/pdf-viewer';
import { getPendingDocument } from '@/lib/storage';
import { download, baseName, formatBytes } from '@/lib/utils';
import {
  replacementFonts,
  type TextBlock,
  type TextChange,
  type TextInspection,
  type TextPreview,
} from '@/lib/pro-types';

type SourceFile = { bytes: Uint8Array; name: string };
type Changes = Record<string, TextChange>;
const defaultChange = (block: TextBlock): TextChange => ({
  id: block.id,
  original: block.text,
  text: block.text,
  font: block.replacementFont,
  size: block.size,
  color: block.color,
});
export function ProTextEditor() {
  const router = useRouter();
  const { user, access } = useAccount();
  const userId = user?.id;
  const [file, setFile] = useState<SourceFile | null>(null),
    [demo, setDemo] = useState(false),
    [doc, setDoc] = useState<PDFDocumentProxy | null>(null),
    [inspection, setInspection] = useState<TextInspection | null>(null);
  const [page, setPage] = useState(0),
    [selectedId, setSelectedId] = useState(''),
    [history, setHistory] = useState<{ states: Changes[]; index: number }>({
      states: [{}],
      index: 0,
    });
  const [previewImages, setPreviewImages] = useState<
      Record<number, { image: TextPreview; key: string; changes: Changes }>
    >({}),
    [gateOpen, setGateOpen] = useState(false),
    [draftSaved, setDraftSaved] = useState(false),
    [downloadedRevision, setDownloadedRevision] = useState('{}'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [find, setFind] = useState(''),
    [replace, setReplace] = useState(''),
    [matchCase, setMatchCase] = useState(false),
    [canvasWidth, setCanvasWidth] = useState(600),
    [rectangles, setRectangles] = useState<Record<string, number[]>>({});
  const canvas = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    initial = useRef(false),
    mounted = useRef(false),
    version = useRef(0),
    abort = useRef<AbortController | null>(null);
  const appliedChanges = useRef<Changes>({});
  const changes = history.states[history.index],
    selected = inspection?.blocks.find((block) => block.id === selectedId),
    value = selected ? changes[selected.id] || defaultChange(selected) : null;
  const revision = JSON.stringify(changes),
    needsPreview = revision !== (previewImages[page]?.key || '{}');
  const dirty = revision !== downloadedRevision;
  const canEdit = true;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(
    () => () => {
      void doc?.loadingTask.destroy();
    },
    [doc],
  );
  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver((entries) =>
      setCanvasWidth(Math.max(200, Math.min(760, entries[0].contentRect.width - 48))),
    );
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [file]);
  useEffect(() => {
    let cancelled = false;
    if (!doc || !inspection) return;
    void doc
      .getPage(page + 1)
      .then((pdfPage) => {
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: canvasWidth / base.width });
        const boxes: Record<string, number[]> = {};
        for (const block of inspection.blocks.filter((block) => block.page === page)) {
          const [a, bm, c, d, e, f] = viewport.transform;
          const [left, bottom, right, top] = block.bounds;
          const b = [
            a * left + c * bottom + e,
            bm * left + d * bottom + f,
            a * right + c * top + e,
            bm * right + d * top + f,
          ];
          boxes[block.id] = [
            Math.min(b[0], b[2]),
            Math.min(b[1], b[3]),
            Math.abs(b[2] - b[0]),
            Math.abs(b[3] - b[1]),
          ];
        }
        if (!cancelled) setRectangles(boxes);
      })
      .catch(() => {
        if (!cancelled) setError('This page could not be displayed. Try opening the PDF again.');
      });
    return () => {
      cancelled = true;
    };
  }, [doc, inspection, page, canvasWidth]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    const linkClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (
        dirty &&
        anchor?.href &&
        !anchor.hasAttribute('download') &&
        anchor.protocol !== 'blob:' &&
        anchor.target !== '_blank' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !window.confirm('You have changes that have not been downloaded. Leave this document?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', handler);
    document.addEventListener('click', linkClick, true);
    return () => {
      window.removeEventListener('beforeunload', handler);
      document.removeEventListener('click', linkClick, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (initial.current) return;
    initial.current = true;
    const pending = getPendingDocument();
    if (pending) void open(pending, false);
    else if (new URLSearchParams(window.location.search).get('demo') === '1') void openDemo();
    else
      void readProDraft()
        .then(async (draft) => {
          if (!draft || !mounted.current || version.current !== 0) return;
          if (draft.editorState) {
            router.replace('/workspace?draft=pro-text');
            return;
          }
          await open(draft, false);
          if (!mounted.current) return;
          setInspection(draft.inspection);
          setHistory({ states: [{}, draft.changes], index: 1 });
          setPage(draft.page);
          setDraftSaved(true);
          setNotice(
            'Recovered your edits from cloud storage. Update the preview when you are ready.',
          );
        })
        .catch(() => {});
  }, [router]);
  useEffect(() => {
    if (!userId || !gateOpen || !file || !inspection) return;
    let active = true;
    saveProDraft({ ...file, inspection, changes, page, savedAt: Date.now() })
      .then((saved) => {
        if (active) setDraftSaved(saved);
      })
      .catch(() => {
        if (active) setDraftSaved(false);
      });
    return () => {
      active = false;
    };
  }, [userId, gateOpen, file, inspection, changes, page]);
  function changePage(next: number) {
    setPage(next);
    setSelectedId('');
    const applied = appliedChanges.current;
    if (
      file &&
      inspection &&
      (Object.keys(applied).length || previewImages[next]) &&
      previewImages[next]?.key !== JSON.stringify(applied)
    )
      void showPreview(applied, next);
  }
  async function preview(bytes: Uint8Array) {
    const token = ++version.current;
    const viewer = await loadViewer(bytes);
    if (token !== version.current || !mounted.current) {
      void viewer.loadingTask.destroy();
      return;
    }
    setDoc(viewer);
  }
  async function open(next: SourceFile, isDemo: boolean) {
    abort.current?.abort();
    setError('');
    setNotice('');
    setBusy('Opening PDF…');
    try {
      // Keep an incoming free-editor copy downloadable even if Pro cannot process it.
      setFile(next);
      setDoc(null);
      setDemo(isDemo);
      setInspection(null);
      setHistory({ states: [{}], index: 0 });
      setPreviewImages({});
      appliedChanges.current = {};
      setDownloadedRevision('{}');
      setDraftSaved(false);
      setPage(0);
      setSelectedId('');
      await preview(next.bytes);
      if (!mounted.current) return;
      if (next.bytes.length > 10 * 1024 * 1024) {
        setError(
          'This copy exceeds the 10 MB file limit. Download it and split it into smaller files first.',
        );
        return;
      }
      if (isDemo) {
        const result = await request(next, true, { operation: 'inspect' });
        setInspection(await result.json());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This PDF could not be opened.');
    } finally {
      setBusy('');
    }
  }
  async function openDemo() {
    setError('');
    setBusy('Preparing the sample…');
    try {
      const response = await fetch('/api/pro/demo');
      if (!response.ok) throw new Error('The sample could not be loaded.');
      await open(
        {
          name: 'Studio North — sample.pdf',
          bytes: new Uint8Array(await response.arrayBuffer()),
        },
        true,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The sample could not be loaded.');
      setBusy('');
    }
  }
  async function request(
    source: SourceFile,
    isDemo: boolean,
    job: { operation: string; [key: string]: unknown },
  ) {
    const controller = new AbortController();
    abort.current = controller;
    if (isDemo) {
      const response = await fetch('/api/pro/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'This PDF could not be processed.');
      }
      return response;
    }
    const form = new FormData();
    form.append(
      'file',
      new Blob([source.bytes.slice().buffer], { type: 'application/pdf' }),
      source.name,
    );
    form.append('job', JSON.stringify(job));
    if (job.operation === 'inspect' || job.operation === 'preview') {
      const response = await fetch('/api/pro/preview', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'This PDF could not be previewed.');
      }
      return response;
    }
    return accountFetch('/api/pro/pdf', { method: 'POST', body: form, signal: controller.signal });
  }
  async function inspect() {
    if (!file || !canEdit || file.bytes.length > 10 * 1024 * 1024) return;
    setBusy('Finding editable text…');
    setError('');
    try {
      setInspection(await (await request(file, demo, { operation: 'inspect' })).json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Text could not be inspected.');
    } finally {
      setBusy('');
    }
  }
  function commit(next: Changes) {
    setHistory((current) => {
      const states = [...current.states.slice(0, current.index + 1), next].slice(-40);
      return { states, index: states.length - 1 };
    });
    setNotice('');
  }
  function update(patch: Partial<TextChange>) {
    if (!value || !selected) return;
    const next = { ...value, ...patch };
    const updated = { ...changes };
    if (
      next.text === selected.text &&
      next.font === selected.replacementFont &&
      next.size === selected.size &&
      next.color === selected.color
    )
      delete updated[selected.id];
    else updated[selected.id] = next;
    commit(updated);
  }
  async function renderChanges() {
    if (!file) return null;
    if (!Object.keys(changes).length) return file.bytes;
    const response = await request(file, demo, {
      operation: 'edit',
      changes: Object.values(changes),
    });
    return new Uint8Array(await response.arrayBuffer());
  }
  async function apply(shouldDownload = false, verified = false) {
    if (!file || !canEdit) return;
    if (shouldDownload && !demo && !access.pro && !verified && Object.keys(changes).length) {
      if (needsPreview && !(await showPreview(changes))) return;
      await askForDownload();
      return;
    }
    if (!shouldDownload) {
      await showPreview(changes);
      return;
    }
    setBusy(shouldDownload ? 'Preparing your download…' : 'Updating the PDF…');
    setError('');
    try {
      const output = await renderChanges();
      if (!output) return;
      if (shouldDownload) {
        download(output, `${baseName(file.name)}-text-edited.pdf`);
        setDownloadedRevision(revision);
        if (!demo) void clearProDraft().catch(() => {});
        setNotice('Your PDF has been downloaded with the changed text.');
      } else setNotice('Preview updated. Your changes are now in the PDF.');
    } catch (e) {
      if (e instanceof AccountRequestError && [401, 402].includes(e.status)) {
        await askForDownload();
        return;
      }
      setError(e instanceof Error ? e.message : 'This text could not be changed.');
    } finally {
      setBusy('');
    }
  }
  async function showPreview(changeSet: Changes, previewPage = page) {
    if (!file) return false;
    setBusy('Updating the preview…');
    setError('');
    try {
      const result: TextPreview = await (
        await request(file, demo, {
          operation: 'preview',
          changes: Object.values(changeSet),
          page: previewPage,
        })
      ).json();
      appliedChanges.current = changeSet;
      setPreviewImages((current) => ({
        ...current,
        [previewPage]: { image: result, key: JSON.stringify(changeSet), changes: changeSet },
      }));
      setNotice('Preview updated. Your changes are ready for download.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The preview could not be updated.');
      return false;
    } finally {
      setBusy('');
    }
  }
  async function askForDownload() {
    setDraftSaved(false);
    setGateOpen(true);
  }
  function replaceMatches() {
    if (!inspection || !find) return;
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      expression = new RegExp(escaped, matchCase ? 'g' : 'gi');
    const next = { ...changes };
    let count = 0;
    for (const block of inspection.blocks) {
      const current = next[block.id] || defaultChange(block);
      const text = current.text.replace(expression, () => {
        count++;
        return replace;
      });
      if (text !== current.text) next[block.id] = { ...current, text };
    }
    if (count) commit(next);
    setNotice(
      count
        ? `${count} replacement${count === 1 ? '' : 's'} ready. Update the preview to apply them.`
        : 'No matching text found within editable blocks.',
    );
  }
  const blocksOnPage = inspection?.blocks.filter((block) => block.page === page) || [];
  function chooseFile() {
    if (!dirty || window.confirm('Download your edits before opening another PDF. Continue?')) {
      input.current?.click();
    }
  }
  return (
    <div className="pro-text-tool">
      {!file ? (
        <div className="pro-intro">
          <div>
            <span className="workspace-label">
              <PencilLine size={14} /> ORIGINAL TEXT, EDITABLE
            </span>
            <h2>
              A better word.
              <br />
              <em>Right where it belongs.</em>
            </h2>
            <p>
              Correct a name, update a detail, or rewrite a text block in your PDF. Preview the
              result before you download.
            </p>
            <div className="pro-intro-actions">
              <button
                className="button primary"
                disabled={!!busy}
                onClick={() => input.current?.click()}
              >
                <Upload size={16} />
                Choose your PDF
              </button>
              <button className="button secondary" disabled={!!busy} onClick={openDemo}>
                Try the sample <ArrowRight size={16} />
              </button>
            </div>
            <small>
              Your file is uploaded only when you choose “Upload for text editing”. Maximum 10 MB
              and 100 pages.
            </small>
          </div>
          <div className="pro-edit-first">
            <span className="eyebrow">MAKE IT YOURS FIRST</span>
            <h3>
              Your document.
              <br />
              Your finishing touches.
            </h3>
            <ol>
              <li>Choose a PDF and start editing.</li>
              <li>Refine the text and preview every change.</li>
              <li>Download your finished PDF.</li>
            </ol>
            <p>Adjust fonts, colors, and wording in one workspace.</p>
          </div>
        </div>
      ) : (
        <div className="pro-workspace">
          <div className="pro-workspace-bar">
            <div>
              <span className="workspace-label">
                <PencilLine size={12} />
                {demo ? 'SAMPLE WORKSPACE' : 'TEXT EDITOR'}
              </span>
              <strong>{file.name}</strong>
              <small>
                {formatBytes(file.bytes.length)} · {doc?.numPages || '…'} pages
              </small>
            </div>
            <div className="pro-workspace-actions">
              <button
                className="icon-button"
                aria-label="Undo text change"
                disabled={history.index === 0 || !!busy}
                onClick={() => setHistory((h) => ({ ...h, index: h.index - 1 }))}
              >
                <Undo2 size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Redo text change"
                disabled={history.index === history.states.length - 1 || !!busy}
                onClick={() => setHistory((h) => ({ ...h, index: h.index + 1 }))}
              >
                <Redo2 size={17} />
              </button>
              <button className="button secondary" disabled={!!busy} onClick={chooseFile}>
                Change PDF
              </button>
              <button
                className="button primary"
                disabled={!!busy || (!!inspection && !canEdit)}
                onClick={() => (inspection ? void apply(true) : download(file.bytes, file.name))}
              >
                <Download size={15} />
                {inspection ? 'Download PDF' : 'Download current copy'}
              </button>
            </div>
          </div>
          {demo && (
            <div className="pro-demo-note">
              <span>You’re editing a sample PDF. Try changing its text, fonts, and colors.</span>
              <button className="text-link" disabled={!!busy} onClick={chooseFile}>
                Use your own PDF <ArrowRight size={14} />
              </button>
            </div>
          )}
          {!inspection && (
            <div className="pro-upload-consent">
              <p>
                Your PDF is previewed locally. Text editing sends this document to Folio for
                processing in memory.
              </p>
              <button
                className="button primary"
                disabled={!!busy || file.bytes.length > 10 * 1024 * 1024}
                onClick={inspect}
              >
                Upload for text editing <ArrowRight size={16} />
              </button>
            </div>
          )}
          <div className="pro-workspace-body">
            <div className="pro-document-area" ref={canvas}>
              <div className="pro-page-tools">
                <button
                  className="icon-button"
                  aria-label="Previous PDF page"
                  disabled={page <= 0 || !!busy}
                  onClick={() => {
                    changePage(page - 1);
                    setSelectedId('');
                  }}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  Page {page + 1} of {doc?.numPages || '…'}
                </span>
                <button
                  className="icon-button"
                  aria-label="Next PDF page"
                  disabled={!doc || page >= doc.numPages - 1 || !!busy}
                  onClick={() => {
                    changePage(page + 1);
                    setSelectedId('');
                  }}
                >
                  <ChevronRight size={17} />
                </button>
                <span className={needsPreview ? 'preview-pending' : 'preview-current'}>
                  {needsPreview ? 'Preview needs updating' : 'Preview is up to date'}
                </span>
              </div>
              <div
                className="pro-page-scroll"
                tabIndex={0}
                role="region"
                aria-label="PDF text editing preview"
              >
                <div className="pro-editable-page" style={{ width: canvasWidth }}>
                  {previewImages[page] ? (
                    <>
                      <img
                        className="pro-rendered-preview"
                        src={`data:image/png;base64,${previewImages[page].image.preview}`}
                        alt={`Edited preview of page ${page + 1}`}
                        width={canvasWidth}
                        height={
                          (canvasWidth * previewImages[page].image.height) /
                          previewImages[page].image.width
                        }
                      />
                      <span className="sr-only">
                        {blocksOnPage
                          .map((block) => previewImages[page].changes[block.id]?.text ?? block.text)
                          .join(' ')}
                      </span>
                    </>
                  ) : (
                    doc && <PdfCanvas document={doc} page={page + 1} width={canvasWidth} />
                  )}
                  <div className="pro-text-targets">
                    {blocksOnPage.map((block) => {
                      const rect = rectangles[block.id];
                      if (!rect) return null;
                      return (
                        <button
                          key={block.id}
                          className={`pro-text-target ${selectedId === block.id ? 'active' : ''} ${changes[block.id] ? 'changed' : ''}`}
                          style={{
                            left: rect[0] - 3,
                            top: rect[1] - 3,
                            width: Math.max(12, rect[2] + 6),
                            height: Math.max(16, rect[3] + 6),
                          }}
                          aria-label={`Edit text: ${block.text}`}
                          aria-pressed={selectedId === block.id}
                          disabled={!!busy}
                          onClick={() => setSelectedId(block.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
              <small className="pro-canvas-hint">
                Click an outlined text block, or choose it from the list. Existing images and page
                layout stay in place.
              </small>
            </div>
            <aside className="pro-text-properties">
              <fieldset disabled={!!busy || !canEdit}>
                <legend>Make the words yours.</legend>
                {value && selected ? (
                  <>
                    <label className="pro-field">
                      Replacement text
                      <textarea
                        aria-label="Replacement text"
                        value={value.text}
                        rows={3}
                        maxLength={2000}
                        onChange={(e) => update({ text: e.target.value })}
                      />
                    </label>
                    <Dropdown
                      label="Replacement font"
                      value={value.font}
                      options={replacementFonts.map((font) => ({
                        value: font,
                        label: font.replace('-', ' '),
                      }))}
                      onValueChange={(font) => update({ font: font as TextChange['font'] })}
                      disabled={!!busy || !canEdit}
                    />
                    <div className="pro-style-fields">
                      <label className="pro-field">
                        Size
                        <input
                          type="number"
                          min={4}
                          max={144}
                          step={0.5}
                          value={value.size}
                          onChange={(e) => update({ size: Number(e.target.value) })}
                        />
                      </label>
                      <label className="pro-field">
                        Color
                        <input
                          type="color"
                          value={value.color}
                          onChange={(e) => update({ color: e.target.value })}
                        />
                      </label>
                    </div>
                    <p className="pro-font-note">
                      Original font: {selected.font}. Replacement uses the selected standard font.
                      Longer text may need a smaller size.
                    </p>
                    <button className="text-link" onClick={() => update({ text: '' })}>
                      <Trash2 size={14} />
                      Delete this text
                    </button>
                  </>
                ) : (
                  <div className="pro-select-hint">
                    <PencilLine size={25} />
                    <p>
                      {inspection
                        ? 'Choose a text block to edit its words and style.'
                        : 'Enable text editing to see available text blocks.'}
                    </p>
                  </div>
                )}
                <button
                  className="button primary full pro-preview-button"
                  disabled={!inspection || !needsPreview || !!busy || !canEdit}
                  onClick={() => void apply()}
                >
                  <Check size={16} />
                  Update PDF preview
                </button>
              </fieldset>
              {inspection && (
                <>
                  <details className="pro-find-replace">
                    <summary>
                      <ReplaceAll size={16} />
                      Find & replace
                    </summary>
                    <label className="pro-field">
                      Find
                      <input
                        value={find}
                        onChange={(e) => setFind(e.target.value)}
                        maxLength={2000}
                        disabled={!!busy}
                      />
                    </label>
                    <label className="pro-field">
                      Replace with
                      <input
                        value={replace}
                        onChange={(e) => setReplace(e.target.value)}
                        maxLength={2000}
                        disabled={!!busy}
                      />
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={matchCase}
                        onChange={(e) => setMatchCase(e.target.checked)}
                      />
                      Match case
                    </label>
                    <button
                      className="button secondary full"
                      disabled={!find || !!busy || !canEdit}
                      onClick={replaceMatches}
                    >
                      Replace across document
                    </button>
                    <small>Finds matches within editable text blocks, across all pages.</small>
                  </details>
                  <div className="pro-block-list">
                    <h3>
                      <Search size={14} />
                      {blocksOnPage.length} text blocks on this page
                    </h3>
                    {blocksOnPage.length ? (
                      blocksOnPage.map((block) => (
                        <button
                          key={block.id}
                          className={selectedId === block.id ? 'active' : ''}
                          aria-pressed={selectedId === block.id}
                          onClick={() => setSelectedId(block.id)}
                        >
                          {changes[block.id]?.text || block.text}
                          {changes[block.id] && <span className="pro-edited-dot" />}
                        </button>
                      ))
                    ) : (
                      <p>
                        No supported text on this page. It may be scanned, outlined, clipped, or
                        inside artwork. OCR is not included.
                      </p>
                    )}
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        hidden
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          e.target.value = '';
          if (!selected) return;
          if (!/\.pdf$/i.test(selected.name) || selected.size > 10 * 1024 * 1024) {
            setError('Choose a PDF smaller than 10 MB.');
            return;
          }
          await clearProDraft().catch(() => {});
          await open(
            { name: selected.name, bytes: new Uint8Array(await selected.arrayBuffer()) },
            false,
          );
        }}
      />
      {busy && (
        <p className="pro-processing" role="status">
          <Loader2 size={16} className="spin" />
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="pro-notice">
          <Check size={15} />
          {notice}
        </p>
      )}
      <p className="service-note">
        Text is edited in separate blocks; paragraphs do not reflow automatically. Replacement text
        currently supports Latin characters.{' '}
        {inspection?.skipped ? `${inspection.skipped} complex objects were left unchanged. ` : ''}
        Text deletion is not secure redaction. Keep an original and review the exported PDF.
      </p>
      <DownloadGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onReady={() => void apply(true, true)}
        saved={draftSaved}
      />
    </div>
  );
}

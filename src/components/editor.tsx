'use client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CloudUpload,
  Download,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  TextCursorInput,
  Trash2,
  X,
  Settings2,
  MessageSquare,
  Link2,
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Logo } from './logo';
import { UploadArea } from './upload';
import { PdfCanvas } from './pdf-canvas';
import { EditorContentSkeleton } from './editor-skeleton';
import { Dropdown } from './dropdown';
import { FontPicker } from './font-picker';
import { documentFontStyle } from '@/lib/document-fonts.mjs';
import { useDocumentFonts } from '@/lib/document-font-client';
import { EditorToolbar, type EditorMode } from './editor-toolbar';
import { useAccount } from './account-provider';
import { InlinePdfText } from './inline-pdf-text';
import { PdfTextSizeInput } from './pdf-text-size-input';
import { DownloadGate } from './download-gate';
import { SignatureDialog } from './signature-dialog';
import type { SignatureResult, SignatureTab } from '@/lib/signature';
import {
  defaultTextChange,
  resolvedTextChange,
  hasTextChanges,
  unchangedText,
} from '@/lib/editor-text';
import { exportWorkspacePdf } from '@/lib/editor-text-client';
import { readProDraft } from '@/lib/pro-draft';
import { AccountRequestError } from '@/lib/auth-client';
import { type TextBlock, type TextChange, type TextInspection } from '@/lib/pro-types';
import { readWorkspace } from '@/lib/workspace-client';
import { useWorkspaceSync } from './use-workspace-sync';
import { usePreparedText } from './use-prepared-text';
import { useInteractiveTextPreview } from './use-interactive-text-preview';
import { useEditorExit } from './use-editor-exit';
import type { WorkspaceRecord } from '@/lib/workspace-types';
import { runPdf } from '@/lib/pdf-client';
import { loadViewer } from '@/lib/pdf-viewer';
import { getDocument, getPendingDocument, setPendingDocument } from '@/lib/storage';
import { MAX_FILE_SIZE, download, friendlyError, baseName } from '@/lib/utils';
import type { Annotation, AnnotationKind, EditorState, FormValue, PageModel } from '@/lib/types';
import type { inspectPdf } from '@/lib/pdf-engine';
type Field = Awaited<ReturnType<typeof inspectPdf>>['fields'][number];
const initialState: EditorState = { pages: [], annotations: [], formValues: {} };
const palette = ['#202522', '#c44934', '#3e6852', '#3a638b', '#efc95b'];
export function Editor() {
  const { user, access } = useAccount();
  const userId = user?.id;
  const params = useSearchParams();
  const router = useRouter();
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [name, setName] = useState('Untitled document.pdf');
  const [history, setHistory] = useState<{ states: EditorState[]; index: number }>({
    states: [initialState],
    index: 0,
  });
  const state = history.states[history.index];
  const annotationFonts = useDocumentFonts(
    state.annotations.flatMap((annotation) => (annotation.font ? [annotation.font] : [])),
  );
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [fields, setFields] = useState<Field[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [textInspection, setTextInspection] = useState<TextInspection | null>(null);
  const [originalSelection, setOriginalSelection] = useState<TextBlock | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [restoredWorkspace, setRestoredWorkspace] = useState<WorkspaceRecord | null>(null);
  const [inlineAnnotation, setInlineAnnotation] = useState('');
  const annotationEditGroup = useRef('');
  const historyGroup = useRef<string | undefined>(undefined);
  const [mode, setMode] = useState<EditorMode>('select');
  const [zoom, setZoom] = useState(100);
  const [availableWidth, setAvailableWidth] = useState(650);
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [retryingPreview, setRetryingPreview] = useState(false);
  const [busy, setBusy] = useState(() =>
    ['cloud', 'draft', 'id', 'sample'].some((key) => params.has(key))
      ? 'Opening your workspace…'
      : '',
  );
  const [notice, setNotice] = useState('');
  const [savingNow, setSavingNow] = useState(false);
  const [dirty, setDirty] = useState(false);
  const signInDialog = useRef<HTMLDialogElement>(null);
  const editVersion = useRef(0);
  const saveMounted = useRef(true);
  useEffect(() => {
    saveMounted.current = true;
    return () => {
      saveMounted.current = false;
    };
  }, []);
  const [sidebar, setSidebar] = useState(true);
  const [properties, setProperties] = useState(true);
  const [propertiesTab, setPropertiesTab] = useState('style');
  useEffect(() => {
    const compact = window.matchMedia('(max-width: 999px)');
    const narrow = window.matchMedia('(max-width: 699px)');
    const hideProperties = () => {
      if (compact.matches) setProperties(false);
    };
    const hidePages = () => {
      if (narrow.matches) setSidebar(false);
    };
    compact.addEventListener('change', hideProperties);
    narrow.addEventListener('change', hidePages);
    return () => {
      compact.removeEventListener('change', hideProperties);
      narrow.removeEventListener('change', hidePages);
    };
  }, []);
  const [color, setColor] = useState('#202522');
  const [textSize, setTextSize] = useState(18);
  const [flatten, setFlatten] = useState(false);
  const interactive = useInteractiveTextPreview(bytes, doc?.numPages);
  const interactivePreview = interactive.client;
  const preparedText = usePreparedText(
    bytes,
    name,
    doc?.numPages,
    state.pages[pageIndex]?.sourceIndex ?? null,
    textInspection,
    interactivePreview,
    interactive.starting,
  );
  useEffect(() => {
    // Prefetch stays out of the saved workspace until text editing is used.
    if ((mode === 'original-text' || textInspection) && preparedText.inspection)
      setTextInspection(preparedText.inspection);
  }, [mode, textInspection, preparedText.inspection]);
  const snapshot = useMemo(
    () => ({ state, inspection: textInspection, page: pageIndex, mode, flatten }),
    [state, textInspection, pageIndex, mode, flatten],
  );
  const autosave = useWorkspaceSync(bytes, name, snapshot, restoredWorkspace, userId);
  const editorExit = useEditorExit({
    enabled: !!bytes,
    unsaved: dirty,
    guest: !user,
    save: () => autosave.flush({ name, snapshot: { ...snapshot, state: stateRef.current } }),
  });
  useEffect(() => {
    if (!bytes) return;
    setDirty(autosave.phase !== 'saved');
    if (autosave.phase !== 'saved')
      setNotice((current) => (current === 'Your document has been saved.' ? '' : current));
  }, [bytes, autosave.phase, autosave.updatedAt]);
  const [search, setSearch] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  const [signatureTab, setSignatureTab] = useState<SignatureTab | null>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const pageArea = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const draftStroke = useRef<{ x: number; y: number }[]>([]);
  const [stroke, setStroke] = useState<{ x: number; y: number }[]>([]);
  const drawing = useRef(false);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const placement = useRef<{
    kind: AnnotationKind;
    x: number;
    y: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [placementBox, setPlacementBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const gesture = useRef<{
    id: string;
    clientX: number;
    clientY: number;
    a: Annotation;
    resize: boolean;
    moved: boolean;
  } | null>(null);
  const [dragAnnotation, setDragAnnotation] = useState<Annotation | null>(null);
  const initialLoad = useRef(false);
  const loadVersion = useRef(0);
  useEffect(() => {
    if (bytes && !busy && mode === 'signature') {
      setSignatureTab('draw');
      setMode('select');
    }
  }, [bytes, busy, mode]);
  const selected = state.annotations.find((a) => a.id === selectedId);
  const pageModel = state.pages[pageIndex];
  const sideways = !!pageModel && pageModel.rotation % 180 !== 0;
  const pageWidth = pageModel ? (sideways ? pageModel.height : pageModel.width) : 595;
  const pageHeight = pageModel ? (sideways ? pageModel.width : pageModel.height) : 842;
  const canvasWidth = (Math.max(100, Math.min(620, availableWidth - 56)) * zoom) / 100;
  const scale = canvasWidth / pageWidth;
  const zoomAnchor = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const commit = useCallback((next: EditorState, group?: string) => {
    const merge = !!group && historyGroup.current === group;
    historyGroup.current = group;
    stateRef.current = next;
    setHistory((h) => {
      if (merge && h.index > 0)
        return { states: [...h.states.slice(0, h.index), next], index: h.index };
      const previous = h.states.slice(0, h.index + 1).slice(-49);
      return { states: [...previous, next], index: previous.length };
    });
    editVersion.current++;
    setDirty(true);
  }, []);
  function updateAnnotation(id: string, patch: Partial<Annotation>, group?: string) {
    const current = stateRef.current;
    const old = current.annotations.find((a) => a.id === id);
    let formValues = current.formValues;
    if (
      old &&
      ['field', 'checkbox'].includes(old.kind) &&
      patch.text !== undefined &&
      patch.text !== old.text &&
      old.text in formValues
    ) {
      formValues = { ...formValues, [patch.text]: formValues[old.text] };
      delete formValues[old.text];
    }
    commit(
      {
        ...current,
        formValues,
        annotations: current.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      },
      group,
    );
  }
  const undo = useCallback(() => {
    historyGroup.current = undefined;
    setHistory((h) => {
      const index = Math.max(0, h.index - 1);
      stateRef.current = h.states[index];
      return { ...h, index };
    });
    editVersion.current++;
    setDirty(true);
    setSelectedId('');
  }, []);
  const redo = useCallback(() => {
    historyGroup.current = undefined;
    setHistory((h) => {
      const index = Math.min(h.states.length - 1, h.index + 1);
      stateRef.current = h.states[index];
      return { ...h, index };
    });
    editVersion.current++;
    setDirty(true);
    setSelectedId('');
  }, []);
  const openBytes = useCallback(
    async (
      value: Uint8Array,
      filename: string,
      saved?: { state: EditorState; id: string; updatedAt: number; workspace?: WorkspaceRecord },
    ) => {
      const version = ++loadVersion.current;
      setTextInspection(null);
      setOriginalSelection(null);
      setInlineAnnotation('');
      setGateOpen(false);
      historyGroup.current = undefined;
      setBusy('Opening document…');
      setSavingNow(false);
      setError('');
      try {
        const inspected = await runPdf('inspect', [{ bytes: value, name: filename }]);
        if (inspected.state.pages.length > 500)
          throw new Error(
            'The editor supports up to 500 pages per document. Use Split PDF to work with a smaller section.',
          );
        const viewer = await loadViewer(value, true);
        if (version !== loadVersion.current) {
          void viewer.loadingTask.destroy();
          return;
        }
        setBytes(value);
        setDoc(viewer);
        setName(filename);
        setHistory({ states: [saved?.state || inspected.state], index: 0 });
        stateRef.current = saved?.state || inspected.state;
        setFields(inspected.fields);
        setPageIndex(saved?.workspace?.snapshot?.page || 0);
        setFlatten(saved?.workspace?.snapshot?.flatten || false);
        setTextInspection(saved?.workspace?.snapshot?.inspection || null);
        if (saved?.workspace?.snapshot) {
          const restored = saved.workspace.snapshot;
          setMode(restored.mode || (restored.inspection ? 'original-text' : 'select'));
        }
        setRestoredWorkspace(saved?.workspace || null);
        setSelectedId('');
        setDirty(false);
        setNotice('');
        setPendingDocument(undefined);
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        if (version === loadVersion.current) setBusy('');
      }
    },
    [],
  );
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    if (window.innerWidth < 1000) setProperties(false);
    if (window.innerWidth < 700) setSidebar(false);
    const requested = params.get('mode') as EditorMode;
    if (
      [
        'select',
        'text',
        'highlight',
        'rectangle',
        'ellipse',
        'line',
        'cross',
        'check',
        'whiteout',
        'comment',
        'link',
        'erase',
        'draw',
        'signature',
        'image',
        'field',
        'checkbox',
        'form-fill',
      ].includes(requested)
    ) {
      setMode(requested);
      if (requested === 'form-fill') {
        setPropertiesTab('form');
        setProperties(true);
      }
    }
    void (async () => {
      try {
        const id = params.get('id');
        const cloudId = params.get('cloud');
        if (params.get('draft') === 'pro-text') {
          const draft = await readProDraft();
          if (draft) {
            const inspected =
              draft.editorState ||
              (await runPdf('inspect', [{ bytes: draft.bytes, name: draft.name }])).state;
            const restored = draft.editorState || {
              ...inspected,
              textChanges: Object.fromEntries(
                inspected.pages.map((p) => [
                  p.id,
                  Object.fromEntries(
                    Object.entries(draft.changes).filter(
                      ([id]) => Number(id.split(':')[0]) === p.sourceIndex,
                    ),
                  ),
                ]),
              ),
            };
            await openBytes(draft.bytes, draft.name, {
              state: restored,
              id: 'pro-text',
              updatedAt: draft.savedAt,
            });
            setTextInspection(draft.inspection);
            setMode('original-text');
            setFlatten(!!draft.flatten);
            setPageIndex(Math.min(draft.page, restored.pages.length - 1));
            setNotice(
              'Recovered your workspace from cloud storage. Continue editing directly on the page.',
            );
          } else
            setError(
              'There is no saved text workspace for this account. Open a PDF to get started.',
            );
        } else if (cloudId) {
          setBusy('Opening your cloud PDF…');
          const file = await readWorkspace(cloudId);
          const state =
            file.snapshot?.state ||
            (await runPdf('inspect', [{ bytes: file.bytes, name: file.name }])).state;
          await openBytes(file.bytes, file.name, {
            state,
            id: file.id,
            updatedAt: Date.parse(file.updatedAt),
            workspace: file,
          });
        } else if (id) {
          const saved = await getDocument(id);
          if (!saved)
            throw new Error(
              'This local draft was not found. It may have been removed or saved in a different browser.',
            );
          await openBytes(saved.bytes, saved.name, saved);
        } else if (params.get('sample')) {
          setBusy('Preparing your sample…');
          const { createSample } = await import('@/lib/sample');
          await openBytes(await createSample(params.get('sample')!), 'Studio North — Proposal.pdf');
        } else {
          const pending = getPendingDocument();
          if (pending) await openBytes(pending.bytes, pending.name);
        }
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy('');
      }
    })();
  }, [params, openBytes]);
  useEffect(
    () => () => {
      void doc?.loadingTask.destroy();
    },
    [doc],
  );
  async function retryPreview() {
    if (!bytes || retryingPreview) return;
    const version = loadVersion.current;
    setRetryingPreview(true);
    try {
      // Recreate only the viewer. Reopening the workspace would replace edit
      // history, selections, and changes that have not reached storage yet.
      const viewer = await loadViewer(bytes, true);
      if (!saveMounted.current || version !== loadVersion.current) {
        void viewer.loadingTask.destroy();
        return;
      }
      setDoc(viewer);
    } catch {
      if (saveMounted.current && version === loadVersion.current)
        setPreviewError('The preview is still unavailable. Your edits are still here.');
    } finally {
      if (saveMounted.current) setRetryingPreview(false);
    }
  }
  useEffect(() => {
    if (!scrollArea.current) return;
    const observer = new ResizeObserver((entries) =>
      setAvailableWidth(entries[0].contentRect.width),
    );
    observer.observe(scrollArea.current);
    return () => observer.disconnect();
  }, [doc, sidebar, properties]);
  useEffect(() => {
    const area = scrollArea.current;
    if (!area) return;
    const wheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || !pageArea.current) return;
      event.preventDefault();
      const rect = pageArea.current.getBoundingClientRect();
      zoomAnchor.current = {
        x: event.clientX,
        y: event.clientY,
        fx: (event.clientX - rect.left) / rect.width,
        fy: (event.clientY - rect.top) / rect.height,
      };
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? area.clientHeight : 1);
      setZoom((value) => Math.max(50, Math.min(300, Math.round(value * Math.exp(-delta * 0.002)))));
    };
    area.addEventListener('wheel', wheel, { passive: false });
    return () => area.removeEventListener('wheel', wheel);
  }, [doc]);
  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    const area = scrollArea.current;
    if (!anchor || !area || !pageArea.current) return;
    const rect = pageArea.current.getBoundingClientRect();
    area.scrollLeft += rect.left + anchor.fx * rect.width - anchor.x;
    area.scrollTop += rect.top + anchor.fy * rect.height - anchor.y;
    zoomAnchor.current = null;
  }, [canvasWidth]);
  useEffect(() => {
    if (pageIndex >= state.pages.length && state.pages.length) setPageIndex(state.pages.length - 1);
  }, [pageIndex, state.pages.length]);
  useEffect(() => {
    setOriginalSelection(null);
    setInlineAnnotation('');
  }, [pageModel?.id]);
  function enableOriginalText() {
    if (!bytes || !doc || busy) return;
    setInlineAnnotation('');
    setSelectedId('');
    if (bytes.length > 10 * 1024 * 1024 || doc.numPages > 100) {
      setError(
        'Original text editing supports PDFs up to 10 MB and 100 pages. Split a larger file first.',
      );
      return;
    }
    setError('');
    setMode('original-text');
    if (preparedText.inspection) setTextInspection(preparedText.inspection);
    if (preparedText.error) preparedText.retry();
  }
  function updateOriginalText(block: TextBlock, patch: Partial<TextChange>, group?: string) {
    if (!pageModel) return;
    const current = stateRef.current;
    const pageChanges = { ...current.textChanges?.[pageModel.id] };
    const next = {
      ...resolvedTextChange(block, pageChanges[block.id]),
      ...patch,
      ...(patch.color !== undefined ? { preservePaint: false } : {}),
    };
    if (unchangedText(block, next)) delete pageChanges[block.id];
    else pageChanges[block.id] = next;
    commit(
      { ...current, textChanges: { ...current.textChanges, [pageModel.id]: pageChanges } },
      group,
    );
  }
  async function exportFile(nextTool?: string, verified = false, leaveConfirmed = false) {
    if (!bytes) return false;
    if (nextTool === 'edit-pdf-text') {
      await enableOriginalText();
      return;
    }
    if (hasTextChanges(stateRef.current) && !access.pro && !verified) {
      if (nextTool) {
        setNotice(
          'Download your finished text edits before continuing in another tool. Your work stays in this editor.',
        );
        return;
      }
      setGateOpen(true);
      return;
    }
    if (nextTool && !leaveConfirmed) {
      editorExit.requestLeave(() => exportFile(nextTool, verified, true));
      return;
    }
    setBusy('Preparing your PDF…');
    setError('');
    try {
      const result = await exportWorkspacePdf(bytes, name, stateRef.current, flatten);
      if (nextTool) {
        setPendingDocument({ name: `${baseName(name)}-edited.pdf`, bytes: result.bytes });
        setDirty(false);
        router.push(`/${nextTool}`);
      } else {
        download(result.bytes, `${baseName(name)}-edited.pdf`);
        setNotice('Your edited PDF has been downloaded.');
      }
    } catch (e) {
      if (
        e instanceof AccountRequestError &&
        [401, 402].includes(e.status) &&
        hasTextChanges(stateRef.current)
      ) {
        setGateOpen(true);
        return false;
      }
      setError(friendlyError(e));
      return false;
    } finally {
      setBusy('');
    }
  }
  async function save() {
    if (!bytes || savingNow) return;
    const version = loadVersion.current;
    setSavingNow(true);
    setNotice('');
    try {
      await autosave.flush({ name, snapshot: { ...snapshot, state: stateRef.current } });
      if (saveMounted.current && version === loadVersion.current)
        setNotice('Your document has been saved.');
    } catch {
      // The save queue publishes one persistent error toast with a retry action.
    } finally {
      if (saveMounted.current && version === loadVersion.current) setSavingNow(false);
    }
  }
  const requestedDownload = useRef(false);
  useEffect(() => {
    if (params.get('download') === '1' && bytes && !busy && !requestedDownload.current) {
      requestedDownload.current = true;
      void exportFile();
    }
  });
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.target as HTMLElement)?.closest('dialog[open]')) return;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current();
      }
      if (
        typing ||
        (e.target as HTMLElement)?.closest(
          '.dropdown-field, .dropdown-positioner, .editor-menu-positioner',
        )
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        commit({
          ...stateRef.current,
          annotations: stateRef.current.annotations.filter((a) => a.id !== selectedId),
        });
        setSelectedId('');
      }
      if (e.key === 'Escape') {
        setMode('select');
        setSelectedId('');
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [selectedId, undo, redo, commit]);
  function coordinate(e: React.PointerEvent) {
    const rect = pageArea.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(pageWidth, (e.clientX - rect.left) / scale)),
      y: Math.max(0, Math.min(pageHeight, (e.clientY - rect.top) / scale)),
    };
  }
  function addAnnotation(
    kind: AnnotationKind,
    x: number,
    y: number,
    dataUrl?: string,
    imageRatio = 1.4,
    box?: { width: number; height: number },
  ) {
    if (!pageModel) return;
    const width = Math.min(
      pageWidth,
      box?.width ??
        (kind === 'checkbox'
          ? 20
          : ['cross', 'check', 'comment'].includes(kind)
            ? 28
            : kind === 'image'
              ? 180
              : ['rectangle', 'ellipse'].includes(kind)
                ? 140
                : 220),
    );
    const height = Math.min(
      pageHeight,
      box?.height ??
        (kind === 'checkbox'
          ? 20
          : ['cross', 'check', 'comment'].includes(kind)
            ? 28
            : kind === 'image'
              ? width / imageRatio
              : ['rectangle', 'ellipse'].includes(kind)
                ? 90
                : kind === 'highlight'
                  ? 24
                  : kind === 'signature'
                    ? 46
                    : 32),
    );
    const a: Annotation = {
      id: crypto.randomUUID(),
      pageId: pageModel.id,
      kind,
      x: Math.max(0, Math.min(x, pageWidth - width)),
      y: Math.max(0, Math.min(y, pageHeight - height)),
      width,
      height,
      text:
        kind === 'signature'
          ? 'Your signature'
          : kind === 'field' || kind === 'checkbox'
            ? `${kind}_${state.annotations.filter((a) => a.kind === kind).length + 1}_${crypto.randomUUID().slice(0, 5)}`
            : kind === 'comment'
              ? ''
              : kind === 'link'
                ? ''
                : 'Your text here',
      size: kind === 'signature' ? 30 : ['cross', 'check', 'line'].includes(kind) ? 2 : textSize,
      color: kind === 'highlight' ? '#efc95b' : kind === 'whiteout' ? '#ffffff' : color,
      opacity: kind === 'highlight' ? 0.35 : 1,
      dataUrl,
      ...(kind === 'link' ? { url: '' } : {}),
    };
    commit({ ...state, annotations: [...state.annotations, a] });
    setSelectedId(a.id);
    setMode('select');
    if (kind === 'text' || kind === 'signature') {
      annotationEditGroup.current = crypto.randomUUID();
      setInlineAnnotation(a.id);
    }
    if (!['text', 'signature'].includes(kind) || window.innerWidth >= 1000) setProperties(true);
    setPropertiesTab('style');
  }
  function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (busy || mode === 'form-fill' || e.button !== 0) return;
    if (mode === 'original-text') {
      setOriginalSelection(null);
      return;
    }
    if ((e.target as HTMLElement).closest('.annotation') && (mode === 'select' || mode === 'erase'))
      return;
    if (mode === 'select') {
      setSelectedId('');
      setOriginalSelection(null);
      if (scrollArea.current && e.pointerType !== 'touch') {
        e.currentTarget.setPointerCapture(e.pointerId);
        pan.current = {
          x: e.clientX,
          y: e.clientY,
          left: scrollArea.current.scrollLeft,
          top: scrollArea.current.scrollTop,
        };
      }
      return;
    }
    if (mode === 'erase') return;
    const point = coordinate(e);
    if (['rectangle', 'ellipse', 'highlight', 'whiteout', 'link', 'line'].includes(mode)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      placement.current = { kind: mode, ...point, endX: point.x, endY: point.y };
      return;
    }
    if (mode === 'draw') {
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      draftStroke.current = [point];
      setStroke([point]);
      return;
    }
    if (mode === 'signature') {
      setSignatureTab('draw');
      return;
    }
    if (mode === 'image') {
      imageInput.current?.click();
      return;
    }
    e.preventDefault();
    addAnnotation(mode, point.x, point.y);
  }
  function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pan.current && scrollArea.current) {
      scrollArea.current.scrollLeft = pan.current.left - (e.clientX - pan.current.x);
      scrollArea.current.scrollTop = pan.current.top - (e.clientY - pan.current.y);
    }
    if (placement.current) {
      const point = coordinate(e);
      placement.current.endX = point.x;
      placement.current.endY = point.y;
      setPlacementBox({
        x: Math.min(point.x, placement.current.x),
        y: Math.min(point.y, placement.current.y),
        width: Math.abs(point.x - placement.current.x),
        height: Math.abs(point.y - placement.current.y),
      });
    }
    if (drawing.current) {
      const point = coordinate(e);
      draftStroke.current.push(point);
      setStroke([...draftStroke.current]);
    }
    if (gesture.current) {
      const g = gesture.current;
      g.moved ||= Math.hypot(e.clientX - g.clientX, e.clientY - g.clientY) > 3;
      if (!g.moved) return;
      const dx = (e.clientX - g.clientX) / scale;
      const dy = (e.clientY - g.clientY) / scale;
      if (g.resize && (g.a.signatureSource || g.a.kind === 'signature')) {
        const horizontal = dx / g.a.width,
          vertical = dy / g.a.height;
        const delta = Math.abs(horizontal) > Math.abs(vertical) ? horizontal : vertical;
        const maximum = Math.min(
          (pageWidth - g.a.x) / g.a.width,
          (pageHeight - g.a.y) / g.a.height,
        );
        const minimum = Math.min(
          maximum,
          Math.max(24 / g.a.width, 12 / g.a.height, g.a.kind === 'signature' ? 6 / g.a.size : 0),
        );
        const factor = Math.max(minimum, Math.min(maximum, 1 + delta));
        setDragAnnotation({
          ...g.a,
          width: g.a.width * factor,
          height: g.a.height * factor,
          ...(g.a.kind === 'signature' ? { size: g.a.size * factor } : {}),
        });
        return;
      }
      setDragAnnotation(
        g.resize
          ? {
              ...g.a,
              width: Math.max(12, Math.min(pageWidth - g.a.x, g.a.width + dx)),
              height: Math.max(12, Math.min(pageHeight - g.a.y, g.a.height + dy)),
            }
          : {
              ...g.a,
              x: Math.max(0, Math.min(pageWidth - g.a.width, g.a.x + dx)),
              y: Math.max(0, Math.min(pageHeight - g.a.height, g.a.y + dy)),
            },
      );
    }
  }
  function pointerUp() {
    pan.current = null;
    if (placement.current) {
      const p = placement.current;
      const width = Math.abs(p.endX - p.x),
        height = Math.abs(p.endY - p.y);
      const dragged = width > 4 || height > 4;
      addAnnotation(
        p.kind,
        dragged ? Math.min(p.x, p.endX) : p.x,
        dragged ? Math.min(p.y, p.endY) : p.y,
        undefined,
        undefined,
        dragged ? { width: Math.max(12, width), height: Math.max(12, height) } : undefined,
      );
      placement.current = null;
      setPlacementBox(null);
    }
    if (drawing.current && pageModel) {
      const points = draftStroke.current;
      if (points.length > 1) {
        const x = Math.min(...points.map((p) => p.x)),
          y = Math.min(...points.map((p) => p.y));
        const a: Annotation = {
          id: crypto.randomUUID(),
          pageId: pageModel.id,
          kind: 'draw',
          x,
          y,
          width: Math.max(1, Math.max(...points.map((p) => p.x)) - x),
          height: Math.max(1, Math.max(...points.map((p) => p.y)) - y),
          text: '',
          size: 2,
          color,
          opacity: 1,
          points: points.map((p) => ({ x: p.x - x, y: p.y - y })),
        };
        commit({ ...state, annotations: [...state.annotations, a] });
        setSelectedId(a.id);
      }
      drawing.current = false;
      draftStroke.current = [];
      setStroke([]);
    }
    if (gesture.current) {
      const completed = gesture.current;
      if (completed.moved && dragAnnotation) updateAnnotation(dragAnnotation.id, dragAnnotation);
      else if (
        !completed.moved &&
        !completed.resize &&
        ['text', 'signature'].includes(completed.a.kind)
      )
        editAnnotation(completed.a);
    }
    gesture.current = null;
    setDragAnnotation(null);
  }
  function editAnnotation(a: Annotation) {
    annotationEditGroup.current = crypto.randomUUID();
    setInlineAnnotation(a.id);
    setSelectedId(a.id);
    setOriginalSelection(null);
    if (mode === 'text' || mode === 'signature') setMode('select');
  }
  function beginMove(e: React.PointerEvent, a: Annotation, resize = false) {
    if (busy) return;
    if (
      !resize &&
      ['original-text', 'text', 'signature'].includes(mode) &&
      ['text', 'signature'].includes(a.kind)
    ) {
      e.preventDefault();
      e.stopPropagation();
      editAnnotation(a);
      return;
    }
    if (mode === 'erase' && !busy) {
      e.stopPropagation();
      commit({ ...state, annotations: state.annotations.filter((item) => item.id !== a.id) });
      setSelectedId('');
      return;
    }
    if (mode !== 'select' || busy) return;
    e.stopPropagation();
    e.preventDefault();
    pageArea.current?.setPointerCapture(e.pointerId);
    setSelectedId(a.id);
    setOriginalSelection(null);
    gesture.current = { id: a.id, clientX: e.clientX, clientY: e.clientY, a, resize, moved: false };
    setPropertiesTab('style');
  }
  function addSignature(signature: SignatureResult) {
    if (!pageModel || busy) return;
    const factor = Math.min(
      1,
      260 / signature.width,
      110 / signature.height,
      (pageWidth * 0.8) / signature.width,
      (pageHeight * 0.5) / signature.height,
    );
    const width = signature.width * factor,
      height = signature.height * factor;
    const rect = pageArea.current?.getBoundingClientRect(),
      viewport = scrollArea.current?.getBoundingClientRect();
    const centerY =
      rect && viewport
        ? ((Math.max(rect.top, viewport.top) + Math.min(rect.bottom, viewport.bottom)) / 2 -
            rect.top) /
          scale
        : pageHeight / 2;
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      pageId: pageModel.id,
      kind: signature.source === 'type' ? 'signature' : 'image',
      signatureSource: signature.source,
      x: Math.max(0, (pageWidth - width) / 2),
      y: Math.max(0, Math.min(pageHeight - height, centerY - height / 2)),
      width,
      height,
      opacity: 1,
      text:
        signature.source === 'type'
          ? signature.text
          : signature.source === 'draw'
            ? 'Drawn signature'
            : 'Uploaded signature',
      color: signature.source === 'type' ? signature.color : '#202522',
      size: signature.source === 'type' ? signature.size * factor : 2,
      ...(signature.source === 'type' ? { font: signature.font } : { dataUrl: signature.dataUrl }),
    };
    const current = stateRef.current;
    commit({ ...current, annotations: [...current.annotations, annotation] });
    setSelectedId(annotation.id);
    setOriginalSelection(null);
    setInlineAnnotation('');
    setMode('select');
    setPropertiesTab('style');
    if (window.innerWidth >= 1000) setProperties(true);
  }
  async function addImage(file?: File) {
    if (!file) return;
    try {
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024)
        throw new Error('Choose a JPG or PNG image smaller than 10 MB.');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      addAnnotation('image', 50, 100, dataUrl, image.width / image.height);
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  function rotatePage(angle = 90) {
    if (!pageModel) return;
    if (state.annotations.some((a) => a.pageId === pageModel.id)) {
      setError(
        'Export your annotations and reopen the exported PDF before rotating this page. This keeps every mark aligned.',
      );
      return;
    }
    commit({
      ...state,
      pages: state.pages.map((p, i) =>
        i === pageIndex ? { ...p, rotation: (p.rotation + angle + 360) % 360 } : p,
      ),
    });
  }
  function movePage(direction: number) {
    if (pageIndex + direction < 0 || pageIndex + direction >= state.pages.length) return;
    const next = [...state.pages];
    [next[pageIndex], next[pageIndex + direction]] = [next[pageIndex + direction], next[pageIndex]];
    commit({ ...state, pages: next });
    setPageIndex(pageIndex + direction);
  }
  function duplicatePage() {
    if (!pageModel) return;
    const id = crypto.randomUUID();
    const next = [...state.pages];
    next.splice(pageIndex + 1, 0, { ...pageModel, id });
    commit({
      ...state,
      pages: next,
      textChanges: { ...state.textChanges, [id]: { ...state.textChanges?.[pageModel.id] } },
      annotations: [
        ...state.annotations,
        ...state.annotations
          .filter((a) => a.pageId === pageModel.id)
          .map((a) => ({
            ...a,
            id: crypto.randomUUID(),
            pageId: id,
            text:
              a.kind === 'field' || a.kind === 'checkbox'
                ? `${a.text}_copy_${id.slice(0, 5)}`
                : a.text,
          })),
      ],
    });
    setPageIndex(pageIndex + 1);
  }
  function removePage() {
    if (!pageModel || state.pages.length <= 1) return;
    commit({
      ...state,
      pages: state.pages.filter((_, i) => i !== pageIndex),
      annotations: state.annotations.filter((a) => a.pageId !== pageModel.id),
    });
    setSelectedId('');
  }
  function addPage() {
    const page: PageModel = {
      id: crypto.randomUUID(),
      sourceIndex: null,
      rotation: 0,
      width: 595,
      height: 842,
    };
    const pages = [...state.pages];
    pages.splice(pageIndex + 1, 0, page);
    commit({ ...state, pages });
    setPageIndex(pageIndex + 1);
  }
  async function findText() {
    if (!doc || !search.trim()) {
      setSearchMatches([]);
      return;
    }
    setSearching(true);
    try {
      const found = [];
      for (const [i, p] of state.pages.entries()) {
        if (p.sourceIndex !== null) {
          const content = await (await doc.getPage(p.sourceIndex + 1)).getTextContent();
          if (
            content.items
              .map((item) => ('str' in item ? item.str : ''))
              .join(' ')
              .toLowerCase()
              .includes(search.toLowerCase())
          )
            found.push(i);
        }
      }
      setSearchMatches(found);
      if (found.length) setPageIndex(found[0]);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSearching(false);
    }
  }
  function setFormValue(field: string, value: FormValue) {
    commit({ ...state, formValues: { ...state.formValues, [field]: value } });
  }
  const customFields: Field[] = state.annotations
    .filter((a) => a.kind === 'field' || a.kind === 'checkbox')
    .map((a) => ({
      name: a.text,
      type: a.kind === 'checkbox' ? 'checkbox' : 'text',
      value: state.formValues[a.text] ?? (a.kind === 'checkbox' ? false : ''),
      required: !!a.required,
      readonly: false,
    }));
  const allFields = [...fields, ...customFields];
  return (
    <main id="main" className="editor-app">
      <header className="editor-header">
        <div className="editor-header-left">
          <Logo />
          <span className="header-divider" />
          <Link href="/tools" className="icon-button" aria-label="Back to all tools">
            <ArrowLeft size={18} />
          </Link>
          <div className="editor-file-title">
            <input
              aria-label="Document name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                editVersion.current++;
                setDirty(true);
              }}
            />
            <span>
              {busy ||
                (!bytes
                  ? 'Your next document starts here'
                  : autosave.phase === 'saved'
                    ? 'All changes saved'
                    : autosave.phase === 'uploading'
                      ? 'Uploading PDF…'
                      : autosave.phase === 'error'
                        ? 'Not saved — retry'
                        : 'Saving changes…')}
            </span>
          </div>
        </div>
        <div className="editor-header-right">
          <button
            className="button secondary cloud-save-button"
            aria-label="Save to cloud"
            title="Save your workspace now"
            disabled={!bytes || !!busy || savingNow}
            onClick={() => void save()}
          >
            {savingNow ? <Loader2 size={16} className="spin" /> : <CloudUpload size={16} />}
            <span>
              {savingNow ? 'Saving…' : autosave.phase === 'error' ? 'Retry saving' : 'Save now'}
            </span>
          </button>
          <button
            className="button primary"
            disabled={!bytes || !!busy}
            onClick={() => exportFile()}
          >
            {busy ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
            <span>Download PDF</span>
          </button>
        </div>
      </header>
      {editorExit.dialog}
      <dialog ref={signInDialog} className="confirm-dialog" aria-labelledby="cloud-signin-heading">
        <header className="dialog-header">
          <h2 id="cloud-signin-heading">Keep this document in your account.</h2>
          <button
            className="icon-button"
            aria-label="Close save dialog"
            onClick={() => signInDialog.current?.close()}
          >
            <X size={18} />
          </button>
        </header>
        <div className="dialog-body">
          <p>
            {user
              ? 'You’re signed in. Your document is saved to your account automatically.'
              : 'Your guest workspace expires after 24 hours. Sign in to keep it beyond 24 hours and open it on any device. Sign-in opens in a new tab.'}
          </p>
        </div>
        <footer className="dialog-footer">
          <button className="button secondary" onClick={() => signInDialog.current?.close()}>
            Keep editing
          </button>
          {user ? (
            <button className="button primary" onClick={() => void save()}>
              Save PDF
            </button>
          ) : (
            <Link
              className="button primary"
              href="/account?next=%2Fdashboard%3Fview%3Dfiles"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign in to keep <ArrowRight size={16} />
            </Link>
          )}
        </footer>
      </dialog>

      {(!bytes || !doc || !pageModel) && busy ? (
        <EditorContentSkeleton sidebar={sidebar} properties={properties} />
      ) : !bytes || !doc || !pageModel ? (
        <div className="editor-empty">
          <span className="eyebrow">A LITTLE SPACE TO MAKE IT YOURS</span>
          <h1>
            Your next great document
            <br />
            <em>starts right here.</em>
          </h1>
          <p>Add a PDF to open your workspace.</p>
          {params.get('cloud') && !user && (
            <Link className="text-link" href="/account?next=%2Fdashboard%3Fview%3Dfiles">
              Sign in to open your cloud files <ArrowRight size={16} />
            </Link>
          )}
          <UploadArea
            onFiles={async (files) => {
              const f = files[0];
              if (!f) return;
              if (f.size > MAX_FILE_SIZE || !/\.pdf$/i.test(f.name)) {
                setError('Choose a PDF smaller than 50 MB.');
                return;
              }
              await openBytes(new Uint8Array(await f.arrayBuffer()), f.name);
            }}
            busy={!!busy}
          />
          <button
            className="text-link"
            disabled={!!busy}
            onClick={async () => {
              setBusy('Preparing your sample…');
              try {
                const { createSample } = await import('@/lib/sample');
                await openBytes(await createSample(), 'Studio North — Proposal.pdf');
              } catch (e) {
                setError(friendlyError(e));
                setBusy('');
              }
            }}
          >
            Try a sample document <ArrowRight size={16} />
          </button>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          {signatureTab && (
            <SignatureDialog
              initialTab={signatureTab}
              onClose={() => setSignatureTab(null)}
              onAdd={addSignature}
            />
          )}
          <EditorToolbar
            mode={signatureTab ? 'signature' : mode}
            signature={(tab) => {
              setInlineAnnotation('');
              setOriginalSelection(null);
              setSignatureTab(tab);
            }}
            choose={(next) => {
              setMode(next);
              setOriginalSelection(null);
              setInlineAnnotation('');
              setSelectedId('');
              setPropertiesTab('style');
              if (['signature', 'comment', 'link', 'whiteout', 'erase'].includes(next))
                setProperties(true);
            }}
            busy={!!busy}
            canUndo={history.index > 0}
            canRedo={history.index < history.states.length - 1}
            undo={undo}
            redo={redo}
            editText={() => void enableOriginalText()}
            image={() => imageInput.current?.click()}
            more={[
              {
                label: 'Text field',
                onClick: () => {
                  setMode('field');
                  setSelectedId('');
                  setPropertiesTab('style');
                },
              },
              {
                label: 'Checkbox',
                onClick: () => {
                  setMode('checkbox');
                  setSelectedId('');
                  setPropertiesTab('style');
                },
              },
              {
                label: 'Fill existing fields',
                onClick: () => {
                  setMode('form-fill');
                  setProperties(true);
                  setPropertiesTab('form');
                },
              },
              {
                label: 'Review annotations',
                onClick: () => {
                  setMode('select');
                  setProperties(true);
                  setPropertiesTab('annotations');
                },
              },
              {
                label: 'Find text',
                onClick: () => {
                  setProperties(true);
                  setPropertiesTab('find');
                },
              },
              { label: 'Add a password', onClick: () => void exportFile('protect-pdf') },
              {
                label: properties ? 'Hide properties' : 'Show properties',
                onClick: () => setProperties(!properties),
              },
            ]}
            layout={[
              { label: 'Rotate page clockwise', onClick: () => rotatePage() },
              { label: 'Rotate page counterclockwise', onClick: () => rotatePage(-90) },
              { label: 'Turn page upside down', onClick: () => rotatePage(180) },
              { label: 'Fit to width', onClick: () => setZoom(100) },
              {
                label: sidebar ? 'Hide page thumbnails' : 'Show page thumbnails',
                onClick: () => setSidebar(!sidebar),
              },
            ]}
            manage={[
              { label: 'Add a blank page', onClick: addPage },
              { label: 'Duplicate page', onClick: duplicatePage },
              {
                label: 'Move page earlier',
                onClick: () => movePage(-1),
                disabled: pageIndex === 0,
              },
              {
                label: 'Move page later',
                onClick: () => movePage(1),
                disabled: pageIndex === state.pages.length - 1,
              },
              { label: 'Delete page', onClick: removePage, disabled: state.pages.length <= 1 },
              { label: 'Split or extract pages', onClick: () => void exportFile('split-pdf') },
              { label: 'Merge another PDF', onClick: () => void exportFile('merge-pdf') },
            ]}
          />
          <div
            className={`editor-body ${sidebar ? '' : 'hide-pages'} ${properties ? '' : 'hide-properties'}`}
          >
            <aside className="page-sidebar">
              <div className="sidebar-heading">
                <h2>
                  Pages <span>{state.pages.length}</span>
                </h2>
                <button className="icon-button" aria-label="Add a blank page" onClick={addPage}>
                  <Plus size={16} />
                </button>
              </div>
              <div className="page-thumbnails">
                {state.pages.map((p, i) => (
                  <button
                    key={p.id}
                    className={`page-thumbnail ${i === pageIndex ? 'active' : ''}`}
                    onClick={() => {
                      setPageIndex(i);
                      setSelectedId('');
                    }}
                    aria-label={`Go to page ${i + 1}`}
                    aria-current={i === pageIndex ? 'page' : undefined}
                  >
                    <div className="thumbnail-page">
                      {p.sourceIndex !== null ? (
                        <PdfCanvas
                          document={doc}
                          page={p.sourceIndex + 1}
                          width={86}
                          aspectRatio={p.rotation % 180 ? p.height / p.width : p.width / p.height}
                          rotation={p.rotation}
                          decorative
                          lazy
                        />
                      ) : (
                        <div className="blank-thumbnail" />
                      )}
                      {state.annotations.some((a) => a.pageId === p.id) && (
                        <span className="thumbnail-edited" title="Has annotations" />
                      )}
                    </div>
                    <span>{i + 1}</span>
                  </button>
                ))}
              </div>
              <div className="page-actions">
                <button
                  className="icon-button"
                  title="Move page up"
                  aria-label="Move page up"
                  disabled={pageIndex === 0}
                  onClick={() => movePage(-1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  title="Move page down"
                  aria-label="Move page down"
                  disabled={pageIndex === state.pages.length - 1}
                  onClick={() => movePage(1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="icon-button"
                  title="Rotate page"
                  aria-label="Rotate page"
                  onClick={() => rotatePage()}
                >
                  <RotateCw size={16} />
                </button>
                <button
                  className="icon-button"
                  title="Duplicate page"
                  aria-label="Duplicate page"
                  onClick={duplicatePage}
                >
                  <Copy size={15} />
                </button>
                <button
                  className="icon-button danger"
                  title="Delete page"
                  aria-label="Delete page"
                  disabled={state.pages.length <= 1}
                  onClick={removePage}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </aside>
            <div
              className="editor-canvas-area"
              ref={scrollArea}
              tabIndex={0}
              role="region"
              aria-label="Document canvas"
              aria-describedby="canvas-instruction"
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget || e.key !== 'Enter' || busy) return;
                if (mode === 'image') imageInput.current?.click();
                else if (
                  mode !== 'select' &&
                  mode !== 'form-fill' &&
                  mode !== 'original-text' &&
                  mode !== 'draw' &&
                  mode !== 'erase'
                ) {
                  e.preventDefault();
                  addAnnotation(mode, 60, 60);
                }
              }}
            >
              <div className="canvas-instruction" id="canvas-instruction">
                {mode === 'select' ? (
                  'Drag the page to move around. Select an added item to move or edit it.'
                ) : mode === 'original-text' ? (
                  pageModel.sourceIndex === null ? (
                    'This is a blank page. Choose Add Text to write on it.'
                  ) : preparedText.error ? (
                    <span role="alert">
                      {preparedText.error}{' '}
                      <button className="text-link" onClick={preparedText.retry}>
                        Retry preparing text
                      </button>
                    </span>
                  ) : !preparedText.ready ? (
                    <span role="status">Preparing editable text on this page…</span>
                  ) : !textInspection?.blocks.some(
                      (block) => block.page === pageModel.sourceIndex,
                    ) ? (
                    'No editable text was found on this page. You can still use Add Text.'
                  ) : (
                    'Click text and type directly on the page. Ctrl/⌘ + mouse wheel or pinch to zoom.'
                  )
                ) : mode === 'erase' ? (
                  'Click an added item to remove it. Undo restores removed items.'
                ) : mode === 'whiteout' ? (
                  'Drag over an area to cover it. Covered content remains in the PDF; this is not secure redaction.'
                ) : mode === 'draw' ? (
                  'Draw directly on the page. Use a stylus, mouse, or your finger.'
                ) : mode === 'form-fill' ? (
                  'Complete your fields in the Form panel, then export.'
                ) : (
                  'Click on the page, or focus the canvas and press Enter, to add your selected tool.'
                )}
              </div>
              <div
                className="editor-page-wrap"
                style={{ width: canvasWidth, minHeight: pageHeight * scale }}
              >
                <div
                  ref={pageArea}
                  className={`editable-page mode-${mode}`}
                  style={{ width: canvasWidth, height: pageHeight * scale }}
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={() => {
                    pan.current = null;
                    placement.current = null;
                    setPlacementBox(null);
                    drawing.current = false;
                    setStroke([]);
                    gesture.current = null;
                    setDragAnnotation(null);
                  }}
                >
                  {pageModel.sourceIndex !== null && (
                    <PdfCanvas
                      document={doc}
                      page={pageModel.sourceIndex + 1}
                      rotation={pageModel.rotation}
                      width={canvasWidth}
                      aspectRatio={pageWidth / pageHeight}
                      onPreviewError={setPreviewError}
                    />
                  )}
                  {preparedText.inspection && pageModel.sourceIndex !== null && (
                    <InlinePdfText
                      key={pageModel.id}
                      document={doc}
                      bytes={bytes}
                      name={name}
                      previewClient={interactivePreview}
                      page={pageModel}
                      width={canvasWidth}
                      inspection={preparedText.inspection}
                      selected={originalSelection?.id || ''}
                      changes={state.textChanges?.[pageModel.id] || {}}
                      enabled={mode === 'original-text' || (!!textInspection && mode === 'select')}
                      disabled={!!busy}
                      update={updateOriginalText}
                      select={(block) => {
                        setMode('original-text');
                        setInlineAnnotation('');
                        setOriginalSelection(block);
                        setSelectedId('');
                        setPropertiesTab('style');
                      }}
                      undo={undo}
                      redo={redo}
                      save={() => void save()}
                    />
                  )}
                  {state.annotations
                    .filter((a) => a.pageId === pageModel.id)
                    .map((original) => {
                      const a = dragAnnotation?.id === original.id ? dragAnnotation : original;
                      return (
                        <div
                          key={a.id}
                          className={`annotation annotation-${a.kind} ${selectedId === a.id ? 'selected' : ''}`}
                          style={{
                            left: a.x * scale,
                            top: a.y * scale,
                            width: a.width * scale,
                            height: a.height * scale,
                            fontSize: a.size * scale,
                            ...(a.font ? (documentFontStyle(a.font) as CSSProperties) : {}),
                            color: a.color,
                          }}
                          onPointerDown={(e) => beginMove(e, a)}
                          onDoubleClick={() => {
                            if (
                              !busy &&
                              ['select', 'original-text', 'text', 'signature'].includes(mode) &&
                              ['text', 'signature'].includes(a.kind)
                            )
                              editAnnotation(a);
                          }}
                          tabIndex={inlineAnnotation === a.id ? undefined : 0}
                          role={inlineAnnotation === a.id ? undefined : 'button'}
                          aria-label={`${a.signatureSource ? 'signature' : a.kind}: ${a.signatureSource ? a.text : a.kind === 'link' ? a.url || 'Set link address' : a.kind === 'comment' ? a.text || 'Write a comment' : a.kind === 'text' || a.kind === 'signature' || a.kind === 'field' || a.kind === 'checkbox' ? a.text : 'annotation'}`}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === 'Enter') {
                              if (
                                !busy &&
                                ['select', 'original-text', 'text', 'signature'].includes(mode) &&
                                ['text', 'signature'].includes(a.kind)
                              ) {
                                e.preventDefault();
                                editAnnotation(a);
                                return;
                              }
                              if (mode === 'erase') {
                                commit({
                                  ...state,
                                  annotations: state.annotations.filter((item) => item.id !== a.id),
                                });
                                setSelectedId('');
                                return;
                              }
                              setSelectedId(a.id);
                              setProperties(true);
                              setPropertiesTab('style');
                            }
                            if (
                              ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
                            ) {
                              e.preventDefault();
                              const step = e.shiftKey ? 10 : 1;
                              const dx =
                                e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                              const dy =
                                e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
                              updateAnnotation(a.id, {
                                x: Math.max(0, Math.min(pageWidth - a.width, a.x + dx)),
                                y: Math.max(0, Math.min(pageHeight - a.height, a.y + dy)),
                              });
                            }
                          }}
                        >
                          {(a.kind === 'text' || a.kind === 'signature') &&
                            (inlineAnnotation === a.id ? (
                              <textarea
                                className="inline-annotation-input"
                                aria-label="Edit added text"
                                autoFocus
                                value={a.text}
                                style={{
                                  fontSize: a.size * scale,
                                  color: a.color,
                                  ...(a.font ? (documentFontStyle(a.font) as CSSProperties) : {}),
                                }}
                                onPointerDown={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  updateAnnotation(
                                    a.id,
                                    { text: event.target.value },
                                    annotationEditGroup.current,
                                  )
                                }
                                onBlur={() => setInlineAnnotation('')}
                                onKeyDown={(event) => {
                                  event.stopPropagation();
                                  if (
                                    (event.ctrlKey || event.metaKey) &&
                                    event.key.toLowerCase() === 'z'
                                  ) {
                                    event.preventDefault();
                                    if (event.shiftKey) redo();
                                    else undo();
                                    annotationEditGroup.current = crypto.randomUUID();
                                  }
                                  if (
                                    (event.ctrlKey || event.metaKey) &&
                                    event.key.toLowerCase() === 's'
                                  ) {
                                    event.preventDefault();
                                    void save();
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                }}
                              />
                            ) : (
                              <span className="annotation-content" style={{ opacity: a.opacity }}>
                                {a.text}
                              </span>
                            ))}
                          {(a.kind === 'highlight' || a.kind === 'whiteout') && (
                            <span
                              className="annotation-fill"
                              style={{ background: a.color, opacity: a.opacity }}
                            />
                          )}
                          {(a.kind === 'rectangle' || a.kind === 'ellipse') && (
                            <span
                              className="annotation-fill"
                              style={{
                                border: `${1.5 * scale}px solid ${a.color}`,
                                opacity: a.opacity,
                                borderRadius: a.kind === 'ellipse' ? '50%' : undefined,
                              }}
                            />
                          )}
                          {['cross', 'check', 'line'].includes(a.kind) && (
                            <svg
                              className="drawn-annotation"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                              style={{ opacity: a.opacity }}
                            >
                              <path
                                d={
                                  a.kind === 'cross'
                                    ? 'M12 12L88 88M12 88L88 12'
                                    : a.kind === 'check'
                                      ? 'M10 52L38 82L90 15'
                                      : 'M0 50H100'
                                }
                                fill="none"
                                stroke={a.color}
                                strokeWidth={a.size * scale}
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                          )}
                          {a.kind === 'comment' && (
                            <span
                              className="annotation-comment-icon"
                              title={a.text || 'Write a comment'}
                              style={{ opacity: a.opacity }}
                            >
                              <MessageSquare size={Math.min(a.width, a.height) * scale * 0.8} />
                            </span>
                          )}
                          {a.kind === 'link' && (
                            <span
                              className="annotation-link-area"
                              title={a.url || 'Set link address'}
                            >
                              <Link2 size={14} />
                            </span>
                          )}
                          {a.kind === 'image' && (
                            <img
                              src={a.dataUrl}
                              alt={a.signatureSource ? 'Your signature' : 'Document annotation'}
                              draggable={false}
                            />
                          )}
                          {a.kind === 'draw' && (
                            <svg
                              className="drawn-annotation"
                              viewBox={`0 0 ${a.width} ${a.height}`}
                              preserveAspectRatio="none"
                              style={{ opacity: a.opacity }}
                            >
                              <polyline
                                points={a.points?.map((p) => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke={a.color}
                                strokeWidth={a.size}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          {a.kind === 'field' && (
                            <span className="annotation-field">
                              {String(state.formValues[a.text] || a.text)}
                              {a.required ? ' *' : ''}
                            </span>
                          )}
                          {a.kind === 'checkbox' && (
                            <span className="annotation-checkbox">
                              {state.formValues[a.text] ? (
                                <Check size={a.width * scale * 0.75} />
                              ) : null}
                            </span>
                          )}
                          {selectedId === a.id && (
                            <>
                              <span className="annotation-tag">
                                {a.signatureSource
                                  ? 'signature'
                                  : a.kind === 'field'
                                    ? 'Form field'
                                    : a.kind}
                              </span>
                              {a.kind !== 'draw' && (
                                <span
                                  className="resize-handle"
                                  aria-hidden="true"
                                  onPointerDown={(e) => beginMove(e, a, true)}
                                />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  {placementBox && (
                    <div
                      className={`placement-preview ${mode === 'ellipse' ? 'ellipse' : ''}`}
                      aria-hidden="true"
                      style={{
                        left: placementBox.x * scale,
                        top: placementBox.y * scale,
                        width: placementBox.width * scale,
                        height: placementBox.height * scale,
                      }}
                    />
                  )}
                  {!!stroke.length && (
                    <svg className="drawing-overlay" viewBox={`0 0 ${pageWidth} ${pageHeight}`}>
                      <polyline
                        points={stroke.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div className="canvas-bottom-space" />
            </div>
            <aside className="properties-sidebar" id="properties-panel">
              <div className="properties-tabs">
                <button
                  className={propertiesTab === 'style' ? 'active' : ''}
                  onClick={() => setPropertiesTab('style')}
                >
                  Properties
                </button>
                <button
                  className={propertiesTab === 'form' ? 'active' : ''}
                  onClick={() => {
                    setPropertiesTab('form');
                    setMode('form-fill');
                  }}
                >
                  Form {allFields.length ? `(${allFields.length})` : ''}
                </button>
                <button
                  className={propertiesTab === 'find' ? 'active' : ''}
                  aria-label="Search document"
                  onClick={() => setPropertiesTab('find')}
                >
                  <Search size={15} />
                </button>
              </div>
              <div className="properties-content">
                {propertiesTab === 'annotations' ? (
                  <>
                    <h2>Annotations</h2>
                    <p className="panel-description">
                      Select an item to jump to its page and edit it.
                    </p>
                    <div className="editor-annotation-list">
                      {state.annotations.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setPageIndex(state.pages.findIndex((p) => p.id === a.pageId));
                            setSelectedId(a.id);
                            setMode('select');
                            setPropertiesTab('style');
                          }}
                        >
                          <strong>
                            {a.kind === 'comment'
                              ? a.text || 'Empty comment'
                              : a.kind === 'link'
                                ? a.url || 'Link address needed'
                                : a.kind}
                          </strong>
                          <small>Page {state.pages.findIndex((p) => p.id === a.pageId) + 1}</small>
                        </button>
                      ))}
                    </div>
                    {!state.annotations.length && (
                      <p className="panel-description">
                        Your added text, notes, links, and marks will appear here.
                      </p>
                    )}
                  </>
                ) : propertiesTab === 'form' ? (
                  <>
                    <h2>Fill in the details.</h2>
                    <p className="panel-description">
                      Values are applied to your downloaded PDF. The original page preview remains
                      unchanged.
                    </p>
                    {allFields.length ? (
                      allFields.map((f) =>
                        f.type === 'select' ? (
                          <Dropdown
                            key={f.name}
                            label={`${f.name}${f.required ? ' *' : ''}`}
                            disabled={f.readonly}
                            value={String(state.formValues[f.name] || '')}
                            onValueChange={(value) => setFormValue(f.name, value)}
                            options={[
                              { value: '', label: 'Choose an option' },
                              ...(('options' in f ? f.options : []) || []).map((option) => ({
                                value: option,
                                label: option,
                              })),
                            ]}
                          />
                        ) : (
                          <label
                            className={`form-property ${f.type === 'checkbox' ? 'checkbox-label' : ''}`}
                            key={f.name}
                          >
                            {f.type === 'checkbox' ? (
                              <>
                                <input
                                  type="checkbox"
                                  disabled={f.readonly}
                                  checked={!!state.formValues[f.name]}
                                  onChange={(e) => setFormValue(f.name, e.target.checked)}
                                />
                                <span>
                                  {f.name}
                                  {f.required ? ' *' : ''}
                                </span>
                              </>
                            ) : (
                              <>
                                <span>
                                  {f.name}
                                  {f.required ? ' *' : ''}
                                </span>
                                {f.type === 'multiline' ? (
                                  <textarea
                                    disabled={f.readonly}
                                    value={String(state.formValues[f.name] || '')}
                                    onChange={(e) => setFormValue(f.name, e.target.value)}
                                  />
                                ) : (
                                  <input
                                    disabled={f.readonly}
                                    value={String(state.formValues[f.name] || '')}
                                    onChange={(e) => setFormValue(f.name, e.target.value)}
                                  />
                                )}
                              </>
                            )}
                          </label>
                        ),
                      )
                    ) : (
                      <div className="panel-empty">
                        <TextCursorInput size={30} />
                        <p>No fillable fields yet.</p>
                        <button
                          className="text-link"
                          onClick={() => {
                            setMode('field');
                            setPropertiesTab('style');
                          }}
                        >
                          Add a text field <Plus size={15} />
                        </button>
                      </div>
                    )}
                    <label className="checkbox-label flatten-option">
                      <input
                        type="checkbox"
                        checked={flatten}
                        onChange={(e) => setFlatten(e.target.checked)}
                      />
                      <span>
                        Flatten fields when exporting
                        <small>Makes completed fields uneditable.</small>
                      </span>
                    </label>
                  </>
                ) : propertiesTab === 'find' ? (
                  <>
                    <h2>Find your place.</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void findText();
                      }}
                    >
                      <label>
                        Search original document text
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="A word or phrase…"
                        />
                      </label>
                      <button className="button dark full" disabled={searching}>
                        {searching ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                        Find pages
                      </button>
                    </form>
                    <p className="panel-description">
                      {searchMatches.length
                        ? `Found on ${searchMatches.length} page(s).`
                        : 'Matching pages will appear here. Scanned images need OCR.'}
                    </p>
                    <div className="search-page-results">
                      {searchMatches.map((i) => (
                        <button
                          className="button secondary"
                          key={i}
                          onClick={() => setPageIndex(i)}
                        >
                          Page {i + 1}
                          <ArrowRight size={14} />
                        </button>
                      ))}
                    </div>
                  </>
                ) : mode === 'original-text' && originalSelection ? (
                  <>
                    <h2>Text appearance</h2>
                    <p className="panel-description">
                      Type directly on the page. Drag the move handle to reposition this text. Use
                      Tab or Shift+Tab to move between text blocks.
                    </p>
                    <FontPicker
                      key={originalSelection.id}
                      label="Text font"
                      value={
                        (
                          state.textChanges?.[pageModel.id]?.[originalSelection.id] ||
                          defaultTextChange(originalSelection)
                        ).font
                      }
                      original={originalSelection}
                      onChange={(font) => updateOriginalText(originalSelection, { font })}
                    />
                    <label>
                      Text size
                      <PdfTextSizeInput
                        key={originalSelection.id}
                        block={originalSelection}
                        size={
                          (
                            state.textChanges?.[pageModel.id]?.[originalSelection.id] ||
                            originalSelection
                          ).size
                        }
                        onChange={(size) => updateOriginalText(originalSelection, { size })}
                      />
                    </label>
                    <label>
                      Text color
                      <input
                        type="color"
                        value={
                          resolvedTextChange(
                            originalSelection,
                            state.textChanges?.[pageModel.id]?.[originalSelection.id],
                          ).color
                        }
                        onChange={(event) =>
                          updateOriginalText(originalSelection, { color: event.target.value })
                        }
                      />
                    </label>
                    <p className="panel-description">
                      The original font is preserved where available. Missing characters use a
                      matching font automatically.
                    </p>
                  </>
                ) : selected ? (
                  <>
                    <div className="selected-heading">
                      <h2>
                        {selected.signatureSource
                          ? 'Signature'
                          : selected.kind === 'field'
                            ? 'Text field'
                            : selected.kind.charAt(0).toUpperCase() + selected.kind.slice(1)}
                      </h2>
                      <span className="status-label">SELECTED</span>
                    </div>
                    {['text', 'signature', 'field', 'checkbox', 'comment'].includes(
                      selected.kind,
                    ) && (
                      <label>
                        {selected.kind === 'field' || selected.kind === 'checkbox'
                          ? 'Unique field name'
                          : selected.kind === 'comment'
                            ? 'Comment'
                            : 'Your text'}
                        <textarea
                          rows={selected.kind === 'text' || selected.kind === 'comment' ? 4 : 2}
                          maxLength={selected.kind === 'comment' ? 4000 : undefined}
                          value={selected.text}
                          onChange={(e) => updateAnnotation(selected.id, { text: e.target.value })}
                        />
                      </label>
                    )}
                    {selected.kind === 'link' && (
                      <>
                        <label>
                          Link address
                          <input
                            type="url"
                            placeholder="https://example.com"
                            maxLength={2048}
                            value={selected.url || ''}
                            onChange={(e) => updateAnnotation(selected.id, { url: e.target.value })}
                          />
                        </label>
                        <p className="panel-description">
                          Use https://, http://, or mailto:. The outlined area becomes clickable in
                          the exported PDF.
                        </p>
                      </>
                    )}
                    {selected.kind === 'comment' && (
                      <p className="panel-description">
                        This note is saved as a PDF comment. Open it in a PDF reader that supports
                        comments.
                      </p>
                    )}
                    {selected.kind === 'whiteout' && (
                      <p className="panel-description">
                        This covers content visually. The original content can still be recovered;
                        use a dedicated redaction tool for sensitive information.
                      </p>
                    )}
                    {['text', 'signature'].includes(selected.kind) && (
                      <FontPicker
                        key={selected.id}
                        value={
                          selected.font ||
                          (selected.kind === 'signature' ? 'Times-Italic' : 'Helvetica')
                        }
                        onChange={(font) => {
                          if (font !== 'original') updateAnnotation(selected.id, { font });
                        }}
                      />
                    )}
                    {['text', 'signature', 'field'].includes(selected.kind) && (
                      <label>
                        Text size
                        <input
                          type="number"
                          min="6"
                          max="100"
                          value={selected.size}
                          onChange={(e) =>
                            updateAnnotation(selected.id, {
                              size: Math.max(6, Math.min(100, Number(e.target.value) || 6)),
                            })
                          }
                        />
                      </label>
                    )}
                    {!['field', 'checkbox', 'image', 'link'].includes(selected.kind) && (
                      <>
                        <label>Color</label>
                        <div className="color-swatches">
                          {palette.map((c) => (
                            <button
                              key={c}
                              style={{ background: c }}
                              aria-label={`Use ${c} color`}
                              aria-pressed={selected.color === c}
                              onClick={() => updateAnnotation(selected.id, { color: c })}
                            >
                              {selected.color === c && (
                                <Check size={14} color={c === '#efc95b' ? '#202522' : 'white'} />
                              )}
                            </button>
                          ))}
                          <input
                            type="color"
                            aria-label="Custom annotation color"
                            value={selected.color}
                            onChange={(e) =>
                              updateAnnotation(selected.id, { color: e.target.value })
                            }
                          />
                        </div>
                        <label>
                          Opacity <span>{Math.round(selected.opacity * 100)}%</span>
                          <input
                            type="range"
                            min=".05"
                            max="1"
                            step=".05"
                            value={selected.opacity}
                            onChange={(e) =>
                              updateAnnotation(selected.id, { opacity: Number(e.target.value) })
                            }
                          />
                        </label>
                      </>
                    )}
                    {['field', 'checkbox'].includes(selected.kind) && (
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={!!selected.required}
                          onChange={(e) =>
                            updateAnnotation(selected.id, { required: e.target.checked })
                          }
                        />
                        Required field
                      </label>
                    )}
                    <div className="two-fields">
                      <label>
                        Width
                        <input
                          type="number"
                          min="12"
                          max={pageWidth - selected.x}
                          value={Math.round(selected.width)}
                          onChange={(e) =>
                            updateAnnotation(selected.id, {
                              width: Math.max(
                                12,
                                Math.min(pageWidth - selected.x, Number(e.target.value) || 12),
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Height
                        <input
                          type="number"
                          min="12"
                          max={pageHeight - selected.y}
                          value={Math.round(selected.height)}
                          onChange={(e) =>
                            updateAnnotation(selected.id, {
                              height: Math.max(
                                12,
                                Math.min(pageHeight - selected.y, Number(e.target.value) || 12),
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="annotation-actions">
                      <button
                        className="button secondary"
                        onClick={() => {
                          const copy = {
                            ...selected,
                            id: crypto.randomUUID(),
                            x: Math.min(pageWidth - selected.width, selected.x + 12),
                            y: Math.min(pageHeight - selected.height, selected.y + 12),
                            text: ['field', 'checkbox'].includes(selected.kind)
                              ? `${selected.text}_copy`
                              : selected.text,
                          };
                          commit({ ...state, annotations: [...state.annotations, copy] });
                          setSelectedId(copy.id);
                        }}
                      >
                        <Copy size={15} />
                        Duplicate
                      </button>
                      <button
                        className="button secondary danger"
                        onClick={() => {
                          commit({
                            ...state,
                            annotations: state.annotations.filter((a) => a.id !== selectedId),
                          });
                          setSelectedId('');
                        }}
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                    <p className="panel-description">
                      Drag to position. Use the corner handle or dimensions to resize.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="properties-illustration">
                      <Settings2 size={32} strokeWidth={1.3} />
                    </span>
                    <h2>The details are yours.</h2>
                    <p className="panel-description">
                      Choose a tool, then click on your document. Select a mark to adjust its
                      appearance.
                    </p>
                    {mode === 'erase' || mode === 'whiteout' ? (
                      <p className="panel-description">
                        {mode === 'erase'
                          ? 'Click any added text, shape, note, link, or image to remove it. Original page content stays intact. Use Undo to restore an item.'
                          : 'Click or drag to add a cover. Resize it to fit the area and choose a color that matches the page. This does not permanently remove underlying text or images.'}
                      </p>
                    ) : mode === 'signature' ? (
                      <button
                        className="button secondary full"
                        onClick={() => setSignatureTab('draw')}
                      >
                        Create your signature
                      </button>
                    ) : (
                      <>
                        <label>
                          Default text size
                          <input
                            type="number"
                            min="6"
                            max="100"
                            value={textSize}
                            onChange={(e) =>
                              setTextSize(Math.max(6, Math.min(100, Number(e.target.value) || 6)))
                            }
                          />
                        </label>
                        <label>Default color</label>
                        <div className="color-swatches">
                          {palette.map((c) => (
                            <button
                              key={c}
                              style={{ background: c }}
                              aria-label={`Default color ${c}`}
                              aria-pressed={color === c}
                              onClick={() => setColor(c)}
                            >
                              {color === c && (
                                <Check size={14} color={c === '#efc95b' ? '#202522' : 'white'} />
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="editor-tips">
                      <span className="eyebrow">A LITTLE GOOD TO KNOW</span>
                      <p>
                        Add text creates annotations. Choose Edit original text to replace supported
                        PDF text directly on this page. Ctrl/⌘ + mouse wheel or pinch zooms around
                        your pointer.
                      </p>
                      <div>
                        <kbd>⌘ Z</kbd>
                        <span>Undo a change</span>
                      </div>
                      <div>
                        <kbd>⌘ S</kbd>
                        <span>Save to your account</span>
                      </div>
                      <div>
                        <kbd>ESC</kbd>
                        <span>Back to Move</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="editor-next-step">
                <span className="eyebrow">KEEP THE GOOD WORK GOING</span>
                <Dropdown
                  label="Continue with another tool"
                  hideLabel
                  placeholder="Continue with another tool…"
                  value=""
                  disabled={!!busy}
                  onValueChange={(value) => {
                    if (value) void exportFile(value);
                  }}
                  options={[
                    { value: 'edit-pdf-text', label: 'Edit original text' },
                    { value: 'protect-pdf', label: 'Add a password' },
                    { value: 'merge-pdf', label: 'Merge with another PDF' },
                    { value: 'compress-pdf', label: 'Compress this PDF' },
                    { value: 'pdf-to-jpg', label: 'Convert pages to JPG' },
                    { value: 'split-pdf', label: 'Split or extract pages' },
                    { value: 'translate-pdf', label: 'Prepare for translation' },
                  ]}
                />
              </div>
            </aside>
          </div>
          {(autosave.phase === 'error' ||
            previewError ||
            annotationFonts.error ||
            error ||
            notice) && (
            <section className="editor-notifications" aria-label="Editor notifications">
              {annotationFonts.error && (
                <div className="editor-toast error-message" role="alert">
                  <span>{annotationFonts.error}</span>
                  <button className="text-link" onClick={annotationFonts.retry}>
                    Retry fonts
                  </button>
                </div>
              )}
              {autosave.phase === 'error' && (
                <div className="editor-toast error-message" role="alert">
                  <span>{autosave.error} Your current edits remain in this tab.</span>
                  <button className="text-link" onClick={() => void save()}>
                    Retry saving
                  </button>
                </div>
              )}
              {previewError && (
                <div className="editor-toast error-message" role="alert">
                  <span>{previewError}</span>
                  <button
                    className="text-link"
                    disabled={retryingPreview}
                    onClick={() => void retryPreview()}
                  >
                    {retryingPreview ? 'Loading preview…' : 'Retry preview'}
                  </button>
                </div>
              )}
              {error && (
                <div className="editor-toast error-message" role="alert">
                  <span>{error}</span>
                  <button
                    className="icon-button"
                    aria-label="Dismiss error"
                    onClick={() => setError('')}
                  >
                    <X size={17} />
                  </button>
                </div>
              )}
              {notice && (
                <div className="editor-toast success-message" role="status">
                  <Check size={17} />
                  <span>{notice}</span>
                  <button
                    className="icon-button"
                    aria-label="Dismiss notification"
                    onClick={() => setNotice('')}
                  >
                    <X size={17} />
                  </button>
                </div>
              )}
            </section>
          )}
          <footer className="editor-statusbar">
            <button
              className="icon-button mobile-properties-toggle"
              aria-label="Toggle properties and forms"
              aria-expanded={properties}
              aria-controls="properties-panel"
              onClick={() => setProperties(!properties)}
            >
              <Settings2 size={17} />
            </button>
            <span className="editor-privacy" role="status" aria-live="polite">
              <ShieldCheck size={14} />
              {autosave.phase === 'saved'
                ? autosave.expiresAt
                  ? 'Saved for 24 hours'
                  : 'All changes saved'
                : autosave.phase === 'uploading'
                  ? 'Uploading PDF…'
                  : autosave.phase === 'error'
                    ? 'Not saved — retry saving'
                    : 'Saving changes…'}
            </span>
            {bytes && !user && autosave.expiresAt && (
              <button
                className="text-link guest-keep-file"
                onClick={() => signInDialog.current?.showModal()}
              >
                Sign in to keep
              </button>
            )}
            <div className="page-navigation">
              <button
                className="icon-button"
                aria-label="Previous page"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(pageIndex - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Page {pageIndex + 1} of {state.pages.length}
              </span>
              <button
                className="icon-button"
                aria-label="Next page"
                disabled={pageIndex >= state.pages.length - 1}
                onClick={() => setPageIndex(pageIndex + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="zoom-controls">
              <button
                className="icon-button"
                aria-label="Zoom out"
                disabled={zoom <= 50}
                onClick={() => setZoom(Math.max(50, zoom - 10))}
              >
                <Minus size={15} />
              </button>
              <button className="zoom-value" title="Fit to width" onClick={() => setZoom(100)}>
                {zoom}%
              </button>
              <button
                className="icon-button"
                aria-label="Zoom in"
                disabled={zoom >= 300}
                onClick={() => setZoom(Math.min(300, zoom + 10))}
              >
                <Plus size={15} />
              </button>
            </div>
          </footer>
        </>
      )}
      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={(e) => {
          void addImage(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <DownloadGate
        open={gateOpen}
        saved={autosave.phase === 'saved'}
        onClose={() => setGateOpen(false)}
        onReady={() => void exportFile(undefined, true)}
      />
      <div className="sr-only" role="status" aria-live="polite">
        {busy}
      </div>
    </main>
  );
}

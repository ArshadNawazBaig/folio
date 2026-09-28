'use client';
import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import {
  Check,
  Download,
  ShieldCheck,
  ImagePlus,
  Loader2,
  Pencil,
  RotateCcw,
  Signature,
  Type,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import type { DocumentFont } from '@/lib/pro-types';
import { documentFontStyle } from '@/lib/document-fonts.mjs';
import { loadBrowserDocumentFont } from '@/lib/document-font-client';
import { download } from '@/lib/utils';
import {
  paintSignature,
  readSignatureImage,
  signatureImage,
  typedSignatureImage,
  type SignaturePoint,
  type SignatureResult,
  type SignatureTab,
} from '@/lib/signature';
import s from './signature-dialog.module.css';

const tabs = [
  { id: 'draw', label: 'Draw', icon: Pencil },
  { id: 'image', label: 'Image', icon: ImagePlus },
  { id: 'type', label: 'Type', icon: Type },
] as const;
const colors = [
  { value: '#202522', label: 'Black' },
  { value: '#3a638b', label: 'Blue' },
  { value: '#3e6852', label: 'Green' },
];
const fonts: { value: DocumentFont; label: string }[] = [
  { value: 'Times-Italic', label: 'Classic' },
  { value: 'google:caveat:500:normal', label: 'Handwritten' },
  { value: 'google:dancing-script:500:normal', label: 'Flowing' },
];

type EditorSignatureProps = {
  initialTab?: SignatureTab;
  onClose: () => void;
  onAdd: (signature: SignatureResult) => void;
};

export function SignatureDialog(props: EditorSignatureProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current!;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => {
      element.close();
      const target =
        previousFocus?.isConnected && previousFocus !== document.body
          ? previousFocus
          : document.querySelector<HTMLButtonElement>('.editor-toolbar button[aria-label="Sign"]');
      target?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
    >
      <SignatureComposer {...props} id={id} />
    </dialog>
  );
}

export function SignatureWorkbench() {
  const [version, setVersion] = useState(0);
  const id = useId();
  // Discard the working signature before the browser puts this page in its back/forward cache.
  useEffect(() => {
    const reset = () => setVersion((value) => value + 1);
    window.addEventListener('pagehide', reset);
    return () => window.removeEventListener('pagehide', reset);
  }, []);
  return (
    <section className={s.workbench} aria-labelledby={`${id}-title`}>
      <SignatureComposer
        key={version}
        id={id}
        downloadMode
        onClose={() => setVersion((value) => value + 1)}
      />
      <p className={s.privacy}>
        <ShieldCheck size={17} aria-hidden="true" />
        Your signature stays in this tab. Folio does not upload or save it. Download it before
        leaving.
      </p>
    </section>
  );
}

function SignatureComposer({
  id,
  initialTab = 'draw',
  onClose,
  onAdd,
  downloadMode = false,
}: {
  id: string;
  initialTab?: SignatureTab;
  onClose: () => void;
  onAdd?: (signature: SignatureResult) => void;
  downloadMode?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [downloadStatus, setDownloadStatus] = useState('');
  const input = useRef<HTMLInputElement>(null),
    originalImage = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<SignaturePoint[][]>([]),
    pointer = useRef<number | null>(null);
  const [strokeCount, setStrokeCount] = useState(0),
    [tab, setTab] = useState(initialTab);
  const [color, setColor] = useState(colors[0].value),
    [name, setName] = useState('');
  const [font, setFont] = useState<DocumentFont>('Times-Italic'),
    [fontReady, setFontReady] = useState(true);
  const [image, setImage] = useState<ReturnType<typeof signatureImage> | null>(null);
  const [fileName, setFileName] = useState(''),
    [removeWhite, setRemoveWhite] = useState(true);
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [dragging, setDragging] = useState(false);
  const uploadVersion = useRef(0),
    mounted = useRef(true),
    colorRef = useRef(color);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (tab !== 'draw' || !canvas.current) return;
    const element = canvas.current;
    const redraw = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(rect.width * ratio);
      element.height = Math.round(rect.height * ratio);
      paintSignature(element, strokes.current, colorRef.current);
    };
    const observer = new ResizeObserver(redraw);
    observer.observe(element);
    redraw();
    return () => observer.disconnect();
  }, [tab]);
  useEffect(() => {
    colorRef.current = color;
    if (canvas.current) paintSignature(canvas.current, strokes.current, color);
  }, [color]);
  useEffect(() => {
    if (tab !== 'type') return;
    let cancelled = false;
    setFontReady(false);
    setError('');
    void loadBrowserDocumentFont(font)
      .then(() => {
        if (!cancelled) setFontReady(true);
      })
      .catch(() => {
        if (!cancelled)
          setError('This signature style could not load. Choose Classic or try another style.');
      });
    return () => {
      cancelled = true;
    };
  }, [font, tab]);
  function changeTab(next: SignatureTab) {
    pointer.current = null;
    setTab(next);
    setDownloadStatus('');
    setError('');
  }
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  }
  function draw(event: PointerEvent<HTMLCanvasElement>, start = false) {
    if (start) {
      if (event.button !== 0 || pointer.current !== null) return;
      pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      strokes.current.push([point(event)]);
      setStrokeCount(strokes.current.length);
      setError('');
    } else if (pointer.current === event.pointerId) {
      const last = strokes.current.at(-1)!;
      if (last.length < 10000) last.push(point(event));
    } else return;
    event.preventDefault();
    paintSignature(event.currentTarget, strokes.current, color);
  }
  function clear(all = true) {
    pointer.current = null;
    if (all) strokes.current = [];
    else strokes.current.pop();
    setStrokeCount(strokes.current.length);
    setError('');
    if (canvas.current) paintSignature(canvas.current, strokes.current, color);
  }
  async function upload(file?: File) {
    if (!file) return;
    const version = ++uploadVersion.current;
    setLoading(true);
    setImage(null);
    originalImage.current = null;
    setFileName('');
    setError('');
    try {
      const original = await readSignatureImage(file);
      const result = signatureImage(original, removeWhite);
      if (mounted.current && version === uploadVersion.current) {
        originalImage.current = original;
        setImage(result);
        setFileName(file.name);
      }
    } catch (e) {
      if (mounted.current && version === uploadVersion.current)
        setError(e instanceof Error ? e.message : 'This image could not be opened.');
    } finally {
      if (mounted.current && version === uploadVersion.current) setLoading(false);
    }
  }
  function background(checked: boolean) {
    setRemoveWhite(checked);
    setError('');
    try {
      if (originalImage.current) setImage(signatureImage(originalImage.current, checked));
    } catch (e) {
      setImage(null);
      setError(e instanceof Error ? e.message : 'This image could not be prepared.');
    }
  }
  function add() {
    setError('');
    try {
      if (downloadMode) {
        const result =
          tab === 'draw' && canvas.current && strokeCount
            ? signatureImage(canvas.current)
            : tab === 'image' && image
              ? image
              : tab === 'type' && name.trim() && fontReady
                ? typedSignatureImage(name, font, color)
                : null;
        if (!result) return;
        const bytes = Uint8Array.from(atob(result.dataUrl.split(',')[1]), (char) =>
          char.charCodeAt(0),
        );
        const delivery = download(bytes, 'signature.png', 'image/png');
        setDownloadStatus(
          `${delivery === 'ready' ? 'PNG ready to save' : 'PNG download started'} · ${result.width} × ${result.height} pixels`,
        );
        return;
      }
      if (!onAdd) return;
      if (tab === 'draw' && canvas.current && strokeCount)
        onAdd({ source: 'draw', ...signatureImage(canvas.current) });
      else if (tab === 'image' && image) onAdd({ source: 'image', ...image });
      else if (tab === 'type' && name.trim() && fontReady) {
        const style = documentFontStyle(font),
          context = document.createElement('canvas').getContext('2d');
        if (!context) throw new Error('Your signature could not be prepared.');
        context.font = `${style.fontStyle} ${style.fontWeight} 30px ${style.fontFamily}`;
        context.fontKerning = 'none';
        onAdd({
          source: 'type',
          text: name.trim(),
          font,
          color,
          size: 30,
          width: Math.max(48, context.measureText(name.trim()).width * 1.15 + 12),
          height: 44,
        });
      } else return;
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your signature could not be added.');
    }
  }
  const ready =
    !loading &&
    (tab === 'draw' ? strokeCount > 0 : tab === 'image' ? !!image : !!name.trim() && fontReady);
  return (
    <div
      ref={root}
      className={s.composer}
      onKeyDown={(e) => {
        if (tab === 'draw' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          clear(false);
        }
        e.stopPropagation();
      }}
    >
      <header className={s.header}>
        <span className={s.symbol}>
          <Signature size={25} strokeWidth={1.6} />
        </span>
        <div>
          <h2 id={`${id}-title`}>
            {downloadMode ? 'Create your signature' : 'Add your signature'}
          </h2>
          <p id={`${id}-description`}>
            {downloadMode
              ? 'Draw, type, or choose an image. Download your PNG for free.'
              : 'A personal touch, in your own style.'}
          </p>
        </div>
        {!downloadMode && (
          <button className="icon-button" aria-label="Close signature dialog" onClick={onClose}>
            <X size={21} />
          </button>
        )}
      </header>
      <div
        className={s.tabs}
        role="tablist"
        aria-label="Signature method"
        onKeyDown={(e) => {
          const current = tabs.findIndex((item) => item.id === tab);
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? 2
                : e.key === 'ArrowRight'
                  ? (current + 1) % 3
                  : e.key === 'ArrowLeft'
                    ? (current + 2) % 3
                    : -1;
          if (next < 0) return;
          e.preventDefault();
          changeTab(tabs[next].id);
          root.current
            ?.querySelector<HTMLButtonElement>(`#${CSS.escape(id)}-${tabs[next].id}-tab`)
            ?.focus();
        }}
      >
        {tabs.map(({ id: value, label, icon: Icon }) => (
          <button
            key={value}
            id={`${id}-${value}-tab`}
            role="tab"
            aria-selected={tab === value}
            aria-controls={`${id}-${value}-panel`}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => changeTab(value)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <div className={s.body}>
        <div
          role="tabpanel"
          id={`${id}-${tab}-panel`}
          aria-labelledby={`${id}-${tab}-tab`}
          className={s.panel}
        >
          <div className={s.options}>
            <div>
              <h3>
                {tab === 'draw'
                  ? 'Make your mark.'
                  : tab === 'image'
                    ? 'Bring your own signature.'
                    : 'Your name, beautifully signed.'}
              </h3>
              <p>
                {tab === 'draw'
                  ? 'Use your mouse, finger, or pen to sign below.'
                  : tab === 'image'
                    ? 'Upload a clear image of your signature.'
                    : 'Type your name and choose a style.'}
              </p>
            </div>
            {tab !== 'image' && (
              <div className={s.colors} role="group" aria-label="Signature ink color">
                {colors.map((item) => (
                  <button
                    key={item.value}
                    aria-label={`${item.label} ink`}
                    aria-pressed={color === item.value}
                    onClick={() => setColor(item.value)}
                    style={{ '--signature-color': item.value } as CSSProperties}
                  >
                    {color === item.value && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {tab === 'draw' && (
            <>
              <div className={`${s.pad} ${s.drawPad}`}>
                <canvas
                  ref={canvas}
                  aria-label="Draw your signature"
                  aria-describedby={`${id}-draw-help`}
                  tabIndex={0}
                  onPointerDown={(e) => draw(e, true)}
                  onPointerMove={(e) => draw(e)}
                  onPointerUp={(e) => {
                    if (pointer.current === e.pointerId) {
                      draw(e);
                      pointer.current = null;
                      if (e.currentTarget.hasPointerCapture(e.pointerId))
                        e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  }}
                  onPointerCancel={() => {
                    pointer.current = null;
                  }}
                  onLostPointerCapture={() => {
                    pointer.current = null;
                  }}
                />
                {!strokeCount && (
                  <div className={s.empty} aria-hidden="true">
                    <Signature size={40} strokeWidth={1.2} />
                    <span>Sign here</span>
                  </div>
                )}
                <span className={s.baseline} aria-hidden="true" />
              </div>
              <div className={s.padActions}>
                <button className={s.textButton} onClick={() => clear()} disabled={!strokeCount}>
                  <RotateCcw size={15} />
                  Clear signature
                </button>
                <button
                  className={s.textButton}
                  onClick={() => clear(false)}
                  disabled={!strokeCount}
                >
                  <Undo2 size={15} />
                  Undo stroke
                </button>
              </div>
              <p className={s.hint} id={`${id}-draw-help`}>
                Prefer using the keyboard? Choose Type to create your signature.
              </p>
            </>
          )}
          {tab === 'image' && (
            <>
              <input
                ref={input}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload signature image"
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div
                className={`${s.pad} ${s.uploadPad} ${dragging ? s.dragging : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void upload(e.dataTransfer.files[0]);
                }}
              >
                {loading ? (
                  <div className={s.empty} role="status">
                    <Loader2 size={28} className="spin" />
                    <span>Preparing your signature…</span>
                  </div>
                ) : image ? (
                  <img src={image.dataUrl} alt="Uploaded signature preview" />
                ) : (
                  <div className={s.uploadEmpty}>
                    <span className={s.uploadIcon}>
                      <Upload size={26} strokeWidth={1.5} />
                    </span>
                    <strong>Drop your signature here</strong>
                    <span>PNG, JPG, or WebP · up to 5 MB</span>
                    <button className="button secondary" onClick={() => input.current?.click()}>
                      Choose image <ImagePlus size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className={s.imageActions}>
                <label>
                  <input
                    type="checkbox"
                    checked={removeWhite}
                    onChange={(e) => background(e.target.checked)}
                    disabled={loading}
                  />
                  Remove white background
                </label>
                {image && (
                  <button
                    className={s.textButton}
                    onClick={() => input.current?.click()}
                    disabled={loading}
                  >
                    Replace image
                  </button>
                )}
              </div>
              {downloadMode && (
                <p className={s.hint}>
                  White removal works best on plain white paper. Shadows and colored backgrounds may
                  remain.
                </p>
              )}
              {fileName && (
                <p className={s.fileName} title={fileName}>
                  {fileName}
                </p>
              )}
            </>
          )}
          {tab === 'type' && (
            <>
              <label className={s.nameInput}>
                Your signature
                <input
                  autoComplete={downloadMode ? 'off' : 'name'}
                  value={name}
                  maxLength={80}
                  placeholder="Enter your full name"
                  onChange={(e) => setName(e.target.value.replace(/[\r\n\t]/g, ' '))}
                />
              </label>
              <div className={s.styles} role="group" aria-label="Signature style">
                {fonts.map((item) => (
                  <button
                    key={item.value}
                    aria-pressed={font === item.value}
                    onClick={() => {
                      if (font !== item.value) setFontReady(false);
                      setFont(item.value);
                    }}
                  >
                    {item.label}
                    {font === item.value && <Check size={14} />}
                  </button>
                ))}
              </div>
              {!fontReady ? (
                <div className={`${s.pad} ${s.typePad}`}>
                  <div className={s.empty} role="status">
                    {error ? <Type size={24} /> : <Loader2 size={24} className="spin" />}
                    <span>{error ? 'Choose another signature style.' : 'Loading your style…'}</span>
                  </div>
                </div>
              ) : (
                <TypedSignaturePreview
                  text={name.trim() || 'Your signature'}
                  font={font}
                  color={color}
                />
              )}
            </>
          )}
        </div>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </div>
      {downloadMode && (
        <p className={s.downloadStatus} role="status">
          {downloadStatus}
        </p>
      )}
      <footer className={s.footer}>
        <p>
          {downloadMode
            ? tab === 'image' && !removeWhite
              ? 'PNG · original background retained'
              : 'PNG · transparent background'
            : 'Drag and resize after adding.'}
        </p>
        <div>
          <button className="button secondary" onClick={onClose}>
            {downloadMode ? 'Clear all' : 'Cancel'}
          </button>
          <button className="button primary" onClick={add} disabled={!ready}>
            {downloadMode ? <Download size={16} /> : <Check size={16} />}
            {downloadMode ? 'Download PNG' : 'Add signature'}
          </button>
        </div>
      </footer>
    </div>
  );
}

function TypedSignaturePreview({
  text,
  font,
  color,
}: {
  text: string;
  font: DocumentFont;
  color: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(60);
  useLayoutEffect(() => {
    const element = frame.current!;
    const measure = () => {
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      const style = documentFontStyle(font),
        spacing = getComputedStyle(element);
      context.font = `${style.fontStyle} ${style.fontWeight} 60px ${style.fontFamily}`;
      context.fontKerning = 'none';
      const width =
        element.clientWidth -
        parseFloat(spacing.paddingLeft) -
        parseFloat(spacing.paddingRight) -
        12;
      setSize(
        Math.min(60, (Math.max(1, width) / Math.max(1, context.measureText(text).width)) * 60),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, font]);
  return (
    <div ref={frame} className={`${s.pad} ${s.typePad}`} aria-label="Typed signature preview">
      <span style={{ ...documentFontStyle(font), color, fontSize: size } as CSSProperties}>
        {text}
      </span>
    </div>
  );
}

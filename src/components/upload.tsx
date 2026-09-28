'use client';
import { useRef, useState } from 'react';
import { Upload, ArrowUpRight, Loader2, FileUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { setPendingDocument } from '@/lib/storage';
import { MAX_FILE_SIZE, friendlyError } from '@/lib/utils';
export function UploadArea({
  onFiles,
  accept = 'application/pdf',
  multiple = false,
  compact = false,
  busy = false,
  formatsLabel,
  maxSizeLabel = '50 MB',
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  compact?: boolean;
  busy?: boolean;
  formatsLabel?: string;
  maxSizeLabel?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`upload-area ${compact ? 'compact' : ''} ${over ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy) onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {!compact && (
        <div className="upload-symbol">
          <FileUp size={30} strokeWidth={1.4} />
        </div>
      )}
      <button
        className="button primary upload-button"
        onClick={() => input.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
        {busy ? 'Opening document…' : multiple ? 'Choose files' : 'Choose a file'}
        {!busy && <ArrowUpRight size={17} />}
      </button>
      <p>or drop {multiple ? 'your files' : 'your file'} here</p>
      <small>
        {formatsLabel || (accept.includes('image') ? 'JPG and PNG' : 'PDF files')} · Up to{' '}
        {maxSizeLabel}
        {multiple ? ' per file' : ''}
      </small>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={busy}
        hidden
        aria-label="Choose document files"
        onChange={(e) => {
          if (!busy && e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
    </div>
  );
}
export function HomeUpload() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function open(files: File[]) {
    const f = files[0];
    if (!f) return;
    setError('');
    try {
      if (!/\.pdf$/i.test(f.name)) throw new Error('Choose a PDF to open in the editor.');
      if (f.size > MAX_FILE_SIZE) throw new Error('Choose a PDF smaller than 50 MB.');
      setBusy(true);
      setPendingDocument({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
      router.push('/workspace');
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  }
  return (
    <div className="home-upload">
      <div
        className={`home-upload-bar ${over ? 'drag-over' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (!busy) void open(Array.from(event.dataTransfer.files));
        }}
        aria-busy={busy}
      >
        <FileUp size={36} className="home-upload-icon" strokeWidth={1.5} aria-hidden="true" />
        <div className="home-upload-copy">
          <strong>Drop your PDF and get started</strong>
          <span>Drag a file here, or choose one from your device. Up to 50 MB.</span>
        </div>
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? <Loader2 size={18} className="spin" aria-hidden="true" /> : null}
          {busy ? 'Opening document…' : 'Choose a PDF'}
          {!busy && <ArrowUpRight size={18} aria-hidden="true" />}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          hidden
          aria-label="Choose document files"
          onChange={(event) => {
            if (!busy && event.target.files) void open(Array.from(event.target.files));
            event.target.value = '';
          }}
        />
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

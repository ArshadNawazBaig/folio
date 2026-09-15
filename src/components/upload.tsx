'use client';
import { useRef, useState } from 'react';
import { Upload, ArrowUpRight, Loader2, ShieldCheck, FileUp } from 'lucide-react';
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
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  compact?: boolean;
  busy?: boolean;
  formatsLabel?: string;
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
        {formatsLabel || (accept.includes('image') ? 'JPG and PNG' : 'PDF files')} · Up to 50 MB
        {multiple ? ' per file' : ''}
      </small>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        aria-label="Choose document files"
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
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
    <div className="hero-upload">
      <UploadArea onFiles={open} compact busy={busy} />
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="upload-assurance">
        <ShieldCheck size={14} />
        <span>Private upload. Your work saves automatically.</span>
        <span className="small-dot">·</span>
        <span>No sign-up needed.</span>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, Eye, EyeOff, LockKeyhole, Upload } from 'lucide-react';
import { useAccount } from './account-provider';
import { DownloadGate } from './download-gate';
import { accountFetch, AccountRequestError } from '@/lib/auth-client';
import { baseName, download, formatBytes } from '@/lib/utils';
import { getPendingDocument } from '@/lib/storage';
export function ProtectPdf() {
  const { access } = useAccount();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  useEffect(() => {
    const pending = getPendingDocument();
    if (pending) {
      setFile(new File([pending.bytes.slice().buffer], pending.name, { type: 'application/pdf' }));
      if (pending.bytes.length > 10 * 1024 * 1024)
        setError(
          'This copy exceeds the 10 MB file limit. Download it and split it into smaller files first.',
        );
    }
  }, []);
  async function protect(e?: React.FormEvent, verified = false) {
    e?.preventDefault();
    if (!file) return;
    setError('');
    setDone(false);
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    if (password.length < 8 || password.length > 64 || file.size > 10 * 1024 * 1024) {
      setError('Use a password of 8–64 characters and a PDF under 10 MB.');
      return;
    }
    if (!access.pro && !verified) {
      setBusy(true);
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('job', JSON.stringify({ operation: 'inspect' }));
        const response = await fetch('/api/pro/preview', { method: 'POST', body: form });
        if (!response.ok)
          throw new Error((await response.json()).error || 'This PDF could not be opened.');
        setGateOpen(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'This PDF could not be opened.');
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('job', JSON.stringify({ operation: 'protect', password }));
      const response = await accountFetch('/api/pro/pdf', { method: 'POST', body: form });
      download(
        new Uint8Array(await response.arrayBuffer()),
        `${baseName(file.name)}-protected.pdf`,
      );
      setPassword('');
      setConfirm('');
      setDone(true);
    } catch (e) {
      if (e instanceof AccountRequestError && [401, 402].includes(e.status)) {
        setGateOpen(true);
        return;
      }
      setError(e instanceof Error ? e.message : 'The PDF could not be protected.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pro-protect-grid">
      <form className="protect-card" onSubmit={protect}>
        <span className="account-symbol">
          <LockKeyhole size={26} />
        </span>
        <h2>A password for your paperwork.</h2>
        <p>Require a password to open your PDF. Your original stays unchanged.</p>
        <button
          type="button"
          className="button secondary full"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload size={16} />
          {file ? 'Change PDF' : 'Choose a PDF'}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/pdf"
          hidden
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setDone(false);
            setError('');
            if (f && (!/\.pdf$/i.test(f.name) || f.size > 10 * 1024 * 1024)) {
              setError('Choose a PDF smaller than 10 MB.');
              setFile(null);
            } else setFile(f || null);
          }}
        />
        {file && (
          <>
            <small style={{ overflowWrap: 'anywhere' }}>
              {file.name} · {formatBytes(file.size)}
            </small>
            <button
              className="text-link"
              type="button"
              disabled={busy}
              onClick={async () => download(new Uint8Array(await file.arrayBuffer()), file.name)}
            >
              Download current copy <Download size={14} />
            </button>
          </>
        )}
        <fieldset disabled={busy}>
          <label className="pro-field">
            Opening password
            <div className="password-input">
              <input
                type={show ? 'text' : 'password'}
                minLength={8}
                maxLength={64}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label className="pro-field">
            Confirm password
            <input
              type={show ? 'text' : 'password'}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button
            className="button primary full"
            disabled={!file || file.size > 10 * 1024 * 1024 || busy}
          >
            <Download size={16} />
            {busy ? 'Protecting your PDF…' : 'Protect & download'}
          </button>
        </fieldset>
        <p className="service-note">
          This sends the PDF and password to Folio for processing in memory. Neither is saved by the
          application. Use at least 8 characters; keep a copy of the password. Maximum 10 MB, 100
          pages.
        </p>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="pro-notice">
            Your protected PDF has been downloaded.
          </p>
        )}
      </form>
      <div className="pro-edit-first">
        <span className="eyebrow">SET IT UP FIRST</span>
        <h3>A little more privacy.</h3>
        <p>
          Choose your file, enter an opening password, and confirm it before downloading a protected
          copy.
        </p>
        <p>Your password stays in this tab until you request the protected download.</p>
      </div>
      <DownloadGate
        tool="protect-pdf"
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onReady={() => void protect(undefined, true)}
      />
    </div>
  );
}

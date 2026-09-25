'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileCheck2, Loader2, Share2, X } from 'lucide-react';
import { DOWNLOAD_READY_EVENT, formatBytes, type PreparedDownload } from '@/lib/utils';
import s from './download-ready.module.css';

type ReadyFile = { file: File; url: string; shareable: boolean };

/** One save surface for the editor, dashboard and standalone tools. */
export function DownloadReady() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ready, setReady] = useState<ReadyFile | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const activeShare = useRef<object | null>(null);

  useEffect(() => {
    const prepare = (event: Event) => {
      if (!window.matchMedia('(pointer: coarse), (max-width: 760px)').matches) return;
      const { blob, name } = (event as CustomEvent<PreparedDownload>).detail;
      const file = new File([blob], name, { type: blob.type });
      const url = URL.createObjectURL(file);
      let shareable = false;
      try {
        shareable = !!navigator.share && !!navigator.canShare?.({ files: [file] });
      } catch {
        // File sharing may be disallowed by the browser; download still works.
      }
      event.preventDefault();
      activeShare.current = null;
      setSharing(false);
      setError('');
      setNotice('');
      setReady({ file, url, shareable });
    };
    window.addEventListener(DOWNLOAD_READY_EVENT, prepare);
    return () => window.removeEventListener(DOWNLOAD_READY_EVENT, prepare);
  }, []);

  useEffect(() => {
    if (ready) dialog.current?.showModal();
    else dialog.current?.close();
    // Keep the link valid for as long as it is offered. Allow an in-flight
    // download/new-tab preview time to consume it after this dialog closes.
    return () => {
      if (ready) setTimeout(() => URL.revokeObjectURL(ready.url), 60_000);
    };
  }, [ready]);

  function close() {
    activeShare.current = null;
    setReady(null);
  }

  async function share() {
    if (!ready || sharing) return;
    const attempt = {};
    activeShare.current = attempt;
    setSharing(true);
    setError('');
    setNotice('');
    try {
      // No async preparation before share: this must run within the new tap.
      await navigator.share({ files: [ready.file] });
      if (activeShare.current === attempt)
        setNotice('The file was handed to your selected app. You can keep working here.');
    } catch (e) {
      if (activeShare.current === attempt) {
        if (e instanceof Error && e.name === 'AbortError')
          setNotice('Sharing was canceled. Your file is still ready to download.');
        else setError('Sharing is unavailable right now. Use Download file instead.');
      }
    } finally {
      if (activeShare.current === attempt) {
        activeShare.current = null;
        setSharing(false);
      }
    }
  }

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="download-ready-heading"
      aria-describedby="download-ready-description"
      onCancel={close}
      onClose={close}
    >
      <header className="dialog-header">
        <h2 id="download-ready-heading">Your file is ready.</h2>
        <button className="icon-button" aria-label="Close download options" onClick={close}>
          <X size={20} />
        </button>
      </header>
      {ready && (
        <>
          <div className="dialog-body">
            <div className={s.file}>
              <span className={s.symbol} aria-hidden="true">
                <FileCheck2 size={24} />
              </span>
              <div>
                <strong>{ready.file.name}</strong>
                <span>{formatBytes(ready.file.size)}</span>
              </div>
            </div>
            <p id="download-ready-description">
              Download a copy to your device. Your workspace stays open.
            </p>
            {ready.shareable && <p>Use Share file to save to Files or send it to another app.</p>}
            {ready.file.type === 'application/pdf' && (
              <p>
                If your browser opens the PDF, use its Share or Save option. You can also{' '}
                <a href={ready.url} target="_blank" rel="noopener" className="text-link">
                  open the PDF <ExternalLink size={13} aria-hidden="true" />
                </a>
                .
              </p>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {notice && <p role="status">{notice}</p>}
          </div>
          <footer className="dialog-footer">
            {ready.shareable && (
              <button className="button secondary" disabled={sharing} onClick={() => void share()}>
                {sharing ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
                Share file
              </button>
            )}
            <a
              className="button primary"
              href={ready.url}
              download={ready.file.name}
              target="_blank"
              rel="noopener"
              onClick={() => {
                setError('');
                setNotice('Download requested. Check your browser’s downloads or PDF preview.');
              }}
            >
              <Download size={16} /> Download file
            </a>
          </footer>
        </>
      )}
    </dialog>
  );
}

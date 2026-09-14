'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { Pricing } from './pricing';
import { useAccount } from './account-provider';
export function DownloadGate({
  open,
  onClose,
  onReady,
  saved = false,
}: {
  open: boolean;
  onClose: () => void;
  onReady: () => void;
  saved?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { refresh, error } = useAccount();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  async function check() {
    setChecking(true);
    setNotice('');
    try {
      const verified = await refresh();
      if (verified.pro) {
        onClose();
        onReady();
      } else
        setNotice(
          'Premium access is not active yet. After paying, allow a moment for confirmation and check again.',
        );
    } finally {
      setChecking(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="download-gate"
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="download-gate-title"
    >
      <header className="download-gate-header">
        <span className="account-symbol" aria-hidden="true">
          <Download size={25} />
        </span>
        <h2 id="download-gate-title">Your edits are ready to take with you.</h2>
        <button className="icon-button gate-close" aria-label="Keep editing" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <div className="download-gate-body" role="region" aria-label="Download options" tabIndex={0}>
        <p>
          A premium plan is required to download your finished document. You can keep editing for
          free.
        </p>
        <p className="gate-preserve">
          {saved
            ? 'Your recovery draft is saved in cloud storage. '
            : 'Keep this tab open until your work is saved to your account or downloaded. '}
          Sign-in and checkout open in a new tab, so your document stays here.
        </p>
        {open && <Pricing compact checkoutInNewTab />}
      </div>
      <footer className="download-gate-footer">
        {notice && (
          <p role="status" className="service-note">
            {notice}
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="gate-actions">
          <button className="button secondary" onClick={onClose}>
            Keep editing
          </button>
          <button className="button primary" disabled={checking} onClick={check}>
            <RefreshCw size={15} />
            {checking ? 'Checking payment…' : 'I’ve paid — download my PDF'}
          </button>
        </div>
      </footer>
    </dialog>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, X, RefreshCw, Loader2 } from 'lucide-react';
import { googleSignInUrl } from '@/lib/auth-client';
import { Pricing } from './pricing';
import { useAccount } from './account-provider';
import { premiumDownloads, type PremiumDownloadTool } from '@/lib/tool-access';
export function DownloadGate({
  open,
  onClose,
  onReady,
  saved = false,
  tool,
}: {
  open: boolean;
  onClose: () => void;
  onReady: () => void;
  saved?: boolean;
  tool: PremiumDownloadTool;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const signInTab = useRef<Window | null>(null);
  const startingSignIn = useRef(false);
  const { user, access, configured, loading, refresh, error } = useAccount();
  const [checking, setChecking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    setNotice('');
    setSignInError('');
  }, [open, user?.id]);
  async function signIn() {
    if (startingSignIn.current || user) return;
    setSignInError('');
    if (signInTab.current && !signInTab.current.closed) {
      signInTab.current.focus();
      return;
    }
    // Open synchronously from the click; never navigate or reload the editor.
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      setSignInError(
        'Allow a new tab for Google sign-in, then try again. Your edits are still here.',
      );
      return;
    }
    tab.opener = null;
    tab.document.title = 'Opening Google sign-in…';
    signInTab.current = tab;
    startingSignIn.current = true;
    setSigningIn(true);
    setNotice('');
    try {
      const url = await googleSignInUrl('/account', true);
      if (tab.closed) throw new Error('The sign-in tab was closed. Please try again.');
      tab.location.replace(url);
      setNotice('Google sign-in opened in a new tab. Your edits are still here.');
    } catch (e) {
      tab.close();
      signInTab.current = null;
      setSignInError(e instanceof Error ? e.message : 'Google sign-in could not be opened.');
    } finally {
      startingSignIn.current = false;
      setSigningIn(false);
    }
  }
  async function check() {
    if (!user || checking) return;
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
  const message = user ? error : signInError;
  const download = premiumDownloads[tool];
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
        <p>{download.reason} You can keep editing and previewing for free.</p>
        <p className="gate-preserve">
          {saved
            ? 'Your recovery draft is saved in cloud storage. '
            : 'Keep this tab open until your work is saved to your account or downloaded. '}
          Sign-in and checkout open in a new tab, so your document stays here.
        </p>
        {open && <Pricing compact checkoutInNewTab signInInFooter />}
      </div>
      <footer className="download-gate-footer">
        {notice && !message && (
          <p role="status" className="service-note">
            {notice}
          </p>
        )}
        {message && (
          <p className="error-message" role="alert">
            {message}
          </p>
        )}
        {!user && !configured && (
          <p className="service-note" role="status">
            Google sign-in is not connected yet. You can keep editing.
          </p>
        )}
        <div className="gate-actions">
          <button className="button secondary" onClick={onClose}>
            Keep editing
          </button>
          {!user ? (
            <button
              className="google-sign-in"
              disabled={!configured || loading || signingIn}
              onClick={signIn}
            >
              {signingIn ? (
                <Loader2 size={18} className="spin" aria-hidden="true" />
              ) : (
                <img src="/google-g.png" width={18} height={18} alt="" />
              )}
              {signingIn ? 'Opening Google…' : 'Continue with Google'}
            </button>
          ) : (
            <button className="button primary" disabled={checking || loading} onClick={check}>
              {access.pro ? <Download size={15} /> : <RefreshCw size={15} />}
              {checking || loading
                ? 'Checking access…'
                : access.pro
                  ? `Download my ${download.format}`
                  : `I’ve paid — download my ${download.format}`}
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}

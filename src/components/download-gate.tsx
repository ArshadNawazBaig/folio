'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';
import { useUiTranslation } from '@/components/ui-language';

import { useEffect, useRef, useState } from 'react';
import { Download, X, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { googleSignInUrl } from '@/lib/auth-client';
import { Pricing } from './pricing';
import { useAccount } from './account-provider';
import { premiumDownloads, type PremiumDownloadTool } from '@/lib/tool-access';
import s from './download-gate.module.css';
export function DownloadGate(props: React.ComponentProps<typeof PaidDownloadGate>) {
  return FREE_LAUNCH ? null : <PaidDownloadGate {...props} />;
}
function PaidDownloadGate({
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
  const tr = useUiTranslation();

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
      setNotice(tr('Google sign-in opened in a new tab. Your edits are still here.'));
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
          tr(
            'Premium access is not active yet. After paying, allow a moment for confirmation and check again.',
          ),
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
      className={`download-gate ${s.dialog}`}
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby="download-gate-title"
      aria-describedby="download-gate-description"
    >
      <header className="download-gate-header">
        <span className="account-symbol" aria-hidden="true">
          <Download size={25} />
        </span>
        <div className={s.heading}>
          <span>{tr('FOLIO PRO DOWNLOAD')}</span>
          <h2 id="download-gate-title">{tr('Take your work with you.')}</h2>
        </div>
        <button
          className="icon-button gate-close"
          aria-label={tr('Keep editing')}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div
        className="download-gate-body"
        role="region"
        aria-label={tr('Download options')}
        tabIndex={0}
      >
        <p id="download-gate-description">
          {tr('Unlock your')} {download.format}{' '}
          {tr('download with Folio Pro. Keep editing and previewing for free.')}
        </p>
        {open && <Pricing compact checkoutInNewTab signInInFooter />}
        <details className={s.explanation}>
          <summary>{tr('About this Pro download')}</summary>
          <p>{download.reason}</p>
        </details>
        <div className={`gate-preserve ${s.preserve}`}>
          <ShieldCheck size={18} aria-hidden="true" />
          <p>
            {saved
              ? tr('Your recovery draft is saved in cloud storage. ')
              : tr('Keep this tab open until your work is saved to your account or downloaded. ')}
            {tr('Sign-in and checkout open in a new tab, so your document stays here.')}
          </p>
        </div>
      </div>
      <footer className="download-gate-footer">
        {notice && !message && (
          <p role="status" className="service-note">
            {tr(notice)}
          </p>
        )}
        {message && (
          <p className="error-message" role="alert">
            {tr(message)}
          </p>
        )}
        {!user && !configured && (
          <p className="service-note" role="status">
            {tr('Google sign-in is not connected yet. You can keep editing.')}
          </p>
        )}
        <div className="gate-actions">
          <button className="button secondary" onClick={onClose}>
            {tr('Keep editing')}
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
              <span>{signingIn ? tr('Opening Google…') : tr('Continue with Google')}</span>
            </button>
          ) : (
            <button className="button primary" disabled={checking || loading} onClick={check}>
              {access.pro ? <Download size={15} /> : <RefreshCw size={15} />}
              {checking || loading
                ? tr('Checking access…')
                : access.pro
                  ? tr('Download my {value0}', { value0: download.format })
                  : tr('I’ve paid — download my {value0}', { value0: download.format })}
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}

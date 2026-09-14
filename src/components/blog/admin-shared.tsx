'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAccount } from '../account-provider';
import { SignInForm } from '../sign-in-form';
import { Skeleton, LoadingLabel } from '../skeleton';
import s from './admin-blog.module.css';
export function BlogAccess({
  children,
  destination,
}: {
  children: ReactNode;
  destination: string;
}) {
  const { user, access, loading, error } = useAccount();
  if (loading)
    return (
      <main id="main" className={s.access}>
        <div className="account-card" aria-busy="true">
          <LoadingLabel>Checking editorial access…</LoadingLabel>
          <Skeleton width={44} height={44} />
          <h1>
            <Skeleton height={32} />
          </h1>
          <Skeleton height={44} />
        </div>
      </main>
    );
  if (!user || !access.admin)
    return (
      <main id="main" className={s.access}>
        <div className="account-card">
          <span className="account-symbol">
            <ShieldCheck size={24} />
          </span>
          <h1>Your editorial workspace.</h1>
          <p>{error || 'Sign in with a super admin account to manage the Folio blog.'}</p>
          {!user ? (
            <SignInForm destination={destination} />
          ) : (
            <Link className="button secondary" href="/dashboard">
              Back to your dashboard
            </Link>
          )}
        </div>
      </main>
    );
  return children;
}
export function BlogToast({
  notice,
  onClose,
}: {
  notice: { text: string; error?: boolean } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [notice, onClose]);
  if (!notice) return null;
  return createPortal(
    <div
      className={`${s.toast} ${notice.error ? s.toastError : ''}`}
      role={notice.error ? 'alert' : 'status'}
    >
      {notice.error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
      <span>{notice.text}</span>
      <button aria-label="Dismiss notification" onClick={onClose}>
        <X size={16} />
      </button>
    </div>,
    document.querySelector('dialog[open]') || document.body,
  );
}
export function BlogDialog({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby="blog-dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id="blog-dialog-title">{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={19} />
        </button>
      </header>
      <div className={s.dialogBody}>{children}</div>
      {footer && <footer>{footer}</footer>}
    </dialog>
  );
}

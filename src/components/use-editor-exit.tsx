'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, X } from 'lucide-react';

type ExitAction = () => void | boolean | Promise<void | boolean>;
type ExitRequest = { run: ExitAction };

export function useEditorExit({
  enabled,
  unsaved,
  guest,
  save,
}: {
  enabled: boolean;
  unsaved: boolean;
  guest: boolean;
  save: () => Promise<void>;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const keepEditing = useRef<HTMLButtonElement>(null);
  const pending = useRef<ExitRequest | null>(null);
  const attempt = useRef<object | null>(null);
  const leaving = useRef(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'leaving' | 'save-error' | 'exit-error'>(
    'idle',
  );
  const working = phase === 'saving' || phase === 'leaving';

  const cancel = useCallback(() => {
    pending.current = null;
    attempt.current = null;
    leaving.current = false;
    setOpen(false);
  }, []);

  const requestLeave = useCallback(
    (run: ExitAction) => {
      if (!enabled) {
        void run();
        return;
      }
      // Repeated clicks/back presses must not replace an active confirmation.
      if (pending.current) return;
      pending.current = { run };
      leaving.current = false;
      setPhase('idle');
      setOpen(true);
    },
    [enabled],
  );

  useEffect(() => {
    const element = dialog.current;
    if (open) {
      element?.showModal();
      keepEditing.current?.focus();
    } else element?.close();
  }, [open]);

  useEffect(
    () => () => {
      pending.current = null;
      attempt.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    const linkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self') ||
        !['http:', 'https:'].includes(anchor.protocol)
      )
        return;
      const destination = new URL(anchor.href);
      const current = new URL(window.location.href);
      // Same-page anchors, downloads and new-tab sign-in never leave the editor.
      if (
        destination.origin === current.origin &&
        destination.pathname === current.pathname &&
        destination.search === current.search
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      requestLeave(() => {
        if (destination.origin === current.origin)
          router.push(destination.pathname + destination.search + destination.hash);
        else window.location.assign(destination.href);
      });
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      // Browsers only support their own prompt for tab closing and reloading.
      if (unsaved && !leaving.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const traverse = (event: NavigateEvent) => {
      if (
        leaving.current ||
        event.defaultPrevented ||
        event.navigationType !== 'traverse' ||
        !event.cancelable ||
        event.hashChange
      )
        return;
      const destination = event.destination;
      if (destination.url === window.location.href) return;
      // Cancel before Next receives popstate, keeping the live document and
      // history intact. Do not intercept autosave's replaceState URL updates.
      event.preventDefault();
      requestLeave(async () => {
        const result = window.navigation.traverseTo(destination.key);
        void result.finished?.catch(() => {});
        await result.committed;
      });
    };
    const pageShown = (event: PageTransitionEvent) => {
      leaving.current = false;
      if (event.persisted) cancel();
    };
    document.addEventListener('click', linkClick, true);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('pageshow', pageShown);
    window.navigation?.addEventListener('navigate', traverse);
    return () => {
      document.removeEventListener('click', linkClick, true);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('pageshow', pageShown);
      window.navigation?.removeEventListener('navigate', traverse);
    };
  }, [cancel, enabled, requestLeave, router, unsaved]);

  async function confirm(discard = false) {
    const request = pending.current;
    if (!request || attempt.current) return;
    const ticket = {};
    attempt.current = ticket;
    if (!discard) {
      setPhase('saving');
      try {
        await save();
      } catch {
        if (attempt.current === ticket) {
          attempt.current = null;
          setPhase('save-error');
        }
        return;
      }
    }
    // Cancel/Escape during a slow save must never navigate after it completes.
    if (attempt.current !== ticket) return;
    leaving.current = true;
    setPhase('leaving');
    try {
      const result = await request.run();
      if (attempt.current !== ticket) return;
      if (result === false) leaving.current = false;
      pending.current = null;
      attempt.current = null;
      setOpen(false);
    } catch {
      if (attempt.current !== ticket) return;
      leaving.current = false;
      attempt.current = null;
      setPhase('exit-error');
    }
  }

  return {
    requestLeave,
    dialog: (
      <dialog
        ref={dialog}
        className="confirm-dialog editor-exit-dialog"
        aria-labelledby="editor-exit-heading"
        aria-describedby="editor-exit-description"
        onCancel={(event) => {
          event.preventDefault();
          if (phase !== 'leaving') cancel();
        }}
      >
        <header className="dialog-header">
          <h2 id="editor-exit-heading">Are you sure you want to leave?</h2>
          <button
            className="icon-button"
            aria-label="Close leave dialog"
            disabled={phase === 'leaving'}
            onClick={cancel}
          >
            <X size={18} />
          </button>
        </header>
        <div className="dialog-body">
          <p id="editor-exit-description">
            {unsaved
              ? 'We’ll save your latest changes before you leave the editor.'
              : guest
                ? 'Your document is saved in your guest dashboard. Guest files remain available for 24 hours in this browser.'
                : 'Your document is saved. You can reopen it from your dashboard whenever you’re ready.'}
          </p>
          {phase === 'save-error' && (
            <p className="error-message" role="alert">
              Your latest changes couldn’t be saved. Try again, or keep editing. Leaving without
              saving may lose those changes.
            </p>
          )}
          {phase === 'exit-error' && (
            <p className="error-message" role="alert">
              This page couldn’t be opened. Your document is still here. Please try again.
            </p>
          )}
        </div>
        <footer className="dialog-footer">
          {phase === 'save-error' && (
            <button className="text-link" onClick={() => void confirm(true)}>
              Leave without saving
            </button>
          )}
          <button
            ref={keepEditing}
            className="button secondary"
            disabled={phase === 'leaving'}
            onClick={cancel}
          >
            Keep editing
          </button>
          <button className="button primary" disabled={working} onClick={() => void confirm()}>
            {working ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
            {phase === 'saving'
              ? 'Saving…'
              : phase === 'leaving'
                ? 'Leaving…'
                : phase === 'save-error'
                  ? 'Retry & leave'
                  : 'Leave editor'}
          </button>
        </footer>
      </dialog>
    ),
  };
}

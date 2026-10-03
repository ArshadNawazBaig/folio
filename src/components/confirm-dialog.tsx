'use client';
import { useUiTranslation } from '@/components/ui-language';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Folio's confirmation surface. Mount only while a decision is pending. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const tr = useUiTranslation();

  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    cancelButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        if (
          event.key !== 'Tab' ||
          event.defaultPrevented ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, textarea, [tabindex]',
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(':disabled') &&
            element.getClientRects().length > 0,
        );
        if (!controls.length) return;
        // Move explicitly so Safari's keyboard preference cannot skip buttons.
        const current = controls.indexOf(document.activeElement as HTMLElement);
        const next = event.shiftKey
          ? current > 0
            ? current - 1
            : controls.length - 1
          : (current + 1) % controls.length;
        event.preventDefault();
        controls[next].focus();
      }}
    >
      <header className="dialog-header">
        <h2 id={`${id}-title`}>{tr(title)}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={tr('Close confirmation')}
          onClick={onCancel}
        >
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div className="dialog-body">
        <p id={`${id}-description`}>{description}</p>
        {children}
      </div>
      <footer className="dialog-footer">
        <button ref={cancelButton} type="button" className="button secondary" onClick={onCancel}>
          {tr('Keep editing')}
        </button>
        <button type="button" className="button primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </footer>
    </dialog>
  );
}

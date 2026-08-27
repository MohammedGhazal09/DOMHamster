import { useEffect, useId, useRef, useState } from 'react';
import { useModalFocus } from './dialog-focus.ts';

export interface ConfirmDialogProps {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void | Promise<void>;
  readonly onCancel: () => void;
  readonly returnFocusId?: string;
  readonly tone?: 'danger' | 'warning';
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  returnFocusId,
  tone = 'danger',
}: ConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  async function confirm(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  useModalFocus(dialogRef, {
    initialFocusRef: cancelRef,
    returnFocusId,
    onEscape: () => {
      if (!busy) onCancel();
    },
  });

  return (
    <div className="modal-backdrop">
      <div
        ref={dialogRef}
        className={`modal-card confirm-dialog confirm-dialog--${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <header className="confirm-dialog__header">
          <span aria-hidden="true">!</span>
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={bodyId}>{body}</p>
          </div>
        </header>
        <footer className="modal-card__actions">
          <button
            ref={cancelRef}
            type="button"
            className="button button--secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="button button--danger"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

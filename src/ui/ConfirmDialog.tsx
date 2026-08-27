import { useEffect, useRef } from 'react';

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <section
        className="confirm-dialog surface"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-heading"
        aria-describedby="confirm-dialog-description"
      >
        <h2 id="confirm-dialog-heading">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>
        <div className="confirm-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="button button--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button type="button" className="button button--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

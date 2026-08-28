import { useId, useRef } from 'react';
import type { AuditEventView } from '../app/selectors.ts';
import { useModalFocus } from './dialog-focus.ts';

export interface ActivityDrawerProps {
  readonly open: boolean;
  readonly events: readonly AuditEventView[];
  readonly onClose: () => void;
  readonly returnFocusId?: string;
}

function formatEventTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Riyadh',
  }).format(new Date(timestamp));
}

export function ActivityDrawer({ open, events, onClose, returnFocusId }: ActivityDrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useModalFocus(drawerRef, {
    active: open,
    initialFocusRef: closeRef,
    returnFocusId,
    onEscape: onClose,
  });

  if (!open) return null;
  const orderedEvents = [...events].sort((left, right) => right.sequence - left.sequence);

  return (
    <div className="modal-backdrop drawer-backdrop">
      <aside
        ref={drawerRef}
        className="drawer-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="drawer-card__header">
          <div>
            <span className="eyebrow">Privacy-safe operational record</span>
            <h2 id={titleId}>Activity history</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="button button--secondary"
            aria-label="Close activity history"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        {orderedEvents.length === 0 ? (
          <p className="drawer-empty">No activity has been recorded in this run.</p>
        ) : (
          <ol className="activity-list">
            {orderedEvents.map((event) => (
              <li key={event.id}>
                <div className="activity-list__topline">
                  <code>{event.type}</code>
                  <span className={`actor-pill actor-pill--${event.actor}`}>{event.actor}</span>
                </div>
                <p>{event.safeSummary}</p>
                <div className="activity-list__metadata">
                  <span className="mono">#{event.sequence}</span>
                  <span>{formatEventTime(event.timestamp)}</span>
                  <span>
                    {event.draftVersion === null
                      ? 'No draft version'
                      : `Draft v${event.draftVersion}`}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

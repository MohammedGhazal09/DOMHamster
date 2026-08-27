import { useEffect, useRef } from 'react';
import type { AuditEventView } from '../app/selectors.ts';

export interface ActivityDrawerProps {
  readonly open: boolean;
  readonly events: readonly AuditEventView[];
  readonly onClose: () => void;
}

const ACTOR_LABELS: Readonly<Record<AuditEventView['actor'], string>> = Object.freeze({
  human: 'Human',
  agent: 'Agent',
  system: 'System',
});

function formatTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Riyadh',
  }).format(timestamp);
}

export function ActivityDrawer({ open, events, onClose }: ActivityDrawerProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="activity-drawer surface"
        role="dialog"
        aria-modal="false"
        aria-labelledby="activity-drawer-heading"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <header className="activity-drawer__header">
          <div>
            <span className="eyebrow">Append-only audit</span>
            <h2 id="activity-drawer-heading" ref={headingRef} tabIndex={-1}>
              Activity
            </h2>
          </div>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Close activity
          </button>
        </header>

        {events.length === 0 ? (
          <p className="activity-empty">No material actions have been recorded yet.</p>
        ) : (
          <ol className="activity-list">
            {[...events].reverse().map((event) => (
              <li key={event.id}>
                <div className="activity-event__topline">
                  <code>{event.type}</code>
                  <span className={`actor-chip actor-chip--${event.actor}`}>
                    {ACTOR_LABELS[event.actor]}
                  </span>
                </div>
                <p>{event.safeSummary}</p>
                <div className="activity-event__metadata">
                  <span className="mono">#{event.sequence}</span>
                  <span>{formatTimestamp(event.timestamp)} Riyadh</span>
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

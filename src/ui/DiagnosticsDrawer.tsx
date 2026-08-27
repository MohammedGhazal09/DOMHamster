import { useId, useRef } from 'react';
import type { DiagnosticsSnapshot } from '../diagnostics/diagnostics.ts';
import { useModalFocus } from './dialog-focus.ts';

export interface DiagnosticsDrawerProps {
  readonly open: boolean;
  readonly snapshot: DiagnosticsSnapshot;
  readonly onClose: () => void;
  readonly returnFocusId?: string;
}

function ToolList({ title, tools }: { readonly title: string; readonly tools: readonly string[] }) {
  return (
    <section className="diagnostics-tool-list" aria-label={title}>
      <h3>{title}</h3>
      {tools.length === 0 ? (
        <p>None</p>
      ) : (
        <ul>
          {tools.map((tool) => (
            <li key={tool}>
              <code>{tool}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DiagnosticsDrawer({
  open,
  snapshot,
  onClose,
  returnFocusId,
}: DiagnosticsDrawerProps) {
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

  return (
    <div className="modal-backdrop drawer-backdrop">
      <aside
        ref={drawerRef}
        className="drawer-card diagnostics-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="drawer-card__header">
          <div>
            <span className="eyebrow">Bounded runtime evidence</span>
            <h2 id={titleId}>Diagnostics</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="button button--secondary"
            aria-label="Close diagnostics"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <dl className="diagnostics-facts">
          <div>
            <dt>Workflow state</dt>
            <dd className="mono">{snapshot.workflowState}</dd>
          </div>
          <div>
            <dt>Draft version</dt>
            <dd className="mono">{snapshot.draftVersion ?? '—'}</dd>
          </div>
          <div>
            <dt>WebMCP</dt>
            <dd>{snapshot.capabilityStatus}</dd>
          </div>
          <div>
            <dt>Persistence</dt>
            <dd>{snapshot.persistenceStatus}</dd>
          </div>
          <div>
            <dt>Build version</dt>
            <dd className="mono">{snapshot.build.version}</dd>
          </div>
          <div>
            <dt>Commit</dt>
            <dd className="mono">{snapshot.build.commitSha}</dd>
          </div>
        </dl>

        <section className="diagnostics-fixture" aria-labelledby={`${titleId}-fixture`}>
          <h3 id={`${titleId}-fixture`}>Canonical fixture hash</h3>
          <code>{snapshot.fixtureHash}</code>
        </section>

        <div className="diagnostics-tools-grid">
          <ToolList title="Desired tools" tools={snapshot.desiredToolNames} />
          <ToolList title="Registered tools" tools={snapshot.registeredToolNames} />
        </div>

        <section className="diagnostics-errors" aria-labelledby={`${titleId}-errors`}>
          <h3 id={`${titleId}-errors`}>Recent safe error codes</h3>
          {snapshot.recentErrorCodes.length === 0 ? (
            <p>None</p>
          ) : (
            <ul>
              {snapshot.recentErrorCodes.map((code, index) => (
                <li key={`${index}-${code}`}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

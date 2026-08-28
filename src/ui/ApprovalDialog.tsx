import { useId, useRef, useState } from 'react';
import type { AssignmentDraftView, PublicRequestView } from '../app/selectors.ts';
import type { ApprovalRecord } from '../domain/types.ts';
import { useModalFocus } from './dialog-focus.ts';
import { ReadonlyAssignmentTable } from './ReadonlyAssignmentTable.tsx';
import { executeWorkflowCommand, type WorkflowCommandHandler } from './workflow-commands.ts';

export interface ApprovalDialogProps {
  readonly draft: AssignmentDraftView;
  readonly approval: ApprovalRecord & { readonly status: 'pending' };
  readonly requests: readonly PublicRequestView[];
  readonly onCommand: WorkflowCommandHandler;
  readonly onAnnouncement: (message: string) => void;
  readonly returnFocusId?: string;
}

type DecisionType = 'APPROVE' | 'REJECT' | 'CANCEL_APPROVAL';

const RIYADH_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Riyadh',
});

function formatRiyadhTime(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? RIYADH_TIME_FORMATTER.format(timestamp) : value;
}

function acceptedMessage(type: DecisionType, version: number): string {
  if (type === 'APPROVE') return `Draft version ${version} approved.`;
  if (type === 'REJECT') return `Draft version ${version} rejected.`;
  return `Approval review for draft version ${version} cancelled.`;
}

export function ApprovalDialog({
  draft,
  approval,
  requests,
  onCommand,
  onAnnouncement,
  returnFocusId,
}: ApprovalDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const assignedCount = draft.assignments.filter(
    ({ status, volunteerId }) => status !== 'unassigned' && volunteerId !== null,
  ).length;
  const lockedCount = draft.assignments.filter(({ lockedByHuman }) => lockedByHuman).length;

  async function decide(type: DecisionType): Promise<void> {
    if (busy) return;
    setBusy(true);
    const accepted = await executeWorkflowCommand(
      onCommand,
      {
        type,
        actor: 'human',
        expectedDraftVersion: draft.version,
      },
      onAnnouncement,
      acceptedMessage(type, draft.version),
    );
    if (!accepted) setBusy(false);
  }

  useModalFocus(dialogRef, {
    initialFocusRef: headingRef,
    returnFocusId,
    onEscape: () => {
      if (!busy) void decide('CANCEL_APPROVAL');
    },
  });

  return (
    <div className="modal-backdrop" data-testid="approval-dialog-backdrop">
      <div
        ref={dialogRef}
        className="modal-card approval-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy}
      >
        <header className="modal-card__header">
          <div>
            <span className="eyebrow">Human decision required</span>
            <h2 ref={headingRef} id={titleId} tabIndex={-1}>
              Review draft v{draft.version} before approval
            </h2>
          </div>
          <span className="mono state-pill">AWAITING_APPROVAL</span>
        </header>

        <p id={descriptionId} className="approval-consequence">
          Approval authorizes the agent to commit this exact version for 120 seconds. Any edit,
          unlock, rejection, cancellation, reset, reload, or expiry invalidates approval.
        </p>

        <dl className="approval-facts">
          <div>
            <dt>Requested</dt>
            <dd>{formatRiyadhTime(approval.createdAt)}</dd>
          </div>
          <div>
            <dt>Assignments</dt>
            <dd>{draft.assignments.length}</dd>
          </div>
          <div>
            <dt>Assigned</dt>
            <dd>{assignedCount}</dd>
          </div>
          <div>
            <dt>Coordinator locks</dt>
            <dd>{lockedCount}</dd>
          </div>
        </dl>

        <p className="approval-agent-summary">
          Agent requested approval for {draft.assignments.length} assignments reviewed;{' '}
          {assignedCount} assigned and {draft.assignments.length - assignedCount} unassigned.
        </p>

        <ReadonlyAssignmentTable
          assignments={draft.assignments}
          requests={requests}
          accessibleName="Draft assignment review"
        />

        <section className="approval-warning-review" aria-labelledby={`${titleId}-warnings`}>
          <div className="approval-warning-review__heading">
            <h3 id={`${titleId}-warnings`}>Warnings retained for human review</h3>
            <span>{draft.warnings.length}</span>
          </div>
          {draft.warnings.length === 0 ? (
            <p>No warnings are reported for this exact version.</p>
          ) : (
            <ul>
              {draft.warnings.map((warning) => (
                <li key={`${warning.code}-${warning.requestIds.join('-')}`}>
                  <code>{warning.code}</code>
                  <span>{warning.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="modal-card__actions approval-dialog__actions">
          <button
            type="button"
            className="button button--primary"
            disabled={busy}
            onClick={() => void decide('APPROVE')}
          >
            Approve version {draft.version}
          </button>
          <button
            type="button"
            className="button button--danger"
            disabled={busy}
            onClick={() => void decide('REJECT')}
          >
            Reject and return
          </button>
          <button
            type="button"
            className="button button--secondary"
            disabled={busy}
            onClick={() => void decide('CANCEL_APPROVAL')}
          >
            Cancel review
          </button>
        </footer>
      </div>
    </div>
  );
}

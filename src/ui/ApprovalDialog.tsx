import { useEffect, useRef } from 'react';
import type { AssignmentDraftView } from '../app/selectors.ts';
import { executeWorkflowCommand, type WorkflowCommandHandler } from './workflow-commands.ts';

export interface ApprovalDialogProps {
  readonly draft: AssignmentDraftView;
  readonly onCommand: WorkflowCommandHandler;
  readonly onAnnouncement: (message: string) => void;
}

function assignmentSummary(
  volunteerId: string | null,
  startTime: string | null,
  durationMinutes: number,
): string {
  if (volunteerId === null || startTime === null) return 'Explicitly unassigned';
  return `${volunteerId} at ${startTime} for ${durationMinutes} minutes`;
}

export function ApprovalDialog({
  draft,
  onCommand,
  onAnnouncement,
}: ApprovalDialogProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function decide(type: 'APPROVE' | 'REJECT' | 'CANCEL_APPROVAL'): void {
    const message =
      type === 'APPROVE'
        ? `Draft version ${draft.version} approved.`
        : type === 'REJECT'
          ? `Draft version ${draft.version} rejected.`
          : `Approval review for version ${draft.version} cancelled.`;
    void executeWorkflowCommand(
      onCommand,
      onAnnouncement,
      {
        type,
        actor: 'human',
        expectedDraftVersion: draft.version,
      },
      message,
    );
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          decide('CANCEL_APPROVAL');
        }
      }}
    >
      <section
        className="approval-dialog surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-dialog-heading"
        aria-describedby="approval-dialog-consequence"
      >
        <header className="approval-dialog__header">
          <div>
            <span className="eyebrow">Human approval required</span>
            <h2 id="approval-dialog-heading" ref={headingRef} tabIndex={-1}>
              Review draft v{draft.version} before approval
            </h2>
          </div>
          <span className="status-chip status-chip--ready">AWAITING_APPROVAL</span>
        </header>

        <p id="approval-dialog-consequence" className="approval-consequence">
          Approval authorizes the agent to commit this exact version for 120 seconds. Any edit,
          unlock, rejection, cancellation, reset, reload, or expiry invalidates approval.
        </p>

        <div className="approval-review-scroll" tabIndex={0}>
          <table className="approval-review-table" aria-label={`Draft version ${draft.version} review`}>
            <thead>
              <tr>
                <th scope="col">Request</th>
                <th scope="col">Assignment</th>
                <th scope="col">Human lock</th>
              </tr>
            </thead>
            <tbody>
              {draft.assignments.map((assignment) => (
                <tr key={assignment.requestId}>
                  <th scope="row" className="mono">
                    {assignment.requestId}
                  </th>
                  <td>
                    {assignmentSummary(
                      assignment.volunteerId,
                      assignment.startTime,
                      assignment.durationMinutes,
                    )}
                  </td>
                  <td>
                    {assignment.lockedByHuman ? (
                      <span className="approval-lock-chip">Locked by coordinator</span>
                    ) : (
                      <span className="approval-unlocked">Not locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="approval-warning-review" aria-labelledby="approval-warnings-heading">
          <h3 id="approval-warnings-heading">Warnings to acknowledge</h3>
          {draft.warnings.length === 0 ? (
            <p>No warnings require acknowledgement.</p>
          ) : (
            <ul>
              {draft.warnings.map((warning) => (
                <li key={`${warning.code}-${warning.requestIds.join('-')}`}>
                  <code>{warning.code}</code>
                  <span>{warning.message}</span>
                  <span className="mono">{warning.requestIds.join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="approval-dialog__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => decide('CANCEL_APPROVAL')}
          >
            Cancel review
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={() => decide('REJECT')}
          >
            Reject and return
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => decide('APPROVE')}
          >
            Approve version {draft.version}
          </button>
        </footer>
      </section>
    </div>
  );
}

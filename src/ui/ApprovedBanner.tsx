import { useEffect, useRef, useState } from 'react';
import type { ApprovalRecord } from '../domain/types.ts';
import {
  executeWorkflowCommand,
  type WorkflowCommandHandler,
} from './workflow-commands.ts';

export interface ApprovedBannerProps {
  readonly approval: ApprovalRecord & { readonly status: 'approved' };
  readonly draftVersion: number;
  readonly onCommand: WorkflowCommandHandler;
  readonly onRequestCancelApproval: () => void;
  readonly onRequestDiscard: () => void;
  readonly onAnnouncement: (message: string) => void;
  readonly now?: () => number;
  readonly tickMilliseconds?: number;
}

function remainingMilliseconds(expiresAt: string, now: () => number): number {
  return Math.max(0, Date.parse(expiresAt) - now());
}

// eslint-disable-next-line react-refresh/only-export-components -- Pure formatter is exported for unit tests.
export function formatApprovalCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function ApprovedBanner({
  approval,
  draftVersion,
  onCommand,
  onRequestCancelApproval,
  onRequestDiscard,
  onAnnouncement,
  now = Date.now,
  tickMilliseconds = 250,
}: ApprovedBannerProps) {
  const [remaining, setRemaining] = useState(() => remainingMilliseconds(approval.expiresAt, now));
  const expiryDispatched = useRef(false);

  useEffect(() => {
    const update = () => {
      const nextRemaining = remainingMilliseconds(approval.expiresAt, now);
      setRemaining(nextRemaining);
      if (nextRemaining > 0 || expiryDispatched.current) return;
      expiryDispatched.current = true;
      void executeWorkflowCommand(
        onCommand,
        { type: 'APPROVAL_EXPIRES', actor: 'system' },
        onAnnouncement,
        `Approval expired for draft version ${draftVersion}.`,
      );
    };

    update();
    const intervalId = window.setInterval(update, tickMilliseconds);
    return () => window.clearInterval(intervalId);
  }, [approval.expiresAt, draftVersion, now, onAnnouncement, onCommand, tickMilliseconds]);

  return (
    <section className="approved-banner" aria-labelledby="approved-banner-heading">
      <div>
        <span className="eyebrow">Human approval recorded</span>
        <h3 id="approved-banner-heading">Approved draft v{draftVersion}</h3>
        <p
          className="approved-banner__countdown"
          role="timer"
          aria-live="off"
          aria-atomic="true"
        >
          Version {draftVersion} approved. Waiting for the agent to commit. Approval expires in{' '}
          {formatApprovalCountdown(remaining)}.
        </p>
        <p>
          Only the agent can invoke the one-shot commit tool for this exact version. No human
          commit control is exposed.
        </p>
      </div>
      <div className="approved-banner__actions">
        <button
          id="cancel-approval-action"
          type="button"
          className="button button--secondary"
          onClick={onRequestCancelApproval}
        >
          Cancel approval
        </button>
        <button
          id="discard-draft-action"
          type="button"
          className="button button--danger"
          onClick={onRequestDiscard}
        >
          Discard draft
        </button>
      </div>
    </section>
  );
}

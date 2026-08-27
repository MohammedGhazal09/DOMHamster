import { useEffect, useRef, useState } from 'react';
import { executeWorkflowCommand, type WorkflowCommandHandler } from './workflow-commands.ts';

export interface ApprovedBannerProps {
  readonly version: number;
  readonly expiresAt: string;
  readonly now: () => number;
  readonly onCommand: WorkflowCommandHandler;
  readonly onAnnouncement: (message: string) => void;
  readonly onRequestCancelApproval: () => void;
  readonly onRequestDiscard: () => void;
}

function remainingSeconds(expiresAt: string, now: () => number): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now()) / 1000));
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function ApprovedBanner({
  version,
  expiresAt,
  now,
  onCommand,
  onAnnouncement,
  onRequestCancelApproval,
  onRequestDiscard,
}: ApprovedBannerProps) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(expiresAt, now));
  const expirationRequested = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [version]);

  useEffect(() => {
    function requestExpiration(): void {
      if (expirationRequested.current) return;
      expirationRequested.current = true;
      void executeWorkflowCommand(
        onCommand,
        onAnnouncement,
        { type: 'APPROVAL_EXPIRES', actor: 'system' },
        `Approval expired for draft version ${version}.`,
      );
    }

    function refresh(): void {
      const nextSeconds = remainingSeconds(expiresAt, now);
      setSeconds(nextSeconds);
      if (nextSeconds === 0) requestExpiration();
    }

    refresh();
    const intervalId = window.setInterval(refresh, 1000);
    const timeoutId = window.setTimeout(
      requestExpiration,
      Math.max(0, Date.parse(expiresAt) - now()),
    );

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [expiresAt, now, onAnnouncement, onCommand, version]);

  return (
    <section className="approved-banner" aria-labelledby="approved-banner-heading">
      <div>
        <span className="eyebrow">Human approval recorded</span>
        <h3 id="approved-banner-heading" ref={headingRef} tabIndex={-1}>
          Version {version} approved
        </h3>
        <p>
          Version {version} approved. Waiting for the agent to commit. Approval expires in{' '}
          {formatDuration(seconds)}.
        </p>
      </div>
      <div className="approved-banner__actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={onRequestCancelApproval}
        >
          Cancel approval
        </button>
        <button
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

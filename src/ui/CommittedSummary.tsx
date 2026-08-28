import type { CommittedPlanView, PublicRequestView } from '../app/selectors.ts';
import { ReadonlyAssignmentTable } from './ReadonlyAssignmentTable.tsx';

export interface CommittedSummaryProps {
  readonly plan: CommittedPlanView;
  readonly requests: readonly PublicRequestView[];
}

function formatCommittedAt(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Riyadh',
  }).format(new Date(timestamp));
}

export function CommittedSummary({ plan, requests }: CommittedSummaryProps) {
  return (
    <section className="committed-summary" aria-labelledby="committed-plan-heading">
      <header className="committed-summary__header">
        <div>
          <span className="eyebrow">One-shot commit completed</span>
          <h3 id="committed-plan-heading">Committed plan</h3>
          <p>Plan committed. Human-approved version {plan.draftVersion} is now final.</p>
        </div>
        <span className="mono state-pill">COMMITTED</span>
      </header>

      <dl className="committed-plan-facts">
        <div>
          <dt>Plan ID</dt>
          <dd className="mono">{plan.id}</dd>
        </div>
        <div>
          <dt>Committed</dt>
          <dd>{formatCommittedAt(plan.committedAt)}</dd>
        </div>
        <div>
          <dt>Assigned</dt>
          <dd>{plan.assignedRequestCount}</dd>
        </div>
        <div>
          <dt>Unassigned</dt>
          <dd>{plan.unassignedRequestIds.length}</dd>
        </div>
      </dl>

      <ReadonlyAssignmentTable
        assignments={plan.assignments}
        requests={requests}
        accessibleName="Final assignment plan"
      />

      <div className="contact-boundary-notice" role="note" aria-label="Contact access boundary">
        <strong>Contact access remains agent-selected and audited</strong>
        <span>
          Dispatch details are fictional, returned only for selected assigned requests, and every
          access is recorded.
        </span>
      </div>
    </section>
  );
}

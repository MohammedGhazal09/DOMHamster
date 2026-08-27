import type { CommittedPlanView } from '../app/selectors.ts';

export interface CommittedSummaryProps {
  readonly plan: CommittedPlanView;
}

function formatTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Riyadh',
  }).format(timestamp);
}

function workloadEntries(plan: CommittedPlanView): readonly (readonly [string, number])[] {
  const counts = new Map<string, number>();
  for (const assignment of plan.assignments) {
    if (assignment.status === 'committed' && assignment.volunteerId !== null) {
      counts.set(assignment.volunteerId, (counts.get(assignment.volunteerId) ?? 0) + 1);
    }
  }
  return Object.freeze(
    [...counts.entries()].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
  );
}

export function CommittedSummary({ plan }: CommittedSummaryProps) {
  const workloads = workloadEntries(plan);

  return (
    <section className="committed-summary" aria-labelledby="committed-summary-heading">
      <header className="committed-summary__header">
        <div>
          <span className="eyebrow">Final operational plan</span>
          <h3 id="committed-summary-heading">Committed plan</h3>
          <p>Plan committed. Human-approved version {plan.draftVersion} is now final.</p>
        </div>
        <div className="committed-plan-id">
          <span>Plan ID</span>
          <strong className="mono">{plan.id}</strong>
          <span>{formatTimestamp(plan.committedAt)} Riyadh</span>
        </div>
      </header>

      <div className="committed-metrics" aria-label="Committed plan summary">
        <div>
          <strong>{plan.assignedRequestCount}</strong>
          <span>Assigned</span>
        </div>
        <div>
          <strong>{plan.unassignedRequestIds.length}</strong>
          <span>Unassigned</span>
        </div>
        <div>
          <strong>{plan.draftVersion}</strong>
          <span>Approved version</span>
        </div>
      </div>

      <div className="committed-table-scroll" tabIndex={0} aria-label="Scrollable committed plan">
        <table className="committed-table" aria-label="Committed assignments">
          <thead>
            <tr>
              <th scope="col">Request</th>
              <th scope="col">Volunteer</th>
              <th scope="col">Start</th>
              <th scope="col">Duration</th>
              <th scope="col">Human lock</th>
            </tr>
          </thead>
          <tbody>
            {plan.assignments.map((assignment) => (
              <tr key={assignment.requestId}>
                <th scope="row" className="mono">
                  {assignment.requestId}
                </th>
                <td className="mono">{assignment.volunteerId ?? 'Unassigned'}</td>
                <td className="mono">{assignment.startTime ?? '—'}</td>
                <td>{assignment.durationMinutes} min</td>
                <td>{assignment.lockedByHuman ? 'Locked' : 'Not locked'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="committed-workloads" aria-labelledby="committed-workloads-heading">
        <h4 id="committed-workloads-heading">Final volunteer workloads</h4>
        <ul>
          {workloads.map(([volunteerId, count]) => (
            <li key={volunteerId}>
              <span className="mono">{volunteerId}</span>
              <strong>{count} tasks</strong>
            </li>
          ))}
        </ul>
      </section>

      <aside className="contact-boundary-notice">
        <strong>Progressive disclosure remains enforced</strong>
        <span>
          Dispatch details are fictional, returned only for selected assigned requests, and every
          access is recorded.
        </span>
      </aside>
    </section>
  );
}

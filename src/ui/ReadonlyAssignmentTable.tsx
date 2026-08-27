import type {
  PublicAssignmentView,
  PublicRequestView,
} from '../app/selectors.ts';
import type { Priority, RequestType, Zone } from '../domain/types.ts';

export interface ReadonlyAssignmentTableProps {
  readonly assignments: readonly PublicAssignmentView[];
  readonly requests: readonly PublicRequestView[];
  readonly accessibleName: string;
}

const TYPE_LABELS: Readonly<Record<RequestType, string>> = Object.freeze({
  delivery: 'Food delivery',
  transport: 'Transport',
  setup: 'Community setup',
  translation: 'Translation',
  check_in: 'Check-in',
});

const PRIORITY_LABELS: Readonly<Record<Priority, string>> = Object.freeze({
  high: 'Urgent',
  medium: 'High',
  low: 'Normal',
});

const ZONE_LABELS: Readonly<Record<Zone, string>> = Object.freeze({
  north: 'North',
  center: 'Central',
  east: 'East',
  south: 'South',
  west: 'West',
});

export function ReadonlyAssignmentTable({
  assignments,
  requests,
  accessibleName,
}: ReadonlyAssignmentTableProps) {
  const requestsById = new Map(requests.map((request) => [request.id, request]));

  return (
    <div
      className="readonly-assignment-scroll"
      role="region"
      aria-label={`${accessibleName} horizontal scroll area`}
      tabIndex={0}
    >
      <table className="readonly-assignment-table" aria-label={accessibleName}>
        <thead>
          <tr>
            <th scope="col">Request</th>
            <th scope="col">Volunteer</th>
            <th scope="col">Start</th>
            <th scope="col">Authority</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => {
            const request = requestsById.get(assignment.requestId);
            return (
              <tr key={assignment.requestId}>
                <th scope="row">
                  <span className="mono">{assignment.requestId}</span>
                  <strong>{request === undefined ? 'Request' : TYPE_LABELS[request.type]}</strong>
                  {request === undefined ? null : (
                    <span>
                      {PRIORITY_LABELS[request.priority]} · {ZONE_LABELS[request.zone]} ·{' '}
                      {request.timeWindow.start}–{request.timeWindow.end}
                    </span>
                  )}
                </th>
                <td className="mono">{assignment.volunteerId ?? 'Unassigned'}</td>
                <td className="mono">{assignment.startTime ?? '—'}</td>
                <td>{assignment.lockedByHuman ? 'Coordinator locked' : 'Agent draft'}</td>
                <td>{assignment.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

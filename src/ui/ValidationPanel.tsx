import type { PublicValidationIssueView } from '../app/selectors.ts';
import type { RequestId } from '../domain/types.ts';
import { validationIssueDomId } from './validation-ids.ts';

export interface ValidationPanelProps {
  readonly errors: readonly PublicValidationIssueView[];
  readonly warnings: readonly PublicValidationIssueView[];
}

const REMEDIATION_BY_CODE: Readonly<Record<string, string>> = Object.freeze({
  DUPLICATE_REQUEST_ASSIGNMENT: 'Keep exactly one assignment row for this request.',
  UNKNOWN_REQUEST: 'Restore the canonical request identifier.',
  UNKNOWN_VOLUNTEER: 'Choose a volunteer from the canonical scenario.',
  INVALID_ASSIGNMENT_TIME:
    'Choose a volunteer and a valid start time, or leave the request unassigned.',
  MISSING_REQUIRED_SKILL: 'Choose a volunteer who has every required skill.',
  MISSING_REQUIRED_LANGUAGE: 'Choose a volunteer who speaks every required language.',
  REQUEST_TIME_WINDOW_VIOLATION: 'Move the start time inside the request window.',
  VOLUNTEER_UNAVAILABLE: 'Choose a time inside the volunteer availability window.',
  VOLUNTEER_WORKLOAD_EXCEEDED: 'Move one or more requests to another volunteer.',
  VOLUNTEER_TIME_OVERLAP: 'Move one of the overlapping assignments to another time or volunteer.',
  HUMAN_LOCK_VIOLATION: 'Restore the coordinator-locked volunteer, time, duration, and status.',
  ZONE_INEFFICIENCY: 'Consider a volunteer whose home zone matches the request.',
  REQUEST_UNASSIGNED: 'Assign a volunteer when the request can be covered.',
  WORKLOAD_IMBALANCE: 'Consider redistributing work across available volunteers.',
});

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function affectedRequestIds(issues: readonly PublicValidationIssueView[]): readonly RequestId[] {
  return Object.freeze(
    [...new Set(issues.flatMap(({ requestIds }) => requestIds))].sort(compareText),
  );
}

function focusElement(id: string): void {
  const element = document.getElementById(id);
  if (element instanceof HTMLElement) element.focus();
}

function remediation(issue: PublicValidationIssueView): string {
  return (
    REMEDIATION_BY_CODE[issue.code] ?? 'Review the affected assignment and resolve the constraint.'
  );
}

export function ValidationPanel({ errors, warnings }: ValidationPanelProps) {
  const issues = Object.freeze([...errors, ...warnings]);
  const affected = affectedRequestIds(issues);

  return (
    <section
      className={`validation-panel ${errors.length > 0 ? 'is-invalid' : 'is-valid'}`}
      aria-labelledby="draft-validation-heading"
    >
      <div className="validation-panel__heading">
        <div>
          <h3 id="draft-validation-heading">Draft validation</h3>
          <p>
            {errors.length} hard {errors.length === 1 ? 'error' : 'errors'} · {warnings.length}{' '}
            {warnings.length === 1 ? 'warning' : 'warnings'}
          </p>
        </div>
        <span className="mono">{errors.length > 0 ? 'BLOCKED' : 'PASS'}</span>
      </div>

      {affected.length > 0 ? (
        <div className="validation-focus-links" aria-label="Affected assignments">
          <span>Affected rows</span>
          {affected.map((requestId) => (
            <button
              key={requestId}
              type="button"
              className="validation-focus-link mono"
              onClick={() => focusElement(`assignment-row-${requestId}`)}
            >
              <span className="sr-only">Focus assignment </span>
              {requestId}
            </button>
          ))}
        </div>
      ) : null}

      {issues.length === 0 ? (
        <p className="validation-empty">No validation issues are currently reported.</p>
      ) : (
        <ul className="validation-list">
          {issues.map((issue, index) => (
            <li
              key={`${issue.severity}-${issue.code}-${issue.requestIds.join('-')}-${
                issue.volunteerId ?? ''
              }`}
              id={validationIssueDomId(issue, index)}
              className={`validation-item validation-item--${issue.severity}`}
              tabIndex={-1}
            >
              <div className="validation-item__topline">
                <code>{issue.code}</code>
                <span>{issue.severity}</span>
              </div>
              <p>{issue.message}</p>
              <p className="validation-item__remediation">{remediation(issue)}</p>
              <div
                className="validation-item__entities"
                aria-label={`Affected IDs for ${issue.code}`}
              >
                {issue.requestIds.map((requestId) => (
                  <span key={requestId} className="mono">
                    {requestId}
                  </span>
                ))}
                {issue.volunteerId === undefined ? null : (
                  <span className="mono">{issue.volunteerId}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

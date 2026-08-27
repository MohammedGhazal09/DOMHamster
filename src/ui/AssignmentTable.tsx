import type { StoreDispatchResult } from '../app/ports.ts';
import type {
  AssignmentDraftView,
  PublicAssignmentView,
  PublicRequestView,
  PublicValidationIssueView,
  PublicVolunteerView,
} from '../app/selectors.ts';
import type {
  EditAssignmentCommand,
  LockAssignmentCommand,
  UnlockAssignmentCommand,
} from '../domain/commands.ts';
import {
  volunteerId,
  type Language,
  type Priority,
  type RequestId,
  type RequestType,
  type Skill,
  type TimeOfDay,
  type Zone,
} from '../domain/types.ts';
import { validationIssueDomId } from './ValidationPanel.tsx';

export type HumanDraftCommand =
  | EditAssignmentCommand
  | LockAssignmentCommand
  | UnlockAssignmentCommand;

export type HumanDraftCommandHandler = (
  command: HumanDraftCommand,
) => StoreDispatchResult | void | Promise<StoreDispatchResult | void>;

export interface AssignmentTableProps {
  readonly draft: AssignmentDraftView;
  readonly requests: readonly PublicRequestView[];
  readonly volunteers: readonly PublicVolunteerView[];
  readonly onCommand: HumanDraftCommandHandler;
  readonly onAnnouncement: (message: string) => void;
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

const SKILL_LABELS: Readonly<Record<Skill, string>> = Object.freeze({
  lifting: 'lifting',
  driving: 'driving',
  food_handling: 'food handling',
  setup: 'setup',
});

const LANGUAGE_LABELS: Readonly<Record<Language, string>> = Object.freeze({
  AR: 'Arabic',
  EN: 'English',
  UR: 'Urdu',
});

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

interface IndexedIssue {
  readonly issue: PublicValidationIssueView;
  readonly index: number;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capabilityText(volunteer: PublicVolunteerView): string {
  const skills = volunteer.skills.map((skill) => SKILL_LABELS[skill]);
  const languages = volunteer.languages.map((language) => LANGUAGE_LABELS[language]);
  return [...skills, ...languages].join(', ') || 'general support';
}

function volunteerMatches(
  request: PublicRequestView,
  volunteer: PublicVolunteerView,
): boolean {
  return (
    request.requiredSkills.every((skill) => volunteer.skills.includes(skill)) &&
    request.requiredLanguages.every((language) => volunteer.languages.includes(language))
  );
}

function volunteerOptionLabel(
  request: PublicRequestView,
  volunteer: PublicVolunteerView,
): string {
  const constraintHint = volunteerMatches(request, volunteer) ? 'matches requirements' : 'review constraints';
  return `${volunteer.id} — ${ZONE_LABELS[volunteer.zone]}; ${capabilityText(volunteer)}; ${
    volunteer.assignedCount
  }/${volunteer.capacity} tasks; ${constraintHint}`;
}

function requirementText(request: PublicRequestView): string {
  const requirements = [
    ...request.requiredSkills.map((skill) => SKILL_LABELS[skill]),
    ...request.requiredLanguages.map((language) => LANGUAGE_LABELS[language]),
  ];
  return requirements.length === 0 ? 'No special capability' : requirements.join(', ');
}

function issuesByRequest(draft: AssignmentDraftView): ReadonlyMap<RequestId, readonly IndexedIssue[]> {
  const result = new Map<RequestId, IndexedIssue[]>();
  const issues = [...draft.errors, ...draft.warnings];

  issues.forEach((issue, index) => {
    for (const requestId of issue.requestIds) {
      const existing = result.get(requestId);
      const indexedIssue = Object.freeze({ issue, index });
      if (existing === undefined) result.set(requestId, [indexedIssue]);
      else existing.push(indexedIssue);
    }
  });

  return result;
}

function assignmentByRequest(
  draft: AssignmentDraftView,
): ReadonlyMap<RequestId, PublicAssignmentView> {
  return new Map(draft.assignments.map((assignment) => [assignment.requestId, assignment]));
}

function focusValidationIssue(issue: IndexedIssue): void {
  const element = document.getElementById(validationIssueDomId(issue.issue, issue.index));
  if (element instanceof HTMLElement) element.focus();
}

async function executeCommand(
  onCommand: HumanDraftCommandHandler,
  onAnnouncement: (message: string) => void,
  command: HumanDraftCommand,
  acceptedMessage: string,
): Promise<void> {
  try {
    const result = await onCommand(command);
    if (result !== undefined && !result.ok) {
      onAnnouncement(`Assignment change was not accepted: ${result.error.code}.`);
      return;
    }
    onAnnouncement(acceptedMessage);
  } catch {
    onAnnouncement('DOMHamster could not apply that assignment change. State was not changed.');
  }
}

function actorLabel(assignment: PublicAssignmentView): 'Agent' | 'You' {
  return assignment.lockedByHuman ? 'You' : 'Agent';
}

export function AssignmentTable({
  draft,
  requests,
  volunteers,
  onCommand,
  onAnnouncement,
}: AssignmentTableProps) {
  const assignments = assignmentByRequest(draft);
  const indexedIssues = issuesByRequest(draft);
  const orderedVolunteers = [...volunteers].sort((left, right) => compareText(left.id, right.id));

  return (
    <div className="assignment-table-scroll" tabIndex={0} aria-label="Scrollable assignment editor">
      <table className="assignment-table" aria-label="Assignment editor">
        <thead>
          <tr>
            <th scope="col">Request</th>
            <th scope="col">Volunteer</th>
            <th scope="col">Start</th>
            <th scope="col">Authority</th>
            <th scope="col">Validation</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const assignment = assignments.get(request.id);
            if (assignment === undefined) return null;

            const rowIssues = indexedIssues.get(request.id) ?? [];
            const volunteerControlId = `assignment-volunteer-${request.id}`;
            const timeControlId = `assignment-time-${request.id}`;
            const hintId = `assignment-hint-${request.id}`;
            const lockHelperId = `assignment-lock-helper-${request.id}`;
            const describedBy = assignment.lockedByHuman ? `${hintId} ${lockHelperId}` : hintId;
            const unassigned = assignment.status === 'unassigned' || assignment.volunteerId === null;

            return (
              <tr key={request.id} className={rowIssues.length > 0 ? 'has-issues' : undefined}>
                <th scope="row">
                  <div
                    id={`assignment-row-${request.id}`}
                    className="assignment-request-target"
                    tabIndex={-1}
                  >
                    <div className="assignment-request__topline">
                      <span className="mono">{request.id}</span>
                      <span className={`priority-badge priority-badge--${request.priority}`}>
                        {PRIORITY_LABELS[request.priority]}
                      </span>
                    </div>
                    <strong>{TYPE_LABELS[request.type]}</strong>
                    <span>
                      {ZONE_LABELS[request.zone]} · {request.timeWindow.start}–{request.timeWindow.end}{' '}
                      · {request.durationMinutes} min
                    </span>
                    <span className="assignment-requirement">{requirementText(request)}</span>
                  </div>
                </th>
                <td>
                  <label className="assignment-field-label" htmlFor={volunteerControlId}>
                    Volunteer<span className="sr-only"> for {request.id}</span>
                  </label>
                  <select
                    id={volunteerControlId}
                    value={assignment.volunteerId ?? ''}
                    disabled={assignment.lockedByHuman}
                    aria-describedby={describedBy}
                    onChange={(event) => {
                      const selectedValue = event.currentTarget.value;
                      const command: EditAssignmentCommand =
                        selectedValue === ''
                          ? {
                              type: 'EDIT_ASSIGNMENT',
                              actor: 'human',
                              expectedDraftVersion: draft.version,
                              requestId: request.id,
                              patch: {
                                volunteerId: null,
                                startTime: null,
                                status: 'unassigned',
                              },
                            }
                          : {
                              type: 'EDIT_ASSIGNMENT',
                              actor: 'human',
                              expectedDraftVersion: draft.version,
                              requestId: request.id,
                              patch: {
                                volunteerId: volunteerId(selectedValue),
                                startTime: assignment.startTime ?? request.timeWindow.start,
                                status: 'planned',
                              },
                            };
                      void executeCommand(
                        onCommand,
                        onAnnouncement,
                        command,
                        `${request.id} volunteer change accepted.`,
                      );
                    }}
                  >
                    <option value="">Leave unassigned</option>
                    {orderedVolunteers.map((volunteer) => (
                      <option key={volunteer.id} value={volunteer.id}>
                        {volunteerOptionLabel(request, volunteer)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <label className="assignment-field-label" htmlFor={timeControlId}>
                    Start time<span className="sr-only"> for {request.id}</span>
                  </label>
                  <input
                    id={timeControlId}
                    type="time"
                    step={900}
                    min={request.timeWindow.start}
                    max={request.timeWindow.end}
                    value={assignment.startTime ?? ''}
                    disabled={assignment.lockedByHuman || unassigned}
                    aria-describedby={describedBy}
                    onChange={(event) => {
                      const nextTime = event.currentTarget.value;
                      if (!TIME_PATTERN.test(nextTime) || assignment.volunteerId === null) return;
                      const command: EditAssignmentCommand = {
                        type: 'EDIT_ASSIGNMENT',
                        actor: 'human',
                        expectedDraftVersion: draft.version,
                        requestId: request.id,
                        patch: {
                          volunteerId: assignment.volunteerId,
                          startTime: nextTime as TimeOfDay,
                          status: 'planned',
                        },
                      };
                      void executeCommand(
                        onCommand,
                        onAnnouncement,
                        command,
                        `${request.id} start-time change accepted.`,
                      );
                    }}
                  />
                  <span id={hintId} className="assignment-field-hint">
                    Request window {request.timeWindow.start}–{request.timeWindow.end}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className={`lock-button ${assignment.lockedByHuman ? 'is-locked' : ''}`}
                    aria-label={`${assignment.lockedByHuman ? 'Unlock' : 'Lock'} assignment for ${
                      request.id
                    }`}
                    aria-pressed={assignment.lockedByHuman}
                    disabled={unassigned}
                    onClick={() => {
                      const command: LockAssignmentCommand | UnlockAssignmentCommand = {
                        type: assignment.lockedByHuman
                          ? 'UNLOCK_ASSIGNMENT'
                          : 'LOCK_ASSIGNMENT',
                        actor: 'human',
                        expectedDraftVersion: draft.version,
                        requestId: request.id,
                      };
                      void executeCommand(
                        onCommand,
                        onAnnouncement,
                        command,
                        `${request.id} ${assignment.lockedByHuman ? 'unlock' : 'lock'} accepted.`,
                      );
                    }}
                  >
                    {assignment.lockedByHuman ? 'Unlock' : 'Lock'}
                  </button>
                  <span className="assignment-actor">
                    Last accepted change: {actorLabel(assignment)}
                  </span>
                  {assignment.lockedByHuman ? (
                    <span id={lockHelperId} className="assignment-lock-helper">
                      Locked by the coordinator. Agent revisions cannot change this assignment.
                    </span>
                  ) : null}
                </td>
                <td>
                  {rowIssues.length === 0 ? (
                    <span className="assignment-no-issues">Clear</span>
                  ) : (
                    <div className="assignment-issue-badges">
                      {rowIssues.map((indexedIssue) => (
                        <button
                          key={`${indexedIssue.index}-${indexedIssue.issue.code}`}
                          type="button"
                          className={`assignment-issue-badge assignment-issue-badge--${
                            indexedIssue.issue.severity
                          }`}
                          aria-label={`Focus ${indexedIssue.issue.code} validation issue for ${
                            request.id
                          }`}
                          onClick={() => focusValidationIssue(indexedIssue)}
                        >
                          {indexedIssue.issue.code}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

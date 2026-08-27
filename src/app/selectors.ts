import type {
  AppState,
  Assignment,
  AuditEvent,
  Language,
  Priority,
  RequestId,
  RequestType,
  Skill,
  TimeWindow,
  ValidationIssue,
  VolunteerId,
  WorkflowState,
  Zone,
} from '../domain/types.ts';

export interface CoordinationOverviewView {
  readonly scenarioId: string;
  readonly date: string;
  readonly timezone: 'Asia/Riyadh';
  readonly workflowState: WorkflowState;
  readonly requestCount: number;
  readonly volunteerCount: number;
  readonly assignedRequestCount: number;
  readonly unassignedRequestCount: number;
  readonly draftVersion: number | null;
  readonly validationErrorCount: number;
  readonly validationWarningCount: number;
  readonly auditEventCount: number;
}

export interface PublicRequestView {
  readonly id: RequestId;
  readonly type: RequestType;
  readonly priority: Priority;
  readonly zone: Zone;
  readonly timeWindow: TimeWindow;
  readonly durationMinutes: number;
  readonly requiredSkills: readonly Skill[];
  readonly requiredLanguages: readonly Language[];
  readonly status: 'open' | 'assigned';
  readonly untrustedNote: string;
}

export interface PublicVolunteerView {
  readonly id: VolunteerId;
  readonly zone: Zone;
  readonly skills: readonly Skill[];
  readonly languages: readonly Language[];
  readonly capacity: number;
  readonly availability: TimeWindow;
  readonly status: 'available';
  readonly assignedCount: number;
}

export interface PublicAssignmentView {
  readonly requestId: RequestId;
  readonly volunteerId: VolunteerId | null;
  readonly startTime: Assignment['startTime'];
  readonly durationMinutes: number;
  readonly status: Assignment['status'];
  readonly lockedByHuman: boolean;
}

export interface PublicValidationIssueView {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly requestIds: readonly RequestId[];
  readonly volunteerId?: VolunteerId;
}

export interface AssignmentDraftView {
  readonly id: string;
  readonly version: number;
  readonly workflowState: 'DRAFT_INVALID' | 'DRAFT_VALID' | 'AWAITING_APPROVAL' | 'APPROVED';
  readonly valid: boolean;
  readonly assignments: readonly PublicAssignmentView[];
  readonly errors: readonly PublicValidationIssueView[];
  readonly warnings: readonly PublicValidationIssueView[];
}

export interface CommittedPlanView {
  readonly id: string;
  readonly draftVersion: number;
  readonly committedAt: string;
  readonly assignments: readonly PublicAssignmentView[];
  readonly assignedRequestCount: number;
  readonly unassignedRequestIds: readonly RequestId[];
}

export interface AuditEventView {
  readonly id: string;
  readonly sequence: number;
  readonly type: string;
  readonly actor: AuditEvent['actor'];
  readonly timestamp: string;
  readonly draftVersion: number | null;
  readonly safeSummary: string;
}

export interface DispatchContactView {
  readonly requestId: RequestId;
  readonly recipientAlias: string;
  readonly fictionalLocation: string;
  readonly fictionalContactChannel: string;
  readonly boundedInstructions: string;
}

export type DispatchContactErrorCode =
  'INVALID_INPUT' | 'INVALID_STATE' | 'UNKNOWN_REQUEST' | 'REQUEST_NOT_ASSIGNED';

export type DispatchContactSelection =
  | {
      readonly ok: true;
      readonly contacts: readonly DispatchContactView[];
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: DispatchContactErrorCode;
        readonly message: DispatchContactErrorCode;
      };
    };

function freezeArray<Value>(values: readonly Value[]): readonly Value[] {
  return Object.freeze([...values]);
}

function boundedText(value: string, maximumCharacters: number): string {
  return value.slice(0, maximumCharacters);
}

function currentAssignments(state: AppState): readonly Assignment[] {
  return state.draft?.assignments ?? state.committedPlan?.assignments ?? [];
}

function assignmentView(assignment: Assignment): PublicAssignmentView {
  return Object.freeze({
    requestId: assignment.requestId,
    volunteerId: assignment.volunteerId,
    startTime: assignment.startTime,
    durationMinutes: assignment.durationMinutes,
    status: assignment.status,
    lockedByHuman: assignment.lockedByHuman,
  });
}

function issueView(issue: ValidationIssue): PublicValidationIssueView {
  const base = {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    requestIds: freezeArray(issue.requestIds),
  };
  return Object.freeze(
    issue.volunteerId === undefined ? base : { ...base, volunteerId: issue.volunteerId },
  );
}

function contactFailure(code: DispatchContactErrorCode): DispatchContactSelection {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, message: code }),
  });
}

export function selectCoordinationOverview(state: AppState): CoordinationOverviewView {
  const assignments = currentAssignments(state);
  const assignedRequestCount = assignments.filter(
    ({ status, volunteerId }) => status !== 'unassigned' && volunteerId !== null,
  ).length;
  const validation = state.draft?.validation;

  return Object.freeze({
    scenarioId: state.scenario.id,
    date: state.scenario.date,
    timezone: state.scenario.timezone,
    workflowState: state.workflowState,
    requestCount: state.scenario.requests.length,
    volunteerCount: state.scenario.volunteers.length,
    assignedRequestCount,
    unassignedRequestCount: state.scenario.requests.length - assignedRequestCount,
    draftVersion: state.draft?.version ?? state.committedPlan?.draftVersion ?? null,
    validationErrorCount: validation?.errors.length ?? 0,
    validationWarningCount: validation?.warnings.length ?? 0,
    auditEventCount: state.auditHistory.length,
  });
}

export function selectOpenRequests(state: AppState): readonly PublicRequestView[] {
  return freezeArray(
    state.scenario.requests
      .filter(({ status }) => status === 'open')
      .map((request) =>
        Object.freeze({
          id: request.id,
          type: request.type,
          priority: request.priority,
          zone: request.zone,
          timeWindow: Object.freeze({
            start: request.timeWindow.start,
            end: request.timeWindow.end,
          }),
          durationMinutes: request.durationMinutes,
          requiredSkills: freezeArray(request.requiredSkills),
          requiredLanguages: freezeArray(request.requiredLanguages),
          status: request.status,
          untrustedNote: boundedText(request.untrustedNote, 240),
        }),
      ),
  );
}

export function selectAvailableVolunteers(state: AppState): readonly PublicVolunteerView[] {
  const counts = new Map<VolunteerId, number>();
  for (const assignment of currentAssignments(state)) {
    if (assignment.status !== 'unassigned' && assignment.volunteerId !== null) {
      counts.set(assignment.volunteerId, (counts.get(assignment.volunteerId) ?? 0) + 1);
    }
  }

  return freezeArray(
    state.scenario.volunteers.map((volunteer) =>
      Object.freeze({
        id: volunteer.id,
        zone: volunteer.zone,
        skills: freezeArray(volunteer.skills),
        languages: freezeArray(volunteer.languages),
        capacity: volunteer.capacity,
        availability: Object.freeze({
          start: volunteer.availability.start,
          end: volunteer.availability.end,
        }),
        status: volunteer.status,
        assignedCount: counts.get(volunteer.id) ?? 0,
      }),
    ),
  );
}

export function selectAssignmentDraft(state: AppState): AssignmentDraftView | null {
  if (state.draft === null) return null;

  return Object.freeze({
    id: state.draft.id,
    version: state.draft.version,
    workflowState: state.workflowState,
    valid: state.draft.validation.valid,
    assignments: freezeArray(state.draft.assignments.map(assignmentView)),
    errors: freezeArray(state.draft.validation.errors.map(issueView)),
    warnings: freezeArray(state.draft.validation.warnings.map(issueView)),
  });
}

export function selectCommittedPlan(state: AppState): CommittedPlanView | null {
  if (state.workflowState !== 'COMMITTED') return null;

  const assignments = freezeArray(state.committedPlan.assignments.map(assignmentView));
  const unassignedRequestIds = freezeArray(
    state.committedPlan.assignments
      .filter(({ status, volunteerId }) => status === 'unassigned' || volunteerId === null)
      .map(({ requestId }) => requestId),
  );

  return Object.freeze({
    id: state.committedPlan.id,
    draftVersion: state.committedPlan.draftVersion,
    committedAt: state.committedPlan.committedAt,
    assignments,
    assignedRequestCount: assignments.length - unassignedRequestIds.length,
    unassignedRequestIds,
  });
}

export function selectAuditHistory(state: AppState): readonly AuditEventView[] {
  return freezeArray(
    state.auditHistory.map((event) =>
      Object.freeze({
        id: event.id,
        sequence: event.sequence,
        type: event.type,
        actor: event.actor,
        timestamp: event.timestamp,
        draftVersion: event.draftVersion,
        safeSummary: boundedText(event.safeSummary, 200),
      }),
    ),
  );
}

export function selectDispatchContacts(
  state: AppState,
  requestIds: readonly RequestId[],
): DispatchContactSelection {
  if (state.workflowState !== 'COMMITTED') return contactFailure('INVALID_STATE');
  if (
    requestIds.length === 0 ||
    requestIds.length > state.scenario.requests.length ||
    new Set(requestIds).size !== requestIds.length
  ) {
    return contactFailure('INVALID_INPUT');
  }

  const requestsById = new Map(state.scenario.requests.map((request) => [request.id, request]));
  const assignmentsByRequest = new Map(
    state.committedPlan.assignments.map((assignment) => [assignment.requestId, assignment]),
  );
  const contacts: DispatchContactView[] = [];

  for (const id of requestIds) {
    const request = requestsById.get(id);
    if (request === undefined) return contactFailure('UNKNOWN_REQUEST');

    const assignment = assignmentsByRequest.get(id);
    if (assignment?.status !== 'committed' || assignment.volunteerId === null) {
      return contactFailure('REQUEST_NOT_ASSIGNED');
    }

    const contact = state.scenario.privateContacts[id];
    if (contact === undefined) return contactFailure('UNKNOWN_REQUEST');

    contacts.push(
      Object.freeze({
        requestId: id,
        recipientAlias: contact.recipientAlias,
        fictionalLocation: contact.fictionalLocation,
        fictionalContactChannel: contact.fictionalContactChannel,
        boundedInstructions: boundedText(request.untrustedNote, 240),
      }),
    );
  }

  return Object.freeze({ ok: true, contacts: freezeArray(contacts) });
}

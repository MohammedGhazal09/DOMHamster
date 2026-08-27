import type { AuditEventType } from '../domain/audit.ts';
import type { ClockPort, IdPort, StatePersistencePort, StoragePort } from '../app/ports.ts';
import { normalizeRehydratedState } from '../domain/state-machine.ts';
import type {
  AppState,
  ApprovalRecord,
  Assignment,
  AuditEvent,
  CommittedPlan,
  Draft,
  DraftState,
  PlanId,
  ReadyState,
  RequestId,
  Scenario,
  TimeOfDay,
  VolunteerId,
} from '../domain/types.ts';
import { requestId, volunteerId } from '../domain/types.ts';
import { validateDraft, type HumanLockSnapshot } from '../domain/validation.ts';

export const DOMHAMSTER_STORAGE_KEY = 'domhamster:v1';
export const PERSISTENCE_SCHEMA_VERSION = 1;

export type PersistenceRecoveryCode =
  | 'MALFORMED_JSON'
  | 'SCHEMA_MISMATCH'
  | 'FIXTURE_MISMATCH'
  | 'INVALID_STATE'
  | 'PERSISTENCE_READ_FAILED';

export interface PersistenceRecovery {
  readonly code: PersistenceRecoveryCode;
  readonly message: 'Saved DOMHamster data was reset safely.';
}

export interface PersistenceLoadResult {
  readonly state: AppState;
  readonly recovery: PersistenceRecovery | null;
}

export interface LocalStorageRepository extends StatePersistencePort {
  load(): PersistenceLoadResult;
  clear(): void;
}

export interface LocalStorageRepositoryDependencies {
  readonly storage: StoragePort;
  readonly scenario: Scenario;
  readonly fixtureVersion: string;
  readonly fixtureHash: string;
  readonly clock: ClockPort;
  readonly ids: Pick<IdPort, 'nextAuditEventId'>;
}

export class PersistenceWriteError extends Error {
  readonly code = 'PERSISTENCE_WRITE_FAILED' as const;

  constructor() {
    super('PERSISTENCE_WRITE_FAILED');
    this.name = 'PersistenceWriteError';
  }
}

type JsonRecord = Record<string, unknown>;

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const WORKFLOW_STATES = new Set([
  'READY',
  'DRAFT_INVALID',
  'DRAFT_VALID',
  'AWAITING_APPROVAL',
  'APPROVED',
  'COMMITTED',
]);
const ASSIGNMENT_STATUSES = new Set(['planned', 'committed', 'unassigned']);
const CONTROL_PATTERN = /\p{Cc}/u;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const AUDIT_EVENT_TYPES = new Set<AuditEventType>([
  'SCENARIO_RESET',
  'DRAFT_CREATED',
  'DRAFT_REVISED',
  'ASSIGNMENT_LOCKED',
  'ASSIGNMENT_UNLOCKED',
  'DRAFT_DISCARDED',
  'APPROVAL_REQUESTED',
  'APPROVAL_APPROVED',
  'APPROVAL_REJECTED',
  'APPROVAL_CANCELLED',
  'APPROVAL_EXPIRED',
  'APPROVAL_INVALIDATED_RELOAD',
  'PLAN_COMMITTED',
  'CONTACTS_ACCESSED',
]);

function isAuditEventType(value: unknown): value is AuditEventType {
  return typeof value === 'string' && AUDIT_EVENT_TYPES.has(value as AuditEventType);
}

function isAuditActor(value: unknown): value is AuditEvent['actor'] {
  return value === 'human' || value === 'agent' || value === 'system';
}

function isNullablePositiveInteger(value: unknown): value is number | null {
  return value === null || isPositiveInteger(value);
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_TIMESTAMP_PATTERN.test(value)) return false;
  return new Date(value).toISOString() === value;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) {
      deepFreeze(entry);
    }
  }
  return value;
}

function readyState(scenario: Scenario): ReadyState {
  return Object.freeze({
    workflowState: 'READY',
    scenario,
    draft: null,
    approval: null,
    committedPlan: null,
    auditHistory: Object.freeze([]),
  });
}

function recovery(scenario: Scenario, code: PersistenceRecoveryCode): PersistenceLoadResult {
  return Object.freeze({
    state: readyState(scenario),
    recovery: Object.freeze({
      code,
      message: 'Saved DOMHamster data was reset safely.',
    }),
  });
}

function requestIds(scenario: Scenario): ReadonlySet<string> {
  return new Set(scenario.requests.map(({ id }) => id));
}

function volunteerIds(scenario: Scenario): ReadonlySet<string> {
  return new Set(scenario.volunteers.map(({ id }) => id));
}

function parseRequestId(value: unknown, scenario: Scenario): RequestId | null {
  if (typeof value !== 'string' || !requestIds(scenario).has(value)) return null;
  try {
    return requestId(value);
  } catch {
    return null;
  }
}

function parseVolunteerId(value: unknown, scenario: Scenario): VolunteerId | null {
  if (typeof value !== 'string' || !volunteerIds(scenario).has(value)) return null;
  try {
    return volunteerId(value);
  } catch {
    return null;
  }
}

function parseTime(value: unknown): TimeOfDay | null {
  return typeof value === 'string' && TIME_PATTERN.test(value) ? (value as TimeOfDay) : null;
}

function parseAssignment(value: unknown, scenario: Scenario): Assignment | null {
  if (!isRecord(value)) return null;
  const parsedRequestId = parseRequestId(value.requestId, scenario);
  const parsedVolunteerId =
    value.volunteerId === null ? null : parseVolunteerId(value.volunteerId, scenario);
  const parsedStartTime = value.startTime === null ? null : parseTime(value.startTime);

  if (
    parsedRequestId === null ||
    (value.volunteerId !== null && parsedVolunteerId === null) ||
    (value.startTime !== null && parsedStartTime === null) ||
    !isPositiveInteger(value.durationMinutes) ||
    typeof value.status !== 'string' ||
    !ASSIGNMENT_STATUSES.has(value.status) ||
    typeof value.lockedByHuman !== 'boolean'
  ) {
    return null;
  }

  return Object.freeze({
    requestId: parsedRequestId,
    volunteerId: parsedVolunteerId,
    startTime: parsedStartTime,
    durationMinutes: value.durationMinutes,
    status: value.status as Assignment['status'],
    lockedByHuman: value.lockedByHuman,
  });
}

function parseAssignments(
  value: unknown,
  scenario: Scenario,
  allowedStatuses: ReadonlySet<Assignment['status']>,
): readonly Assignment[] | null {
  if (!Array.isArray(value) || value.length !== scenario.requests.length) return null;
  const parsed: Assignment[] = [];
  const seen = new Set<RequestId>();

  for (const entry of value) {
    const assignment = parseAssignment(entry, scenario);
    if (
      assignment === null ||
      !allowedStatuses.has(assignment.status) ||
      seen.has(assignment.requestId)
    ) {
      return null;
    }
    seen.add(assignment.requestId);
    parsed.push(assignment);
  }

  if (seen.size !== scenario.requests.length) return null;
  return Object.freeze(parsed);
}

function humanLocks(assignments: readonly Assignment[]): readonly HumanLockSnapshot[] {
  return Object.freeze(
    assignments
      .filter(({ lockedByHuman }) => lockedByHuman)
      .map(
        ({ requestId: id, volunteerId: assignedVolunteer, startTime, durationMinutes, status }) =>
          Object.freeze({
            requestId: id,
            volunteerId: assignedVolunteer,
            startTime,
            durationMinutes,
            status,
          }),
      ),
  );
}

function parseDraft(value: unknown, scenario: Scenario): Draft | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !isPositiveInteger(value.version)
  ) {
    return null;
  }
  const assignments = parseAssignments(
    value.assignments,
    scenario,
    new Set<Assignment['status']>(['planned', 'unassigned']),
  );
  if (assignments === null) return null;

  const validation = validateDraft({ scenario, assignments, humanLocks: humanLocks(assignments) });
  return Object.freeze({
    id: value.id as PlanId,
    version: value.version,
    assignments,
    validation,
  });
}

function parseApproval<Status extends 'pending' | 'approved'>(
  value: unknown,
  draftVersion: number,
  requiredStatus: Status,
): (ApprovalRecord & { readonly status: Status }) | null {
  if (
    !isRecord(value) ||
    value.draftVersion !== draftVersion ||
    value.status !== requiredStatus ||
    !isIsoTimestamp(value.createdAt) ||
    !isIsoTimestamp(value.expiresAt) ||
    (value.decidedAt !== undefined && !isIsoTimestamp(value.decidedAt))
  ) {
    return null;
  }

  const base = {
    draftVersion,
    status: requiredStatus,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
  };
  return Object.freeze(
    value.decidedAt === undefined ? base : { ...base, decidedAt: value.decidedAt },
  );
}

function parseCommittedPlan(value: unknown, scenario: Scenario): CommittedPlan | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !isPositiveInteger(value.draftVersion) ||
    !isIsoTimestamp(value.committedAt)
  ) {
    return null;
  }
  const assignments = parseAssignments(
    value.assignments,
    scenario,
    new Set<Assignment['status']>(['committed', 'unassigned']),
  );
  if (assignments === null) return null;

  const validation = validateDraft({ scenario, assignments, humanLocks: humanLocks(assignments) });
  if (!validation.valid) return null;

  return Object.freeze({
    id: value.id as PlanId,
    draftVersion: value.draftVersion,
    assignments,
    committedAt: value.committedAt,
  });
}

function parseAuditHistory(value: unknown): readonly AuditEvent[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const events: AuditEvent[] = [];
  let previousSequence = 0;
  const seenIds = new Set<string>();

  for (const entry of value) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      entry.id.length === 0 ||
      seenIds.has(entry.id) ||
      !isPositiveInteger(entry.sequence) ||
      entry.sequence <= previousSequence ||
      !isAuditEventType(entry.type) ||
      !isAuditActor(entry.actor) ||
      !isIsoTimestamp(entry.timestamp) ||
      !isNullablePositiveInteger(entry.draftVersion) ||
      typeof entry.safeSummary !== 'string' ||
      entry.safeSummary.length === 0 ||
      entry.safeSummary.length > 160 ||
      CONTROL_PATTERN.test(entry.safeSummary)
    ) {
      return null;
    }

    seenIds.add(entry.id);
    previousSequence = entry.sequence;
    events.push(
      Object.freeze({
        id: entry.id as AuditEvent['id'],
        sequence: entry.sequence,
        type: entry.type,
        actor: entry.actor,
        timestamp: entry.timestamp,
        draftVersion: entry.draftVersion,
        safeSummary: entry.safeSummary,
      }),
    );
  }

  return Object.freeze(events);
}

function parsePersistedState(value: unknown, scenario: Scenario): AppState | null {
  if (
    !isRecord(value) ||
    typeof value.workflowState !== 'string' ||
    !WORKFLOW_STATES.has(value.workflowState)
  ) {
    return null;
  }
  const auditHistory = parseAuditHistory(value.auditHistory);
  if (auditHistory === null) return null;

  switch (value.workflowState) {
    case 'READY':
      if (value.draft !== null || value.approval !== null || value.committedPlan !== null) {
        return null;
      }
      return Object.freeze({
        workflowState: 'READY',
        scenario,
        draft: null,
        approval: null,
        committedPlan: null,
        auditHistory,
      });

    case 'DRAFT_INVALID':
    case 'DRAFT_VALID': {
      if (value.approval !== null || value.committedPlan !== null) return null;
      const draft = parseDraft(value.draft, scenario);
      if (draft === null) return null;
      return Object.freeze({
        workflowState: value.workflowState,
        scenario,
        draft,
        approval: null,
        committedPlan: null,
        auditHistory,
      } satisfies DraftState);
    }

    case 'AWAITING_APPROVAL': {
      if (value.committedPlan !== null) return null;
      const draft = parseDraft(value.draft, scenario);
      if (draft === null) return null;
      const approval = parseApproval(value.approval, draft.version, 'pending');
      if (approval === null) return null;
      return Object.freeze({
        workflowState: 'AWAITING_APPROVAL',
        scenario,
        draft,
        approval,
        committedPlan: null,
        auditHistory,
      });
    }

    case 'APPROVED': {
      if (value.committedPlan !== null) return null;
      const draft = parseDraft(value.draft, scenario);
      if (draft === null) return null;
      const approval = parseApproval(value.approval, draft.version, 'approved');
      if (approval === null) return null;
      return Object.freeze({
        workflowState: 'APPROVED',
        scenario,
        draft,
        approval,
        committedPlan: null,
        auditHistory,
      });
    }

    case 'COMMITTED': {
      if (value.draft !== null || value.approval !== null) return null;
      const committedPlan = parseCommittedPlan(value.committedPlan, scenario);
      if (committedPlan === null) return null;
      return Object.freeze({
        workflowState: 'COMMITTED',
        scenario,
        draft: null,
        approval: null,
        committedPlan,
        auditHistory,
      });
    }
  }

  return null;
}

function serializeState(state: AppState): JsonRecord {
  return {
    workflowState: state.workflowState,
    draft: state.draft,
    approval: state.approval,
    committedPlan: state.committedPlan,
    auditHistory: state.auditHistory,
  };
}

export function createLocalStorageRepository(
  dependencies: LocalStorageRepositoryDependencies,
): LocalStorageRepository {
  const auditDependencies = {
    now: () => dependencies.clock.now(),
    nextAuditEventId: () => dependencies.ids.nextAuditEventId(),
  };

  function load(): PersistenceLoadResult {
    let raw: string | null;
    try {
      raw = dependencies.storage.getItem(DOMHAMSTER_STORAGE_KEY);
    } catch {
      return recovery(dependencies.scenario, 'PERSISTENCE_READ_FAILED');
    }

    if (raw === null) {
      return Object.freeze({ state: readyState(dependencies.scenario), recovery: null });
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(raw) as unknown;
    } catch {
      return recovery(dependencies.scenario, 'MALFORMED_JSON');
    }

    if (!isRecord(envelope) || envelope.schemaVersion !== PERSISTENCE_SCHEMA_VERSION) {
      return recovery(dependencies.scenario, 'SCHEMA_MISMATCH');
    }
    if (
      envelope.fixtureVersion !== dependencies.fixtureVersion ||
      envelope.fixtureHash !== dependencies.fixtureHash
    ) {
      return recovery(dependencies.scenario, 'FIXTURE_MISMATCH');
    }
    if (!isIsoTimestamp(envelope.savedAt)) {
      return recovery(dependencies.scenario, 'INVALID_STATE');
    }

    const parsed = parsePersistedState(envelope.state, dependencies.scenario);
    if (parsed === null) return recovery(dependencies.scenario, 'INVALID_STATE');

    const normalized = normalizeRehydratedState(parsed, auditDependencies);
    return Object.freeze({ state: deepFreeze(normalized), recovery: null });
  }

  function save(state: AppState): void {
    const envelope = {
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      fixtureVersion: dependencies.fixtureVersion,
      fixtureHash: dependencies.fixtureHash,
      savedAt: dependencies.clock.now(),
      state: serializeState(state),
    };

    try {
      dependencies.storage.setItem(DOMHAMSTER_STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      throw new PersistenceWriteError();
    }
  }

  function clear(): void {
    try {
      dependencies.storage.removeItem(DOMHAMSTER_STORAGE_KEY);
    } catch {
      throw new PersistenceWriteError();
    }
  }

  return Object.freeze({ load, save, clear });
}

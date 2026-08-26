import {
  appendAuditEvent,
  resetAuditHistory,
  type AuditDependencies,
  type AuditEventType,
} from './audit.ts';
import { canTransition, classifyDraft, type CommandActor } from './state-machine.ts';
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
  ValidationIssue,
  ValidationResult,
} from './types.ts';
import { validateDraft, type HumanLockSnapshot } from './validation.ts';

const APPROVAL_TTL_MILLISECONDS = 120_000;

export type CommandErrorCode =
  | 'INVALID_STATE'
  | 'INVALID_INPUT'
  | 'STALE_DRAFT_VERSION'
  | 'LOCKED_ASSIGNMENT_CHANGE'
  | 'UNKNOWN_REQUEST'
  | 'UNKNOWN_VOLUNTEER'
  | 'ASSIGNMENT_NOT_FOUND'
  | 'APPROVAL_NOT_EXPIRED'
  | 'APPROVAL_EXPIRED'
  | 'DRAFT_INVALID'
  | 'COMMIT_ALREADY_COMPLETED';

export interface CommandError {
  readonly code: CommandErrorCode;
  readonly message: string;
}

export interface CommandDependencies extends AuditDependencies {
  readonly scenario: Scenario;
  readonly nextPlanId: () => PlanId;
}

interface CommandBase {
  readonly actor: CommandActor;
}

export interface ResetDemoCommand extends CommandBase {
  readonly type: 'RESET_DEMO';
}

export interface CreateDraftCommand extends CommandBase {
  readonly type: 'CREATE_DRAFT';
  readonly assignments: readonly Assignment[];
}

export interface ReviseDraftCommand extends CommandBase {
  readonly type: 'REVISE_DRAFT';
  readonly expectedDraftVersion: number;
  readonly assignments: readonly Assignment[];
}

export type AssignmentPatch = Partial<
  Pick<Assignment, 'volunteerId' | 'startTime' | 'durationMinutes' | 'status'>
>;

export interface EditAssignmentCommand extends CommandBase {
  readonly type: 'EDIT_ASSIGNMENT';
  readonly expectedDraftVersion: number;
  readonly requestId: RequestId;
  readonly patch: AssignmentPatch;
}

export interface LockAssignmentCommand extends CommandBase {
  readonly type: 'LOCK_ASSIGNMENT';
  readonly expectedDraftVersion: number;
  readonly requestId: RequestId;
}

export interface UnlockAssignmentCommand extends CommandBase {
  readonly type: 'UNLOCK_ASSIGNMENT';
  readonly expectedDraftVersion: number;
  readonly requestId: RequestId;
}

export interface DiscardDraftCommand extends CommandBase {
  readonly type: 'DISCARD_DRAFT';
}

export interface PrepareApprovalCommand extends CommandBase {
  readonly type: 'PREPARE_APPROVAL';
  readonly expectedDraftVersion: number;
}

export interface ApprovalDecisionCommand extends CommandBase {
  readonly type: 'APPROVE' | 'REJECT' | 'CANCEL_APPROVAL';
  readonly expectedDraftVersion: number;
}

export interface ApprovalExpiresCommand extends CommandBase {
  readonly type: 'APPROVAL_EXPIRES';
}

export interface CommitPlanCommand extends CommandBase {
  readonly type: 'COMMIT_PLAN';
  readonly expectedDraftVersion: number;
}

export type Command =
  | ResetDemoCommand
  | CreateDraftCommand
  | ReviseDraftCommand
  | EditAssignmentCommand
  | LockAssignmentCommand
  | UnlockAssignmentCommand
  | DiscardDraftCommand
  | PrepareApprovalCommand
  | ApprovalDecisionCommand
  | ApprovalExpiresCommand
  | CommitPlanCommand;

export type CommandResult =
  | {
      readonly ok: true;
      readonly state: AppState;
    }
  | {
      readonly ok: false;
      readonly state: AppState;
      readonly error: CommandError;
    };

function success(state: AppState): CommandResult {
  return Object.freeze({ ok: true, state });
}

function failure(state: AppState, code: CommandErrorCode): CommandResult {
  return Object.freeze({
    ok: false,
    state,
    error: Object.freeze({ code, message: code }),
  });
}

function freezeIssue(issue: ValidationIssue): ValidationIssue {
  const base = {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    requestIds: Object.freeze([...issue.requestIds]),
  };
  return Object.freeze(
    issue.volunteerId === undefined ? base : { ...base, volunteerId: issue.volunteerId },
  );
}

function freezeValidation(validation: ValidationResult): ValidationResult {
  return Object.freeze({
    valid: validation.valid,
    errors: Object.freeze(validation.errors.map(freezeIssue)),
    warnings: Object.freeze(validation.warnings.map(freezeIssue)),
  });
}

function freezeAssignments(assignments: readonly Assignment[]): readonly Assignment[] {
  return Object.freeze(assignments.map((assignment) => Object.freeze({ ...assignment })));
}

function humanLocks(assignments: readonly Assignment[]): readonly HumanLockSnapshot[] {
  return Object.freeze(
    assignments
      .filter(({ lockedByHuman }) => lockedByHuman)
      .map(({ requestId, volunteerId, startTime, durationMinutes, status }) =>
        Object.freeze({ requestId, volunteerId, startTime, durationMinutes, status }),
      ),
  );
}

function validate(
  scenario: Scenario,
  assignments: readonly Assignment[],
  locks: readonly HumanLockSnapshot[] = humanLocks(assignments),
): ValidationResult {
  return freezeValidation(
    validateDraft({
      scenario,
      assignments,
      humanLocks: locks,
    }),
  );
}

function freezeDraft(
  id: PlanId,
  version: number,
  assignments: readonly Assignment[],
  validation: ValidationResult,
): Draft {
  return Object.freeze({
    id,
    version,
    assignments: freezeAssignments(assignments),
    validation: freezeValidation(validation),
  });
}

function buildDraftState(
  state: AppState,
  draft: Draft,
  auditHistory: readonly AuditEvent[],
): DraftState {
  return Object.freeze({
    workflowState: classifyDraft(draft),
    scenario: state.scenario,
    draft,
    approval: null,
    committedPlan: null,
    auditHistory,
  });
}

function append(
  state: AppState,
  type: AuditEventType,
  actor: CommandActor,
  draftVersion: number | null,
  safeSummary: string,
  dependencies: CommandDependencies,
): readonly AuditEvent[] {
  return appendAuditEvent(
    state.auditHistory,
    { type, actor, draftVersion, safeSummary },
    dependencies,
  );
}

function addMilliseconds(isoTimestamp: string, milliseconds: number): string {
  return new Date(Date.parse(isoTimestamp) + milliseconds).toISOString();
}

function isAtOrAfter(left: string, right: string): boolean {
  return Date.parse(left) >= Date.parse(right);
}

function structurallyValidVersion(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function containsCommittedDraftStatus(assignments: readonly Assignment[]): boolean {
  return assignments.some(({ status }) => status === 'committed');
}

function accountingError(
  scenario: Scenario,
  assignments: readonly Assignment[],
): CommandErrorCode | null {
  if (containsCommittedDraftStatus(assignments)) {
    return 'INVALID_INPUT';
  }

  const knownRequests = new Set(scenario.requests.map(({ id }) => id));
  const knownVolunteers = new Set(scenario.volunteers.map(({ id }) => id));
  const counts = new Map<RequestId, number>();

  for (const assignment of assignments) {
    if (!knownRequests.has(assignment.requestId)) {
      return 'UNKNOWN_REQUEST';
    }
    if (assignment.volunteerId !== null && !knownVolunteers.has(assignment.volunteerId)) {
      return 'UNKNOWN_VOLUNTEER';
    }
    counts.set(assignment.requestId, (counts.get(assignment.requestId) ?? 0) + 1);
  }

  if (
    assignments.length !== scenario.requests.length ||
    scenario.requests.some(({ id }) => counts.get(id) !== 1)
  ) {
    return 'INVALID_INPUT';
  }

  return null;
}

function orderedAssignments(
  scenario: Scenario,
  assignments: readonly Assignment[],
): readonly Assignment[] {
  const byRequest = new Map(assignments.map((assignment) => [assignment.requestId, assignment]));
  return Object.freeze(
    scenario.requests.map(({ id }) => {
      const assignment = byRequest.get(id);
      if (assignment === undefined) {
        throw new Error('DOMHAMSTER_ASSIGNMENT_ACCOUNTING_INVARIANT');
      }
      return Object.freeze({ ...assignment });
    }),
  );
}

function sameAssignment(left: Assignment, right: Assignment): boolean {
  return (
    left.requestId === right.requestId &&
    left.volunteerId === right.volunteerId &&
    left.startTime === right.startTime &&
    left.durationMinutes === right.durationMinutes &&
    left.status === right.status &&
    left.lockedByHuman === right.lockedByHuman
  );
}

function lockPreservationError(
  previous: readonly Assignment[],
  proposed: readonly Assignment[],
): CommandErrorCode | null {
  const proposedByRequest = new Map(
    proposed.map((assignment) => [assignment.requestId, assignment]),
  );

  for (const previousAssignment of previous) {
    const nextAssignment = proposedByRequest.get(previousAssignment.requestId);
    if (nextAssignment === undefined) {
      return 'INVALID_INPUT';
    }
    if (previousAssignment.lockedByHuman && !sameAssignment(previousAssignment, nextAssignment)) {
      return 'LOCKED_ASSIGNMENT_CHANGE';
    }
    if (!previousAssignment.lockedByHuman && nextAssignment.lockedByHuman) {
      return 'LOCKED_ASSIGNMENT_CHANGE';
    }
  }

  return null;
}

function exactVersion(state: Extract<AppState, { draft: Draft }>, expected: number): boolean {
  return structurallyValidVersion(expected) && state.draft.version === expected;
}

function findAssignmentIndex(assignments: readonly Assignment[], requestId: RequestId): number {
  return assignments.findIndex(({ requestId: candidate }) => candidate === requestId);
}

function updatedAssignment(assignment: Assignment, patch: AssignmentPatch): Assignment {
  return Object.freeze({
    ...assignment,
    ...(patch.volunteerId !== undefined ? { volunteerId: patch.volunteerId } : {}),
    ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
    ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
  });
}

function createDraft(
  state: ReadyState,
  command: CreateDraftCommand,
  dependencies: CommandDependencies,
): CommandResult {
  const structuralError = accountingError(state.scenario, command.assignments);
  if (structuralError !== null) return failure(state, structuralError);
  if (command.assignments.some(({ lockedByHuman }) => lockedByHuman)) {
    return failure(state, 'INVALID_INPUT');
  }

  const assignments = orderedAssignments(state.scenario, command.assignments);
  const draft = freezeDraft(
    dependencies.nextPlanId(),
    1,
    assignments,
    validate(state.scenario, assignments, []),
  );
  const auditHistory = append(
    state,
    'DRAFT_CREATED',
    command.actor,
    draft.version,
    'Agent created assignment draft version 1.',
    dependencies,
  );
  return success(buildDraftState(state, draft, auditHistory));
}

function reviseDraft(
  state: DraftState,
  command: ReviseDraftCommand,
  dependencies: CommandDependencies,
): CommandResult {
  if (!exactVersion(state, command.expectedDraftVersion)) {
    return failure(state, 'STALE_DRAFT_VERSION');
  }
  const structuralError = accountingError(state.scenario, command.assignments);
  if (structuralError !== null) return failure(state, structuralError);
  const lockError = lockPreservationError(state.draft.assignments, command.assignments);
  if (lockError !== null) return failure(state, lockError);

  const assignments = orderedAssignments(state.scenario, command.assignments);
  const version = state.draft.version + 1;
  const draft = freezeDraft(
    state.draft.id,
    version,
    assignments,
    validate(state.scenario, assignments, humanLocks(state.draft.assignments)),
  );
  const auditHistory = append(
    state,
    'DRAFT_REVISED',
    command.actor,
    version,
    `Agent revised assignment draft to version ${version}.`,
    dependencies,
  );
  return success(buildDraftState(state, draft, auditHistory));
}

function editAssignment(
  state: DraftState,
  command: EditAssignmentCommand,
  dependencies: CommandDependencies,
): CommandResult {
  if (!exactVersion(state, command.expectedDraftVersion)) {
    return failure(state, 'STALE_DRAFT_VERSION');
  }
  const index = findAssignmentIndex(state.draft.assignments, command.requestId);
  if (index < 0) return failure(state, 'ASSIGNMENT_NOT_FOUND');
  const current = state.draft.assignments[index];
  if (current === undefined) return failure(state, 'ASSIGNMENT_NOT_FOUND');
  if (current.lockedByHuman) return failure(state, 'LOCKED_ASSIGNMENT_CHANGE');

  const editedAssignment = updatedAssignment(current, command.patch);
  if (editedAssignment.status === 'committed') {
    return failure(state, 'INVALID_INPUT');
  }
  const assignments = state.draft.assignments.map((assignment, candidateIndex) =>
    candidateIndex === index ? editedAssignment : Object.freeze({ ...assignment }),
  );
  const version = state.draft.version + 1;
  const draft = freezeDraft(
    state.draft.id,
    version,
    assignments,
    validate(state.scenario, assignments),
  );
  const auditHistory = append(
    state,
    'DRAFT_REVISED',
    command.actor,
    version,
    `Human edited ${command.requestId}; draft advanced to version ${version}.`,
    dependencies,
  );
  return success(buildDraftState(state, draft, auditHistory));
}

function changeLock(
  state: DraftState,
  command: LockAssignmentCommand | UnlockAssignmentCommand,
  dependencies: CommandDependencies,
): CommandResult {
  if (!exactVersion(state, command.expectedDraftVersion)) {
    return failure(state, 'STALE_DRAFT_VERSION');
  }
  const index = findAssignmentIndex(state.draft.assignments, command.requestId);
  if (index < 0) return failure(state, 'ASSIGNMENT_NOT_FOUND');
  const current = state.draft.assignments[index];
  if (current === undefined) return failure(state, 'ASSIGNMENT_NOT_FOUND');
  if (containsCommittedDraftStatus(state.draft.assignments)) {
    return failure(state, 'INVALID_INPUT');
  }
  const locking = command.type === 'LOCK_ASSIGNMENT';
  if (locking && (current.status === 'unassigned' || current.lockedByHuman)) {
    return failure(state, 'INVALID_INPUT');
  }
  if (!locking && !current.lockedByHuman) {
    return failure(state, 'INVALID_INPUT');
  }

  const assignments = state.draft.assignments.map((assignment, candidateIndex) =>
    Object.freeze({
      ...assignment,
      ...(candidateIndex === index ? { lockedByHuman: locking } : {}),
    }),
  );
  const version = state.draft.version + 1;
  const draft = freezeDraft(
    state.draft.id,
    version,
    assignments,
    validate(state.scenario, assignments),
  );
  const eventType = locking ? 'ASSIGNMENT_LOCKED' : 'ASSIGNMENT_UNLOCKED';
  const auditHistory = append(
    state,
    eventType,
    command.actor,
    version,
    `Human ${locking ? 'locked' : 'unlocked'} ${command.requestId}; ` +
      `draft advanced to version ${version}.`,
    dependencies,
  );
  return success(buildDraftState(state, draft, auditHistory));
}

function discardDraft(
  state: Exclude<AppState, ReadyState | Extract<AppState, { workflowState: 'COMMITTED' }>>,
  command: DiscardDraftCommand,
  dependencies: CommandDependencies,
): CommandResult {
  const auditHistory = append(
    state,
    'DRAFT_DISCARDED',
    command.actor,
    state.draft.version,
    'Human discarded the current uncommitted draft.',
    dependencies,
  );
  return success(
    Object.freeze({
      workflowState: 'READY',
      scenario: state.scenario,
      draft: null,
      approval: null,
      committedPlan: null,
      auditHistory,
    } satisfies ReadyState),
  );
}

function prepareApproval(
  state: DraftState,
  command: PrepareApprovalCommand,
  dependencies: CommandDependencies,
): CommandResult {
  if (!exactVersion(state, command.expectedDraftVersion)) {
    return failure(state, 'STALE_DRAFT_VERSION');
  }
  if (containsCommittedDraftStatus(state.draft.assignments)) {
    return failure(state, 'INVALID_INPUT');
  }
  if (containsCommittedDraftStatus(state.draft.assignments)) {
    return failure(state, 'DRAFT_INVALID');
  }
  const validation = validate(state.scenario, state.draft.assignments);
  if (!validation.valid) return failure(state, 'DRAFT_INVALID');
  const draft = freezeDraft(
    state.draft.id,
    state.draft.version,
    state.draft.assignments,
    validation,
  );
  const createdAt = dependencies.now();
  const approval = Object.freeze({
    draftVersion: draft.version,
    status: 'pending',
    createdAt,
    expiresAt: addMilliseconds(createdAt, APPROVAL_TTL_MILLISECONDS),
  } satisfies ApprovalRecord & { readonly status: 'pending' });
  const auditHistory = append(
    state,
    'APPROVAL_REQUESTED',
    command.actor,
    draft.version,
    `Agent prepared human approval for draft version ${draft.version}.`,
    dependencies,
  );
  return success(
    Object.freeze({
      workflowState: 'AWAITING_APPROVAL',
      scenario: state.scenario,
      draft,
      approval,
      committedPlan: null,
      auditHistory,
    }),
  );
}

function decideApproval(
  state: Extract<AppState, { workflowState: 'AWAITING_APPROVAL' }>,
  command: ApprovalDecisionCommand,
  dependencies: CommandDependencies,
): CommandResult {
  if (!exactVersion(state, command.expectedDraftVersion)) {
    return failure(state, 'STALE_DRAFT_VERSION');
  }
  const decidedAt = dependencies.now();
  if (isAtOrAfter(decidedAt, state.approval.expiresAt)) {
    return failure(state, 'APPROVAL_EXPIRED');
  }

  if (command.type === 'APPROVE') {
    const approval = Object.freeze({
      draftVersion: state.draft.version,
      status: 'approved',
      createdAt: state.approval.createdAt,
      expiresAt: addMilliseconds(decidedAt, APPROVAL_TTL_MILLISECONDS),
      decidedAt,
    } satisfies ApprovalRecord & { readonly status: 'approved' });
    const auditHistory = append(
      state,
      'APPROVAL_APPROVED',
      command.actor,
      state.draft.version,
      `Human approved draft version ${state.draft.version}.`,
      dependencies,
    );
    return success(
      Object.freeze({
        workflowState: 'APPROVED',
        scenario: state.scenario,
        draft: state.draft,
        approval,
        committedPlan: null,
        auditHistory,
      }),
    );
  }

  const rejected = command.type === 'REJECT';
  const auditHistory = append(
    state,
    rejected ? 'APPROVAL_REJECTED' : 'APPROVAL_CANCELLED',
    command.actor,
    state.draft.version,
    rejected
      ? `Human rejected draft version ${state.draft.version}.`
      : `Human cancelled approval review for draft version ${state.draft.version}.`,
    dependencies,
  );
  return success(buildDraftState(state, state.draft, auditHistory));
}

function expireApproval(
  state: Extract<AppState, { workflowState: 'APPROVED' }>,
  command: ApprovalExpiresCommand,
  dependencies: CommandDependencies,
): CommandResult {
  if (!isAtOrAfter(dependencies.now(), state.approval.expiresAt)) {
    return failure(state, 'APPROVAL_NOT_EXPIRED');
  }
  const auditHistory = append(
    state,
    'APPROVAL_EXPIRED',
    command.actor,
    state.draft.version,
    `Approval expired for draft version ${state.draft.version}.`,
    dependencies,
  );
  return success(buildDraftState(state, state.draft, auditHistory));
}

function commitPlan(
  state: Extract<AppState, { workflowState: 'APPROVED' }>,
  command: CommitPlanCommand,
  dependencies: CommandDependencies,
): CommandResult {
  if (!exactVersion(state, command.expectedDraftVersion)) {
    return failure(state, 'STALE_DRAFT_VERSION');
  }
  const now = dependencies.now();
  if (isAtOrAfter(now, state.approval.expiresAt)) {
    return failure(state, 'APPROVAL_EXPIRED');
  }
  const validation = validate(state.scenario, state.draft.assignments);
  if (!validation.valid) return failure(state, 'DRAFT_INVALID');

  const assignments = freezeAssignments(
    state.draft.assignments.map((assignment) => ({
      ...assignment,
      status: assignment.status === 'unassigned' ? 'unassigned' : 'committed',
    })),
  );
  const committedPlan = Object.freeze({
    id: dependencies.nextPlanId(),
    draftVersion: state.draft.version,
    assignments,
    committedAt: now,
  } satisfies CommittedPlan);
  const auditHistory = append(
    state,
    'PLAN_COMMITTED',
    command.actor,
    state.draft.version,
    `Agent committed human-approved draft version ${state.draft.version}.`,
    dependencies,
  );

  return success(
    Object.freeze({
      workflowState: 'COMMITTED',
      scenario: state.scenario,
      draft: null,
      approval: null,
      committedPlan,
      auditHistory,
    }),
  );
}

function resetDemo(command: ResetDemoCommand, dependencies: CommandDependencies): CommandResult {
  return success(
    Object.freeze({
      workflowState: 'READY',
      scenario: dependencies.scenario,
      draft: null,
      approval: null,
      committedPlan: null,
      auditHistory: resetAuditHistory(
        {
          actor: command.actor as 'human',
          safeSummary: 'Human restored the canonical fictional scenario.',
        },
        dependencies,
      ),
    } satisfies ReadyState),
  );
}

export function reduceCommand(
  state: AppState,
  command: Command,
  dependencies: CommandDependencies,
): CommandResult {
  if (command.type === 'COMMIT_PLAN' && state.workflowState === 'COMMITTED') {
    return failure(state, 'COMMIT_ALREADY_COMPLETED');
  }

  if (!canTransition(state.workflowState, command.type, command.actor)) {
    return failure(state, 'INVALID_STATE');
  }

  switch (command.type) {
    case 'RESET_DEMO':
      return resetDemo(command, dependencies);
    case 'CREATE_DRAFT':
      return createDraft(state as ReadyState, command, dependencies);
    case 'REVISE_DRAFT':
      return reviseDraft(state as DraftState, command, dependencies);
    case 'EDIT_ASSIGNMENT':
      return editAssignment(state as DraftState, command, dependencies);
    case 'LOCK_ASSIGNMENT':
    case 'UNLOCK_ASSIGNMENT':
      return changeLock(state as DraftState, command, dependencies);
    case 'DISCARD_DRAFT':
      return discardDraft(
        state as Exclude<AppState, ReadyState | Extract<AppState, { workflowState: 'COMMITTED' }>>,
        command,
        dependencies,
      );
    case 'PREPARE_APPROVAL':
      return prepareApproval(state as DraftState, command, dependencies);
    case 'APPROVE':
    case 'REJECT':
    case 'CANCEL_APPROVAL':
      return decideApproval(
        state as Extract<AppState, { workflowState: 'AWAITING_APPROVAL' }>,
        command,
        dependencies,
      );
    case 'APPROVAL_EXPIRES':
      return expireApproval(
        state as Extract<AppState, { workflowState: 'APPROVED' }>,
        command,
        dependencies,
      );
    case 'COMMIT_PLAN':
      return commitPlan(
        state as Extract<AppState, { workflowState: 'APPROVED' }>,
        command,
        dependencies,
      );
  }
}

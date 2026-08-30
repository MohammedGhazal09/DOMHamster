import { appendAuditEvent, type AuditDependencies } from './audit.ts';
import type {
  AppState,
  AuditEvent,
  Draft,
  DraftState,
  ValidationIssue,
  ValidationResult,
  WorkflowState,
} from './types.ts';
import { validateDraft, type HumanLockSnapshot } from './validation.ts';

export type CommandActor = AuditEvent['actor'];

export type WorkflowEvent =
  | 'RESET_DEMO'
  | 'REHYDRATE_REVIEW_STATE'
  | 'CREATE_DRAFT'
  | 'REVISE_DRAFT'
  | 'EDIT_ASSIGNMENT'
  | 'LOCK_ASSIGNMENT'
  | 'UNLOCK_ASSIGNMENT'
  | 'DISCARD_DRAFT'
  | 'PREPARE_APPROVAL'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL_APPROVAL'
  | 'APPROVAL_EXPIRES'
  | 'COMMIT_PLAN'
  | 'ACCESS_CONTACTS';

function isDraftState(state: WorkflowState): state is 'DRAFT_INVALID' | 'DRAFT_VALID' {
  return state === 'DRAFT_INVALID' || state === 'DRAFT_VALID';
}

export function canTransition(
  state: WorkflowState,
  event: WorkflowEvent,
  actor: CommandActor,
): boolean {
  switch (event) {
    case 'RESET_DEMO':
      return actor === 'human';
    case 'REHYDRATE_REVIEW_STATE':
      return actor === 'system' && (state === 'AWAITING_APPROVAL' || state === 'APPROVED');
    case 'CREATE_DRAFT':
      return actor === 'agent' && state === 'READY';
    case 'REVISE_DRAFT':
      return actor === 'agent' && isDraftState(state);
    case 'EDIT_ASSIGNMENT':
    case 'LOCK_ASSIGNMENT':
    case 'UNLOCK_ASSIGNMENT':
      return actor === 'human' && isDraftState(state);
    case 'DISCARD_DRAFT':
      return (
        actor === 'human' &&
        (isDraftState(state) || state === 'AWAITING_APPROVAL' || state === 'APPROVED')
      );
    case 'PREPARE_APPROVAL':
      return actor === 'agent' && state === 'DRAFT_VALID';
    case 'APPROVE':
    case 'REJECT':
      return actor === 'human' && state === 'AWAITING_APPROVAL';
    case 'CANCEL_APPROVAL':
      return actor === 'human' && (state === 'AWAITING_APPROVAL' || state === 'APPROVED');
    case 'APPROVAL_EXPIRES':
      return actor === 'system' && state === 'APPROVED';
    case 'COMMIT_PLAN':
      return actor === 'agent' && state === 'APPROVED';
    case 'ACCESS_CONTACTS':
      return actor === 'agent' && state === 'COMMITTED';
    default:
      return false;
  }
}

export function classifyDraft(draft: Draft): DraftState['workflowState'] {
  return draft.validation.valid ? 'DRAFT_VALID' : 'DRAFT_INVALID';
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

function humanLocks(draft: Draft): readonly HumanLockSnapshot[] {
  return Object.freeze(
    draft.assignments
      .filter(({ lockedByHuman }) => lockedByHuman)
      .map(({ requestId, volunteerId, startTime, durationMinutes, status }) =>
        Object.freeze({ requestId, volunteerId, startTime, durationMinutes, status }),
      ),
  );
}

function revalidatedDraft(state: Extract<AppState, { draft: Draft }>): Draft {
  const assignments = Object.freeze(
    state.draft.assignments.map((assignment) => Object.freeze({ ...assignment })),
  );
  const validation = validateDraft({
    scenario: state.scenario,
    assignments,
    humanLocks: humanLocks(state.draft),
  });

  return Object.freeze({
    id: state.draft.id,
    version: state.draft.version,
    assignments,
    validation: freezeValidation(validation),
  });
}

export function normalizeRehydratedState(
  state: AppState,
  dependencies: AuditDependencies,
): AppState {
  if (state.workflowState === 'READY' || state.workflowState === 'COMMITTED') {
    return state;
  }

  const draft = revalidatedDraft(state);
  const workflowState = classifyDraft(draft);

  if (state.workflowState === 'AWAITING_APPROVAL' || state.workflowState === 'APPROVED') {
    const auditHistory = appendAuditEvent(
      state.auditHistory,
      {
        type: 'APPROVAL_INVALIDATED_RELOAD',
        actor: 'system',
        workflowState,
        draftVersion: draft.version,
        safeSummary: 'Approval review was invalidated after reload and the draft was revalidated.',
      },
      dependencies,
    );

    return Object.freeze({
      workflowState,
      scenario: state.scenario,
      draft,
      approval: null,
      committedPlan: null,
      auditHistory,
    } satisfies DraftState);
  }

  return Object.freeze({
    workflowState,
    scenario: state.scenario,
    draft,
    approval: null,
    committedPlan: null,
    auditHistory: state.auditHistory,
  } satisfies DraftState);
}

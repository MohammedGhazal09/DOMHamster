import { describe, expect, it } from 'vitest';
import { CANONICAL_SCENARIO } from '../../src/domain/seed';
import { type AppState, type AuditEventId, type Draft, type PlanId } from '../../src/domain/types';
import { validateDraft } from '../../src/domain/validation';
import {
  canTransition,
  classifyDraft,
  normalizeRehydratedState,
  type CommandActor,
  type WorkflowEvent,
} from '../../src/domain/state-machine';
import { validAssignments } from '../fixtures/drafts';

const states = [
  'READY',
  'DRAFT_INVALID',
  'DRAFT_VALID',
  'AWAITING_APPROVAL',
  'APPROVED',
  'COMMITTED',
] as const;

const actors = ['human', 'agent', 'system'] as const satisfies readonly CommandActor[];

const events = [
  'RESET_DEMO',
  'REHYDRATE_REVIEW_STATE',
  'CREATE_DRAFT',
  'REVISE_DRAFT',
  'EDIT_ASSIGNMENT',
  'LOCK_ASSIGNMENT',
  'UNLOCK_ASSIGNMENT',
  'DISCARD_DRAFT',
  'PREPARE_APPROVAL',
  'APPROVE',
  'REJECT',
  'CANCEL_APPROVAL',
  'APPROVAL_EXPIRES',
  'COMMIT_PLAN',
] as const satisfies readonly WorkflowEvent[];

function validDraft(version = 2): Draft {
  const assignments = validAssignments();
  return {
    id: 'DRAFT-01' as PlanId,
    version,
    assignments,
    validation: validateDraft({
      scenario: CANONICAL_SCENARIO,
      assignments,
      humanLocks: [],
    }),
  };
}

function approvedState(workflowState: 'AWAITING_APPROVAL' | 'APPROVED'): AppState {
  const draft = validDraft();
  const approval = {
    draftVersion: draft.version,
    status: workflowState === 'APPROVED' ? ('approved' as const) : ('pending' as const),
    createdAt: '2026-08-26T12:00:00.000Z',
    expiresAt: '2026-08-26T12:02:00.000Z',
    ...(workflowState === 'APPROVED' ? { decidedAt: '2026-08-26T12:00:30.000Z' } : {}),
  };

  return {
    workflowState,
    scenario: CANONICAL_SCENARIO,
    draft,
    approval,
    committedPlan: null,
    auditHistory: [],
  } as AppState;
}

function dependencies() {
  let sequence = 0;
  return {
    now: () => '2026-08-26T12:01:00.000Z',
    nextAuditEventId: () => `A-${++sequence}` as AuditEventId,
  };
}

describe('workflow transition matrix', () => {
  it('allows only the frozen state, event, and actor combinations', () => {
    const allowed = new Set<string>();
    const add = (state: (typeof states)[number], event: WorkflowEvent, actor: CommandActor) => {
      allowed.add(`${state}|${event}|${actor}`);
    };

    for (const state of states) add(state, 'RESET_DEMO', 'human');
    add('AWAITING_APPROVAL', 'REHYDRATE_REVIEW_STATE', 'system');
    add('APPROVED', 'REHYDRATE_REVIEW_STATE', 'system');
    add('READY', 'CREATE_DRAFT', 'agent');
    for (const state of ['DRAFT_INVALID', 'DRAFT_VALID'] as const) {
      add(state, 'REVISE_DRAFT', 'agent');
      add(state, 'EDIT_ASSIGNMENT', 'human');
      add(state, 'LOCK_ASSIGNMENT', 'human');
      add(state, 'UNLOCK_ASSIGNMENT', 'human');
    }
    for (const state of [
      'DRAFT_INVALID',
      'DRAFT_VALID',
      'AWAITING_APPROVAL',
      'APPROVED',
    ] as const) {
      add(state, 'DISCARD_DRAFT', 'human');
    }
    add('DRAFT_VALID', 'PREPARE_APPROVAL', 'agent');
    add('AWAITING_APPROVAL', 'APPROVE', 'human');
    add('AWAITING_APPROVAL', 'REJECT', 'human');
    add('AWAITING_APPROVAL', 'CANCEL_APPROVAL', 'human');
    add('APPROVED', 'APPROVAL_EXPIRES', 'system');
    add('APPROVED', 'COMMIT_PLAN', 'agent');

    for (const state of states) {
      for (const event of events) {
        for (const actor of actors) {
          expect(canTransition(state, event, actor), `${state}|${event}|${actor}`).toBe(
            allowed.has(`${state}|${event}|${actor}`),
          );
        }
      }
    }
  });
});

describe('draft classification and reload normalization', () => {
  it('classifies drafts only from their current validation result', () => {
    const valid = validDraft();
    const invalid: Draft = {
      ...valid,
      validation: {
        valid: false,
        errors: [
          {
            code: 'TEST_ERROR',
            severity: 'error',
            message: 'test',
            requestIds: [],
          },
        ],
        warnings: [],
      },
    };

    expect(classifyDraft(valid)).toBe('DRAFT_VALID');
    expect(classifyDraft(invalid)).toBe('DRAFT_INVALID');
  });

  it.each(['AWAITING_APPROVAL', 'APPROVED'] as const)(
    'invalidates %s after reload, preserves the draft, and appends one audit event',
    (workflowState) => {
      const state = approvedState(workflowState);
      const normalized = normalizeRehydratedState(state, dependencies());

      expect(normalized.workflowState).toBe('DRAFT_VALID');
      expect(normalized.draft?.version).toBe(state.draft?.version);
      expect(normalized.approval).toBeNull();
      expect(normalized.auditHistory.at(-1)?.type).toBe('APPROVAL_INVALIDATED_RELOAD');
      expect(normalized.auditHistory.at(-1)?.actor).toBe('system');
    },
  );

  it('revalidates stale draft state and recomputes its classification', () => {
    const draft = validDraft();
    const duplicatedAssignments = [...draft.assignments, { ...draft.assignments[0]! }];
    const staleState: AppState = {
      workflowState: 'DRAFT_VALID',
      scenario: CANONICAL_SCENARIO,
      draft: {
        ...draft,
        assignments: duplicatedAssignments,
      },
      approval: null,
      committedPlan: null,
      auditHistory: [],
    };

    const normalized = normalizeRehydratedState(staleState, dependencies());

    expect(normalized.workflowState).toBe('DRAFT_INVALID');
    expect(normalized.draft?.validation.errors.map(({ code }) => code)).toContain(
      'DUPLICATE_REQUEST_ASSIGNMENT',
    );
    expect(normalized.auditHistory).toEqual([]);
  });

  it('leaves READY and COMMITTED states unchanged', () => {
    const ready: AppState = {
      workflowState: 'READY',
      scenario: CANONICAL_SCENARIO,
      draft: null,
      approval: null,
      committedPlan: null,
      auditHistory: [],
    };
    const committed: AppState = {
      workflowState: 'COMMITTED',
      scenario: CANONICAL_SCENARIO,
      draft: null,
      approval: null,
      committedPlan: {
        id: 'PLAN-01' as PlanId,
        draftVersion: 1,
        assignments: [],
        committedAt: '2026-08-26T12:00:00.000Z',
      },
      auditHistory: [],
    };

    expect(normalizeRehydratedState(ready, dependencies())).toBe(ready);
    expect(normalizeRehydratedState(committed, dependencies())).toBe(committed);
  });
});

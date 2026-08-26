import { describe, expect, it } from 'vitest';
import { CANONICAL_SCENARIO } from '../../src/domain/seed';
import {
  requestId,
  volunteerId,
  type AppState,
  type AuditEventId,
  type PlanId,
  type ReadyState,
} from '../../src/domain/types';
import {
  reduceCommand,
  type CommandDependencies,
  type CommandResult,
} from '../../src/domain/commands';
import { normalizeRehydratedState } from '../../src/domain/state-machine';
import { validAssignments } from '../fixtures/drafts';

function readyState(): ReadyState {
  return {
    workflowState: 'READY',
    scenario: CANONICAL_SCENARIO,
    draft: null,
    approval: null,
    committedPlan: null,
    auditHistory: [],
  };
}

function dependencies() {
  let planSequence = 0;
  let auditSequence = 0;
  let currentTime = '2026-08-26T12:00:00.000Z';
  const deps: CommandDependencies & { setNow(value: string): void } = {
    scenario: CANONICAL_SCENARIO,
    now: () => currentTime,
    nextPlanId: () => `PLAN-${++planSequence}` as PlanId,
    nextAuditEventId: () => `AUDIT-${++auditSequence}` as AuditEventId,
    setNow(value) {
      currentTime = value;
    },
  };
  return deps;
}

function success(result: CommandResult): AppState {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function failure(result: CommandResult, code: string, state: AppState): void {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('TEST_EXPECTED_FAILURE');
  expect(result.error.code).toBe(code);
  expect(result.state).toBe(state);
}

function validDraft(deps: CommandDependencies, assignments = validAssignments()): AppState {
  return success(
    reduceCommand(
      readyState(),
      { type: 'CREATE_DRAFT', actor: 'agent', assignments },
      deps,
    ),
  );
}

function awaitingApproval(deps: CommandDependencies): AppState {
  const draft = validDraft(deps);
  return success(
    reduceCommand(
      draft,
      {
        type: 'PREPARE_APPROVAL',
        actor: 'agent',
        expectedDraftVersion: draft.draft!.version,
      },
      deps,
    ),
  );
}

function approved(deps: CommandDependencies & { setNow(value: string): void }): AppState {
  const awaiting = awaitingApproval(deps);
  deps.setNow('2026-08-26T12:00:30.000Z');
  return success(
    reduceCommand(
      awaiting,
      {
        type: 'APPROVE',
        actor: 'human',
        expectedDraftVersion: awaiting.draft!.version,
      },
      deps,
    ),
  );
}

describe('approval review lifecycle', () => {
  it('prepares only the exact current valid version', () => {
    const deps = dependencies();
    const draft = validDraft(deps);
    const awaiting = success(
      reduceCommand(
        draft,
        {
          type: 'PREPARE_APPROVAL',
          actor: 'agent',
          expectedDraftVersion: 1,
        },
        deps,
      ),
    );

    expect(awaiting.workflowState).toBe('AWAITING_APPROVAL');
    expect(awaiting.approval).toMatchObject({ draftVersion: 1, status: 'pending' });
    expect(awaiting.auditHistory.at(-1)?.type).toBe('APPROVAL_REQUESTED');
  });

  it('rejects a stale approval request without mutation', () => {
    const deps = dependencies();
    const draft = validDraft(deps);

    failure(
      reduceCommand(
        draft,
        {
          type: 'PREPARE_APPROVAL',
          actor: 'agent',
          expectedDraftVersion: 0,
        },
        deps,
      ),
      'STALE_DRAFT_VERSION',
      draft,
    );
  });

  it('approves for exactly 120 seconds from the human decision', () => {
    const deps = dependencies();
    const state = approved(deps);

    expect(state.workflowState).toBe('APPROVED');
    expect(state.approval).toMatchObject({
      draftVersion: 1,
      status: 'approved',
      decidedAt: '2026-08-26T12:00:30.000Z',
      expiresAt: '2026-08-26T12:02:30.000Z',
    });
    expect(state.auditHistory.at(-1)?.type).toBe('APPROVAL_APPROVED');
  });

  it.each([
    ['REJECT', 'APPROVAL_REJECTED'],
    ['CANCEL_APPROVAL', 'APPROVAL_CANCELLED'],
  ] as const)('%s returns review to DRAFT_VALID', (type, eventType) => {
    const deps = dependencies();
    const awaiting = awaitingApproval(deps);
    const next = success(
      reduceCommand(
        awaiting,
        {
          type,
          actor: 'human',
          expectedDraftVersion: awaiting.draft!.version,
        },
        deps,
      ),
    );

    expect(next.workflowState).toBe('DRAFT_VALID');
    expect(next.approval).toBeNull();
    expect(next.auditHistory.at(-1)?.type).toBe(eventType);
  });

  it('expires approval at the exact deadline and clears it', () => {
    const deps = dependencies();
    const state = approved(deps);
    deps.setNow(state.approval!.expiresAt);
    const expired = success(
      reduceCommand(state, { type: 'APPROVAL_EXPIRES', actor: 'system' }, deps),
    );

    expect(expired.workflowState).toBe('DRAFT_VALID');
    expect(expired.approval).toBeNull();
    expect(expired.auditHistory.at(-1)?.type).toBe('APPROVAL_EXPIRED');
  });

  it('invalidates review state on reload and preserves locks', () => {
    const deps = dependencies();
    const state = approved(deps);
    const normalized = normalizeRehydratedState(state, deps);

    expect(normalized.workflowState).toBe('DRAFT_VALID');
    expect(normalized.approval).toBeNull();
    expect(normalized.auditHistory.at(-1)?.type).toBe('APPROVAL_INVALIDATED_RELOAD');
  });
});

describe('commit lifecycle', () => {
  it('revalidates immediately, commits once, and rejects replay', () => {
    const deps = dependencies();
    const state = approved(deps);
    const committed = success(
      reduceCommand(
        state,
        {
          type: 'COMMIT_PLAN',
          actor: 'agent',
          expectedDraftVersion: state.draft!.version,
        },
        deps,
      ),
    );

    expect(committed.workflowState).toBe('COMMITTED');
    expect(committed.committedPlan).toMatchObject({
      id: 'PLAN-2',
      draftVersion: 1,
      committedAt: '2026-08-26T12:00:30.000Z',
    });
    expect(
      committed.committedPlan?.assignments.every(
        ({ status }) => status === 'committed' || status === 'unassigned',
      ),
    ).toBe(true);
    expect(committed.auditHistory.at(-1)?.type).toBe('PLAN_COMMITTED');

    failure(
      reduceCommand(
        committed,
        {
          type: 'COMMIT_PLAN',
          actor: 'agent',
          expectedDraftVersion: 1,
        },
        deps,
      ),
      'COMMIT_ALREADY_COMPLETED',
      committed,
    );
  });

  it('rejects an expired commit without mutation', () => {
    const deps = dependencies();
    const state = approved(deps);
    deps.setNow(state.approval!.expiresAt);

    failure(
      reduceCommand(
        state,
        {
          type: 'COMMIT_PLAN',
          actor: 'agent',
          expectedDraftVersion: state.draft!.version,
        },
        deps,
      ),
      'APPROVAL_EXPIRED',
      state,
    );
  });

  it('rejects commit if the approved draft no longer revalidates', () => {
    const deps = dependencies();
    const state = approved(deps);
    if (state.workflowState !== 'APPROVED') throw new Error('TEST_EXPECTED_APPROVED');
    const corrupted: AppState = {
      ...state,
      draft: {
        ...state.draft,
        assignments: [...state.draft.assignments, { ...state.draft.assignments[0]! }],
      },
    };

    failure(
      reduceCommand(
        corrupted,
        {
          type: 'COMMIT_PLAN',
          actor: 'agent',
          expectedDraftVersion: corrupted.draft.version,
        },
        deps,
      ),
      'DRAFT_INVALID',
      corrupted,
    );
  });
});

describe('canonical human-approved journey', () => {
  it(
    'preserves R-105 while the agent repairs R-106 before approval and commit',
    () => {
      const deps = dependencies();
      const initialAssignments = validAssignments().map((assignment) =>
        assignment.requestId === requestId('R-106')
          ? { ...assignment, volunteerId: volunteerId('V-03') }
          : assignment,
      );
      let state = validDraft(deps, initialAssignments);

      state = success(
        reduceCommand(
          state,
          {
            type: 'EDIT_ASSIGNMENT',
            actor: 'human',
            expectedDraftVersion: 1,
            requestId: requestId('R-105'),
            patch: { volunteerId: volunteerId('V-03'), startTime: '13:00' },
          },
          deps,
        ),
      );
      expect(state.workflowState).toBe('DRAFT_INVALID');

      state = success(
        reduceCommand(
          state,
          {
            type: 'LOCK_ASSIGNMENT',
            actor: 'human',
            expectedDraftVersion: 2,
            requestId: requestId('R-105'),
          },
          deps,
        ),
      );
      const lockedR105 = state.draft!.assignments.find(
        ({ requestId: id }) => id === requestId('R-105'),
      )!;

      const repaired = state.draft!.assignments.map((assignment) =>
        assignment.requestId === requestId('R-106')
          ? {
              ...assignment,
              volunteerId: volunteerId('V-05'),
              startTime: '13:00' as const,
            }
          : { ...assignment },
      );
      state = success(
        reduceCommand(
          state,
          {
            type: 'REVISE_DRAFT',
            actor: 'agent',
            expectedDraftVersion: 3,
            assignments: repaired,
          },
          deps,
        ),
      );
      expect(state.workflowState).toBe('DRAFT_VALID');
      expect(
        state.draft!.assignments.find(({ requestId: id }) => id === requestId('R-105')),
      ).toEqual(lockedR105);

      state = success(
        reduceCommand(
          state,
          {
            type: 'PREPARE_APPROVAL',
            actor: 'agent',
            expectedDraftVersion: 4,
          },
          deps,
        ),
      );
      deps.setNow('2026-08-26T12:00:30.000Z');
      state = success(
        reduceCommand(
          state,
          {
            type: 'APPROVE',
            actor: 'human',
            expectedDraftVersion: 4,
          },
          deps,
        ),
      );
      state = success(
        reduceCommand(
          state,
          {
            type: 'COMMIT_PLAN',
            actor: 'agent',
            expectedDraftVersion: 4,
          },
          deps,
        ),
      );

      expect(state.workflowState).toBe('COMMITTED');
      expect(state.committedPlan?.assignments).toHaveLength(8);
      expect(
        state.committedPlan?.assignments.find(({ requestId: id }) => id === requestId('R-105')),
      ).toMatchObject({
        volunteerId: volunteerId('V-03'),
        startTime: '13:00',
        lockedByHuman: true,
      });
      expect(state.auditHistory.map(({ type }) => type)).toEqual([
        'DRAFT_CREATED',
        'DRAFT_REVISED',
        'ASSIGNMENT_LOCKED',
        'DRAFT_REVISED',
        'APPROVAL_REQUESTED',
        'APPROVAL_APPROVED',
        'PLAN_COMMITTED',
      ]);
    },
  );
});

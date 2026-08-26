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

function expectSuccess(result: CommandResult): AppState {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function expectFailure(result: CommandResult, code: string, state: AppState): void {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('TEST_EXPECTED_FAILURE');
  expect(result.error.code).toBe(code);
  expect(result.state).toBe(state);
}

function createValidDraft(deps: CommandDependencies, assignments = validAssignments()): AppState {
  return expectSuccess(
    reduceCommand(readyState(), { type: 'CREATE_DRAFT', actor: 'agent', assignments }, deps),
  );
}

describe('draft creation and revision commands', () => {
  it('creates version one, validates it, freezes it, and audits the accepted mutation', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);

    expect(state.workflowState).toBe('DRAFT_VALID');
    expect(state.draft?.version).toBe(1);
    expect(state.draft?.validation.valid).toBe(true);
    expect(state.auditHistory.at(-1)?.type).toBe('DRAFT_CREATED');
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.draft?.assignments)).toBe(true);
  });

  it('rejects incomplete request accounting without changing state or audit history', () => {
    const deps = dependencies();
    const state = readyState();

    expectFailure(
      reduceCommand(
        state,
        {
          type: 'CREATE_DRAFT',
          actor: 'agent',
          assignments: validAssignments().slice(0, 7),
        },
        deps,
      ),
      'INVALID_INPUT',
      state,
    );
  });

  it('rejects committed assignment rows before the commit command', () => {
    const deps = dependencies();
    const state = readyState();
    const assignments = validAssignments();
    assignments[0] = { ...assignments[0]!, status: 'committed' };

    expectFailure(
      reduceCommand(
        state,
        { type: 'CREATE_DRAFT', actor: 'agent', assignments },
        deps,
      ),
      'INVALID_INPUT',
      state,
    );
  });

  it('rejects unknown request identifiers safely', () => {
    const deps = dependencies();
    const state = readyState();
    const assignments = validAssignments();
    assignments[7] = { ...assignments[7]!, requestId: requestId('R-999') };

    expectFailure(
      reduceCommand(state, { type: 'CREATE_DRAFT', actor: 'agent', assignments }, deps),
      'UNKNOWN_REQUEST',
      state,
    );
  });

  it('rejects stale revisions byte-for-byte', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);

    expectFailure(
      reduceCommand(
        state,
        {
          type: 'REVISE_DRAFT',
          actor: 'agent',
          expectedDraftVersion: 0,
          assignments: validAssignments(),
        },
        deps,
      ),
      'STALE_DRAFT_VERSION',
      state,
    );
  });

  it('increments the draft version exactly once for an accepted revision', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);
    const revised = validAssignments().map((assignment) =>
      assignment.requestId === requestId('R-108')
        ? { ...assignment, volunteerId: volunteerId('V-05') }
        : assignment,
    );

    const next = expectSuccess(
      reduceCommand(
        state,
        {
          type: 'REVISE_DRAFT',
          actor: 'agent',
          expectedDraftVersion: 1,
          assignments: revised,
        },
        deps,
      ),
    );

    expect(next.draft?.version).toBe(2);
    expect(next.auditHistory.at(-1)?.type).toBe('DRAFT_REVISED');
  });
});

describe('human edits and authoritative locks', () => {
  it('applies a human edit, increments once, and recomputes invalid state', () => {
    const deps = dependencies();
    const assignments = validAssignments().map((assignment) =>
      assignment.requestId === requestId('R-106')
        ? { ...assignment, volunteerId: volunteerId('V-03') }
        : assignment,
    );
    const state = createValidDraft(deps, assignments);

    const edited = expectSuccess(
      reduceCommand(
        state,
        {
          type: 'EDIT_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 1,
          requestId: requestId('R-105'),
          patch: {
            volunteerId: volunteerId('V-03'),
            startTime: '13:00',
          },
        },
        deps,
      ),
    );

    expect(edited.workflowState).toBe('DRAFT_INVALID');
    expect(edited.draft?.version).toBe(2);
    expect(edited.draft?.validation.errors.map(({ code }) => code)).toContain(
      'VOLUNTEER_TIME_OVERLAP',
    );
  });

  it('locks and unlocks only through human commands', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);
    const locked = expectSuccess(
      reduceCommand(
        state,
        {
          type: 'LOCK_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 1,
          requestId: requestId('R-105'),
        },
        deps,
      ),
    );

    expect(
      locked.draft?.assignments.find(({ requestId: id }) => id === requestId('R-105'))
        ?.lockedByHuman,
    ).toBe(true);
    expect(locked.auditHistory.at(-1)?.type).toBe('ASSIGNMENT_LOCKED');

    const unlocked = expectSuccess(
      reduceCommand(
        locked,
        {
          type: 'UNLOCK_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 2,
          requestId: requestId('R-105'),
        },
        deps,
      ),
    );

    expect(
      unlocked.draft?.assignments.find(({ requestId: id }) => id === requestId('R-105'))
        ?.lockedByHuman,
    ).toBe(false);
    expect(unlocked.draft?.version).toBe(3);
    expect(unlocked.auditHistory.at(-1)?.type).toBe('ASSIGNMENT_UNLOCKED');
  });

  it('prevents an agent revision from changing a human lock', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);
    const locked = expectSuccess(
      reduceCommand(
        state,
        {
          type: 'LOCK_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 1,
          requestId: requestId('R-105'),
        },
        deps,
      ),
    );
    const changed = locked.draft!.assignments.map((assignment) =>
      assignment.requestId === requestId('R-105')
        ? {
            ...assignment,
            volunteerId: volunteerId('V-03'),
            startTime: '13:00' as const,
          }
        : { ...assignment },
    );

    expectFailure(
      reduceCommand(
        locked,
        {
          type: 'REVISE_DRAFT',
          actor: 'agent',
          expectedDraftVersion: 2,
          assignments: changed,
        },
        deps,
      ),
      'LOCKED_ASSIGNMENT_CHANGE',
      locked,
    );
  });

  it('rejects a human edit that tries to mark a draft row committed', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);

    expectFailure(
      reduceCommand(
        state,
        {
          type: 'EDIT_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 1,
          requestId: requestId('R-105'),
          patch: { status: 'committed' },
        },
        deps,
      ),
      'INVALID_INPUT',
      state,
    );
  });

  it('requires unlock before editing a locked row', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);
    const locked = expectSuccess(
      reduceCommand(
        state,
        {
          type: 'LOCK_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 1,
          requestId: requestId('R-105'),
        },
        deps,
      ),
    );

    expectFailure(
      reduceCommand(
        locked,
        {
          type: 'EDIT_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 2,
          requestId: requestId('R-105'),
          patch: { startTime: '13:00' },
        },
        deps,
      ),
      'LOCKED_ASSIGNMENT_CHANGE',
      locked,
    );
  });
});

describe('discard and reset commands', () => {
  it('discards an uncommitted draft to READY and keeps prior audit history', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);
    const discarded = expectSuccess(
      reduceCommand(state, { type: 'DISCARD_DRAFT', actor: 'human' }, deps),
    );

    expect(discarded.workflowState).toBe('READY');
    expect(discarded.draft).toBeNull();
    expect(discarded.auditHistory.map(({ type }) => type)).toEqual([
      'DRAFT_CREATED',
      'DRAFT_DISCARDED',
    ]);
  });

  it('resets from any state to the canonical READY state with one reset event', () => {
    const deps = dependencies();
    const state = createValidDraft(deps);
    const reset = expectSuccess(reduceCommand(state, { type: 'RESET_DEMO', actor: 'human' }, deps));

    expect(reset.workflowState).toBe('READY');
    expect(reset.scenario).toBe(CANONICAL_SCENARIO);
    expect(reset.auditHistory.map(({ type }) => type)).toEqual(['SCENARIO_RESET']);
  });
});

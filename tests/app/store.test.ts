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
import type { CommandDependencies } from '../../src/domain/commands';
import { createAppStore, type StorePersistencePort } from '../../src/app/store';
import { validAssignments } from '../fixtures/drafts';

function readyState(): ReadyState {
  return Object.freeze({
    workflowState: 'READY',
    scenario: CANONICAL_SCENARIO,
    draft: null,
    approval: null,
    committedPlan: null,
    auditHistory: Object.freeze([]),
  });
}

function commandDependencies(): CommandDependencies {
  let planSequence = 0;
  let auditSequence = 0;
  return {
    scenario: CANONICAL_SCENARIO,
    now: () => '2026-08-26T12:00:00.000Z',
    nextPlanId: () => `PLAN-${++planSequence}` as PlanId,
    nextAuditEventId: () => `AUDIT-${++auditSequence}` as AuditEventId,
  };
}

function deferred(): { readonly promise: Promise<void>; resolve(): void } {
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

function stateVersion(state: AppState): number | null {
  return state.draft?.version ?? state.committedPlan?.draftVersion ?? null;
}

describe('serialized application store', () => {
  it('reduces concurrent commands in call order and commits each state after persistence', async () => {
    const firstSave = deferred();
    const persisted: AppState[] = [];
    const persistence: StorePersistencePort = {
      async save(state) {
        persisted.push(state);
        if (persisted.length === 1) {
          await firstSave.promise;
        }
      },
    };
    const store = createAppStore(readyState(), {
      commandDependencies: commandDependencies(),
      persistence,
    });
    const observed: AppState[] = [];
    store.subscribe(() => observed.push(store.getState()));

    const createResultPromise = store.dispatch({
      type: 'CREATE_DRAFT',
      actor: 'agent',
      assignments: validAssignments(),
    });
    const editResultPromise = store.dispatch({
      type: 'EDIT_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 1,
      requestId: requestId('R-105'),
      patch: { volunteerId: volunteerId('V-03'), startTime: '13:00' },
    });

    await Promise.resolve();
    expect(store.getState().workflowState).toBe('READY');
    expect(observed).toHaveLength(0);

    firstSave.resolve();
    const [created, edited] = await Promise.all([createResultPromise, editResultPromise]);

    expect(created.ok).toBe(true);
    expect(edited.ok).toBe(true);
    expect(persisted.map(stateVersion)).toEqual([1, 2]);
    expect(observed.map(stateVersion)).toEqual([1, 2]);
    expect(store.getState().workflowState).toBe('DRAFT_INVALID');
  });

  it('does not persist or notify for a rejected domain command', async () => {
    let saves = 0;
    let notifications = 0;
    const initial = readyState();
    const store = createAppStore(initial, {
      commandDependencies: commandDependencies(),
      persistence: {
        save() {
          saves += 1;
        },
      },
    });
    store.subscribe(() => {
      notifications += 1;
    });

    const result = await store.dispatch({
      type: 'EDIT_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 1,
      requestId: requestId('R-105'),
      patch: { startTime: '13:00' },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('TEST_EXPECTED_FAILURE');
    expect(result.error.code).toBe('INVALID_STATE');
    expect(result.state).toBe(initial);
    expect(store.getState()).toBe(initial);
    expect(saves).toBe(0);
    expect(notifications).toBe(0);
  });

  it('keeps the prior visible state when persistence fails and keeps the queue usable', async () => {
    let failWrites = true;
    let notifications = 0;
    const initial = readyState();
    const store = createAppStore(initial, {
      commandDependencies: commandDependencies(),
      persistence: {
        save() {
          if (failWrites) throw new Error('QUOTA_EXCEEDED_PRIVATE_DETAIL');
        },
      },
    });
    store.subscribe(() => {
      notifications += 1;
    });

    const failed = await store.dispatch({
      type: 'CREATE_DRAFT',
      actor: 'agent',
      assignments: validAssignments(),
    });

    expect(failed.ok).toBe(false);
    if (failed.ok) throw new Error('TEST_EXPECTED_FAILURE');
    expect(failed.error.code).toBe('PERSISTENCE_WRITE_FAILED');
    expect(failed.error.message).toBe('PERSISTENCE_WRITE_FAILED');
    expect(failed.state).toBe(initial);
    expect(store.getState()).toBe(initial);
    expect(notifications).toBe(0);

    failWrites = false;
    const succeeded = await store.dispatch({
      type: 'CREATE_DRAFT',
      actor: 'agent',
      assignments: validAssignments(),
    });

    expect(succeeded.ok).toBe(true);
    expect(store.getState().workflowState).toBe('DRAFT_VALID');
    expect(notifications).toBe(1);
  });

  it('supports unsubscribe and exposes frozen state references', async () => {
    let notifications = 0;
    const store = createAppStore(readyState(), {
      commandDependencies: commandDependencies(),
      persistence: { save: () => undefined },
    });
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });
    unsubscribe();

    await store.dispatch({
      type: 'CREATE_DRAFT',
      actor: 'agent',
      assignments: validAssignments(),
    });

    expect(notifications).toBe(0);
    expect(Object.isFrozen(store.getState())).toBe(true);
    expect(Object.isFrozen(store.getState().draft?.assignments)).toBe(true);
  });
});

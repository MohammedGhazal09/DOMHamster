import { describe, expect, it } from 'vitest';
import type { AppStore } from '../../src/app/store.ts';
import { requestId, volunteerId, type AppState } from '../../src/domain/types.ts';
import { TOOL_NAMES } from '../../src/webmcp/contracts.ts';
import {
  createToolHandlers,
  type ToolExecutionFailure,
  type ToolExecutionResult,
} from '../../src/webmcp/handlers.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import {
  createTestStore,
  minimumToolInput,
  prepareApproveAndCommit,
  readyState,
  validDraftToolInput,
  workflowStates,
} from '../helpers/webmcp-fixtures.ts';

function expectSuccess<Data>(result: ToolExecutionResult<Data>): Data {
  expect(result.ok).toBe(true);
  expect(result.nextActions.length).toBeLessThanOrEqual(4);
  if (!result.ok) throw new Error(result.error.code);
  return result.data;
}

function expectFailure(result: ToolExecutionResult, code: string): ToolExecutionFailure {
  expect(result.ok).toBe(false);
  expect(result.nextActions.length).toBeLessThanOrEqual(4);
  if (result.ok) throw new Error('TEST_EXPECTED_TOOL_FAILURE');
  expect(result.error.code).toBe(code);
  return result;
}

function fixedStore(state: AppState): AppStore {
  return {
    getState: () => state,
    dispatch() {
      return Promise.reject(new Error('TEST_UNEXPECTED_DISPATCH'));
    },
    subscribe() {
      return () => undefined;
    },
  };
}

function noPrivateData(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain('Fictional phone');
  expect(serialized).not.toContain('Fictional Address');
  expect(serialized).not.toContain('privateContacts');
}

describe('WebMCP tool handlers', () => {
  it('creates exactly one handler for every frozen tool name', () => {
    const { store } = createTestStore();
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });

    expect(Object.keys(handlers)).toEqual(TOOL_NAMES);
    expect(Object.isFrozen(handlers)).toBe(true);
  });

  it('returns privacy-minimized read data and supports deterministic filters', async () => {
    const { store } = createTestStore();
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });

    const overview = expectSuccess(await handlers.get_coordination_overview({}));
    expect(overview).toMatchObject({
      workflowState: 'READY',
      requestCount: 8,
      volunteerCount: 5,
      draftVersion: null,
    });

    const requests = expectSuccess(
      await handlers.list_open_requests({ priority: 'URGENT', zone: 'NORTH' }),
    );
    expect(requests.map(({ id }) => id)).toEqual([requestId('R-101')]);
    noPrivateData(requests);

    const volunteers = expectSuccess(await handlers.list_available_volunteers({ zone: 'EAST' }));
    expect(volunteers.map(({ id }) => id)).toEqual([volunteerId('V-03')]);
    noPrivateData(volunteers);

    const audit = expectSuccess(await handlers.get_audit_history({ limit: 20 }));
    expect(audit).toEqual([]);
  });

  it('validates input before state authorization and never echoes raw input', async () => {
    const { store } = createTestStore();
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });
    const before = store.getState();
    const sentinel = 'DO_NOT_ECHO_HANDLER_SECRET';

    const result = await handlers.commit_assignment_plan({
      expectedDraftVersion: 1,
      unexpected: sentinel,
    });
    const failure = expectFailure(result, 'INVALID_INPUT');

    expect(JSON.stringify(failure)).not.toContain(sentinel);
    expect(store.getState()).toBe(before);
  });

  it('rejects every tool outside its exact lifecycle state without dispatching', async () => {
    const states = workflowStates();

    for (const [stateName, state] of Object.entries(states)) {
      const handlers = createToolHandlers(fixedStore(state), {
        nextErrorReference: () => 'ERROR-1',
      });
      const allowed = new Set(desiredToolNames(state.workflowState));

      for (const name of TOOL_NAMES) {
        if (!allowed.has(name)) {
          const result = await handlers[name](minimumToolInput(name));
          expectFailure(result, 'INVALID_STATE');
        }
      }

      expect(state.workflowState).toBe(stateName);
    }
  });

  it('creates a complete draft and serves draft and validation selectors', async () => {
    const { store } = createTestStore();
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });

    const created = expectSuccess(await handlers.create_assignment_draft(validDraftToolInput()));
    expect(created).toMatchObject({ version: 1, workflowState: 'DRAFT_VALID', valid: true });
    expect(store.getState().workflowState).toBe('DRAFT_VALID');

    const draft = expectSuccess(await handlers.get_assignment_draft({ includeIssues: true }));
    expect(draft.assignments).toHaveLength(8);
    noPrivateData(draft);

    const validation = expectSuccess(
      await handlers.validate_assignment_draft({ expectedDraftVersion: 1 }),
    );
    expect(validation).toMatchObject({ draftVersion: 1, valid: true });
    expect(validation.errors).toEqual([]);
  });

  it('rejects unknown identifiers and stale versions without changing state', async () => {
    const { store } = createTestStore();
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });
    const invalidInput = validDraftToolInput();
    const entries = invalidInput.assignments as Record<string, unknown>[];
    entries[0] = { ...entries[0], volunteerId: 'V-99' };

    expectFailure(await handlers.create_assignment_draft(invalidInput), 'UNKNOWN_VOLUNTEER');
    expect(store.getState().workflowState).toBe('READY');

    expectSuccess(await handlers.create_assignment_draft(validDraftToolInput()));
    const before = store.getState();
    expectFailure(
      await handlers.validate_assignment_draft({ expectedDraftVersion: 999 }),
      'STALE_DRAFT_VERSION',
    );
    expect(store.getState()).toBe(before);
  });

  it('revises unlocked assignments and preserves authoritative human locks', async () => {
    const { store } = createTestStore();
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });
    expectSuccess(await handlers.create_assignment_draft(validDraftToolInput()));

    const edited = await store.dispatch({
      type: 'EDIT_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 1,
      requestId: requestId('R-105'),
      patch: { volunteerId: volunteerId('V-03'), startTime: '13:00' },
    });
    expect(edited.ok).toBe(true);
    const locked = await store.dispatch({
      type: 'LOCK_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 2,
      requestId: requestId('R-105'),
    });
    expect(locked.ok).toBe(true);

    const before = store.getState();
    expectFailure(
      await handlers.revise_assignment_draft({
        expectedDraftVersion: 3,
        changes: [
          {
            action: 'SET_ASSIGNMENT',
            requestId: 'R-105',
            volunteerId: 'V-01',
            startTime: '12:30',
          },
        ],
      }),
      'LOCKED_ASSIGNMENT_CHANGE',
    );
    expect(store.getState()).toBe(before);

    const revised = expectSuccess(
      await handlers.revise_assignment_draft({
        expectedDraftVersion: 3,
        changes: [
          {
            action: 'SET_ASSIGNMENT',
            requestId: 'R-106',
            volunteerId: 'V-05',
            startTime: '13:00',
          },
        ],
      }),
    );
    const r105 = revised.assignments.find(({ requestId: id }) => id === requestId('R-105'));
    expect(r105).toMatchObject({
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
      lockedByHuman: true,
    });
  });

  it('prepares review and commits only the exact human-approved version', async () => {
    const { store } = createTestStore();
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });
    expectSuccess(await handlers.create_assignment_draft(validDraftToolInput()));

    const prepared = expectSuccess(
      await handlers.prepare_plan_approval({
        expectedDraftVersion: 1,
        summary: 'All constraints pass.',
      }),
    );
    expect(prepared.workflowState).toBe('AWAITING_APPROVAL');

    expectFailure(
      await handlers.commit_assignment_plan({ expectedDraftVersion: 1 }),
      'INVALID_STATE',
    );

    const approved = await store.dispatch({
      type: 'APPROVE',
      actor: 'human',
      expectedDraftVersion: 1,
    });
    expect(approved.ok).toBe(true);

    expectFailure(
      await handlers.commit_assignment_plan({ expectedDraftVersion: 2 }),
      'STALE_DRAFT_VERSION',
    );
    const committed = expectSuccess(
      await handlers.commit_assignment_plan({ expectedDraftVersion: 1 }),
    );
    expect(committed).toMatchObject({ draftVersion: 1, assignedRequestCount: 8 });
    expect(store.getState().workflowState).toBe('COMMITTED');

    const readBack = expectSuccess(await handlers.get_committed_plan({}));
    expect(readBack).toEqual(committed);
    noPrivateData(readBack);
  });

  it('returns explicit post-commit contacts and records access in the audit', async () => {
    const { store, dependencies } = createTestStore();
    await prepareApproveAndCommit(store, dependencies);
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });

    const beforeCount = store.getState().auditHistory.length;
    const contacts = expectSuccess(
      await handlers.access_dispatch_contacts({ requestIds: ['R-101', 'R-104'] }),
    );

    expect(contacts.map(({ requestId: id }) => id)).toEqual([
      requestId('R-101'),
      requestId('R-104'),
    ]);
    expect(contacts[0]?.fictionalContactChannel).toContain('Fictional phone');
    expect(store.getState().auditHistory).toHaveLength(beforeCount + 1);
    expect(store.getState().auditHistory.at(-1)?.type).toBe('CONTACTS_ACCESSED');

    const recent = expectSuccess(await handlers.get_audit_history({ limit: 1 }));
    expect(recent).toHaveLength(1);
    expect(recent[0]?.type).toBe('CONTACTS_ACCESSED');
  });

  it('sanitizes unexpected exceptions behind an opaque reference', async () => {
    const sentinel = 'DO_NOT_EXPOSE_STACK_OR_SECRET';
    const brokenStore: AppStore = {
      getState() {
        throw new Error(sentinel);
      },
      dispatch() {
        return Promise.reject(new Error(sentinel));
      },
      subscribe() {
        return () => undefined;
      },
    };
    const handlers = createToolHandlers(brokenStore, {
      nextErrorReference: () => 'ERROR-OPAQUE-7',
    });

    const result = await handlers.get_coordination_overview({});
    const failure = expectFailure(result, 'INTERNAL_ERROR');
    expect(failure.error.reference).toBe('ERROR-OPAQUE-7');
    expect(JSON.stringify(failure)).not.toContain(sentinel);
  });

  it('keeps next actions bounded and valid after success and failure', async () => {
    const { store } = createTestStore(readyState());
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-1',
    });

    for (const result of [
      await handlers.get_coordination_overview({}),
      await handlers.get_assignment_draft({}),
    ]) {
      expect(result.nextActions.length).toBeLessThanOrEqual(4);
      for (const action of result.nextActions) {
        expect(TOOL_NAMES).toContain(action);
      }
    }
  });
});

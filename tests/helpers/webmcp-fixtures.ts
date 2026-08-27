import { createAppStore, type AppStore } from '../../src/app/store.ts';
import {
  reduceCommand,
  type CommandDependencies,
  type CommandResult,
} from '../../src/domain/commands.ts';
import { CANONICAL_SCENARIO } from '../../src/domain/seed.ts';
import {
  requestId,
  volunteerId,
  type AppState,
  type AuditEventId,
  type PlanId,
  type ReadyState,
  type WorkflowState,
} from '../../src/domain/types.ts';
import type { ToolName } from '../../src/webmcp/contracts.ts';
import { validAssignments } from '../fixtures/drafts.ts';

export interface MutableCommandDependencies extends CommandDependencies {
  setNow(value: string): void;
}

export function commandDependencies(): MutableCommandDependencies {
  let planSequence = 0;
  let auditSequence = 0;
  let currentTime = '2026-08-26T12:00:00.000Z';

  return {
    scenario: CANONICAL_SCENARIO,
    now: () => currentTime,
    nextPlanId: () => `PLAN-${++planSequence}` as PlanId,
    nextAuditEventId: () => `AUDIT-${++auditSequence}` as AuditEventId,
    setNow(value) {
      currentTime = value;
    },
  };
}

export function readyState(): ReadyState {
  return {
    workflowState: 'READY',
    scenario: CANONICAL_SCENARIO,
    draft: null,
    approval: null,
    committedPlan: null,
    auditHistory: [],
  };
}

export function expectCommandSuccess(result: CommandResult): AppState {
  if (!result.ok) {
    throw new Error(`TEST_EXPECTED_COMMAND_SUCCESS:${result.error.code}`);
  }
  return result.state;
}

export function workflowStates(): Readonly<Record<WorkflowState, AppState>> {
  const dependencies = commandDependencies();
  const ready = readyState();
  const draftValid = expectCommandSuccess(
    reduceCommand(
      ready,
      { type: 'CREATE_DRAFT', actor: 'agent', assignments: validAssignments() },
      dependencies,
    ),
  );

  const editedR105 = expectCommandSuccess(
    reduceCommand(
      draftValid,
      {
        type: 'EDIT_ASSIGNMENT',
        actor: 'human',
        expectedDraftVersion: 1,
        requestId: requestId('R-105'),
        patch: { volunteerId: volunteerId('V-03'), startTime: '13:00' },
      },
      dependencies,
    ),
  );
  const draftInvalid = expectCommandSuccess(
    reduceCommand(
      editedR105,
      {
        type: 'EDIT_ASSIGNMENT',
        actor: 'human',
        expectedDraftVersion: 2,
        requestId: requestId('R-106'),
        patch: { volunteerId: volunteerId('V-03'), startTime: '13:00' },
      },
      dependencies,
    ),
  );

  const awaitingApproval = expectCommandSuccess(
    reduceCommand(
      draftValid,
      { type: 'PREPARE_APPROVAL', actor: 'agent', expectedDraftVersion: 1 },
      dependencies,
    ),
  );
  const approved = expectCommandSuccess(
    reduceCommand(
      awaitingApproval,
      { type: 'APPROVE', actor: 'human', expectedDraftVersion: 1 },
      dependencies,
    ),
  );
  const committed = expectCommandSuccess(
    reduceCommand(
      approved,
      { type: 'COMMIT_PLAN', actor: 'agent', expectedDraftVersion: 1 },
      dependencies,
    ),
  );

  return Object.freeze({
    READY: ready,
    DRAFT_INVALID: draftInvalid,
    DRAFT_VALID: draftValid,
    AWAITING_APPROVAL: awaitingApproval,
    APPROVED: approved,
    COMMITTED: committed,
  });
}

export function createTestStore(initialState: AppState = readyState()): {
  readonly store: AppStore;
  readonly dependencies: MutableCommandDependencies;
  readonly savedStates: AppState[];
} {
  const dependencies = commandDependencies();
  const savedStates: AppState[] = [];
  const store = createAppStore(initialState, {
    commandDependencies: dependencies,
    persistence: {
      save(state) {
        savedStates.push(state);
      },
    },
  });

  return { store, dependencies, savedStates };
}

export async function createValidDraft(store: AppStore): Promise<AppState> {
  const result = await store.dispatch({
    type: 'CREATE_DRAFT',
    actor: 'agent',
    assignments: validAssignments(),
  });
  if (!result.ok) throw new Error(`TEST_DRAFT_CREATION_FAILED:${result.error.code}`);
  return result.state;
}

export async function prepareApproveAndCommit(
  store: AppStore,
  dependencies: MutableCommandDependencies,
): Promise<AppState> {
  await createValidDraft(store);
  const prepared = await store.dispatch({
    type: 'PREPARE_APPROVAL',
    actor: 'agent',
    expectedDraftVersion: 1,
  });
  if (!prepared.ok) throw new Error(`TEST_PREPARE_FAILED:${prepared.error.code}`);

  const approved = await store.dispatch({
    type: 'APPROVE',
    actor: 'human',
    expectedDraftVersion: 1,
  });
  if (!approved.ok) throw new Error(`TEST_APPROVE_FAILED:${approved.error.code}`);

  dependencies.setNow('2026-08-26T12:01:00.000Z');
  const committed = await store.dispatch({
    type: 'COMMIT_PLAN',
    actor: 'agent',
    expectedDraftVersion: 1,
  });
  if (!committed.ok) throw new Error(`TEST_COMMIT_FAILED:${committed.error.code}`);
  return committed.state;
}

export function validDraftToolInput(): Record<string, unknown> {
  return {
    assignments: validAssignments().map(({ requestId: id, volunteerId: volunteer, startTime }) => ({
      requestId: id,
      volunteerId: volunteer,
      startTime,
    })),
    unassignedRequestIds: [],
    rationale: 'Use the deterministic canonical fixture.',
  };
}

export function minimumToolInput(name: ToolName): Record<string, unknown> {
  switch (name) {
    case 'create_assignment_draft':
      return { assignments: [], unassignedRequestIds: [] };
    case 'validate_assignment_draft':
    case 'commit_assignment_plan':
      return { expectedDraftVersion: 1 };
    case 'revise_assignment_draft':
      return {
        expectedDraftVersion: 1,
        changes: [{ action: 'SET_UNASSIGNED', requestId: 'R-101' }],
      };
    case 'prepare_plan_approval':
      return { expectedDraftVersion: 1, summary: 'Ready for review.' };
    case 'access_dispatch_contacts':
      return { requestIds: ['R-101'] };
    default:
      return {};
  }
}

export interface MutableStateStore extends AppStore {
  setState(state: AppState): void;
  emit(): void;
}

export function createMutableStateStore(initialState: AppState): MutableStateStore {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    async dispatch() {
      throw new Error('TEST_REGISTRY_STORE_DISPATCH_NOT_ALLOWED');
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState(nextState) {
      state = nextState;
      for (const listener of [...listeners]) listener();
    },
    emit() {
      for (const listener of [...listeners]) listener();
    },
  };
}

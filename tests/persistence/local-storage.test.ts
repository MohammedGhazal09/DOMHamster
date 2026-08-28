import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../src/domain/canonical-json';
import {
  reduceCommand,
  type CommandDependencies,
  type CommandResult,
} from '../../src/domain/commands';
import { CANONICAL_SCENARIO } from '../../src/domain/seed';
import {
  requestId,
  type AppState,
  type AuditEventId,
  type PlanId,
  type ReadyState,
} from '../../src/domain/types';
import {
  DOMHAMSTER_STORAGE_KEY,
  PERSISTENCE_SCHEMA_VERSION,
  createLocalStorageRepository,
  type LocalStorageRepositoryDependencies,
} from '../../src/persistence/local-storage';
import { validAssignments } from '../fixtures/drafts';
import { MemoryStorage } from '../helpers/storage-fakes';

const FIXTURE_VERSION = CANONICAL_SCENARIO.id;
const FIXTURE_HASH = 'b861f7e997f2f14e087d209130de7e4aa465d8047110b11872edb7750a2122b1';

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

function runtimeDependencies() {
  let planSequence = 0;
  let auditSequence = 0;
  let currentTime = '2026-08-26T12:00:00.000Z';
  const command: CommandDependencies & { setNow(value: string): void } = {
    scenario: CANONICAL_SCENARIO,
    now: () => currentTime,
    nextPlanId: () => `PLAN-${++planSequence}` as PlanId,
    nextAuditEventId: () => `AUDIT-${++auditSequence}` as AuditEventId,
    setNow(value) {
      currentTime = value;
    },
  };
  return {
    command,
    clock: { now: () => currentTime },
    ids: { nextAuditEventId: command.nextAuditEventId },
  };
}

function success(result: CommandResult): AppState {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function draftState(deps: CommandDependencies): AppState {
  const draft = success(
    reduceCommand(
      readyState(),
      { type: 'CREATE_DRAFT', actor: 'agent', assignments: validAssignments() },
      deps,
    ),
  );
  return success(
    reduceCommand(
      draft,
      {
        type: 'LOCK_ASSIGNMENT',
        actor: 'human',
        expectedDraftVersion: draft.draft!.version,
        requestId: requestId('R-105'),
      },
      deps,
    ),
  );
}

function approvedState(deps: ReturnType<typeof runtimeDependencies>['command']): AppState {
  const draft = draftState(deps);
  const awaiting = success(
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

function committedState(deps: ReturnType<typeof runtimeDependencies>['command']): AppState {
  const approved = approvedState(deps);
  return success(
    reduceCommand(
      approved,
      {
        type: 'COMMIT_PLAN',
        actor: 'agent',
        expectedDraftVersion: approved.draft!.version,
      },
      deps,
    ),
  );
}

function repository(
  storage: MemoryStorage,
  runtime = runtimeDependencies(),
  overrides: Partial<LocalStorageRepositoryDependencies> = {},
) {
  return {
    runtime,
    repository: createLocalStorageRepository({
      storage,
      scenario: CANONICAL_SCENARIO,
      fixtureVersion: FIXTURE_VERSION,
      fixtureHash: FIXTURE_HASH,
      clock: runtime.clock,
      ids: runtime.ids,
      ...overrides,
    }),
  };
}

function setEnvelope(storage: MemoryStorage, envelope: unknown): void {
  storage.values.set(DOMHAMSTER_STORAGE_KEY, JSON.stringify(envelope));
}

interface StoredEnvelope {
  savedAt: string;
  state: {
    auditHistory: { type: string }[];
    committedPlan: { assignments: { status: string }[] };
  };
}

function storedEnvelope(storage: MemoryStorage): StoredEnvelope {
  const raw = storage.values.get(DOMHAMSTER_STORAGE_KEY);
  if (raw === undefined) throw new Error('TEST_EXPECTED_STORED_ENVELOPE');
  return JSON.parse(raw) as StoredEnvelope;
}

describe('versioned local storage round trips', () => {
  it.each([
    [
      'READY',
      (deps: CommandDependencies) => {
        void deps;
        return readyState();
      },
    ],
    ['DRAFT_VALID', (deps: CommandDependencies) => draftState(deps)],
    [
      'COMMITTED',
      (deps: CommandDependencies) =>
        committedState(deps as ReturnType<typeof runtimeDependencies>['command']),
    ],
  ] as const)(
    'round-trips %s without persisting private scenario fields',
    async (_name, makeState) => {
      const storage = new MemoryStorage();
      const { repository: stateRepository, runtime } = repository(storage);
      const state = makeState(runtime.command);

      await Promise.resolve(stateRepository.save(state));
      const loaded = stateRepository.load();

      expect(loaded.recovery).toBeNull();
      expect(canonicalJson(loaded.state)).toBe(canonicalJson(state));
      expect(Object.isFrozen(loaded.state)).toBe(true);
      const serialized = storage.values.get(DOMHAMSTER_STORAGE_KEY)!;
      expect(serialized.includes('privateContacts')).toBe(false);
      expect(serialized.includes('Recipient 101')).toBe(false);
    },
  );

  it('uses the frozen key and versioned fixture envelope', async () => {
    const storage = new MemoryStorage();
    const { repository: stateRepository } = repository(storage);

    await Promise.resolve(stateRepository.save(readyState()));
    const envelope = storedEnvelope(storage);

    expect(DOMHAMSTER_STORAGE_KEY).toBe('domhamster:v1');
    expect(envelope).toMatchObject({
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      fixtureVersion: FIXTURE_VERSION,
      fixtureHash: FIXTURE_HASH,
      savedAt: '2026-08-26T12:00:00.000Z',
      state: { workflowState: 'READY' },
    });
  });
});

describe('safe persistence recovery', () => {
  it.each([
    ['malformed JSON', '{broken', 'MALFORMED_JSON'],
    [
      'schema mismatch',
      JSON.stringify({
        schemaVersion: 999,
        fixtureVersion: FIXTURE_VERSION,
        fixtureHash: FIXTURE_HASH,
      }),
      'SCHEMA_MISMATCH',
    ],
    [
      'fixture mismatch',
      JSON.stringify({
        schemaVersion: PERSISTENCE_SCHEMA_VERSION,
        fixtureVersion: 'other-fixture',
        fixtureHash: 'other-hash',
        savedAt: '2026-08-26T12:00:00.000Z',
        state: {
          workflowState: 'READY',
          draft: null,
          approval: null,
          committedPlan: null,
          auditHistory: [],
        },
      }),
      'FIXTURE_MISMATCH',
    ],
  ] as const)('returns canonical READY for %s with a sanitized notice', (_name, raw, code) => {
    const storage = new MemoryStorage();
    storage.values.set(DOMHAMSTER_STORAGE_KEY, raw);
    const { repository: stateRepository } = repository(storage);

    const loaded = stateRepository.load();

    expect(loaded.state.workflowState).toBe('READY');
    expect(loaded.state.scenario).toBe(CANONICAL_SCENARIO);
    expect(loaded.recovery).toMatchObject({
      code,
      message: 'Saved DOMHamster data was reset safely.',
    });
    expect(JSON.stringify(loaded.recovery).includes('broken')).toBe(false);
    expect(JSON.stringify(loaded.recovery).includes('other-hash')).toBe(false);
  });

  it('rejects non-canonical timestamps instead of accepting permissive Date.parse input', async () => {
    const storage = new MemoryStorage();
    const { repository: stateRepository } = repository(storage);
    await Promise.resolve(stateRepository.save(readyState()));
    const envelope = storedEnvelope(storage);
    envelope.savedAt = '1';
    setEnvelope(storage, envelope);

    const loaded = stateRepository.load();

    expect(loaded.state.workflowState).toBe('READY');
    expect(loaded.recovery?.code).toBe('INVALID_STATE');
  });

  it('rejects crafted audit event types', async () => {
    const storage = new MemoryStorage();
    const { repository: stateRepository, runtime } = repository(storage);
    await Promise.resolve(stateRepository.save(draftState(runtime.command)));
    const envelope = storedEnvelope(storage);
    const firstAuditEvent = envelope.state.auditHistory[0];
    if (firstAuditEvent === undefined) throw new Error('TEST_EXPECTED_AUDIT_EVENT');
    firstAuditEvent.type = 'CRAFTED_EVENT';
    setEnvelope(storage, envelope);

    const loaded = stateRepository.load();

    expect(loaded.state.workflowState).toBe('READY');
    expect(loaded.recovery?.code).toBe('INVALID_STATE');
  });

  it('resets a crafted committed plan that violates assignment invariants', async () => {
    const storage = new MemoryStorage();
    const { repository: stateRepository, runtime } = repository(storage);
    await Promise.resolve(stateRepository.save(committedState(runtime.command)));
    const envelope = storedEnvelope(storage);
    const firstAssignment = envelope.state.committedPlan.assignments[0];
    if (firstAssignment === undefined) throw new Error('TEST_EXPECTED_ASSIGNMENT');
    firstAssignment.status = 'planned';
    setEnvelope(storage, envelope);

    const loaded = stateRepository.load();

    expect(loaded.state.workflowState).toBe('READY');
    expect(loaded.recovery?.code).toBe('INVALID_STATE');
  });

  it('returns canonical READY when storage reads fail', () => {
    const storage = new MemoryStorage();
    storage.getError = new Error('PRIVATE_BROWSER_FAILURE');
    const { repository: stateRepository } = repository(storage);

    const loaded = stateRepository.load();

    expect(loaded.state.workflowState).toBe('READY');
    expect(loaded.recovery).toMatchObject({
      code: 'PERSISTENCE_READ_FAILED',
      message: 'Saved DOMHamster data was reset safely.',
    });
    expect(JSON.stringify(loaded.recovery).includes('PRIVATE_BROWSER_FAILURE')).toBe(false);
  });
});

describe('approval reload and write failures', () => {
  it.each(['AWAITING_APPROVAL', 'APPROVED'] as const)(
    'invalidates %s on reload while preserving the revalidated draft and lock',
    async (reviewState) => {
      const storage = new MemoryStorage();
      const { repository: stateRepository, runtime } = repository(storage);
      const approved = approvedState(runtime.command);
      let state = approved;
      if (reviewState === 'AWAITING_APPROVAL') {
        const freshRuntime = runtimeDependencies();
        const draft = draftState(freshRuntime.command);
        state = success(
          reduceCommand(
            draft,
            {
              type: 'PREPARE_APPROVAL',
              actor: 'agent',
              expectedDraftVersion: draft.draft!.version,
            },
            freshRuntime.command,
          ),
        );
      }
      await Promise.resolve(stateRepository.save(state));

      const loaded = stateRepository.load();

      expect(loaded.recovery).toBeNull();
      expect(loaded.state.workflowState).toBe('DRAFT_VALID');
      expect(loaded.state.approval).toBeNull();
      expect(loaded.state.draft?.version).toBe(state.draft?.version);
      expect(
        loaded.state.draft?.assignments.find(({ requestId: id }) => id === requestId('R-105'))
          ?.lockedByHuman,
      ).toBe(true);
      expect(loaded.state.auditHistory.at(-1)?.type).toBe('APPROVAL_INVALIDATED_RELOAD');
    },
  );

  it('throws only a sanitized persistence error when a write is rejected', async () => {
    const storage = new MemoryStorage();
    storage.setError = new Error('QUOTA_PRIVATE_DETAIL');
    const { repository: stateRepository } = repository(storage);
    let error: unknown;

    try {
      await Promise.resolve(stateRepository.save(readyState()));
    } catch (caught) {
      error = caught;
    }

    expect(error instanceof Error).toBe(true);
    expect((error as Error).message).toBe('PERSISTENCE_WRITE_FAILED');
    expect((error as { code?: string }).code).toBe('PERSISTENCE_WRITE_FAILED');
    expect(String(error).includes('QUOTA_PRIVATE_DETAIL')).toBe(false);
  });
});

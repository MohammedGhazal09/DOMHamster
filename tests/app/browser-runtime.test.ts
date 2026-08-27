import { describe, expect, it } from 'vitest';
import { createBrowserRuntime } from '../../src/app/browser-runtime.ts';
import type { ModelContextPort } from '../../src/app/ports.ts';
import { CANONICAL_SCENARIO } from '../../src/domain/seed.ts';
import type { AuditEventId, PlanId } from '../../src/domain/types.ts';
import { DOMHAMSTER_STORAGE_KEY } from '../../src/persistence/local-storage.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { validAssignments } from '../fixtures/drafts.ts';
import { MemoryStorage } from '../helpers/storage-fakes.ts';

interface RegisteredToolLike {
  readonly name: string;
}

class FakeModelContext implements ModelContextPort {
  readonly tools: RegisteredToolLike[] = [];
  readonly signals: AbortSignal[] = [];

  async registerTool(tool: unknown, options?: { readonly signal?: AbortSignal }): Promise<void> {
    const name =
      tool === null || typeof tool !== 'object'
        ? undefined
        : (Reflect.get(tool, 'name') as unknown);
    if (typeof name !== 'string') {
      throw new Error('TEST_INVALID_TOOL');
    }
    this.tools.push({ name });
    if (options?.signal !== undefined) this.signals.push(options.signal);
  }
}

function runtimeDependencies(
  storage: MemoryStorage,
  documentLike: unknown,
  hostname = 'example.test',
) {
  let planSequence = 0;
  let auditSequence = 0;
  let errorSequence = 0;

  return {
    documentLike,
    location: { protocol: 'https:', hostname },
    storage,
    now: () => '2026-08-27T12:00:00.000Z',
    nextPlanId: () => `PLAN-${++planSequence}` as PlanId,
    nextAuditEventId: () => `AUDIT-${++auditSequence}` as AuditEventId,
    nextErrorReference: () => `ERROR-${++errorSequence}`,
  };
}

describe('browser runtime composition', () => {
  it('keeps the manual shared store active when WebMCP is unavailable', async () => {
    const storage = new MemoryStorage();
    const runtime = createBrowserRuntime(runtimeDependencies(storage, {}));

    expect(runtime.capabilityStatus).toBe('API_UNAVAILABLE');
    expect(runtime.store.getState().workflowState).toBe('READY');
    expect(runtime.persistenceRecovery).toBeNull();

    await runtime.start();

    expect(runtime.getRegistrySnapshot()).toBeNull();
    runtime.teardown();
  });

  it('starts and reconciles state-aware WebMCP tools against the same store', async () => {
    const storage = new MemoryStorage();
    const modelContext = new FakeModelContext();
    const runtime = createBrowserRuntime(runtimeDependencies(storage, { modelContext }));

    await runtime.start();

    expect(runtime.getRegistrySnapshot()?.registeredToolNames).toEqual(desiredToolNames('READY'));

    const result = await runtime.store.dispatch({
      type: 'CREATE_DRAFT',
      actor: 'agent',
      assignments: validAssignments(),
    });
    expect(result.ok).toBe(true);
    await runtime.whenIdle();

    expect(runtime.store.getState().workflowState).toBe('DRAFT_VALID');
    expect(runtime.getRegistrySnapshot()?.registeredToolNames).toEqual(
      desiredToolNames('DRAFT_VALID'),
    );
    expect(storage.setCalls).toBe(1);
    expect(modelContext.signals.slice(0, 5).every((signal) => signal.aborted)).toBe(true);

    runtime.teardown();
  });

  it('overwrites malformed saved state with the canonical recovered READY state', () => {
    const storage = new MemoryStorage();
    storage.values.set(DOMHAMSTER_STORAGE_KEY, '{malformed');

    const runtime = createBrowserRuntime(runtimeDependencies(storage, {}));
    const savedState = JSON.parse(
      storage.values.get(DOMHAMSTER_STORAGE_KEY) ?? '{}',
    ) as unknown;

    expect(runtime.persistenceRecovery?.code).toBe('MALFORMED_JSON');
    expect(runtime.store.getState().scenario).toBe(CANONICAL_SCENARIO);
    expect(runtime.store.getState().workflowState).toBe('READY');
    expect(storage.setCalls).toBe(1);
    expect(savedState).toMatchObject({
      fixtureVersion: CANONICAL_SCENARIO.id,
      state: { workflowState: 'READY' },
    });
  });

  it('aborts every active tool registration during teardown', async () => {
    const storage = new MemoryStorage();
    const modelContext = new FakeModelContext();
    const runtime = createBrowserRuntime(runtimeDependencies(storage, { modelContext }));

    await runtime.start();
    runtime.teardown();

    expect(modelContext.signals).toHaveLength(5);
    expect(modelContext.signals.every((signal) => signal.aborted)).toBe(true);
  });
});

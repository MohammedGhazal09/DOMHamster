import { describe, expect, it } from 'vitest';
import type { ModelContextPort, ModelContextRegistrationOptions } from '../../src/app/ports.ts';
import { TOOL_NAMES, type ToolName } from '../../src/webmcp/contracts.ts';
import { createWebMcpRegistry } from '../../src/webmcp/registry.ts';
import type { ToolHandlerMap } from '../../src/webmcp/handlers.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { createMutableStateStore, workflowStates } from '../helpers/webmcp-fixtures.ts';

interface RegistrationCall {
  readonly name: ToolName;
  readonly tool: ModelContextTool;
  readonly signal: AbortSignal | undefined;
}

interface Deferred {
  readonly promise: Promise<void>;
  resolve(): void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

class FakeModelContext implements ModelContextPort {
  readonly calls: RegistrationCall[] = [];
  readonly failOnce = new Set<ToolName>();
  blocked: Deferred | null = null;

  async registerTool(value: unknown, options?: ModelContextRegistrationOptions): Promise<void> {
    const tool = value as ModelContextTool;
    const name = tool.name as ToolName;
    this.calls.push({ name, tool, signal: options?.signal });

    if (this.failOnce.delete(name)) {
      throw new Error('DO_NOT_EXPOSE_REGISTRY_FAILURE');
    }

    if (this.blocked !== null) {
      const pending = this.blocked;
      this.blocked = null;
      await pending.promise;
    }
  }

  latest(name: ToolName): RegistrationCall | undefined {
    return [...this.calls].reverse().find((call) => call.name === name);
  }
}

function handlers(): ToolHandlerMap {
  return Object.freeze(
    Object.fromEntries(
      TOOL_NAMES.map((name) => [
        name,
        async () => ({
          ok: true as const,
          data: { handler: name },
          nextActions: [] as const,
        }),
      ]),
    ),
  ) as unknown as ToolHandlerMap;
}

describe('state-aware WebMCP registry', () => {
  it('registers the exact READY set with dedicated live signals', async () => {
    const states = workflowStates();
    const store = createMutableStateStore(states.READY);
    const modelContext = new FakeModelContext();
    const registry = createWebMcpRegistry({
      store,
      modelContext,
      handlers: handlers(),
    });

    await registry.start();

    expect(modelContext.calls.map(({ name }) => name)).toEqual(desiredToolNames('READY'));
    expect(new Set(modelContext.calls.map(({ signal }) => signal)).size).toBe(5);
    expect(modelContext.calls.every(({ signal }) => signal?.aborted === false)).toBe(true);
    expect(registry.getSnapshot()).toMatchObject({
      active: true,
      desiredToolNames: desiredToolNames('READY'),
      registeredToolNames: desiredToolNames('READY'),
      errorCodes: [],
    });
  });

  it('aborts removed registrations and registers only the new state delta', async () => {
    const states = workflowStates();
    const store = createMutableStateStore(states.READY);
    const modelContext = new FakeModelContext();
    const registry = createWebMcpRegistry({
      store,
      modelContext,
      handlers: handlers(),
    });
    await registry.start();

    const createDraftSignal = modelContext.latest('create_assignment_draft')?.signal;
    store.setState(states.COMMITTED);
    await registry.whenIdle();

    expect(createDraftSignal?.aborted).toBe(true);
    expect(registry.getSnapshot().desiredToolNames).toEqual(desiredToolNames('COMMITTED'));
    expect(registry.getSnapshot().registeredToolNames).toEqual(desiredToolNames('COMMITTED'));
    expect(
      modelContext.calls.filter(({ signal }) => signal?.aborted === false).map(({ name }) => name),
    ).toEqual(desiredToolNames('COMMITTED'));
  });

  it('does not duplicate registrations for repeated identical notifications', async () => {
    const states = workflowStates();
    const store = createMutableStateStore(states.READY);
    const modelContext = new FakeModelContext();
    const registry = createWebMcpRegistry({
      store,
      modelContext,
      handlers: handlers(),
    });
    await registry.start();
    const callCount = modelContext.calls.length;

    store.emit();
    store.emit();
    await registry.whenIdle();

    expect(modelContext.calls).toHaveLength(callCount);
  });

  it('prevents stale generations from surviving rapid state changes', async () => {
    const states = workflowStates();
    const store = createMutableStateStore(states.READY);
    const modelContext = new FakeModelContext();
    const pending = deferred();
    modelContext.blocked = pending;
    const registry = createWebMcpRegistry({
      store,
      modelContext,
      handlers: handlers(),
    });

    const start = registry.start();
    await Promise.resolve();
    store.setState(states.DRAFT_VALID);
    store.setState(states.COMMITTED);
    pending.resolve();
    await start;
    await registry.whenIdle();

    expect(registry.getSnapshot().desiredToolNames).toEqual(desiredToolNames('COMMITTED'));
    expect(registry.getSnapshot().registeredToolNames).toEqual(desiredToolNames('COMMITTED'));
    expect(
      modelContext.calls.filter(({ signal }) => signal?.aborted === false).map(({ name }) => name),
    ).toEqual(desiredToolNames('COMMITTED'));
  });

  it('records a safe registration error and retries on the next reconciliation', async () => {
    const states = workflowStates();
    const store = createMutableStateStore(states.READY);
    const modelContext = new FakeModelContext();
    modelContext.failOnce.add('get_coordination_overview');
    const registry = createWebMcpRegistry({
      store,
      modelContext,
      handlers: handlers(),
    });

    await registry.start();
    expect(registry.getSnapshot().errorCodes).toContain('TOOL_REGISTRATION_FAILED');
    expect(registry.getSnapshot().registeredToolNames).not.toContain('get_coordination_overview');

    store.emit();
    await registry.whenIdle();

    expect(registry.getSnapshot().registeredToolNames).toEqual(desiredToolNames('READY'));
    expect(
      modelContext.calls.filter(({ name }) => name === 'get_coordination_overview'),
    ).toHaveLength(2);
    expect(JSON.stringify(registry.getSnapshot())).not.toContain('DO_NOT_EXPOSE');
  });

  it('registers executable tools that delegate to the matching handler', async () => {
    const states = workflowStates();
    const store = createMutableStateStore(states.READY);
    const modelContext = new FakeModelContext();
    const registry = createWebMcpRegistry({
      store,
      modelContext,
      handlers: handlers(),
    });
    await registry.start();

    const registration = modelContext.latest('get_coordination_overview');
    expect(registration?.tool.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
    const result = await registration?.tool.execute({}, { signal: new AbortController().signal });
    expect(result).toEqual({
      ok: true,
      data: { handler: 'get_coordination_overview' },
      nextActions: [],
    });
  });

  it('teardown aborts every controller and unsubscribes from future changes', async () => {
    const states = workflowStates();
    const store = createMutableStateStore(states.READY);
    const modelContext = new FakeModelContext();
    const registry = createWebMcpRegistry({
      store,
      modelContext,
      handlers: handlers(),
    });
    await registry.start();
    const callCount = modelContext.calls.length;

    registry.teardown();
    expect(modelContext.calls.every(({ signal }) => signal?.aborted === true)).toBe(true);
    expect(registry.getSnapshot().active).toBe(false);
    expect(registry.getSnapshot().registeredToolNames).toEqual([]);

    store.setState(states.COMMITTED);
    await registry.whenIdle();
    expect(modelContext.calls).toHaveLength(callCount);
  });
});

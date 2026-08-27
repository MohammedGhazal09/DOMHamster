import type { ModelContextPort } from '../app/ports.ts';
import type { AppStore } from '../app/store.ts';
import { TOOL_CONTRACT_BY_NAME, type ToolName, type WebMcpToolContract } from './contracts.ts';
import type { ToolExecutionResult, ToolHandlerMap } from './handlers.ts';
import { desiredToolNames } from './lifecycle.ts';

export interface WebMcpRegistrySnapshot {
  readonly active: boolean;
  readonly desiredToolNames: readonly ToolName[];
  readonly registeredToolNames: readonly ToolName[];
  readonly errorCodes: readonly string[];
  readonly generation: number;
}

export interface WebMcpRegistry {
  start(): Promise<void>;
  whenIdle(): Promise<void>;
  getSnapshot(): WebMcpRegistrySnapshot;
  subscribe(listener: () => void): () => void;
  teardown(): void;
}

export interface WebMcpRegistryDependencies {
  readonly store: AppStore;
  readonly modelContext: ModelContextPort;
  readonly handlers: ToolHandlerMap;
}

interface RegistrationRecord {
  readonly controller: AbortController;
  registered: boolean;
}

interface ExecuteOptions {
  readonly signal: AbortSignal;
}

const MAX_REGISTRY_ERRORS = 10;

function freezeNames(names: readonly ToolName[]): readonly ToolName[] {
  return Object.freeze([...names]);
}

function registrationTool(
  contract: WebMcpToolContract,
  handler: ToolHandlerMap[ToolName],
): ModelContextTool {
  return Object.freeze({
    name: contract.name,
    title: contract.title,
    description: contract.description,
    inputSchema: contract.inputSchema,
    annotations: contract.annotations,
    execute: (inputObject: object, options: ExecuteOptions): Promise<ToolExecutionResult> =>
      handler(inputObject, { signal: options.signal }),
  });
}

export function createWebMcpRegistry(dependencies: WebMcpRegistryDependencies): WebMcpRegistry {
  const registrations = new Map<ToolName, RegistrationRecord>();
  const errors: string[] = [];
  const listeners = new Set<() => void>();
  let active = false;
  let generation = 0;
  let desiredKey = '';
  let unsubscribe: (() => void) | null = null;
  let tail: Promise<void> = Promise.resolve();

  function notify(): void {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A diagnostics subscriber cannot affect tool registration authority.
      }
    }
  }

  function recordError(code: string): void {
    errors.push(code);
    if (errors.length > MAX_REGISTRY_ERRORS) errors.splice(0, errors.length - MAX_REGISTRY_ERRORS);
  }

  function abortAll(): void {
    for (const record of registrations.values()) record.controller.abort();
    registrations.clear();
  }

  function currentDesired(): readonly ToolName[] {
    try {
      return desiredToolNames(dependencies.store.getState().workflowState);
    } catch {
      recordError('REGISTRY_STATE_READ_FAILED');
      return Object.freeze([]);
    }
  }

  async function reconcile(runGeneration: number): Promise<void> {
    if (!active || runGeneration !== generation) return;

    const desired = currentDesired();
    const nextKey = desired.join('|');
    if (nextKey !== desiredKey) {
      abortAll();
      desiredKey = nextKey;
      notify();
    }

    for (const name of desired) {
      const existing = registrations.get(name);
      if (existing?.registered === true && !existing.controller.signal.aborted) continue;

      existing?.controller.abort();
      registrations.delete(name);

      const controller = new AbortController();
      const record: RegistrationRecord = { controller, registered: false };
      registrations.set(name, record);
      const contract = TOOL_CONTRACT_BY_NAME[name];

      try {
        await dependencies.modelContext.registerTool(
          registrationTool(contract, dependencies.handlers[name]),
          { signal: controller.signal },
        );

        const latestDesired = currentDesired();
        if (runGeneration !== generation || !latestDesired.includes(name)) {
          controller.abort();
          registrations.delete(name);
          notify();
          return;
        }

        record.registered = true;
        notify();
      } catch {
        controller.abort();
        registrations.delete(name);
        recordError('TOOL_REGISTRATION_FAILED');
        notify();
      }
    }
  }

  function schedule(): void {
    if (!active) return;
    const runGeneration = ++generation;
    tail = tail.then(
      () => reconcile(runGeneration),
      () => reconcile(runGeneration),
    );
  }

  async function whenIdle(): Promise<void> {
    let observed: Promise<void>;
    do {
      observed = tail;
      await observed;
    } while (observed !== tail);
  }

  function snapshot(): WebMcpRegistrySnapshot {
    const desired = currentDesired();
    const registered = desired.filter((name) => {
      const record = registrations.get(name);
      return record?.registered === true && !record.controller.signal.aborted;
    });

    return Object.freeze({
      active,
      desiredToolNames: freezeNames(desired),
      registeredToolNames: freezeNames(registered),
      errorCodes: Object.freeze([...errors]),
      generation,
    });
  }

  return Object.freeze({
    async start() {
      if (active) return whenIdle();
      active = true;
      desiredKey = '';
      unsubscribe = dependencies.store.subscribe(schedule);
      notify();
      schedule();
      await whenIdle();
    },
    whenIdle,
    getSnapshot: snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    teardown() {
      if (!active) return;
      active = false;
      generation += 1;
      desiredKey = '';
      unsubscribe?.();
      unsubscribe = null;
      abortAll();
      notify();
    },
  });
}

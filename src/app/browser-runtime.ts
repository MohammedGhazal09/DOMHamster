import { CANONICAL_FIXTURE_HASH } from '../domain/fixture-identity.ts';
import { CANONICAL_SCENARIO } from '../domain/seed.ts';
import type { AuditEventId, PlanId } from '../domain/types.ts';
import {
  createLocalStorageRepository,
  type PersistenceRecovery,
} from '../persistence/local-storage.ts';
import {
  detectWebMcpCapability,
  type LocationLike,
  type WebMcpCapabilityStatus,
} from '../webmcp/capability.ts';
import { createToolHandlers } from '../webmcp/handlers.ts';
import {
  createWebMcpRegistry,
  type WebMcpRegistry,
  type WebMcpRegistrySnapshot,
} from '../webmcp/registry.ts';
import type { StoragePort } from './ports.ts';
import { createAppStore, type AppStore } from './store.ts';

export interface BrowserRuntimeDependencies {
  readonly documentLike: unknown;
  readonly location: LocationLike;
  readonly storage: StoragePort;
  readonly now: () => string;
  readonly nextPlanId: () => PlanId;
  readonly nextAuditEventId: () => AuditEventId;
  readonly nextErrorReference: () => string;
}

export interface BrowserRuntime {
  readonly store: AppStore;
  readonly capabilityStatus: WebMcpCapabilityStatus;
  readonly persistenceRecovery: PersistenceRecovery | null;
  start(): Promise<void>;
  whenIdle(): Promise<void>;
  getRegistrySnapshot(): WebMcpRegistrySnapshot | null;
  subscribeRegistry(listener: () => void): () => void;
  teardown(): void;
}

function recoverPersistence(
  repository: ReturnType<typeof createLocalStorageRepository>,
  recovery: PersistenceRecovery | null,
  store: AppStore,
): void {
  if (recovery === null) return;

  try {
    repository.save(store.getState());
  } catch {
    // The manual in-memory interface remains available when storage is blocked.
  }
}

export function createBrowserRuntime(dependencies: BrowserRuntimeDependencies): BrowserRuntime {
  const repository = createLocalStorageRepository({
    storage: dependencies.storage,
    scenario: CANONICAL_SCENARIO,
    fixtureVersion: CANONICAL_SCENARIO.id,
    fixtureHash: CANONICAL_FIXTURE_HASH,
    clock: { now: dependencies.now },
    ids: { nextAuditEventId: dependencies.nextAuditEventId },
  });
  const loaded = repository.load();
  const store = createAppStore(loaded.state, {
    commandDependencies: {
      scenario: CANONICAL_SCENARIO,
      now: dependencies.now,
      nextPlanId: dependencies.nextPlanId,
      nextAuditEventId: dependencies.nextAuditEventId,
    },
    persistence: repository,
  });
  recoverPersistence(repository, loaded.recovery, store);

  const capability = detectWebMcpCapability(dependencies.documentLike, dependencies.location);
  let registry: WebMcpRegistry | null = null;

  if (capability.available) {
    const handlers = createToolHandlers(store, {
      nextErrorReference: dependencies.nextErrorReference,
    });
    registry = createWebMcpRegistry({
      store,
      modelContext: capability.modelContext,
      handlers,
    });
  }

  return Object.freeze({
    store,
    capabilityStatus: capability.status,
    persistenceRecovery: loaded.recovery,
    async start() {
      await registry?.start();
    },
    async whenIdle() {
      await registry?.whenIdle();
    },
    getRegistrySnapshot() {
      return registry?.getSnapshot() ?? null;
    },
    subscribeRegistry(listener: () => void) {
      return registry?.subscribe(listener) ?? (() => undefined);
    },
    teardown() {
      registry?.teardown();
    },
  });
}

function browserStoragePort(): StoragePort {
  return Object.freeze({
    getItem(key: string) {
      return window.localStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      window.localStorage.setItem(key, value);
    },
    removeItem(key: string) {
      window.localStorage.removeItem(key);
    },
  });
}

let browserIdSequence = 0;

function nextBrowserId(prefix: string): string {
  browserIdSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${browserIdSequence.toString(36)}`;
}

export function createDefaultBrowserRuntime(): BrowserRuntime {
  return createBrowserRuntime({
    documentLike: document,
    location: {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
    },
    storage: browserStoragePort(),
    now: () => new Date().toISOString(),
    nextPlanId: () => nextBrowserId('PLAN') as PlanId,
    nextAuditEventId: () => nextBrowserId('AUDIT') as AuditEventId,
    nextErrorReference: () => nextBrowserId('ERROR'),
  });
}

import { useCallback, useSyncExternalStore } from 'react';
import { App, type AppProps } from './App.tsx';
import type { AppStore } from './store.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import type { WebMcpRegistrySnapshot } from '../webmcp/registry.ts';

const EMPTY_REGISTERED_TOOL_NAMES = Object.freeze([] as ToolName[]);
const EMPTY_REGISTRY_ERRORS = Object.freeze([] as string[]);

export interface RegistrySnapshotSource {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => WebMcpRegistrySnapshot | null;
}

export interface StoreConnectedAppProps extends Omit<
  AppProps,
  | 'state'
  | 'onHumanDraftCommand'
  | 'onWorkflowCommand'
  | 'registeredToolNames'
  | 'registryErrorCodes'
> {
  readonly store: AppStore;
  readonly registrySource?: RegistrySnapshotSource;
}

// eslint-disable-next-line react-refresh/only-export-components -- Exported for deterministic subscription tests.
export function registrySnapshotKey(snapshot: WebMcpRegistrySnapshot | null): string {
  if (snapshot === null) return 'registry:null';
  return JSON.stringify([
    snapshot.active,
    snapshot.generation,
    snapshot.desiredToolNames,
    snapshot.registeredToolNames,
    snapshot.errorCodes,
  ]);
}

export function StoreConnectedApp({ store, registrySource, ...appProps }: StoreConnectedAppProps) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const subscribeToRegistry = useCallback(
    (listener: () => void) => registrySource?.subscribe(listener) ?? (() => undefined),
    [registrySource],
  );
  const readRegistryKey = useCallback(
    () => registrySnapshotKey(registrySource?.getSnapshot() ?? null),
    [registrySource],
  );
  useSyncExternalStore(subscribeToRegistry, readRegistryKey, readRegistryKey);
  const registrySnapshot = registrySource?.getSnapshot() ?? null;

  return (
    <App
      {...appProps}
      state={state}
      registeredToolNames={registrySnapshot?.registeredToolNames ?? EMPTY_REGISTERED_TOOL_NAMES}
      registryErrorCodes={registrySnapshot?.errorCodes ?? EMPTY_REGISTRY_ERRORS}
      onWorkflowCommand={store.dispatch}
    />
  );
}

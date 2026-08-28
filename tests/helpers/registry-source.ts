import type { AppStore } from '../../src/app/store.ts';
import type { RegistrySnapshotSource } from '../../src/app/StoreConnectedApp.tsx';
import type { WebMcpRegistrySnapshot } from '../../src/webmcp/registry.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';

const EMPTY_ERROR_CODES = Object.freeze([] as string[]);

export function registrySourceForStore(store: AppStore): RegistrySnapshotSource {
  return Object.freeze({
    subscribe: (listener: () => void) => store.subscribe(listener),
    getSnapshot: (): WebMcpRegistrySnapshot => {
      const registeredToolNames = desiredToolNames(store.getState().workflowState);
      return Object.freeze({
        active: true,
        generation: 1,
        desiredToolNames: registeredToolNames,
        registeredToolNames,
        errorCodes: EMPTY_ERROR_CODES,
      });
    },
  });
}

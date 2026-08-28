import { reduceCommand, type Command, type CommandDependencies } from '../domain/commands.ts';
import type { AppState } from '../domain/types.ts';
import type { StatePersistencePort, StoreDispatchResult } from './ports.ts';

export type { StatePersistencePort, StoreDispatchResult, StorePersistencePort } from './ports.ts';

export interface AppStore {
  readonly getState: () => AppState;
  readonly dispatch: (command: Command) => Promise<StoreDispatchResult>;
  readonly subscribe: (listener: () => void) => () => void;
}

export interface AppStoreDependencies {
  readonly commandDependencies: CommandDependencies;
  readonly persistence: StatePersistencePort;
}

function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) {
      deepFreeze(entry);
    }
  }
  return value;
}

function persistenceFailure(state: AppState): StoreDispatchResult {
  return Object.freeze({
    ok: false,
    state,
    error: Object.freeze({
      code: 'PERSISTENCE_WRITE_FAILED',
      message: 'PERSISTENCE_WRITE_FAILED',
    }),
  });
}

export function createAppStore(
  initialState: AppState,
  dependencies: AppStoreDependencies,
): AppStore {
  let state = deepFreeze(initialState);
  let tail: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A presentation subscriber cannot roll back an already persisted state.
      }
    }
  }

  function dispatch(command: Command): Promise<StoreDispatchResult> {
    const operation = tail.then(async () => {
      const current = state;
      const result = reduceCommand(current, command, dependencies.commandDependencies);
      if (!result.ok) {
        return result;
      }

      try {
        await dependencies.persistence.save(result.state);
      } catch {
        return persistenceFailure(current);
      }

      state = deepFreeze(result.state);
      notify();
      return Object.freeze({ ok: true, state });
    });

    tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  return Object.freeze({
    getState: () => state,
    dispatch,
    subscribe(listener: () => void) {
      listeners.add(listener);
      let active = true;
      return () => {
        if (active) {
          active = false;
          listeners.delete(listener);
        }
      };
    },
  });
}

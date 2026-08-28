from pathlib import Path


def replace_once(path_name: str, old: str, new: str) -> None:
    path = Path(path_name)
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one patch target in {path_name}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_count(path_name: str, old: str, new: str, expected: int) -> None:
    path = Path(path_name)
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"expected {expected} patch targets in {path_name}, found {count}")
    path.write_text(text.replace(old, new), encoding="utf-8")


replace_once(
    "src/app/ports.ts",
    """export interface StatePersistencePort {
  save(state: AppState): void | Promise<void>;
}""",
    """export interface StatePersistencePort {
  readonly save: (state: AppState) => void | Promise<void>;
}""",
)

replace_once(
    "src/persistence/local-storage.ts",
    """export interface LocalStorageRepository extends StatePersistencePort {
  load(): PersistenceLoadResult;
  clear(): void;
}""",
    """export interface LocalStorageRepository extends StatePersistencePort {
  readonly load: () => PersistenceLoadResult;
  readonly clear: () => void;
}""",
)

replace_count(
    "tests/persistence/local-storage.test.ts",
    "await stateRepository.save(state);",
    "await Promise.resolve(stateRepository.save(state));",
    2,
)
replace_count(
    "tests/persistence/local-storage.test.ts",
    "await stateRepository.save(readyState());",
    "await Promise.resolve(stateRepository.save(readyState()));",
    3,
)
replace_once(
    "tests/persistence/local-storage.test.ts",
    "await stateRepository.save(draftState(runtime.command));",
    "await Promise.resolve(stateRepository.save(draftState(runtime.command)));",
)
replace_once(
    "tests/persistence/local-storage.test.ts",
    "await stateRepository.save(committedState(runtime.command));",
    "await Promise.resolve(stateRepository.save(committedState(runtime.command)));",
)

replace_once(
    "tests/helpers/registry-source.ts",
    "import type { RegistrySnapshotSource } from '../../src/app/StoreConnectedApp.tsx';\n",
    "",
)
replace_once(
    "tests/helpers/registry-source.ts",
    """const EMPTY_ERROR_CODES = Object.freeze([] as string[]);

export function registrySourceForStore(store: AppStore): RegistrySnapshotSource {""",
    """interface TestRegistrySnapshotSource {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => WebMcpRegistrySnapshot;
}

const EMPTY_ERROR_CODES = Object.freeze([] as string[]);

export function registrySourceForStore(store: AppStore): TestRegistrySnapshotSource {""",
)

replace_once(
    "tests/toolchain/registry-ui-bridge-contract.test.mjs",
    "  'subscribeRegistry(listener: () => void): () => void;',",
    "  'readonly subscribeRegistry: (listener: () => void) => () => void;',",
)

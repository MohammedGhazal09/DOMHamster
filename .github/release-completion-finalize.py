from pathlib import Path


def replace_once(path_name: str, old: str, new: str) -> None:
    path = Path(path_name)
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one patch target in {path_name}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_lines(path_name: str, old_lines: list[str], new_lines: list[str]) -> None:
    replace_once(path_name, "\n".join(old_lines), "\n".join(new_lines))


replace_once(
    "scripts/run-release-gate.mjs",
    "  let isFile = false;",
    "  let isFile;",
)

replace_lines(
    "src/app/store.ts",
    [
        "export interface AppStore {",
        "  getState(): AppState;",
        "  dispatch(command: Command): Promise<StoreDispatchResult>;",
        "  subscribe(listener: () => void): () => void;",
        "}",
    ],
    [
        "export interface AppStore {",
        "  readonly getState: () => AppState;",
        "  readonly dispatch: (command: Command) => Promise<StoreDispatchResult>;",
        "  readonly subscribe: (listener: () => void) => () => void;",
        "}",
    ],
)

replace_lines(
    "src/app/browser-runtime.ts",
    [
        "export interface BrowserRuntime {",
        "  readonly store: AppStore;",
        "  readonly capabilityStatus: WebMcpCapabilityStatus;",
        "  readonly persistenceRecovery: PersistenceRecovery | null;",
        "  start(): Promise<void>;",
        "  whenIdle(): Promise<void>;",
        "  getRegistrySnapshot(): WebMcpRegistrySnapshot | null;",
        "  subscribeRegistry(listener: () => void): () => void;",
        "  teardown(): void;",
        "}",
    ],
    [
        "export interface BrowserRuntime {",
        "  readonly store: AppStore;",
        "  readonly capabilityStatus: WebMcpCapabilityStatus;",
        "  readonly persistenceRecovery: PersistenceRecovery | null;",
        "  readonly start: () => Promise<void>;",
        "  readonly whenIdle: () => Promise<void>;",
        "  readonly getRegistrySnapshot: () => WebMcpRegistrySnapshot | null;",
        "  readonly subscribeRegistry: (listener: () => void) => () => void;",
        "  readonly teardown: () => void;",
        "}",
    ],
)
replace_lines(
    "src/app/browser-runtime.ts",
    [
        "function recoverPersistence(",
        "  repository: ReturnType<typeof createLocalStorageRepository>,",
        "  recovery: PersistenceRecovery | null,",
        "  store: AppStore,",
        "): void {",
        "  if (recovery === null) return;",
        "",
        "  try {",
        "    repository.save(store.getState());",
        "  } catch {",
        "    // The manual in-memory interface remains available when storage is blocked.",
        "  }",
        "}",
    ],
    [
        "async function recoverPersistence(",
        "  repository: ReturnType<typeof createLocalStorageRepository>,",
        "  recovery: PersistenceRecovery | null,",
        "  store: AppStore,",
        "): Promise<void> {",
        "  if (recovery === null) return;",
        "",
        "  try {",
        "    await repository.save(store.getState());",
        "  } catch {",
        "    // The manual in-memory interface remains available when storage is blocked.",
        "  }",
        "}",
    ],
)
replace_once(
    "src/app/browser-runtime.ts",
    "  recoverPersistence(repository, loaded.recovery, store);",
    "  void recoverPersistence(repository, loaded.recovery, store);",
)

replace_lines(
    "src/app/StoreConnectedApp.tsx",
    [
        "export interface RegistrySnapshotSource {",
        "  subscribe(listener: () => void): () => void;",
        "  getSnapshot(): WebMcpRegistrySnapshot | null;",
        "}",
    ],
    [
        "export interface RegistrySnapshotSource {",
        "  readonly subscribe: (listener: () => void) => () => void;",
        "  readonly getSnapshot: () => WebMcpRegistrySnapshot | null;",
        "}",
    ],
)
replace_once(
    "src/app/StoreConnectedApp.tsx",
    "export function registrySnapshotKey(snapshot: WebMcpRegistrySnapshot | null): string {",
    "// eslint-disable-next-line react-refresh/only-export-components -- Exported for deterministic subscription tests.\nexport function registrySnapshotKey(snapshot: WebMcpRegistrySnapshot | null): string {",
)

replace_once(
    "src/ui/workflow-commands.ts",
    "import type { StoreDispatchResult } from '../app/ports.ts';\n",
    "",
)
replace_lines(
    "src/ui/workflow-commands.ts",
    [
        "export type WorkflowCommandHandler = (",
        "  command: WorkflowCommand,",
        ") => StoreDispatchResult | void | Promise<StoreDispatchResult | void>;",
    ],
    [
        "interface WorkflowCommandAcceptedResult {",
        "  readonly ok: true;",
        "}",
        "",
        "interface WorkflowCommandRejectedResult {",
        "  readonly ok: false;",
        "  readonly error: {",
        "    readonly code: string;",
        "  };",
        "}",
        "",
        "type WorkflowCommandResult = WorkflowCommandAcceptedResult | WorkflowCommandRejectedResult;",
        "",
        "export type WorkflowCommandHandler = (command: WorkflowCommand) => unknown;",
        "",
        "function isUnknownRecord(value: unknown): value is Readonly<Record<string, unknown>> {",
        "  return typeof value === 'object' && value !== null;",
        "}",
        "",
        "export function isWorkflowCommandResult(value: unknown): value is WorkflowCommandResult {",
        "  if (!isUnknownRecord(value)) return false;",
        "  const ok = value.ok;",
        "  if (ok === true) return true;",
        "  if (ok !== false) return false;",
        "  const error = value.error;",
        "  return isUnknownRecord(error) && typeof error.code === 'string';",
        "}",
    ],
)
replace_lines(
    "src/ui/workflow-commands.ts",
    [
        "    const result = await onCommand(command);",
        "    if (result !== undefined && !result.ok) {",
        "      onAnnouncement(`Action was not accepted: ${result.error.code}.`);",
        "      return false;",
        "    }",
    ],
    [
        "    const result: unknown = await Promise.resolve(onCommand(command));",
        "    if (result !== undefined) {",
        "      if (!isWorkflowCommandResult(result)) {",
        "        throw new TypeError('Unexpected workflow command result.');",
        "      }",
        "      if (!result.ok) {",
        "        onAnnouncement(`Action was not accepted: ${result.error.code}.`);",
        "        return false;",
        "      }",
        "    }",
    ],
)

replace_lines(
    "src/app/App.tsx",
    [
        "import {",
        "  executeWorkflowCommand,",
        "  type WorkflowCommand,",
        "  type WorkflowCommandHandler,",
        "} from '../ui/workflow-commands.ts';",
    ],
    [
        "import {",
        "  executeWorkflowCommand,",
        "  isWorkflowCommandResult,",
        "  type WorkflowCommand,",
        "  type WorkflowCommandHandler,",
        "} from '../ui/workflow-commands.ts';",
    ],
)
replace_lines(
    "src/app/App.tsx",
    [
        "        const result = await baseCommandHandler(command);",
        "        if (result !== undefined && !result.ok) {",
        "          setRecentErrorCodes((previous) => [...previous, result.error.code].slice(-10));",
        "        }",
        "        return result;",
    ],
    [
        "        const result: unknown = await Promise.resolve(baseCommandHandler(command));",
        "        if (result !== undefined) {",
        "          if (!isWorkflowCommandResult(result)) {",
        "            throw new TypeError('Unexpected workflow command result.');",
        "          }",
        "          if (!result.ok) {",
        "            setRecentErrorCodes((previous) => [...previous, result.error.code].slice(-10));",
        "          }",
        "        }",
        "        return result;",
    ],
)
replace_lines(
    "src/app/App.tsx",
    [
        "  useEffect(() => {",
        "    if (",
        "      (confirmation === 'cancel-approval' && state.workflowState !== 'APPROVED') ||",
        "      (confirmation === 'discard' &&",
        "        (state.workflowState === 'READY' || state.workflowState === 'COMMITTED'))",
        "    ) {",
        "      setConfirmation(null);",
        "    }",
        "  }, [confirmation, state.workflowState]);",
    ],
    [
        "  useEffect(() => {",
        "    const confirmationIsInvalid =",
        "      (confirmation === 'cancel-approval' && state.workflowState !== 'APPROVED') ||",
        "      (confirmation === 'discard' &&",
        "        (state.workflowState === 'READY' || state.workflowState === 'COMMITTED'));",
        "    if (!confirmationIsInvalid) return undefined;",
        "",
        "    let active = true;",
        "    queueMicrotask(() => {",
        "      if (active) setConfirmation(null);",
        "    });",
        "    return () => {",
        "      active = false;",
        "    };",
        "  }, [confirmation, state.workflowState]);",
    ],
)

replace_once(
    "src/ui/AssignmentTable.tsx",
    "import type { WorkflowCommandHandler } from './workflow-commands.ts';",
    "import { isWorkflowCommandResult, type WorkflowCommandHandler } from './workflow-commands.ts';",
)
replace_lines(
    "src/ui/AssignmentTable.tsx",
    [
        "    const result = await onCommand(command);",
        "    if (result !== undefined && !result.ok) {",
        "      onAnnouncement(`Assignment change was not accepted: ${result.error.code}.`);",
        "      return;",
        "    }",
    ],
    [
        "    const result: unknown = await Promise.resolve(onCommand(command));",
        "    if (result !== undefined) {",
        "      if (!isWorkflowCommandResult(result)) {",
        "        throw new TypeError('Unexpected workflow command result.');",
        "      }",
        "      if (!result.ok) {",
        "        onAnnouncement(`Assignment change was not accepted: ${result.error.code}.`);",
        "        return;",
        "      }",
        "    }",
    ],
)

replace_lines(
    "src/domain/state-machine.ts",
    [
        "  if (event === 'COMMIT_PLAN') {",
        "    return actor === 'agent' && state === 'APPROVED';",
        "  }",
        "",
        "  return false;",
    ],
    [
        "  return actor === 'agent' && state === 'APPROVED';",
    ],
)

replace_once(
    "src/ui/ErrorBoundaryFallback.tsx",
    "import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';",
    "import { Component, useEffect, useRef, type ReactNode } from 'react';",
)
replace_lines(
    "src/ui/ErrorBoundaryFallback.tsx",
    [
        "  override componentDidCatch(_error: unknown, _info: ErrorInfo): void {",
        "    // Rendering exceptions are intentionally not serialized or displayed.",
        "  }",
    ],
    [
        "  override componentDidCatch(): void {",
        "    // Rendering exceptions are intentionally not serialized or displayed.",
        "  }",
    ],
)

replace_once(
    "src/ui/ApprovedBanner.tsx",
    "export function formatApprovalCountdown(milliseconds: number): string {",
    "// eslint-disable-next-line react-refresh/only-export-components -- Pure formatter is exported for unit tests.\nexport function formatApprovalCountdown(milliseconds: number): string {",
)

replace_once(
    "tests/app/browser-runtime.test.ts",
    "  async registerTool(tool: unknown, options?: { readonly signal?: AbortSignal }): Promise<void> {",
    "  registerTool(tool: unknown, options?: { readonly signal?: AbortSignal }): void {",
)
replace_lines(
    "tests/ui/error-boundary-fallback.test.tsx",
    [
        "    const onReset = vi.fn(async () => {",
        "      shouldThrow = false;",
        "    });",
    ],
    [
        "    const onReset = vi.fn(() => {",
        "      shouldThrow = false;",
        "    });",
    ],
)

replace_lines(
    "tsconfig.app.json",
    [
        '    "tests/setup.ts",',
        '    "tests/domain/**/*.ts",',
    ],
    [
        '    "tests/setup.ts",',
        '    "tests/accessibility/**/*.tsx",',
        '    "tests/domain/**/*.ts",',
    ],
)

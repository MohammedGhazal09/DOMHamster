from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


def replace_once(path_value: str, old: str, new: str) -> None:
    path = Path(path_value)
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"expected one match in {path_value}, found {count}")
    path.write_text(text.replace(old, new, 1))


def assert_internal_helper(name: str, expected_path: str) -> None:
    result = subprocess.run(
        ["git", "grep", "-l", name, "--", "src", "tests"],
        check=True,
        capture_output=True,
        text=True,
    )
    paths = result.stdout.strip().splitlines()
    if paths != [expected_path]:
        raise RuntimeError(f"unexpected {name} references: {paths}")


def apply_pre_fix() -> None:
    assert_internal_helper("registrySnapshotKey", "src/app/StoreConnectedApp.tsx")
    assert_internal_helper("formatApprovalCountdown", "src/ui/ApprovedBanner.tsx")

    replace_once(
        "scripts/run-release-gate.mjs",
        """  let isFile = false;
  try {
    isFile = statSync(resultsPath).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) throw new Error(`DOMHAMSTER_EVAL_RESULTS_NOT_FILE:${resultsPath}`);
""",
        """  let stats;
  try {
    stats = statSync(resultsPath);
  } catch {
    throw new Error(`DOMHAMSTER_EVAL_RESULTS_NOT_FILE:${resultsPath}`);
  }
  if (!stats.isFile()) throw new Error(`DOMHAMSTER_EVAL_RESULTS_NOT_FILE:${resultsPath}`);
""",
    )

    replace_once(
        "src/app/store.ts",
        """export interface AppStore {
  getState(): AppState;
  dispatch(command: Command): Promise<StoreDispatchResult>;
  subscribe(listener: () => void): () => void;
}
""",
        """export interface AppStore {
  readonly getState: () => AppState;
  readonly dispatch: (command: Command) => Promise<StoreDispatchResult>;
  readonly subscribe: (listener: () => void) => () => void;
}
""",
    )

    replace_once(
        "src/app/browser-runtime.ts",
        """export interface BrowserRuntime {
  readonly store: AppStore;
  readonly capabilityStatus: WebMcpCapabilityStatus;
  readonly persistenceRecovery: PersistenceRecovery | null;
  start(): Promise<void>;
  whenIdle(): Promise<void>;
  getRegistrySnapshot(): WebMcpRegistrySnapshot | null;
  subscribeRegistry(listener: () => void): () => void;
  teardown(): void;
}
""",
        """export interface BrowserRuntime {
  readonly store: AppStore;
  readonly capabilityStatus: WebMcpCapabilityStatus;
  readonly persistenceRecovery: PersistenceRecovery | null;
  readonly start: () => Promise<void>;
  readonly whenIdle: () => Promise<void>;
  readonly getRegistrySnapshot: () => WebMcpRegistrySnapshot | null;
  readonly subscribeRegistry: (listener: () => void) => () => void;
  readonly teardown: () => void;
}
""",
    )

    replace_once(
        "src/persistence/local-storage.ts",
        """export interface LocalStorageRepository extends StatePersistencePort {
  load(): PersistenceLoadResult;
  clear(): void;
}
""",
        """export interface LocalStorageRepository extends StatePersistencePort {
  load(): PersistenceLoadResult;
  save(state: AppState): void;
  clear(): void;
}
""",
    )

    replace_once(
        "src/domain/state-machine.ts",
        """  if (event === 'COMMIT_PLAN') {
    return actor === 'agent' && state === 'APPROVED';
  }

  return false;
""",
        """  return actor === 'agent' && state === 'APPROVED';
""",
    )

    replace_once(
        "src/app/StoreConnectedApp.tsx",
        "export function registrySnapshotKey(snapshot: WebMcpRegistrySnapshot | null): string {",
        "function registrySnapshotKey(snapshot: WebMcpRegistrySnapshot | null): string {",
    )

    replace_once(
        "src/ui/ApprovedBanner.tsx",
        "export function formatApprovalCountdown(milliseconds: number): string {",
        "function formatApprovalCountdown(milliseconds: number): string {",
    )

    replace_once(
        "src/ui/ErrorBoundaryFallback.tsx",
        "import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';",
        "import { Component, useEffect, useRef, type ReactNode } from 'react';",
    )
    replace_once(
        "src/ui/ErrorBoundaryFallback.tsx",
        """  override componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    // Rendering exceptions are intentionally not serialized or displayed.
  }
""",
        """  override componentDidCatch(): void {
    // Rendering exceptions are intentionally not serialized or displayed.
  }
""",
    )

    replace_once(
        "src/ui/workflow-commands.ts",
        """export type WorkflowCommandHandler = (
  command: WorkflowCommand,
) => StoreDispatchResult | void | Promise<StoreDispatchResult | void>;
""",
        """export type WorkflowCommandHandler = (
  command: WorkflowCommand,
) => StoreDispatchResult | undefined | Promise<StoreDispatchResult | undefined>;
""",
    )

    replace_once(
        "tsconfig.app.json",
        '    "tests/setup.ts",\n',
        '    "tests/setup.ts",\n    "tests/accessibility/**/*.ts",\n    "tests/accessibility/**/*.tsx",\n',
    )

    replace_once(
        "tests/app/browser-runtime.test.ts",
        "  async registerTool(tool: unknown, options?: { readonly signal?: AbortSignal }): Promise<void> {",
        "  registerTool(tool: unknown, options?: { readonly signal?: AbortSignal }): void {",
    )

    replace_once(
        "tests/ui/error-boundary-fallback.test.tsx",
        """    const onReset = vi.fn(async () => {
      shouldThrow = false;
    });
""",
        """    const onReset = vi.fn(() => {
      shouldThrow = false;
    });
""",
    )

    test_path = Path("tests/ui/workflow-shell.test.tsx")
    test_text = test_path.read_text()
    anchor = """  it('suppresses stale registered tools when WebMCP is unavailable', async () => {
"""
    regression = """  it('dismisses a confirmation when the immutable state snapshot changes within the same workflow state', async () => {
    const initialState = workflowStates().APPROVED;
    const replacementState = Object.freeze({
      ...initialState,
      auditHistory: Object.freeze([...initialState.auditHistory]),
    });
    const user = userEvent.setup();
    const renderResult = render(
      <App
        state={initialState}
        capabilityStatus=\"AVAILABLE\"
        registeredToolNames={desiredToolNames(initialState.workflowState)}
        now={() => Date.parse('2026-08-26T12:00:30.000Z')}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel approval' }));
    expect(
      screen.getByRole('dialog', { name: 'Cancel approval for version 1?' }),
    ).toBeVisible();

    renderResult.rerender(
      <App
        state={replacementState}
        capabilityStatus=\"AVAILABLE\"
        registeredToolNames={desiredToolNames(replacementState.workflowState)}
        now={() => Date.parse('2026-08-26T12:00:30.000Z')}
      />,
    );

    expect(
      screen.queryByRole('dialog', { name: 'Cancel approval for version 1?' }),
    ).not.toBeInTheDocument();
  });

"""
    if test_text.count(anchor) != 1:
        raise RuntimeError("workflow-shell regression insertion anchor was not unique")
    test_path.write_text(test_text.replace(anchor, regression + anchor, 1))


def apply_app_fix() -> None:
    replace_once(
        "src/app/App.tsx",
        "type ConfirmationKind = 'reset' | 'discard' | 'cancel-approval';\n",
        """type ConfirmationKind = 'reset' | 'discard' | 'cancel-approval';

interface ConfirmationRequest {
  readonly kind: ConfirmationKind;
  readonly stateSnapshot: AppState;
}
""",
    )
    replace_once(
        "src/app/App.tsx",
        "  const [confirmation, setConfirmation] = useState<ConfirmationKind | null>(null);\n",
        "  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);\n",
    )
    replace_once(
        "src/app/App.tsx",
        """  const contentRef = useRef<HTMLDivElement>(null);

  const baseCommandHandler = useMemo<WorkflowCommandHandler>(() => {
""",
        """  const contentRef = useRef<HTMLDivElement>(null);
  const activeConfirmation =
    confirmation !== null && confirmation.stateSnapshot === state ? confirmation.kind : null;

  const baseCommandHandler = useMemo<WorkflowCommandHandler>(() => {
""",
    )
    replace_once(
        "src/app/App.tsx",
        """  const hasBlockingLayer =
    state.workflowState === 'AWAITING_APPROVAL' ||
    activityOpen ||
    diagnosticsOpen ||
    confirmation !== null;

  useEffect(() => {
    if (
      (confirmation === 'cancel-approval' && state.workflowState !== 'APPROVED') ||
      (confirmation === 'discard' &&
        (state.workflowState === 'READY' || state.workflowState === 'COMMITTED'))
    ) {
      setConfirmation(null);
    }
  }, [confirmation, state.workflowState]);

""",
        """  const hasBlockingLayer =
    state.workflowState === 'AWAITING_APPROVAL' ||
    activityOpen ||
    diagnosticsOpen ||
    activeConfirmation !== null;

""",
    )
    replace_once(
        "src/app/App.tsx",
        """          onReset={() => {
            setConfirmation('reset');
          }}
""",
        """          onReset={() => {
            setConfirmation(Object.freeze({ kind: 'reset', stateSnapshot: state }));
          }}
""",
    )
    replace_once(
        "src/app/App.tsx",
        """            onRequestDiscard={() => {
              setConfirmation('discard');
            }}
            onRequestCancelApproval={() => {
              setConfirmation('cancel-approval');
            }}
""",
        """            onRequestDiscard={() => {
              setConfirmation(Object.freeze({ kind: 'discard', stateSnapshot: state }));
            }}
            onRequestCancelApproval={() => {
              setConfirmation(
                Object.freeze({ kind: 'cancel-approval', stateSnapshot: state }),
              );
            }}
""",
    )
    replace_once(
        "src/app/App.tsx",
        """      {confirmation === null ? null : (
        <ConfirmDialog
          {...confirmationContent(confirmation)}
          onConfirm={() => confirmWorkflowAction(confirmation)}
          onCancel={() => {
            setConfirmation(null);
          }}
          returnFocusId={confirmationReturnFocusId(confirmation)}
        />
      )}
""",
        """      {activeConfirmation === null ? null : (
        <ConfirmDialog
          {...confirmationContent(activeConfirmation)}
          onConfirm={() => {
            void confirmWorkflowAction(activeConfirmation);
          }}
          onCancel={() => {
            setConfirmation(null);
          }}
          returnFocusId={confirmationReturnFocusId(activeConfirmation)}
        />
      )}
""",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=("pre", "app"))
    args = parser.parse_args()
    if args.phase == "pre":
        apply_pre_fix()
    else:
        apply_app_fix()


if __name__ == "__main__":
    main()

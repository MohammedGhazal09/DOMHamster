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


registry_helper = Path("tests/helpers/registry-source.ts")
if registry_helper.exists():
    raise SystemExit("registry source helper already exists")
registry_helper.write_text(
    """import type { AppStore } from '../../src/app/store.ts';
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
""",
    encoding="utf-8",
)

replace_once(
    "tests/ui/workflow-shell.test.tsx",
    "import { createTestStore, workflowStates } from '../helpers/webmcp-fixtures.ts';",
    "import { registrySourceForStore } from '../helpers/registry-source.ts';\nimport { createTestStore, workflowStates } from '../helpers/webmcp-fixtures.ts';",
)
replace_count(
    "tests/ui/workflow-shell.test.tsx",
    "        registeredToolNames={desiredToolNames(initialState.workflowState)}",
    "        registrySource={registrySourceForStore(store)}",
    4,
)

replace_once(
    "tests/ui/assignment-editor.test.tsx",
    "} from '../helpers/webmcp-fixtures.ts';",
    "} from '../helpers/webmcp-fixtures.ts';\nimport { registrySourceForStore } from '../helpers/registry-source.ts';",
)
replace_once(
    "tests/ui/assignment-editor.test.tsx",
    "        registeredToolNames={desiredToolNames(initialState.workflowState)}",
    "        registrySource={registrySourceForStore(store)}",
)

replace_once(
    "tests/accessibility/automated-a11y.test.tsx",
    "    const state = workflowStates().AWAITING_APPROVAL;\n    renderState(state);",
    "    const state = workflowStates().AWAITING_APPROVAL;\n    if (state.draft === null) throw new Error('TEST_EXPECTED_APPROVAL_DRAFT');\n    renderState(state);",
)

replace_once(
    "tests/helpers/webmcp-fixtures.ts",
    "import { validAssignments } from '../fixtures/drafts.ts';",
    "import { validAssignments } from '../fixtures/drafts.ts';\nexport { validDraftToolInput } from '../fixtures/drafts.ts';",
)
replace_once(
    "tests/helpers/webmcp-fixtures.ts",
    """export function validDraftToolInput(): Record<string, unknown> {
  return {
    assignments: validAssignments().map(({ requestId: id, volunteerId: volunteer, startTime }) => ({
      requestId: id,
      volunteerId: volunteer,
      startTime,
    })),
    unassignedRequestIds: [],
    rationale: 'Use the deterministic canonical fixture.',
  };
}

""",
    "",
)
replace_once(
    "tests/fixtures/drafts.ts",
    """export function validAssignments(): Assignment[] {
  return BASE_ASSIGNMENTS.map((assignment) => ({ ...assignment }));
}
""",
    """export function validAssignments(): Assignment[] {
  return BASE_ASSIGNMENTS.map((assignment) => ({ ...assignment }));
}

export function validDraftToolInput(): Record<string, unknown> {
  return {
    assignments: validAssignments().map(({ requestId: id, volunteerId: volunteer, startTime }) => ({
      requestId: id,
      volunteerId: volunteer,
      startTime,
    })),
    unassignedRequestIds: [],
    rationale: 'Use the deterministic canonical fixture.',
  };
}
""",
)
replace_once(
    "tests/e2e/model-context-harness.ts",
    "import { validDraftToolInput } from '../helpers/webmcp-fixtures.ts';",
    "import { validDraftToolInput } from '../fixtures/drafts.ts';",
)
replace_once(
    "tsconfig.node.json",
    '''    "eslint.config.js",
    "tests/e2e/**/*.ts"''',
    '''    "eslint.config.js",
    "src/domain/types.ts",
    "tests/fixtures/drafts.ts",
    "tests/e2e/**/*.ts"''',
)

from __future__ import annotations

from pathlib import Path

# This non-workflow adapter commit intentionally triggers the registered v3 verifier.


def replace_exact(path_value: str, old: str, new: str, expected_count: int = 1) -> None:
    path = Path(path_value)
    text = path.read_text()
    actual_count = text.count(old)
    if actual_count != expected_count:
        raise RuntimeError(
            f'expected {expected_count} matches in {path_value} for {old!r}, found {actual_count}'
        )
    path.write_text(text.replace(old, new))


replace_exact(
    'src/app/App.tsx',
    """function ignoreWorkflowCommand(): void {
  // Store-connected rendering supplies the real shared command dispatcher.
}
""",
    """function ignoreWorkflowCommand(): undefined {
  // Store-connected rendering supplies the real shared command dispatcher.
  return undefined;
}
""",
)
replace_exact(
    'src/ui/PlanWorkspace.tsx',
    """function ignoreWorkflowCommand(): void {
  // Store-connected rendering supplies the real shared command dispatcher.
}
""",
    """function ignoreWorkflowCommand(): undefined {
  // Store-connected rendering supplies the real shared command dispatcher.
  return undefined;
}
""",
)

replace_exact(
    'tests/accessibility/automated-a11y.test.tsx',
    """    const state = workflowStates().AWAITING_APPROVAL;
    renderState(state);

    const dialog = screen.getByRole('dialog', {
""",
    """    const state = workflowStates().AWAITING_APPROVAL;
    if (state.draft === null) throw new Error('TEST_EXPECTED_APPROVAL_DRAFT');
    renderState(state);

    const dialog = screen.getByRole('dialog', {
""",
)

registry_source_path = Path('tests/helpers/static-registry-source.ts')
if registry_source_path.exists():
    raise RuntimeError('static registry source helper already exists')
registry_source_path.write_text(
    """import type { RegistrySnapshotSource } from '../../src/app/StoreConnectedApp.tsx';
import type { WorkflowState } from '../../src/domain/types.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import type { WebMcpRegistrySnapshot } from '../../src/webmcp/registry.ts';

export function staticRegistrySource(workflowState: WorkflowState): RegistrySnapshotSource {
  const toolNames = desiredToolNames(workflowState);
  const snapshot: WebMcpRegistrySnapshot = Object.freeze({
    active: true,
    desiredToolNames: toolNames,
    registeredToolNames: toolNames,
    errorCodes: Object.freeze([] as string[]),
    generation: 1,
  });

  return Object.freeze({
    subscribe: () => () => undefined,
    getSnapshot: () => snapshot,
  });
}
"""
)

replace_exact(
    'tests/ui/workflow-shell.test.tsx',
    """import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { createTestStore, workflowStates } from '../helpers/webmcp-fixtures.ts';
""",
    """import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { staticRegistrySource } from '../helpers/static-registry-source.ts';
import { createTestStore, workflowStates } from '../helpers/webmcp-fixtures.ts';
""",
)
replace_exact(
    'tests/ui/workflow-shell.test.tsx',
    """      <StoreConnectedApp
        store={store}
        capabilityStatus=\"AVAILABLE\"
        registeredToolNames={desiredToolNames(initialState.workflowState)}
""",
    """      <StoreConnectedApp
        store={store}
        capabilityStatus=\"AVAILABLE\"
        registrySource={staticRegistrySource(initialState.workflowState)}
""",
    expected_count=4,
)

replace_exact(
    'tests/ui/assignment-editor.test.tsx',
    """import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import {
""",
    """import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { staticRegistrySource } from '../helpers/static-registry-source.ts';
import {
""",
)
replace_exact(
    'tests/ui/assignment-editor.test.tsx',
    """      <StoreConnectedApp
        store={store}
        capabilityStatus=\"AVAILABLE\"
        registeredToolNames={desiredToolNames(initialState.workflowState)}
""",
    """      <StoreConnectedApp
        store={store}
        capabilityStatus=\"AVAILABLE\"
        registrySource={staticRegistrySource(initialState.workflowState)}
""",
)

replace_exact(
    'tsconfig.node.json',
    """    \"eslint.config.js\",
    \"tests/e2e/**/*.ts\"
""",
    """    \"eslint.config.js\",
    \"src/app/ports.ts\",
    \"src/app/store.ts\",
    \"src/domain/**/*.ts\",
    \"src/webmcp/contracts.ts\",
    \"tests/fixtures/drafts.ts\",
    \"tests/helpers/webmcp-fixtures.ts\",
    \"tests/e2e/**/*.ts\"
""",
)

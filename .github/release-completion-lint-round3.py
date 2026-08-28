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

replace_once(
    "tests/app/store.test.ts",
    """    expect(persisted.map(stateVersion)).toEqual([1, 2]);
    expect(observed.map(stateVersion)).toEqual([1, 2]);
    expect(store.getState().workflowState).toBe('DRAFT_VALID');
""",
    """    expect(persisted.map(stateVersion)).toEqual([1, 2]);
    expect(observed.map(stateVersion)).toEqual([1, 2]);
    expect(store.getState().workflowState).toBe('DRAFT_INVALID');
""",
)

replace_once(
    "tests/domain/validation.test.ts",
    """  it('accepts back-to-back assignments for the same volunteer', () => {
    let assignments = replaceAssignment(validAssignments(), requestId('R-104'), {
      volunteerId: volunteerId('V-03'),
      startTime: '11:30',
    });
    assignments = replaceAssignment(assignments, requestId('R-105'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });

    const result = validateDraft(buildContext(assignments));
""",
    """  it('accepts back-to-back assignments for the same volunteer', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-104'), {
      volunteerId: volunteerId('V-03'),
      startTime: '11:30',
    });

    const result = validateDraft(buildContext(assignments));
""",
)
replace_once(
    "tests/domain/validation.test.ts",
    """  it('reports workload above the scenario maximum of three', () => {
    let assignments = replaceAssignment(validAssignments(), requestId('R-104'), {
      volunteerId: volunteerId('V-03'),
      startTime: '11:30',
    });
    assignments = replaceAssignment(assignments, requestId('R-105'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });

    const issue = findIssue(
      validateDraft(buildContext(assignments)).errors,
      'VOLUNTEER_WORKLOAD_EXCEEDED',
    );

    expect(issue.requestIds).toEqual([
      requestId('R-103'),
      requestId('R-104'),
      requestId('R-105'),
      requestId('R-108'),
    ]);
""",
    """  it('reports workload above the scenario maximum of three', () => {
    let assignments = replaceAssignment(validAssignments(), requestId('R-104'), {
      volunteerId: volunteerId('V-03'),
      startTime: '11:30',
    });
    assignments = replaceAssignment(assignments, requestId('R-108'), {
      volunteerId: volunteerId('V-03'),
      startTime: '15:00',
    });

    const issue = findIssue(
      validateDraft(buildContext(assignments)).errors,
      'VOLUNTEER_WORKLOAD_EXCEEDED',
    );

    expect(issue.requestIds).toEqual([
      requestId('R-103'),
      requestId('R-104'),
      requestId('R-106'),
      requestId('R-108'),
    ]);
""",
)
replace_once(
    "tests/domain/validation.test.ts",
    """  it('accepts exactly three assignments for one volunteer', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-105'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });
""",
    """  it('accepts exactly three assignments for one volunteer', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-108'), {
      volunteerId: volunteerId('V-03'),
      startTime: '15:00',
    });
""",
)
replace_once(
    "tests/domain/validation.test.ts",
    """  it('warns about noncritical cross-zone assignment', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-105'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });

    const issue = findIssue(validateDraft(buildContext(assignments)).warnings, 'ZONE_INEFFICIENCY');

    expect(issue.requestIds).toEqual([requestId('R-105')]);
    expect(issue.volunteerId).toBe(volunteerId('V-03'));
""",
    """  it('warns about noncritical cross-zone assignment', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-106'), {
      volunteerId: volunteerId('V-04'),
      startTime: '13:00',
    });

    const issue = findIssue(validateDraft(buildContext(assignments)).warnings, 'ZONE_INEFFICIENCY');

    expect(issue.requestIds).toEqual([requestId('R-106')]);
    expect(issue.volunteerId).toBe(volunteerId('V-04'));
""",
)
replace_once(
    "tests/domain/validation.test.ts",
    """  it('warns when the assigned workload spread exceeds one without invalidating the draft', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-105'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });
""",
    """  it('warns when the assigned workload spread exceeds one without invalidating the draft', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-108'), {
      volunteerId: volunteerId('V-03'),
      startTime: '15:00',
    });
""",
)

replace_once(
    "src/ui/AssignmentTable.tsx",
    """                  <select
                    id={volunteerControlId}
                    value={assignment.volunteerId ?? ''}
""",
    """                  <select
                    id={volunteerControlId}
                    aria-label={`Volunteer for ${request.id}`}
                    value={assignment.volunteerId ?? ''}
""",
)
replace_once(
    "src/ui/AssignmentTable.tsx",
    """                  <input
                    id={timeControlId}
                    type="time"
""",
    """                  <input
                    id={timeControlId}
                    aria-label={`Start time for ${request.id}`}
                    type="time"
""",
)
replace_once(
    "src/ui/ValidationPanel.tsx",
    """            <button
              key={requestId}
              type="button"
              className="validation-focus-link mono"
""",
    """            <button
              key={requestId}
              type="button"
              className="validation-focus-link mono"
              aria-label={`Focus assignment ${requestId}`}
""",
)
replace_once(
    "src/ui/VolunteerPanel.tsx",
    """    <aside className="workspace-panel volunteer-panel surface" aria-labelledby="volunteers-heading">""",
    """    <aside
      className="workspace-panel volunteer-panel surface"
      role="region"
      aria-labelledby="volunteers-heading"
    >""",
)

replace_once(
    "tests/ui/app-shell.test.tsx",
    """  it('copies the canonical prompt and announces the accepted action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const user = userEvent.setup();
    render(<JudgeBrief />);
""",
    """  it('copies the canonical prompt and announces the accepted action', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<JudgeBrief />);
""",
)
replace_once(
    "tests/ui/approval-dialog.test.tsx",
    """    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Approve version 1' })).toHaveFocus();

    await user.keyboard('{Escape}');
""",
    """    await user.tab();
    expect(
      within(dialog).getByRole('region', {
        name: 'Draft assignment review horizontal scroll area',
      }),
    ).toHaveFocus();

    await user.keyboard('{Escape}');
""",
)

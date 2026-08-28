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


replace_count(
    "tests/e2e/canonical.spec.ts",
    "ASSIGNMENT_OVERLAP",
    "VOLUNTEER_TIME_OVERLAP",
    2,
)

replace_once(
    "tests/e2e/keyboard.spec.ts",
    """  await page.keyboard.type('13:00');
  await page.keyboard.press('Tab');

  const lock = page.getByRole('button', { name: 'Lock assignment for R-105' });
  await lock.focus();
  await page.keyboard.press('Enter');
""",
    """  await page.keyboard.type('13:00');
  await page.keyboard.press('Tab');
  await expect(startTime).toHaveValue('13:00');

  const lock = page.getByRole('button', { name: 'Lock assignment for R-105' });
  await lock.focus();
  await expect(page.getByRole('heading', { name: 'Draft v2' })).toBeVisible();
  await page.keyboard.press('Enter');
""",
)

replace_once(
    "tests/e2e/ready.spec.ts",
    """  await expect(page.getByText('READY', { exact: true })).toBeVisible();
""",
    """  await expect(
    page.getByRole('status', { name: 'Current application status' }),
  ).toContainText('READY');
""",
)

replace_once(
    "src/ui/AssignmentTable.tsx",
    """async function executeCommand(
  onCommand: HumanDraftCommandHandler,
  onAnnouncement: (message: string) => void,
  command: HumanDraftCommand,
  acceptedMessage: string,
): Promise<void> {
  try {
    const result: unknown = await Promise.resolve(onCommand(command));
    if (result !== undefined) {
      if (!isWorkflowCommandResult(result)) {
        throw new TypeError('Unexpected workflow command result.');
      }
      if (!result.ok) {
        onAnnouncement(`Assignment change was not accepted: ${result.error.code}.`);
        return;
      }
    }
    onAnnouncement(acceptedMessage);
  } catch {
    onAnnouncement('DOMHamster could not apply that assignment change. State was not changed.');
  }
}
""",
    """async function executeCommand(
  onCommand: HumanDraftCommandHandler,
  onAnnouncement: (message: string) => void,
  command: HumanDraftCommand,
  acceptedMessage: string,
): Promise<boolean> {
  try {
    const result: unknown = await Promise.resolve(onCommand(command));
    if (result !== undefined) {
      if (!isWorkflowCommandResult(result)) {
        throw new TypeError('Unexpected workflow command result.');
      }
      if (!result.ok) {
        onAnnouncement(`Assignment change was not accepted: ${result.error.code}.`);
        return false;
      }
    }
    onAnnouncement(acceptedMessage);
    return true;
  } catch {
    onAnnouncement('DOMHamster could not apply that assignment change. State was not changed.');
    return false;
  }
}
""",
)

replace_once(
    "src/ui/AssignmentTable.tsx",
    """                  <input
                    id={timeControlId}
                    aria-label={`Start time for ${request.id}`}
                    type="time"
                    step={900}
                    min={request.timeWindow.start}
                    max={request.timeWindow.end}
                    value={assignment.startTime ?? ''}
                    disabled={assignment.lockedByHuman || unassigned}
                    aria-describedby={describedBy}
                    onChange={(event) => {
                      const nextTime = event.currentTarget.value;
                      if (!TIME_PATTERN.test(nextTime) || assignment.volunteerId === null) return;
                      const command: EditAssignmentCommand = {
                        type: 'EDIT_ASSIGNMENT',
                        actor: 'human',
                        expectedDraftVersion: draft.version,
                        requestId: request.id,
                        patch: {
                          volunteerId: assignment.volunteerId,
                          startTime: nextTime as TimeOfDay,
                          status: 'planned',
                        },
                      };
                      void executeCommand(
                        onCommand,
                        onAnnouncement,
                        command,
                        `${request.id} start-time change accepted.`,
                      );
                    }}
                  />
""",
    """                  <input
                    key={`${draft.version}:${assignment.startTime ?? 'unassigned'}`}
                    id={timeControlId}
                    aria-label={`Start time for ${request.id}`}
                    type="time"
                    step={900}
                    min={request.timeWindow.start}
                    max={request.timeWindow.end}
                    defaultValue={assignment.startTime ?? ''}
                    disabled={assignment.lockedByHuman || unassigned}
                    aria-describedby={describedBy}
                    onBlur={(event) => {
                      const input = event.currentTarget;
                      const previousTime = assignment.startTime ?? '';
                      const nextTime = input.value;
                      if (!TIME_PATTERN.test(nextTime) || assignment.volunteerId === null) {
                        input.value = previousTime;
                        return;
                      }
                      if (nextTime === previousTime) return;
                      const command: EditAssignmentCommand = {
                        type: 'EDIT_ASSIGNMENT',
                        actor: 'human',
                        expectedDraftVersion: draft.version,
                        requestId: request.id,
                        patch: {
                          volunteerId: assignment.volunteerId,
                          startTime: nextTime as TimeOfDay,
                          status: 'planned',
                        },
                      };
                      void executeCommand(
                        onCommand,
                        onAnnouncement,
                        command,
                        `${request.id} start-time change accepted.`,
                      ).then((accepted) => {
                        if (!accepted) input.value = previousTime;
                      });
                    }}
                  />
""",
)

replace_once(
    "tests/ui/assignment-editor.test.tsx",
    """  it('emits one exact human edit command when the start time changes', () => {
    const onCommand = vi.fn<HumanDraftCommandHandler>().mockResolvedValue(undefined);
    renderDraft(workflowStates().DRAFT_VALID, onCommand);

    fireEvent.change(screen.getByLabelText('Start time for R-105'), {
      target: { value: '13:15' },
    });

    expect(onCommand).toHaveBeenCalledTimes(1);
""",
    """  it('commits one exact human time edit only after keyboard entry is complete', () => {
    const onCommand = vi.fn<HumanDraftCommandHandler>().mockResolvedValue(undefined);
    renderDraft(workflowStates().DRAFT_VALID, onCommand);

    const startTime = screen.getByLabelText('Start time for R-105');
    fireEvent.change(startTime, {
      target: { value: '13:15' },
    });
    expect(onCommand).not.toHaveBeenCalled();

    fireEvent.blur(startTime);

    expect(onCommand).toHaveBeenCalledTimes(1);
""",
)

replace_once(
    "vite.config.ts",
    "    sourcemap: true,",
    "    sourcemap: false,",
)

replace_once(
    "scripts/check-licenses.mjs",
    r"""import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const allowed = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'Python-2.0',
  'Unlicense',
  'BlueOak-1.0.0',
]);
const problems = [];
for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (path === '' || (entry.dev === undefined && entry.license === undefined)) continue;
  const license = entry.license;
  if (typeof license !== 'string' || license.trim() === '') {
    problems.push(`${path}:missing-license`);
    continue;
  }
  const identifiers = license.match(/[A-Za-z0-9.-]+/gu) ?? [];
  const meaningful = identifiers.filter((value) => !['AND', 'OR', 'WITH'].includes(value));
  if (meaningful.some((identifier) => !allowed.has(identifier)))
    problems.push(`${path}:${license}`);
}
assert.deepEqual(problems, [], `DOMHAMSTER_LICENSE_FAILURE\n${problems.join('\n')}`);
console.log(`DOMHAMSTER_LICENSE_PASS packages=${Object.keys(lock.packages ?? {}).length - 1}`);
""",
    r"""import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const runtimeAllowed = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'Python-2.0',
  'Unlicense',
  'BlueOak-1.0.0',
]);
const developmentAllowed = new Set(['MIT-0', 'CC-BY-4.0', 'MPL-2.0']);

function licenseAllowed(identifier, entry) {
  return runtimeAllowed.has(identifier) ||
    (entry.dev === true && developmentAllowed.has(identifier));
}

const problems = [];
let developmentExceptions = 0;
for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (path === '' || (entry.dev === undefined && entry.license === undefined)) continue;
  const license = entry.license;
  if (typeof license !== 'string' || license.trim() === '') {
    problems.push(`${path}:missing-license`);
    continue;
  }
  const identifiers = license.match(/[A-Za-z0-9.-]+/gu) ?? [];
  const meaningful = identifiers.filter((value) => !['AND', 'OR', 'WITH'].includes(value));
  if (meaningful.some((identifier) => !licenseAllowed(identifier, entry))) {
    problems.push(`${path}:${license}`);
    continue;
  }
  if (entry.dev === true && meaningful.some((identifier) => developmentAllowed.has(identifier))) {
    developmentExceptions += 1;
  }
}

const notice = readFileSync('NOTICE.md', 'utf8');
const usesCcByData = Object.values(lock.packages ?? {}).some(
  (entry) => entry.dev === true && entry.license === 'CC-BY-4.0',
);
if (usesCcByData) {
  assert.match(notice, /caniuse\.com/u, 'DOMHAMSTER_CC_BY_ATTRIBUTION_MISSING');
}

assert.deepEqual(problems, [], `DOMHAMSTER_LICENSE_FAILURE\n${problems.join('\n')}`);
console.log(
  `DOMHAMSTER_LICENSE_PASS packages=${Object.keys(lock.packages ?? {}).length - 1} developmentExceptions=${developmentExceptions}`,
);
""",
)

replace_once(
    "NOTICE.md",
    """# Notices

DOMHamster is licensed under the MIT License. Third-party packages retain their own copyright notices and licenses as distributed by their authors.

The judged application uses:

- system fonts only; no font files are distributed;
- original fictional scenario data;
- an original DOMHamster mark and interface assets;
- OpenAI-generated visual concepts as design references, with the final interface implemented as code-native React, HTML, and CSS; and
- permissively licensed npm dependencies recorded in `package-lock.json`.

The release license gate must inspect the exact dependency graph before a release is selected. Any package requiring additional attribution must be added to this notice before tagging.
""",
    """# Notices

DOMHamster is licensed under the MIT License. Third-party packages retain their own copyright notices and licenses as distributed by their authors.

The judged application uses:

- system fonts only; no font files are distributed;
- original fictional scenario data;
- an original DOMHamster mark and interface assets;
- OpenAI-generated visual concepts as design references, with the final interface implemented as code-native React, HTML, and CSS; and
- permissively licensed production runtime dependencies recorded in `package-lock.json`.

Development and build tooling is not shipped in `dist` and may use separately approved open-source licenses, including MIT-0 and MPL-2.0.

Browser compatibility data used by development and build tooling is sourced from caniuse.com under the Creative Commons Attribution 4.0 International license (CC BY 4.0).

The release license gate inspects the exact dependency graph, keeps the production allowlist stricter than the development allowlist, and requires attribution-bearing development licenses to remain documented here before a release is selected.
""",
)

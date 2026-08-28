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

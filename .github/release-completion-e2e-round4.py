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
""",
    """  await page.keyboard.type('13:00');
  await page.keyboard.press('Tab');
  await expect(startTime).toHaveValue('13:00');
  await expect(page.getByRole('heading', { name: 'Draft v2' })).toBeVisible();

  const lock = page.getByRole('button', { name: 'Lock assignment for R-105' });
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

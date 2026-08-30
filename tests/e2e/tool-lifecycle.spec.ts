import { expect, test } from '@playwright/test';
import {
  EXPECTED_TOOL_NAMES,
  VALID_DRAFT_INPUT,
  captureTool,
  installToolHarness,
  runCapturedTool,
  runTool,
  toolNames,
} from './model-context-harness.ts';

test('reconciles the exact six-state tool lifecycle and rejects stale captured tools', async ({
  page,
}) => {
  await installToolHarness(page);
  await page.goto('/');

  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.READY);

  const created = (await runTool(page, 'create_assignment_draft', VALID_DRAFT_INPUT)) as {
    readonly ok: boolean;
  };
  expect(created.ok).toBe(true);
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.DRAFT_VALID);
  await captureTool(page, 'prepare_plan_approval', 'draft-valid-prepare');

  await page.getByLabel('Volunteer for R-105').selectOption('V-03');
  await expect(page.getByRole('heading', { name: 'Draft v2' })).toBeVisible();
  await page.getByRole('button', { name: 'Lock assignment for R-105' }).click();
  await expect(page.getByRole('heading', { name: 'Draft v3' })).toBeVisible();
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.DRAFT_INVALID);
  expect(await toolNames(page)).not.toContain('prepare_plan_approval');

  const auditBeforeStalePrepare = (await runTool(page, 'get_audit_history', {})) as {
    readonly ok: boolean;
    readonly data?: readonly unknown[];
  };
  expect(auditBeforeStalePrepare.ok).toBe(true);
  const stalePrepare = (await runCapturedTool(page, 'draft-valid-prepare', {
    expectedDraftVersion: 3,
    summary: 'This stale handler must not open approval.',
  })) as {
    readonly ok: boolean;
    readonly error?: { readonly code: string };
  };
  expect(stalePrepare).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
  await expect(page.locator('.status-chip')).toHaveText('DRAFT_INVALID');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.DRAFT_INVALID);
  const auditAfterStalePrepare = (await runTool(page, 'get_audit_history', {})) as {
    readonly ok: boolean;
    readonly data?: readonly unknown[];
  };
  expect(auditAfterStalePrepare).toEqual(auditBeforeStalePrepare);

  const revised = (await runTool(page, 'revise_assignment_draft', {
    expectedDraftVersion: 3,
    changes: [
      {
        action: 'SET_ASSIGNMENT',
        requestId: 'R-106',
        volunteerId: 'V-05',
        startTime: '13:00',
      },
    ],
  })) as { readonly ok: boolean };
  expect(revised.ok).toBe(true);
  await expect(page.getByRole('heading', { name: 'Draft v4' })).toBeVisible();
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.DRAFT_VALID);

  const prepared = (await runTool(page, 'prepare_plan_approval', {
    expectedDraftVersion: 4,
    summary: 'Review the exact lock-preserving repaired plan.',
  })) as { readonly ok: boolean };
  expect(prepared.ok).toBe(true);
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.AWAITING_APPROVAL);

  const review = page.getByRole('dialog', { name: 'Review draft v4 before approval' });
  await expect(review).toBeVisible();
  await expect(
    review.getByText(
      'Approval authorizes the agent to commit this exact version for 120 seconds. Any edit, unlock, rejection, cancellation, reset, reload, or expiry invalidates approval.',
      { exact: true },
    ),
  ).toBeVisible();
  const lockedRow = review
    .getByRole('table', { name: 'Draft assignment review' })
    .getByRole('row')
    .filter({ hasText: 'R-105' });
  await expect(lockedRow).toHaveCount(1);
  await expect(lockedRow).toContainText('V-03');
  await expect(lockedRow).toContainText('13:00');
  await expect(lockedRow).toContainText('Coordinator locked');
  await expect(
    review.getByText('Coordinator locks', { exact: true }).locator('..').locator('dd'),
  ).toHaveText('1');
  await expect(
    review
      .getByRole('region', { name: 'Warnings retained for human review' })
      .getByRole('listitem'),
  ).not.toHaveCount(0);
  await review.getByRole('button', { name: 'Approve version 4' }).click();
  await expect(page.getByText(/Version 4 approved/)).toBeVisible();
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.APPROVED);

  await captureTool(page, 'commit_assignment_plan', 'approved-commit');
  const committed = (await runTool(page, 'commit_assignment_plan', {
    expectedDraftVersion: 4,
  })) as { readonly ok: boolean };
  expect(committed.ok).toBe(true);
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.COMMITTED);

  const replay = (await runCapturedTool(page, 'approved-commit', {
    expectedDraftVersion: 4,
  })) as {
    readonly ok: boolean;
    readonly error?: { readonly code: string };
  };
  expect(replay).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.COMMITTED);

  await page.getByRole('button', { name: 'Reset' }).click();
  const reset = page.getByRole('alertdialog', { name: 'Reset the fictional scenario?' });
  await reset.getByRole('button', { name: 'Reset scenario' }).click();

  await expect(page.getByRole('status', { name: 'Current application status' })).toContainText(
    'READY',
  );
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.READY);
  await expect(page.getByRole('heading', { name: 'No assignment draft yet' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Committed plan' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Requests' }).getByRole('listitem')).toHaveCount(8);
  await expect(page.getByRole('region', { name: 'Volunteers' }).getByRole('listitem')).toHaveCount(
    5,
  );

  await page.getByRole('button', { name: 'Diagnostics' }).click();
  const diagnostics = page.getByRole('dialog', { name: 'Diagnostics' });
  await expect(
    diagnostics.getByText('Workflow state', { exact: true }).locator('..').locator('dd'),
  ).toHaveText('READY');
  await expect(
    diagnostics.getByText('b861f7e997f2f14e087d209130de7e4aa465d8047110b11872edb7750a2122b1', {
      exact: true,
    }),
  ).toBeVisible();
});

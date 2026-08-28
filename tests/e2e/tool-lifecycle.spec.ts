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

  await page.getByLabel('Volunteer for R-105').selectOption('V-03');
  await expect(page.getByRole('heading', { name: 'Draft v2' })).toBeVisible();
  await page.getByRole('button', { name: 'Lock assignment for R-105' }).click();
  await expect(page.getByRole('heading', { name: 'Draft v3' })).toBeVisible();
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.DRAFT_INVALID);

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
});

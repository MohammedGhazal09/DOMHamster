import { expect, test } from '@playwright/test';
import {
  EXPECTED_TOOL_NAMES,
  VALID_DRAFT_INPUT,
  installToolHarness,
  runTool,
  toolNames,
} from './model-context-harness.ts';

test('completes the canonical human conflict, lock, and agent repair journey', async ({ page }) => {
  await installToolHarness(page);
  await page.goto('/');

  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.READY);
  const created = (await runTool(page, 'create_assignment_draft', VALID_DRAFT_INPUT)) as {
    readonly ok: boolean;
  };
  expect(created.ok).toBe(true);

  await expect(page.getByRole('heading', { name: 'Draft v1' })).toBeVisible();
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.DRAFT_VALID);

  const r105Volunteer = page.getByLabel('Volunteer for R-105');
  await expect(r105Volunteer).toHaveValue('V-01');
  await r105Volunteer.selectOption('V-03');
  await expect(page.getByRole('heading', { name: 'Draft v2' })).toBeVisible();
  await expect(page.getByLabel('Start time for R-105')).toHaveValue('13:00');

  await page.getByRole('button', { name: 'Lock assignment for R-105' }).click();
  await expect(page.getByRole('heading', { name: 'Draft v3' })).toBeVisible();
  const r105Unlock = page.getByRole('button', { name: 'Unlock assignment for R-105' });
  await expect(r105Unlock).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByText('Locked by the coordinator. Agent revisions cannot change this assignment.'),
  ).toBeVisible();
  await expect(page.getByText('ASSIGNMENT_OVERLAP').first()).toBeVisible();
  await expect(page.getByRole('status', { name: 'Current application status' })).toContainText(
    'DRAFT_INVALID',
  );
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.DRAFT_INVALID);

  const validation = (await runTool(page, 'validate_assignment_draft', {
    expectedDraftVersion: 3,
  })) as {
    readonly ok: boolean;
    readonly data?: {
      readonly draftVersion: number;
      readonly errors: readonly { readonly code: string }[];
    };
  };
  expect(validation).toMatchObject({ ok: true, data: { draftVersion: 3 } });
  expect(validation.data?.errors.map(({ code }) => code)).toContain('ASSIGNMENT_OVERLAP');

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
    rationale: 'Preserve the coordinator lock and move only the conflicting request.',
  })) as {
    readonly ok: boolean;
    readonly data?: {
      readonly version: number;
      readonly valid: boolean;
      readonly assignments: readonly {
        readonly requestId: string;
        readonly volunteerId: string | null;
        readonly startTime: string | null;
        readonly lockedByHuman: boolean;
      }[];
    };
  };

  expect(revised).toMatchObject({ ok: true, data: { version: 4, valid: true } });
  const r105 = revised.data?.assignments.find(({ requestId }) => requestId === 'R-105');
  const r106 = revised.data?.assignments.find(({ requestId }) => requestId === 'R-106');
  expect(r105).toMatchObject({
    volunteerId: 'V-03',
    startTime: '13:00',
    lockedByHuman: true,
  });
  expect(r106).toMatchObject({
    volunteerId: 'V-05',
    startTime: '13:00',
    lockedByHuman: false,
  });

  await expect(page.getByRole('heading', { name: 'Draft v4' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Current application status' })).toContainText(
    'DRAFT_VALID',
  );
  await expect(page.getByLabel('Volunteer for R-105')).toHaveValue('V-03');
  await expect(page.getByLabel('Start time for R-105')).toHaveValue('13:00');
  await expect(page.getByLabel('Start time for R-105')).toBeDisabled();
  await expect(page.getByLabel('Volunteer for R-106')).toHaveValue('V-05');
  await expect(page.getByLabel('Start time for R-106')).toHaveValue('13:00');
  await expect.poll(() => toolNames(page)).toEqual(EXPECTED_TOOL_NAMES.DRAFT_VALID);
});

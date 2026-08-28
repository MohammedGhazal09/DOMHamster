import { expect, test, type Page } from '@playwright/test';

const VALID_DRAFT_INPUT = {
  assignments: [
    { requestId: 'R-101', volunteerId: 'V-01', startTime: '09:00' },
    { requestId: 'R-102', volunteerId: 'V-02', startTime: '09:00' },
    { requestId: 'R-103', volunteerId: 'V-03', startTime: '10:30' },
    { requestId: 'R-104', volunteerId: 'V-04', startTime: '11:30' },
    { requestId: 'R-105', volunteerId: 'V-01', startTime: '13:00' },
    { requestId: 'R-106', volunteerId: 'V-03', startTime: '13:00' },
    { requestId: 'R-107', volunteerId: 'V-05', startTime: '14:00' },
    { requestId: 'R-108', volunteerId: 'V-04', startTime: '15:00' },
  ],
  unassignedRequestIds: [],
};

async function installHarness(page: Page): Promise<void> {
  await page.addInitScript(() => {
    interface Tool {
      readonly name: string;
      execute(input: object, options: { readonly signal: AbortSignal }): Promise<unknown>;
    }
    const tools = new Map<string, Tool>();
    Object.defineProperty(window, '__domhamsterTools', { configurable: true, value: tools });
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(tool: Tool, options?: { readonly signal?: AbortSignal }) {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener(
            'abort',
            () => {
              if (tools.get(tool.name) === tool) tools.delete(tool.name);
            },
            { once: true },
          );
          return Promise.resolve();
        },
      },
    });
  });
}

async function hasTool(page: Page, name: string): Promise<boolean> {
  return page.evaluate(
    (toolName) =>
      (window as unknown as { __domhamsterTools: Map<string, unknown> }).__domhamsterTools.has(
        toolName,
      ),
    name,
  );
}

async function invoke(page: Page, name: string, input: object): Promise<unknown> {
  return page.evaluate(
    ({ toolName, toolInput }) => {
      const tool = (
        window as unknown as {
          __domhamsterTools: Map<
            string,
            {
              execute(input: object, options: { readonly signal: AbortSignal }): Promise<unknown>;
            }
          >;
        }
      ).__domhamsterTools.get(toolName);
      if (tool === undefined) throw new Error(`E2E_TOOL_MISSING:${toolName}`);
      return tool.execute(toolInput, { signal: new AbortController().signal });
    },
    { toolName: name, toolInput: input },
  );
}

async function createAndPrepare(page: Page): Promise<void> {
  await expect.poll(() => hasTool(page, 'create_assignment_draft')).toBe(true);
  await invoke(page, 'create_assignment_draft', VALID_DRAFT_INPUT);
  await expect.poll(() => hasTool(page, 'prepare_plan_approval')).toBe(true);
  await invoke(page, 'prepare_plan_approval', {
    expectedDraftVersion: 1,
    summary: 'Ready for review.',
  });
  await expect(page.getByRole('dialog', { name: 'Review draft v1 before approval' })).toBeVisible();
}

test('invalidates pending and approved authorization on reload', async ({ page }) => {
  await installHarness(page);
  await page.goto('/');
  await createAndPrepare(page);

  await page.reload();
  await expect(page.getByText('Draft v1')).toBeVisible();
  await expect(page.locator('.status-chip')).toHaveText('DRAFT_VALID');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect.poll(() => hasTool(page, 'prepare_plan_approval')).toBe(true);
  await invoke(page, 'prepare_plan_approval', {
    expectedDraftVersion: 1,
    summary: 'Ready again.',
  });
  await page.getByRole('button', { name: 'Approve version 1' }).click();
  await expect(page.getByText(/Version 1 approved/)).toBeVisible();

  await page.reload();
  await expect(page.getByText('Draft v1')).toBeVisible();
  await expect(page.locator('.status-chip')).toHaveText('DRAFT_VALID');
  await expect.poll(() => hasTool(page, 'commit_assignment_plan')).toBe(false);
});

test('expires approval after 120 seconds and removes the commit tool', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-27T12:00:00.000Z') });
  await installHarness(page);
  await page.goto('/');
  await createAndPrepare(page);
  await page.getByRole('button', { name: 'Approve version 1' }).click();

  await expect(page.getByText(/Approval expires in 02:00/)).toBeVisible();
  await expect.poll(() => hasTool(page, 'commit_assignment_plan')).toBe(true);
  await page.clock.fastForward(120_100);

  await expect(page.locator('.status-chip')).toHaveText('DRAFT_VALID');
  await expect.poll(() => hasTool(page, 'commit_assignment_plan')).toBe(false);
});

test('uses least-destructive discard and reset confirmations', async ({ page }) => {
  await installHarness(page);
  await page.goto('/');
  await expect.poll(() => hasTool(page, 'create_assignment_draft')).toBe(true);
  await invoke(page, 'create_assignment_draft', VALID_DRAFT_INPUT);

  await page.getByRole('button', { name: 'Discard draft' }).click();
  const keepDraft = page.getByRole('button', { name: 'Keep draft' });
  await expect(keepDraft).toBeFocused();
  await keepDraft.click();
  await expect(page.getByText('Draft v1')).toBeVisible();

  await page.getByRole('button', { name: 'Discard draft' }).click();
  await page.getByRole('button', { name: 'Discard draft' }).last().click();
  await expect(page.getByRole('heading', { name: 'No assignment draft yet' })).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();
  const cancel = page.getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(page.getByRole('heading', { name: 'No assignment draft yet' })).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Reset scenario' }).click();
  await expect(page.getByText('8 open · privacy-minimized')).toBeVisible();
  await expect(page.getByText('5 available · max 3 tasks')).toBeVisible();
});

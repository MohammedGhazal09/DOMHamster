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
  goal: 'Use the deterministic canonical fixture.',
};

async function installToolHarness(page: Page): Promise<void> {
  await page.addInitScript(() => {
    interface RegisteredTool {
      readonly name: string;
      execute(input: object, options: { readonly signal: AbortSignal }): Promise<unknown>;
    }
    const tools = new Map<string, RegisteredTool>();
    Object.defineProperty(window, '__domhamsterTools', {
      configurable: true,
      value: tools,
    });
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(tool: RegisteredTool, options?: { readonly signal?: AbortSignal }) {
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

async function toolAvailable(page: Page, name: string): Promise<boolean> {
  return page.evaluate((toolName) => {
    const tools = (window as unknown as { __domhamsterTools: Map<string, unknown> })
      .__domhamsterTools;
    return tools.has(toolName);
  }, name);
}

async function runTool(page: Page, name: string, input: object): Promise<unknown> {
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      const tools = (
        window as unknown as {
          __domhamsterTools: Map<
            string,
            {
              execute(input: object, options: { readonly signal: AbortSignal }): Promise<unknown>;
            }
          >;
        }
      ).__domhamsterTools;
      const tool = tools.get(toolName);
      if (tool === undefined) throw new Error(`E2E_TOOL_MISSING:${toolName}`);
      return tool.execute(toolInput, { signal: new AbortController().signal });
    },
    { toolName: name, toolInput: input },
  );
}

test('completes the human-approved agent commit and audited contact boundary', async ({ page }) => {
  await installToolHarness(page);
  await page.goto('/');

  await expect.poll(() => toolAvailable(page, 'create_assignment_draft')).toBe(true);
  const created = (await runTool(page, 'create_assignment_draft', VALID_DRAFT_INPUT)) as {
    readonly ok: boolean;
  };
  expect(created.ok).toBe(true);
  await expect(page.getByText('Draft v1')).toBeVisible();

  await expect.poll(() => toolAvailable(page, 'prepare_plan_approval')).toBe(true);
  const prepared = (await runTool(page, 'prepare_plan_approval', {
    expectedDraftVersion: 1,
    summary: 'Ready for exact human review.',
  })) as { readonly ok: boolean };
  expect(prepared.ok).toBe(true);

  const review = page.getByRole('dialog', { name: 'Review draft v1 before approval' });
  await expect(review).toBeVisible();
  await expect(review.getByRole('button', { name: /commit/i })).toHaveCount(0);
  await review.getByRole('button', { name: 'Approve version 1' }).click();

  await expect(page.getByText(/Version 1 approved/)).toBeVisible();
  await expect.poll(() => toolAvailable(page, 'commit_assignment_plan')).toBe(true);
  const committed = (await runTool(page, 'commit_assignment_plan', {
    expectedDraftVersion: 1,
  })) as {
    readonly ok: boolean;
    readonly data?: { readonly id: string; readonly draftVersion: number };
  };
  expect(committed).toMatchObject({ ok: true, data: { draftVersion: 1 } });
  if (committed.data === undefined) throw new Error('E2E_COMMITTED_PLAN_MISSING');

  const summary = page.getByRole('region', { name: 'Committed plan' });
  await expect(summary).toContainText('Plan committed. Human-approved version 1 is now final.');
  await expect(summary).toContainText(committed.data.id);
  await expect(page.getByRole('button', { name: /commit/i })).toHaveCount(0);
  await expect.poll(() => toolAvailable(page, 'commit_assignment_plan')).toBe(false);
  await expect.poll(() => toolAvailable(page, 'access_dispatch_contacts')).toBe(true);

  const bodyBeforeContact = await page.locator('body').innerText();
  expect(bodyBeforeContact).not.toContain('fictionalLocation');
  expect(bodyBeforeContact).not.toContain('fictionalContactChannel');

  const contactResult = (await runTool(page, 'access_dispatch_contacts', {
    requestIds: ['R-101'],
  })) as {
    readonly ok: boolean;
    readonly data?: readonly { readonly requestId: string }[];
  };
  expect(contactResult).toMatchObject({
    ok: true,
    data: [{ requestId: 'R-101' }],
  });
  expect(contactResult.data).toHaveLength(1);

  const auditResult = (await runTool(page, 'get_audit_history', {})) as {
    readonly ok: boolean;
    readonly data?: readonly { readonly type: string; readonly safeSummary: string }[];
  };
  expect(auditResult.ok).toBe(true);
  expect(auditResult.data?.at(0)).toMatchObject({ type: 'CONTACTS_ACCESSED' });
  expect(auditResult.data?.at(0)?.safeSummary).not.toContain('Fictional Address');

  await expect(summary).toContainText(
    'Dispatch details are fictional, returned only for selected assigned requests, and every access is recorded.',
  );
});

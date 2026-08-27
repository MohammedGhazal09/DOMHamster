import { expect, test, type Page } from '@playwright/test';

const VALID_DRAFT_INPUT = {
  assignments: [
    { requestId: 'R-101', volunteerId: 'V-01', startTime: '09:00' },
    { requestId: 'R-102', volunteerId: 'V-02', startTime: '09:00' },
    { requestId: 'R-103', volunteerId: 'V-03', startTime: '10:30' },
    { requestId: 'R-104', volunteerId: 'V-04', startTime: '11:30' },
    { requestId: 'R-105', volunteerId: 'V-03', startTime: '11:00' },
    { requestId: 'R-106', volunteerId: 'V-03', startTime: '13:00' },
    { requestId: 'R-107', volunteerId: 'V-05', startTime: '14:00' },
    { requestId: 'R-108', volunteerId: 'V-04', startTime: '15:00' },
  ],
  unassignedRequestIds: [],
  goal: 'Use the deterministic canonical fixture.',
};

async function installToolHarness(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type RegisteredTool = {
      readonly name: string;
      execute(input: object, options: { readonly signal: AbortSignal }): Promise<unknown>;
    };
    const tools = new Map<string, RegisteredTool>();
    Object.defineProperty(window, '__domhamsterTools', { configurable: true, value: tools });
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
  return page.evaluate(
    (toolName) =>
      (window as unknown as { __domhamsterTools: Map<string, unknown> }).__domhamsterTools.has(
        toolName,
      ),
    name,
  );
}

async function runTool(page: Page, name: string, input: object): Promise<unknown> {
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      const tool = (
        window as unknown as {
          __domhamsterTools: Map<
            string,
            {
              execute(
                input: object,
                options: { readonly signal: AbortSignal },
              ): Promise<unknown>;
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

test('keeps the critical human authority path keyboard-complete', async ({ page }) => {
  await installToolHarness(page);
  await page.goto('/');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to coordination workspace' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  await expect.poll(() => toolAvailable(page, 'create_assignment_draft')).toBe(true);
  const created = (await runTool(page, 'create_assignment_draft', VALID_DRAFT_INPUT)) as {
    readonly ok: boolean;
  };
  expect(created.ok).toBe(true);

  const volunteer = page.getByLabel('Volunteer for R-105');
  await volunteer.focus();
  await page.keyboard.type('V-03');
  await page.keyboard.press('Enter');

  const startTime = page.getByLabel('Start time for R-105');
  await startTime.focus();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type('13:00');
  await page.keyboard.press('Tab');

  const lock = page.getByRole('button', { name: 'Lock assignment for R-105' });
  await lock.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Locked by the coordinator/)).toBeVisible();

  const issueButton = page.getByRole('button', {
    name: /Focus .*OVERLAP validation issue for R-105/i,
  });
  await issueButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.validation-item:focus')).toHaveCount(1);

  const reset = page.getByRole('button', { name: 'Reset' });
  await reset.focus();
  await page.keyboard.press('Enter');
  const confirmation = page.getByRole('alertdialog', { name: 'Reset the fictional scenario?' });
  await expect(confirmation.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(reset).toBeFocused();
});

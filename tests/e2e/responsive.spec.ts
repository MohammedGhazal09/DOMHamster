import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'compact-desktop', width: 1024, height: 720 },
  { name: 'standard-desktop', width: 1280, height: 720 },
  { name: 'reference-desktop', width: 1440, height: 900 },
] as const;

async function installToolHarness(page: Page): Promise<void> {
  await page.addInitScript(() => {
    interface RegisteredTool {
      readonly name: string;
      execute(input: object, options: { readonly signal: AbortSignal }): Promise<unknown>;
    }
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

async function expectNoPageOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

for (const viewport of VIEWPORTS) {
  test(`keeps the READY workspace usable at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await installToolHarness(page);
    await page.goto('/');

    await expect(page.getByRole('status', { name: 'Current application status' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assignment plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
    await expectNoPageOverflow(page);

    const criticalTargets = page.locator(
      '.button, .lock-button, select, input[type="time"], .validation-focus-link',
    );
    const count = await criticalTargets.count();
    for (let index = 0; index < count; index += 1) {
      const box = await criticalTargets.nth(index).boundingBox();
      if (box !== null) expect(box.height).toBeGreaterThanOrEqual(44);
    }

    await page.screenshot({
      path: testInfo.outputPath(`ready-${viewport.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  });
}

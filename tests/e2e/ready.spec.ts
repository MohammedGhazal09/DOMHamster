import { expect, test } from '@playwright/test';

const PRIVATE_SENTINELS = ['Fictional phone', 'Fictional Address', 'privateContacts'];

test('renders the connected READY workspace without page-level horizontal overflow', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool() {
          return Promise.resolve();
        },
      },
    });
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'DOMHamster' })).toBeVisible();
  await expect(page.getByText('WebMCP connected')).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Current application status' }),
  ).toContainText('READY');
  await expect(
    page.getByRole('heading', {
      name: 'Coordinate the day. Let the agent draft. Keep the human in charge.',
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No assignment draft yet' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Requests' })).toContainText('R-104');
  await expect(page.getByRole('region', { name: 'Volunteers' })).toContainText('V-03');

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);

  const bodyText = await page.locator('body').innerText();
  for (const sentinel of PRIVATE_SENTINELS) {
    expect(bodyText).not.toContain(sentinel);
  }
});

test('keeps the coordinator workspace available when WebMCP is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');

  await expect(
    page.getByText(
      'WebMCP tools are unavailable in this browser. The coordinator interface still works; open the site in ChatGPT’s in-app browser or Chrome with WebMCP testing enabled.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Requests' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Volunteers' })).toBeVisible();
});

import { expect, test } from '@playwright/test';

test('loads the DOMHamster application shell', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (!response.ok()) failedRequests.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'DOMHamster' })).toBeVisible();
  await expect(page).toHaveTitle('DOMHamster');
  await expect(page.locator('link[rel~="icon"]')).toHaveCount(1);
  await page.waitForLoadState('networkidle');
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

import { expect, test } from '@playwright/test';

test('loads the DOMHamster application shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'DOMHamster' })).toBeVisible();
  await expect(page).toHaveTitle('DOMHamster');
});

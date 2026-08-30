import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const netlifyConfig = readFileSync(new URL('../../netlify.toml', import.meta.url), 'utf8');
const productionCsp = /Content-Security-Policy\s*=\s*"([^"]+)"/u.exec(netlifyConfig)?.[1];

if (!productionCsp) {
  throw new Error('TEST_PRODUCTION_CSP_MISSING');
}

test('starts under the production CSP without dynamic code evaluation', async ({ page }) => {
  expect(productionCsp).not.toContain("'unsafe-eval'");

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route(
    (url) => url.pathname === '/',
    async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          'content-security-policy': productionCsp,
        },
      });
    },
  );

  await page.goto('/');

  expect(pageErrors).toEqual([]);
  await expect(page.getByRole('heading', { name: 'DOMHamster' })).toBeVisible();
});

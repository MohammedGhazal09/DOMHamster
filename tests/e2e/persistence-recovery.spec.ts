import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'domhamster:v1';
const PRIVATE_SENTINEL = 'PRIVATE_RECOVERY_SENTINEL';

test('resets incompatible saved data and shows only the sanitized recovery notice', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, sentinel }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ schemaVersion: 999, unsafeValue: sentinel }),
      );
    },
    { key: STORAGE_KEY, sentinel: PRIVATE_SENTINEL },
  );

  await page.goto('/');

  await expect(page.getByRole('status', { name: 'Saved data recovery' })).toContainText(
    'Saved DOMHamster data was reset safely.',
  );
  await expect(page.getByRole('status', { name: 'Current application status' })).toContainText(
    'READY',
  );
  await expect(page.getByText('8 open · privacy-minimized')).toBeVisible();
  await expect(page.getByText('5 available · max 3 tasks')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(PRIVATE_SENTINEL);

  await expect
    .poll(() => page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY))
    .not.toContain(PRIVATE_SENTINEL);

  const saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(JSON.parse(saved ?? 'null')).toMatchObject({ schemaVersion: 2 });
});

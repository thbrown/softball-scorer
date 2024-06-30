import { test } from '@playwright/test';
import { forceSync, importData } from './ui-test-utils.ts';

test('Import saved file', async ({ page }) => {
  await page.goto('http://localhost:8889/');

  await importData(page);

  await page.locator('.centered-row').first().click();
  await page.getByText("VS. I'm Too Old For This2024-04-").click();
  await page
    .locator('div')
    .filter({ hasText: /^REDACTED1B1B1B\+$/ })
    .locator('span')
    .nth(3)
    .click();
  await page.locator('#result-1B').click();
  /*
  await page
    .getByRole('img', { name: 'ball' })
    .dragTo(page.locator('rect').first(), {
      targetPosition: { x: 100, y: 200 },
      sourcePosition: { x: 5, y: 5 },
    });
    */
  await page.getByRole('img', { name: 'confirm' }).click();
  await forceSync(page);
});

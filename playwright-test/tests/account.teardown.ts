import { test as teardown, expect } from '@playwright/test';

teardown('delete database', async ({ page }) => {
  await page.goto('http://localhost:8889/');

  // Delete the account
  await page.getByText('Settings').click();
  await page.getByText('Delete account').click();
  await page.getByPlaceholder('Are you sure you want to').fill('delete');
  await page.getByText('Submit').click();
  await page.getByText('Got it').click();
  await expect(page.getByText('Login/Signup')).toHaveCount(1);
  await expect(page.getByText('Force Sync')).toHaveCount(0);
});

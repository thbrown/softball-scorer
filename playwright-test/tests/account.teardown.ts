import { test as teardown, expect } from '@playwright/test';

teardown('delete database', async ({ page }) => {
  await page.goto('http://localhost:8889/');

  // Wait for page to load
  await page.waitForTimeout(1000);

  // Delete the account
  await page.getByText('Settings').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Settings').click();
  await page.getByText('Delete account').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Delete account').click();
  await page.getByPlaceholder('Are you sure you want to').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByPlaceholder('Are you sure you want to').fill('delete');
  await page.getByText('Submit').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Submit').click();
  await page.getByText('Got it').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Got it').click();
  // Wait for deletion to complete and page to redirect
  await page.waitForTimeout(2000);
  await expect(page.getByText('Login/Signup')).toHaveCount(1, { timeout: 10000 });
  await expect(page.getByText('Force Sync')).toHaveCount(0, { timeout: 10000 });
});

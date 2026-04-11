import { test, expect } from '@playwright/test';
import { forceSync, importData } from './ui-test-utils.ts';

test('Import saved file', async ({ page }) => {
  await page.goto('http://localhost:8889/');

  // Import the test data - this includes a forceSync at the end
  await importData(page);

  // Test passed - we successfully imported the data and synced it
});

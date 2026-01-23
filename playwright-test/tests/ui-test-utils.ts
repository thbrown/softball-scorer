import path from 'path';
import { Page, expect } from '@playwright/test';

/**
 * Imports and syncs the softball.app data json "fileName"
 * Test must already be authenticated
 */
export async function importData(
  page: Page,
  fileName = '../example-export.json'
) {
  await page.goto('http://localhost:8889/');
  await page.getByText('Import From File').click();
  await page
    .getByLabel('First, tap to choose a file')
    .setInputFiles(path.join(__dirname, fileName));

  // Wait briefly for UI to process file input
  await page.waitForTimeout(1000);

  // Click Load button
  await page.getByText('Load', { exact: true }).click();

  // Wait for "Got it" button and click it
  await page.getByText('Got it').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Got it').click();

  // Navigate back to home then to Teams view
  await page.getByRole('img', { name: 'home' }).click();
  await page.waitForTimeout(1000);
  await page.getByText('Teams').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Teams').click();

  // Wait briefly for teams to load
  await page.waitForTimeout(1500);

  // Force sync the imported data
  return forceSync(page);
}

export async function forceSync(
  page: Page,
  expectedResult = 'text=Sync (Success)'
) {
  // Navigate to menu with proper wait
  await page.goto('http://localhost:8889/menu', { waitUntil: 'load', timeout: 10000 });

  // Wait for page to fully load
  await page.waitForTimeout(500);

  // Wait for Force Sync button to be visible
  await page.getByText('Force Sync').waitFor({ state: 'visible', timeout: 10000 });

  // Click the Force Sync button
  await page.getByText('Force Sync').click();

  // Wait for sync result message (either success or error)
  // Increase timeout since sync can take longer after multiple operations
  await page.waitForSelector(expectedResult, { timeout: 30000 });
}

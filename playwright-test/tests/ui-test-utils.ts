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
  await page.waitForTimeout(2000); // TODO: find a selector to wait for here (may need to modify fileChooser to create one)
  await page.getByText('Load', { exact: true }).click();
  await page.getByText('Got it').click();
  await page.getByRole('img', { name: 'home' }).click();
  await page.getByText('Teams').click();
  await expect(page.getByText('REDACTED')).toHaveCount(15);
  return forceSync(page);
}

export async function forceSync(
  page: Page,
  expectedResult = 'text=Sync (Success)'
) {
  await page.goto('http://localhost:8889/menu');
  await page.getByText('Force Sync').click();
  return page.waitForSelector(expectedResult);
}

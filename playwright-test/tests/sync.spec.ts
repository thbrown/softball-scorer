import { test, expect } from '@playwright/test';
import { forceSync, importData } from './ui-test-utils';

test('Simultaneous syncs', async ({ browser }) => {
  // Create two isolated browser contexts
  const userOne = await browser.newContext();
  const userTwo = await browser.newContext();

  // Create pages and interact with contexts independently
  const userOnePage = await userOne.newPage();
  const userTwoPage = await userTwo.newPage();

  // Import data to first user
  await importData(userOnePage);

  // User two forces sync to get the same data
  await forceSync(userTwoPage);

  // Test 1: Both users create a team simultaneously
  await Promise.all([
    userOnePage.goto('http://localhost:8889/'),
    userTwoPage.goto('http://localhost:8889/'),
  ]);

  await Promise.all([
    userOnePage.getByText('Teams').waitFor({ state: 'visible', timeout: 5000 }),
    userTwoPage.getByText('Teams').waitFor({ state: 'visible', timeout: 5000 }),
  ]);

  await Promise.all([
    userOnePage.getByText('Teams').click(),
    userTwoPage.getByText('Teams').click(),
  ]);

  // User one creates a team
  await userOnePage.getByText('+ Add New Team').waitFor({ state: 'visible', timeout: 5000 });
  await userOnePage.getByText('+ Add New Team').click();
  await userOnePage.getByRole('textbox').fill('Sync Test Team');
  await userOnePage.locator('#save').click();
  await userOnePage.waitForTimeout(1500);

  // Test 2: Both users force sync simultaneously
  await Promise.all([
    forceSync(userOnePage),
    forceSync(userTwoPage),
  ]);

  // Test 3: Verify both users can see the team
  await Promise.all([
    userOnePage.goto('http://localhost:8889/teams'),
    userTwoPage.goto('http://localhost:8889/teams'),
  ]);

  // Both should see the Sync Test Team
  await expect(userOnePage.getByText('Sync Test Team').first()).toHaveCount(1, { timeout: 10000 });
  await expect(userTwoPage.getByText('Sync Test Team').first()).toHaveCount(1, { timeout: 10000 });

  // Close browser windows
  await userOnePage.close();
  await userTwoPage.close();
});

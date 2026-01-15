import { test, expect } from '@playwright/test';
import { forceSync } from './ui-test-utils';

//test.describe.configure({ mode: 'serial' });

test('Create and delete an account', async ({ page, browserName }) => {
  await page.goto('http://localhost:8889/');

  // Confirm we are not signed into an account
  await expect(page.getByText('Login/Signup')).toHaveCount(1);
  await expect(page.getByText('Force Sync')).toHaveCount(0);

  // Create the account
  await page.locator('#login').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('#login');
  await page
    .locator('#create-account')
    .waitFor({ state: 'visible', timeout: 5000 });
  await page.click('#create-account');
  await page.locator('#email').waitFor({ state: 'visible', timeout: 5000 });
  await page
    .locator('#email')
    .fill(
      `integration-test-account-lifecycle-${process.env.RUN_ID}-${browserName}@softball.app`
    );
  await page.locator('#password').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#password').fill('123456');
  await page
    .locator('#password-confirm')
    .waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#password-confirm').fill('123456');
  await page
    .frameLocator('iframe[title="reCAPTCHA"]')
    .getByLabel("I'm not a robot");
  await page.locator('#submit').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('#submit');
  await page.waitForSelector('#dialog-bg > div > div.dialog-text', {
    timeout: 15000,
  });
  await expect(page.locator('#dialog-bg > div > div.dialog-text')).toHaveText(
    /Thank you for creating an account on Softball.app!/,
    { timeout: 10000 }
  );
  await page.getByText('Got it').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Got it').click();

  // Confirm we are signed into an account
  await expect(page.getByText('Login/Signup')).toHaveCount(0);
  await expect(page.getByText('Force Sync')).toHaveCount(1);

  // Create some data
  await page.getByText('Teams').click();
  await page.getByText('+ Add New Team').click();
  await page.getByRole('textbox').fill('My Team');
  await page.locator('#save').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#save').click();
  // Wait for save to complete
  await page.waitForTimeout(1000);
  await forceSync(page);
  await page.getByText('Teams').click();
  await expect(page.getByText('My Team')).toHaveCount(1, { timeout: 10000 });

  // Delete all data
  await page.getByRole('img', { name: 'home' }).click();
  await page.getByText('Settings').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Settings').click();
  await page
    .getByText('Delete all data')
    .waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Delete all data').click();
  await page
    .getByPlaceholder('Are you sure you want to')
    .waitFor({ state: 'visible', timeout: 5000 });
  await page.getByPlaceholder('Are you sure you want to').fill('delete');
  await page.getByText('Submit').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Submit').click();
  await page.getByText('Got it').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Got it').click();
  // Wait for deletion to complete
  await page.waitForTimeout(1000);
  await forceSync(page);
  await page.getByText('Teams').click();
  await expect(page.getByText('My Team')).toHaveCount(0, { timeout: 10000 });

  // Delete the account
  await page.getByRole('img', { name: 'home' }).click();
  await page.getByText('Settings').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Settings').click();
  await page
    .getByText('Delete account')
    .waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Delete account').click();
  await page
    .getByPlaceholder('Are you sure you want to')
    .waitFor({ state: 'visible', timeout: 5000 });
  await page.getByPlaceholder('Are you sure you want to').fill('delete');
  await page.getByText('Submit').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Submit').click();
  await page.getByText('Got it').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Got it').click();
  page.pause();
  // Wait for deletion and redirect to complete
  await page.waitForTimeout(1000);
  await expect(page.getByText('Login/Signup')).toHaveCount(1, {
    timeout: 10000,
  });
  await expect(page.getByText('Force Sync')).toHaveCount(0, { timeout: 10000 });

  // TODO: email verification

  // TODO: email reset

  // Screenshot code - helpful for debugging
  //await page.screenshot({
  //  path: `./test-results/screenshot.png`, // ${process.env.RUN_ID}-
  //});
});

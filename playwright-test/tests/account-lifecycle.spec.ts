import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('Create an account', async ({ page, browserName }) => {
  await page.goto('http://localhost:8889/');
  await page.click('#login');
  await page.click('#create-account');
  await page
    .locator('#email')
    .fill(
      `integration-test-account-lifecycle-${process.env.RUN_ID}-${browserName}@softball.app`
    );
  await page.locator('#password').fill('123456');
  await page.locator('#password-confirm').fill('123456');
  await page
    .frameLocator('iframe[title="reCAPTCHA"]')
    .getByLabel("I'm not a robot");

  await page.click('#submit');
  await page.waitForSelector('#dialog-bg > div > div.dialog-text');

  await expect(page.locator('#dialog-bg > div > div.dialog-text')).toHaveText(
    /Thank you for creating an account on Softball.app!/
  );

  await page.getByText('Got it').click();

  /*
  await page.getByText('Import From File').click();
  await page.getByLabel('First, tap to choose a file').click();
  await page
    .getByLabel('First, tap to choose a file')
    .setInputFiles('save1712092306544.json');
  await page.getByText('Load', { exact: true }).click();
  await page.getByText('Got it').click();
      */

  await page.getByText('Settings').click();
  await page.getByText('Delete account').click();
  await page.getByPlaceholder('Are you sure you want to').click();
  await page.getByPlaceholder('Are you sure you want to').fill('delete');
  await page.screenshot({
    path: `./test-results/screenshot.png`, // ${process.env.RUN_ID}-
  });
  await page.getByText('Submit').click();
  await page.getByRole('img', { name: 'home' }).click();
  await page.getByText('Force Sync').click();
  await page.getByText('Auto sync failed with message').click();
  await page.getByText('Got it').click();
});

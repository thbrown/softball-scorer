import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright-test/.auth/user.json';

setup('Signup and Authenticate', async ({ page }) => {
  // Signup an account
  await page.goto('http://localhost:8889/');
  await page.click('#login');
  await page.click('#create-account');
  await page
    .locator('#email')
    .fill(`integration-test-${process.env.RUN_ID}@softball.app`);
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

  // Persist storage state
  await page.context().storageState({ path: authFile });
});

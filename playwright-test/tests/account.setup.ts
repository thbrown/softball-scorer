import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright-test/.auth/user.json';

setup('Signup and Authenticate', async ({ page }) => {
  // Signup an account
  await page.goto('http://localhost:8889/');
  await page.locator('#login').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('#login');
  await page.locator('#create-account').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('#create-account');
  await page
    .locator('#email')
    .waitFor({ state: 'visible', timeout: 5000 });
  await page
    .locator('#email')
    .fill(`integration-test-${process.env.RUN_ID}@softball.app`);
  await page.locator('#password').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#password').fill('123456');
  await page.locator('#password-confirm').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#password-confirm').fill('123456');
  await page
    .frameLocator('iframe[title="reCAPTCHA"]')
    .getByLabel("I'm not a robot");
  await page.locator('#submit').waitFor({ state: 'visible', timeout: 5000 });
  await page.click('#submit');
  await page.waitForSelector('#dialog-bg > div > div.dialog-text', { timeout: 15000 });
  await expect(page.locator('#dialog-bg > div > div.dialog-text')).toHaveText(
    /Thank you for creating an account on Softball.app!/,
    { timeout: 10000 }
  );
  await page.getByText('Got it').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('Got it').click();

  // Persist storage state
  await page.context().storageState({ path: authFile });
});

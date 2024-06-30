import { test } from '@playwright/test';
import { forceSync, importData } from './ui-test-utils';

test('Simultaneous syncs', async ({ browser }) => {
  // Create two isolated browser contexts
  const userOne = await browser.newContext();
  const userTwo = await browser.newContext();

  // Create pages and interact with contexts independently
  const userOnePage = await userOne.newPage();
  const userTwoPage = await userTwo.newPage();

  // UserTwo uses a different session
  //await userTwo.clearCookies();

  // Import data and sync to both sessions
  await importData(userOnePage);
  await forceSync(userTwoPage);

  // Both modify the same team
  const edits: Promise<unknown>[] = [];
  edits.push(
    userOnePage.goto(
      'http://localhost:8889/teams/0ZqzewUy5RHOwl/games/4EMaZ9Udta9R17/edit'
    )
  );
  edits.push(
    userTwoPage.goto(
      'http://localhost:8889/teams/0ZqzewUy5RHOwl/games/4EMaZ9Udta9R17/edit'
    )
  );
  edits.push(userOnePage.locator('#opponentName').fill('PageOneWins!'));
  edits.push(userOnePage.locator('#save').click());
  edits.push(userTwoPage.locator('#opponentName').fill('PageTwoWins!'));
  edits.push(userTwoPage.locator('#save').click());
  await Promise.all(edits);

  // Simultaneous syncs
  const syncsTwo: Promise<unknown>[] = [];
  syncsTwo.push(forceSync(userOnePage));
  syncsTwo.push(forceSync(userTwoPage));
  await Promise.all(syncsTwo);

  // Both add PAs to the same game
  const editsTwo: Promise<unknown>[] = [];
  editsTwo.push(
    userOnePage.goto(
      'http://localhost:8889/teams/14VTCwm3Dahtmc/games/4CwAlkZqLLf5hQ'
    )
  );
  editsTwo.push(
    userTwoPage.goto(
      'http://localhost:8889/teams/14VTCwm3Dahtmc/games/4CwAlkZqLLf5hQ'
    )
  );

  editsTwo.push(userOnePage.locator('#newPa-2mQ74fPkiYKgp2 > div').click());
  editsTwo.push(userOnePage.locator('#result-3B').getByText('3B').click());
  editsTwo.push(userOnePage.getByRole('img', { name: 'confirm' }).click());

  editsTwo.push(userTwoPage.locator('#newPa-2mQ74fPkiYKgp2 > div').click());
  editsTwo.push(userTwoPage.locator('#result-3B').getByText('3B').click());
  editsTwo.push(userTwoPage.getByRole('img', { name: 'confirm' }).click());
  await Promise.all(editsTwo);

  // Simultaneous syncs
  const syncsThree: Promise<unknown>[] = [];
  syncsThree.push(forceSync(userOnePage));
  syncsThree.push(forceSync(userTwoPage));
  await Promise.all(syncsThree);

  // Both modify the same PA
  const editsThree: Promise<unknown>[] = [];
  editsThree.push(
    userOnePage.goto(
      'http://localhost:8889/teams/14VTCwm3Dahtmc/games/4CwAlkZqLLf5hQ'
    )
  );
  editsThree.push(
    userTwoPage.goto(
      'http://localhost:8889/teams/14VTCwm3Dahtmc/games/4CwAlkZqLLf5hQ'
    )
  );
  editsThree.push(
    userOnePage.locator('#lineup_0QNxIPfgaAkYBI').getByText('E').click()
  );
  editsThree.push(userOnePage.locator('#result-2B').getByText('2B').click());
  editsThree.push(userOnePage.getByRole('img', { name: 'confirm' }).click());

  editsThree.push(
    userTwoPage.locator('#lineup_0QNxIPfgaAkYBI').getByText('E').click()
  );
  editsThree.push(userTwoPage.locator('#result-1B').getByText('1B').click());
  editsThree.push(userTwoPage.getByRole('img', { name: 'confirm' }).click());
  await Promise.all(editsThree);

  // Simultaneous syncs
  const syncsFour: Promise<unknown>[] = [];
  syncsFour.push(forceSync(userOnePage));
  syncsFour.push(forceSync(userTwoPage));
  await Promise.all(syncsFour);

  // Get rid of the browser windows
  userOnePage.close();
  userTwoPage.close();
});

# Playwright UI tests

To run the client and server must be running `../start.sh`

Then invoke `npx playwright test` to run the UI tests headless

or

`npx playwright test --debug` if you want to see the browser clicking things

You can also create new, empty test and record its content by clicking around by running the empty test in debug mode, clicking "Record" when dev tools appears, ad the clicking through your flow.

These test do not run as part of CI, they are fairly brittle.

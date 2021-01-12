/*eslint no-process-exit:*/

const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const express = require('express');
const helmet = require('helmet');
const passport = require('passport');
const passportSession = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const got = require('got');
const { v4: uuidv4 } = require('uuid');
const querystring = require('querystring');

const commonUtils = require('../common-utils');
const configAccessor = require('./config-accessor');
const HandledError = require('./handled-error');
const idUtils = require('../id-utils');
const logger = require('./logger');
const objectMerge = require('../object-merge');
const OptimizationServer = require('./optimization-server');
const SimulationTimeEstimator = require('../simulation-time-estimator');
const welcomeEmailHtml = require('./email/welcome-email-html');
const passwordResetEmailHtml = require('./email/password-reset-email-html');

module.exports = class SoftballServer {
  constructor(appPort, optimizationPort, databaseCalls, cacheCalls, compute) {
    this.databaseCalls = databaseCalls;
    this.cacheCalls = cacheCalls;
    this.compute = compute;
    this.port = appPort;
    this.optimizationPort = optimizationPort;
  }

  start() {
    logger.log('sys', 'Starting');

    // Start the optimization server
    this.optServer = new OptimizationServer(this.databaseCalls, this.compute);

    // Authentication
    let self = this;
    passport.use(
      new LocalStrategy(
        {
          usernameField: 'email',
          passwordField: 'password',
        },
        async function (email, password, cb) {
          logger.log(null, 'Checking credentials...', email);

          try {
            let accountInfo = await self.databaseCalls.getAccountFromEmail(
              email
            );

            let isValid = false;
            if (accountInfo && accountInfo.password_hash && email) {
              isValid = await bcrypt.compare(
                password,
                accountInfo.password_hash
              );
            }

            if (isValid) {
              let sessionInfo = {
                accountId: accountInfo.account_id,
                email: email,
              };
              logger.log(accountInfo.account_id, 'Login accepted');
              cb(null, sessionInfo);
            } else {
              cb(null, false);
              logger.log(null, 'Login rejected', email);
            }
          } catch (error) {
            logger.log(null, error, email);
            cb(null, false);
          }
        }
      )
    );

    passport.serializeUser(function (sessionInfo, cb) {
      cb(null, sessionInfo);
    });

    passport.deserializeUser(async function (sessionInfo, cb) {
      cb(null, sessionInfo);
    });

    // Prep the web server
    const app = express();
    const server = http.createServer(app);
    // Middleware
    app.use(
      helmet({
        hsts: false, // Don't require HTTP Strict Transport Security (https) locally, nginx will set this header to true in production
      })
    );
    app.use(
      // CSP
      helmet.contentSecurityPolicy({
        directives: {
          defaultSrc: ["'self'"], // Only allow scripts/style/fonts/etc from this domain unless otherwise specified below
          styleSrc: [
            // TODO: use nonce to avoid recapcha styling errors: https://developers.google.com/recaptcha/docs/faq
            "'self'",
            'https://fonts.googleapis.com',
            //"'sha256-eeE4BsGQZBvwOOvyAnxzD6PBzhU/5IfP4NdPMywc3VE='", // react draggable components
            //"'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", // inline style (used by many react/babel components)
            "'unsafe-inline'", // I give up on this, too many react cmps use inline styles (react-select specifically)
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: [
            "'self'",
            'https://www.google.com/recaptcha/api.js',
            'https://www.gstatic.com/recaptcha/',
            'https://www.google-analytics.com', // JSONP issues here? https://csp-evaluator.withgoogle.com/
            "'sha256-OHGELEzahSNrwMFzyUN05OBpNq1AOUmN5hPgB+af9p0='", // Google Analytics inline
            "'unsafe-eval'", // TODO: the stats page and some other things complain about missing this but it still works.
          ],
          connectSrc: [
            "'self'",
            'https://fonts.googleapis.com/css',
            'https://fonts.gstatic.com',
            'https://www.gstatic.com/recaptcha/',
            'https://www.google.com/recaptcha/api.js',
            'https://www.google-analytics.com',
            'https://i.ytimg.com',
          ],
          frameSrc: [
            'https://www.google.com/', // ReCapcha
            'https://thbrown.github.io/', // YouTube Proxy
            'https://optimizers.softball.app/', // Optimizers selection page
            'http://localhost:8085/', // For testing optimizer selection locally
          ],
          mediaSrc: ['data:'], // This is for the noSleep lib, TODO: there might be a way to tighten this up
          imgSrc: [
            "'self'",
            'https://www.google-analytics.com',
            'https://stats.g.doubleclick.net',
            'https://i.ytimg.com', // YouTube thumbnails
            'https://yt3.ggpht.com',
          ],
          objectSrc: ["'none'"],
          reportUri: '/server/report-violation',
        },
      })
    );
    //app.use(helmet.referrerPolicy({ policy: "same-origin" })); // This breaks embeded youtube on ios safari

    app.use(favicon(__dirname + '/../assets/icons/favicon.ico'));
    app.use(
      '/server/build',
      express.static(path.join(__dirname + '/../build').normalize())
    );
    app.use(
      '/server/assets',
      express.static(path.join(__dirname + '/../assets').normalize())
    );
    // Service worker must be served at project root to intercept all fetches
    app.use(
      '/service-worker',
      express.static(
        path.join(__dirname + '/../src/workers/service-worker.js').normalize()
      )
    );
    // Robots.txt is served from the root by convention
    app.use(
      '/robots.txt',
      express.static(path.join(__dirname + '/../robots.txt').normalize())
    );
    app.use(
      '/server/manifest',
      express.static(path.join(__dirname + '/../manifest.json').normalize())
    );
    app.use(
      '/server/simulation-worker',
      express.static(
        path
          .join(__dirname + '/../src/workers/simulation-worker.js')
          .normalize()
      )
    );
    app.use(
      bodyParser.json({
        limit: '3mb',
        type: ['json', 'application/json', 'application/csp-report'],
      })
    );
    app.use(
      passportSession({
        store: this.cacheCalls.getSessionStore(),
        secret: configAccessor.getSessionSecretKey(),
        resave: false,
        saveUninitialized: false,
        name: 'softball.sid',
        cookie: {
          httpOnly: true,
          expires: new Date(253402300000000),
          sameSite: 'lax',
          // Secure header is set by nginx reverse proxy
        },
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(cookieParser());

    // Middleware to check that our second auth cookie is present and valid
    // This allows clients to log out when offline
    app.use(async function (req, res, next) {
      if (req.isAuthenticated()) {
        let accountId = extractSessionInfo(req, 'accountId');
        let cookieToken = req.cookies.nonHttpOnlyToken;
        let sessionToken = req.session.nonHttpOnlyToken;
        if (sessionToken !== undefined) {
          if (cookieToken !== sessionToken) {
            logger.log(
              accountId,
              `Logging out user due to token mismatch expected ${cookieToken} to be ${sessionToken}`
            );
            await new Promise((resolve, reject) => {
              req.logout();
              req.session.destroy(function (err) {
                if (err) {
                  reject(err);
                }
                resolve();
              });
            }); // Log out the user
          }
        } else {
          // No token stored in the session, assign one
          // This is only required for keeping existing sessions valid.
          initSecondAuthToken(req, res);
          logger.log(accountId, `Assigned user a second auth cookie`);
        }
      }
      next();
    });

    // Routes
    app.get(
      '/server/state',
      wrapForErrorProcessing(async (req, res) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }
        let accountId = extractSessionInfo(req, 'accountId');
        await lockAccount(accountId);
        let state;
        try {
          state = await this.databaseCalls.getState(accountId);
        } finally {
          await unlockAccount(accountId);
        }
        res.status(200).send(state);
      })
    );

    app.get(
      '/server/state-pretty',
      wrapForErrorProcessing(async (req, res) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }
        let accountId = extractSessionInfo(req, 'accountId');
        await lockAccount(accountId);
        let state;
        try {
          state = await this.databaseCalls.getState(accountId);
        } finally {
          await unlockAccount(accountId);
        }
        res.status(200).send(JSON.stringify(state, null, 2));
      })
    );

    app.get(
      '/server/team-stats/:publicTeamId',
      wrapForErrorProcessing(async (req, res) => {
        const { publicTeamId } = req.params;
        const account = await this.databaseCalls.getAccountAndTeamByTeamPublicId(
          publicTeamId
        );
        if (account) {
          const { accountId, teamId } = account;
          await lockAccount(accountId);
          let state;
          try {
            state = await this.databaseCalls.getStateForTeam(accountId, teamId);
          } finally {
            await unlockAccount(accountId);
          }
          res.status(200).send(state);
        } else {
          logger.warn(
            null,
            'No account found with stat_page_id=' + publicTeamId
          );
          res.status(404).send();
        }
      })
    );

    app.post(
      '/server/account/login',
      wrapForErrorProcessing((req, res, next) => {
        passport.authenticate('local', async function (err, accountInfo, info) {
          if (err || !accountInfo) {
            logger.warn(null, 'Authentication Failed', accountInfo, err, info);
            res.status(400).send();
            return;
          }
          req.logIn(accountInfo, function () {
            initSecondAuthToken(req, res);
            logger.log(accountInfo.account_id, 'Login Successful!');
            res.status(204).send();
          });
        })(req, res, next);
      })
    );

    app.post(
      '/server/account/logout',
      wrapForErrorProcessing((req, res, next) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }
        let accountId = extractSessionInfo(req, 'accountId');
        logger.log(accountId, 'Logging out');
        req.logout();
        res.status(204).send();
      })
    );

    app.post(
      '/server/account/signup',
      wrapForErrorProcessing(async (req, res, next) => {
        checkRequiredField(req.body.email, 'email');
        checkFieldLength(req.body.email, 320);

        checkRequiredField(req.body.password, 'password');
        checkFieldLength(req.body.password, 320);

        checkRequiredField(req.body.reCAPCHA, 'reCAPCHA');
        if (configAccessor.getRecapchaSecretKey()) {
          try {
            const recapchaResponse = await got.post(
              `https://www.google.com/recaptcha/api/siteverify?secret=${configAccessor.getRecapchaSecretKey()}&response=${
                req.body.reCAPCHA
              }`
            );
            let recapchaResponseBody = JSON.parse(recapchaResponse.body);
            if (!recapchaResponseBody.success) {
              throw new HandledError(
                'N/A',
                400,
                "We don't serve their kind here",
                recapchaResponse.body
              );
            }
          } catch (error) {
            if (error instanceof HandledError) {
              throw error;
            } else {
              throw new HandledError(
                'N/A',
                500,
                'Failed to get recapcha approval from Google',
                error
              );
            }
          }
        }

        let hashedPassword = await bcrypt.hash(req.body.password, 12);
        let account = await this.databaseCalls.signup(
          req.body.email,
          hashedPassword
        );

        let tokenHash = await sendEmailValidationEmail(
          account.account_id,
          req.body.email
        );
        this.databaseCalls.setPasswordTokenHash(account.account_id, tokenHash);

        logger.log(
          account.account_id,
          'Authenticating after successful signup'
        );
        logIn(account, req, res);

        res.status(204).send();
      })
    );

    app.post(
      '/server/account/reset-password-request',
      wrapForErrorProcessing(async (req, res, next) => {
        checkRequiredField(req.body.email, 'email');
        let account = await this.databaseCalls.getAccountFromEmail(
          req.body.email
        );
        logger.log(null, 'Reset password request for', req.body.email);
        if (account) {
          let token = await generateToken();
          let tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('base64');

          await this.databaseCalls.setPasswordTokenHash(
            account.account_id,
            tokenHash
          );

          configAccessor
            .getEmailService()
            .sendMessage(
              account.account_id,
              req.body.email,
              'Softball.app Password Reset',
              `Sombody tried to reset the password for the softball.app (https://softball.app) account associated with this email address. Please click this link to reset the password: https://softball.app/account/password-reset/${token} If you did not request this message or if you no longer want to reset your password, please ignore this email. This reset link will expire in 24 hours.`,
              passwordResetEmailHtml(
                `https://softball.app/account/password-reset/${token}`
              )
            );

          res.status(204).send();
        } else {
          // TODO: Always send an email, even if no such email address was found.
          // Emails that haven't been registerd on the site will say so.
          logger.warn(
            'N/A',
            'Password reset: No such email found',
            req.body.email
          );
          res.status(404).send();
        }
      })
    );

    app.post(
      '/server/account/reset-password',
      wrapForErrorProcessing(async (req, res, next) => {
        checkRequiredField(req.body.password, 'password');
        checkFieldLength(req.body.password, 320);
        checkFieldLength(req.body.token, 320);
        let token = req.body.token;
        let tokenHash = crypto
          .createHash('sha256')
          .update(token)
          .digest('base64');
        let account = await this.databaseCalls.getAccountFromTokenHash(
          tokenHash
        );
        if (account) {
          logger.log(
            account.account_id,
            'Password update received. Token',
            req.body.token
          );
          // If the user reset their passowrd, the email address is confirmed
          await this.databaseCalls.confirmEmail(account.account_id);

          let hashedPassword = await bcrypt.hash(req.body.password, 12);
          await this.databaseCalls.setPasswordHashAndExpireToken(
            account.account_id,
            hashedPassword
          );

          logger.log(null, 'Password successfully reset', req.body.token);

          // If an attacker somehow guesses the reset token and resets the password, they still don't know the email.
          // So, we wont log the password resetter in automatically. We can change this if we think it really affects
          // usability but I think it's okay. If users are resetting their passwords they are probably aready engaged.
          // logIn(account, req, res);
          res.status(204).send();
        } else {
          logger.warn(
            null,
            'Could not find account from reset token',
            req.body.token
          );
          res.status(404).send();
        }
      })
    );

    app.post(
      '/server/account/verify-email',
      wrapForErrorProcessing(async (req, res, next) => {
        checkFieldLength(req.body.token, 320);
        let token = req.body.token;
        let tokenHash = crypto
          .createHash('sha256')
          .update(token)
          .digest('base64');
        let account = await this.databaseCalls.getAccountFromTokenHash(
          tokenHash
        );
        if (account) {
          logger.log(
            account.account_id,
            'Email verification received. Token',
            req.body.token
          );
          await this.databaseCalls.confirmEmail(account.account_id);

          // Don't log in automatically (for security over usability, is this woth the tradeoff?)
          // logIn(account, req, res);
          res.status(204).send();
        } else {
          logger.warn(
            null,
            'Could not find account from reset token',
            req.body.token
          );
          res.status(404).send();
        }
      })
    );

    app.post(
      '/server/account/send-verification-email',
      wrapForErrorProcessing(async (req, res, next) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }

        let accountId = extractSessionInfo(req, 'accountId');
        let accountInfo = await this.databaseCalls.getAccountById(accountId);
        let emailHasBeenValidated = accountInfo.verifiedEmail;

        if (emailHasBeenValidated) {
          logger.log(
            accountId,
            `Not sending account verification email because email has already been verified`
          );
          res.status(400).send();
        } else {
          logger.log(
            accountId,
            `Sending account verification email per user request`
          );
          let tokenHash = await sendEmailValidationEmail(
            accountId,
            accountInfo.email
          );
          this.databaseCalls.setPasswordTokenHash(accountId, tokenHash);
          res.status(204).send();
        }
      })
    );

    app.delete(
      '/server/account',
      wrapForErrorProcessing(async (req, res, next) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }

        let accountId = extractSessionInfo(req, 'accountId');
        logger.log(accountId, `Deleting account`);

        await lockAccount(accountId);
        try {
          // First delete all the data
          let state = await this.databaseCalls.getState(accountId);
          let deletePatch = objectMerge.diff(state, {
            teams: [],
            players: [],
            optimizations: [],
          });
          await this.databaseCalls.patchState(deletePatch, accountId);

          // Then delete the account
          await this.databaseCalls.deleteAccount(accountId);

          // TODO: Invalidate session somehow?
          logger.log(accountId, 'Account successfully deleted');

          res.status(204).send();
        } catch (error) {
          logger.error(
            accountId,
            'An error occured while deleting the account'
          );
          throw error;
        } finally {
          await unlockAccount(accountId);
        }
      })
    );

    /*
			req: {
				checksum: db8a5d3c57a8e5f7aa7b
				patch: {...}
				type: {full|any}
			}

			res: {
				checksum: db8a5d3c57a8e5f7aa7b
				patchs: []
					-- OR --
				base: {...}
			}
		*/
    app.post(
      '/server/sync',
      wrapForErrorProcessing(async (req, res) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }

        let accountId = extractSessionInfo(req, 'accountId');
        let data = req.body;

        // Validate the request
        if (!data['checksum']) {
          if (data['md5']) {
            // We re-named this field (md5 -> checksum), doing this check prevents users from getting a scary error message
            // before they refresh the page and get the most recent version of the app. It can be removed later.
            data.checksum = data['md5'];
          } else {
            throw new HandledError(
              accountId,
              400,
              'Missing required field: checksum',
              JSON.stringify(data)
            );
          }
        }

        // Prevent race conditions across requests
        await lockAccount(accountId);

        // For testing locks
        // await sleep(10000);

        let state = undefined;
        let responseData = {};
        let anyChangesMade = false;

        try {
          // Check if the client sent updates to the server
          if (data.patch && Object.keys(data.patch).length !== 0) {
            logger.log(
              accountId,
              'client has updates',
              JSON.stringify(data.patch, null, 2)
            );

            state = state || (await this.databaseCalls.getState(accountId));
            let stateCopy = JSON.parse(JSON.stringify(state)); // Deep copy

            // Apply the patch that was supplied by the client, passing true allows us to ignore any changes that were applied to deleted entries or additions of things that already exist
            objectMerge.patch(state, data.patch, true);

            // Now we'll diff the patched version against our original copied version, this gives us a patch without any edits to deleted entries or additions of things that already exist
            let cleanPatch = objectMerge.diff(stateCopy, state);

            // We can pass the clean patch to the database to persist
            await this.databaseCalls.patchState(cleanPatch, accountId);
            state = await this.databaseCalls.getState(accountId);

            // Useful for debuging
            /*logger.log(
              accountId,
              "updatedState",
              JSON.stringify(state, null, 2),
              commonUtils.getHash(state)
            );
            */
            anyChangesMade = true;
          } else {
            logger.log(accountId, 'No updates from client');
          }

          // Calculate the checksum current state
          state = state || (await this.databaseCalls.getState(accountId));
          let checksum = commonUtils.getHash(state);

          // Compare the calculated checksum with the checksum provided by the client to determine if the server has updates for the client.
          if (data.checksum !== checksum) {
            logger.log(
              accountId,
              'Server has updates. CLIENT: ',
              data.checksum,
              ' SERVER: ',
              checksum
            );

            // If we have an ancestor state cached and client did not request a full sync we'll send only a patch representing the server's updates
            // If the client requested a full sync or we don't have a cached ancestor we'll send the entire state to the client
            let serverAncestor = await this.cacheCalls.getAncestor(
              accountId,
              req.sessionID
            );
            logger.log(
              accountId,
              'Retrieving ancestor'
              //JSON.stringify(serverAncestor, null, 2)
            );
            if (data.type === 'any' && serverAncestor) {
              // Yes we have an ancestor!
              logger.log(accountId, 'performing patch sync w/ ancestor');

              // Apply the client's patch to the ancestor
              objectMerge.patch(serverAncestor, data.patch, true);

              // Diff the ancestor and the localState (dbState) to get the patch we need to send back to the server
              let serverPatch = objectMerge.diff(serverAncestor, state);
              logger.log(
                accountId,
                'Server Patch',
                JSON.stringify(serverPatch, null, 2)
              );

              // Array for historical reasons, no reason this can't be a single object
              responseData.patches = [serverPatch];
            } else {
              // No we have no ancestor OR sync status is full, send back the whole state
              logger.warn(
                accountId,
                'performing full sync',
                'Requested Sync Type:',
                data.type,
                'Ansestor present:',
                !!serverAncestor
              );

              // The browser specifically requested a full sync, something must have gone wrong with the patch sync.
              // Print the state string so we can compare what went wrong with the browser's version
              if (data.type === 'full') {
                logger.warn(
                  accountId,
                  'State',
                  commonUtils.getObjectString(state.getLocalState)
                );
              }

              responseData.base =
                state || (await this.databaseCalls.getState(accountId));
            }

            anyChangesMade = true;
          } else {
            logger.log(
              accountId,
              'No updates from server',
              data.checksum,
              checksum
            );
          }

          // Whatever happened, we need to send the checksum back
          responseData.checksum = checksum;

          // Finally, if changes were made by either the client or the server, update the ancestor state for this session. This will reduce network egress for subsequent syncs.
          if (anyChangesMade) {
            await this.cacheCalls.setAncestor(accountId, req.sessionID, state);
          }
        } finally {
          // Unlock the account
          await unlockAccount(accountId);
        }

        // Woot, done
        res.status(200).send(responseData);
      })
    );

    app.post(
      '/server/start-optimization',
      wrapForErrorProcessing(async (req, res, next) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }

        let accountId = extractSessionInfo(req, 'accountId');
        logger.log(accountId, `Starting optimization`);

        let optimizationId = undefined;

        // This lock is just to make sure we don't get two optimizations running at the same time
        await lockAccount(accountId);
        try {
          // Is there another optimization state IN_PROGRESS (or in ALLOCATING_RESOURCES)
          // If so, don't start another one
          let inProgressCount = await this.databaseCalls.getNumberOfOptimizationsInProgress(
            accountId
          );
          if (inProgressCount !== 0) {
            logger.log(accountId, 'Simulations running', inProgressCount);
            res
              .status(400)
              .send({ message: `There is already an optimization running.` });
            return;
          }

          let data = req.body;

          // Convert client optimization id to the server one
          optimizationId = idUtils.clientIdToServerId(
            data.optimizationId,
            accountId
          );

          // TODO: Do some validation?
          // minimum players (this should be on the client side too)
          // must have id
          // required fields?
          // some size restriction?
          // Make sure optimization exists!

          let teamHits = 0;
          let teamOuts = 0;
          let maleCount = 0;
          let femaleCount = 0;
          for (let i = 0; i < data.executionData.players.length; i++) {
            teamOuts += data.executionData.players[i].outs;
            teamHits =
              teamHits +
              data.executionData.players[i].singles +
              data.executionData.players[i].doubles +
              data.executionData.players[i].triples +
              data.executionData.players[i].homeruns;
            if (data.executionData.players[i].gender === 'F') {
              femaleCount++;
            } else {
              maleCount++;
            }
          }
          let teamAverage = teamHits / (teamHits + teamOuts);

          let numLineups = SimulationTimeEstimator.getNumberOfPossibleLineups(
            data.executionData.lineupType,
            maleCount,
            femaleCount
          );

          let estimatedTime = SimulationTimeEstimator.estimateOptimizationTime(
            numLineups,
            SimulationTimeEstimator.getCoreCount(),
            data.executionData.iterations,
            data.executionData.innings,
            teamAverage
          );

          // Don't run optimizations with estimated completion time greater than 12 hours
          if (estimatedTime > 43200) {
            res.status(400).send({
              error: 'BAD_ESTIMATED_COMPLETION_TIME',
              message:
                'Could not start the simulation because the estimated completion time for this lineup is greater then 12 hours. Reduce the estimated runtime and try again.',
            });
            return;
          }

          // If the send email checkbox is checked but the email address has not been validated, complain
          // This is also checked by the optimization server after the optimization completes
          let account = await this.databaseCalls.getAccountById(accountId);
          let optimization = await this.databaseCalls.getOptimizationDetails(
            accountId,
            optimizationId
          );
          if (optimization.sendEmail && !account.verifiedEmail) {
            res.status(400).send({
              error: 'EMAIL_NOT_VERIFIED',
              message:
                "The 'send me an email...' checkbox was checked but the email address associated with this account has not been verified. Please verify your email at (softball.app/account) or uncheck the box.",
            });
            return;
          }

          // Write execution data to db
          logger.log(accountId, 'writing execution data');
          await this.databaseCalls.setOptimizationExecutionData(
            accountId,
            optimizationId,
            data.executionData
          );

          // Transition status to ALLOCATION_RESOURCES
          await this.databaseCalls.setOptimizationStatus(
            accountId,
            optimizationId,
            1 //state.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES, TODO: make this a common server/client enum
          );

          // Now unlock the account
        } catch (error) {
          logger.log(accountId, 'Setting optimization status to error', error);
          await this.databaseCalls.setOptimizationStatus(
            accountId,
            optimizationId,
            5, //state.OPTIMIZATION_STATUS_ENUM.ERROR
            error
          );
          throw error;
        } finally {
          await unlockAccount(accountId);
        }

        // Return success
        res.status(204).send();

        try {
          // Start the computer that will run the optimization
          await this.compute.start(accountId, optimizationId);
        } catch (error) {
          // Transition status to ERROR
          logger.error(
            accountId,
            optimizationId,
            'Setting optimization status to error in compute start',
            error
          );
          await this.databaseCalls.setOptimizationStatus(
            accountId,
            optimizationId,
            5, //state.OPTIMIZATION_STATUS_ENUM.ERROR
            error
          );
          throw error;
          // TODO: Kill the compute instance? If it's not dead already. This should really happen inside the start command
        }
      })
    );

    app.post(
      '/server/pause-optimization',
      wrapForErrorProcessing(async (req, res, next) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }

        let accountId = extractSessionInfo(req, 'accountId');
        let serverOptimizationId = undefined;
        try {
          // Convert client optimization id to the server one
          serverOptimizationId = idUtils.clientIdToServerId(
            req.body.optimizationId,
            accountId
          );

          // Transition status to PAUSING, next time the app server hears from the compute client it will destroy the connection
          // which will shut down the compute instance
          await this.databaseCalls.setOptimizationStatus(
            accountId,
            serverOptimizationId,
            6 //state.OPTIMIZATION_STATUS_ENUM.PAUSING
          );

          // Return success
          res.status(204).send();

          // We don't want to open up an opportunity for some user to quickly start and pause optimizations that
          // can result in user having several active compute instances. Putting a buffer between the pause button
          // press and actual pausing should give enough time for the paused compute instance to shut down
          await sleep(30000);

          // Transition status to PAUSED
          await this.databaseCalls.setOptimizationStatus(
            accountId,
            serverOptimizationId,
            4 //state.OPTIMIZATION_STATUS_ENUM.PAUSED
          );

          // Call compute service specific cleanup
          this.compute.cleanup(accountId, serverOptimizationId);
        } catch (error) {
          logger.log(
            accountId,
            'An error occurred while pausing an optimization',
            error
          );
          throw error;
        }
      })
    );

    app.get('/server/current-account', function (req, res) {
      if (!req.isAuthenticated()) {
        res.status(403).send();
        return;
      }
      let responseData = {};
      responseData.email = extractSessionInfo(req, 'email');
      res.status(200).send(responseData);
    });

    // Just a middle layer between the browser and the YouTube API so we can keep our API key private
    app.get('/server/youtube', async function (req, res) {
      let searchTerms = querystring.escape(req.query.q);
      let apiKey = configAccessor.getYoutubeApiKey();

      let responseData = {};
      responseData.query = searchTerms;
      logger.log('ANO', 'YouTube search: ', searchTerms);

      let youtubeResponse = {
        body: {
          items: [
            {
              snippet: {
                title:
                  'An error occurred while querying YouTube. We may be hitting API limits. Try again tomorrow or try pasting a link to a video instead.',
                thumbnails: {
                  default: {
                    url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
                  },
                },
              },
              id: {
                videoId: 'DLzxrzFCyOs',
              },
            },
          ],
        },
      };
      if (apiKey) {
        try {
          youtubeResponse = await got.get(
            `https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${searchTerms}&key=${apiKey}`
          );
        } catch (e) {
          logger.error('Anon', 'YouTube search error: ', e);
        }
      } else {
        youtubeResponse.body.items[0].snippet.title = 'Misconfigured API key';
        logger.error('Anon', 'Missing youtube API key in config');
      }

      responseData = youtubeResponse.body;
      res.status(200).send(responseData);
    });

    app.get(
      '/server/optimizer-definition/:optimizerId',
      async function (req, res) {
        const { optimizerId } = req.params;
        logger.log(
          '?',
          'Proxy request for optimizer definition ' +
            optimizerId +
            ' to ' +
            configAccessor.getOptimizerDefinitionUrl(optimizerId)
        );

        let githubResponse = { body: [] };
        try {
          githubResponse = await got.get(
            configAccessor.getOptimizerDefinitionUrl(optimizerId)
          );
        } catch (e) {
          logger.error(
            'Anon',
            'Github search error: ',
            optimizerId,
            configAccessor.getOptimizerDefinitionUrl(optimizerId),
            e
          );
        }

        githubResponse = githubResponse.body;
        res.status(200).send(githubResponse);
      }
    );

    // This route just accepts reports of Content Security Policy (CSP) violations
    // https://helmetjs.github.io/docs/csp/
    app.post('/server/report-violation', function (req, res) {
      let accountId = extractSessionInfo(req, 'accountId');
      if (req.body) {
        logger.log(accountId, 'CSP Violation: ', req.body);
      } else {
        logger.log(accountId, 'CSP Violation: No data received!');
      }
      res.status(204).send();
    });

    // The root should return the whole app
    app.get(
      '/',
      wrapForErrorProcessing((req, res) => {
        res.sendFile(path.join(__dirname + '/../index.html').normalize());
      })
    );

    // Everything else loads the react app and is processed on the client side
    app.get(
      '*',
      wrapForErrorProcessing((req, res) => {
        logger.warn(null, 'unanticipated url', req.originalUrl);
        res.sendFile(path.join(__dirname + '/../index.html').normalize());
      })
    );

    // 404 on unrecognized routes
    app.use(function () {
      throw new HandledError('N/A', 404, 'Resource not found');
    });

    app.use(function (error, req, res, next) {
      let accountId = extractSessionInfo(req, 'accountId');

      res.setHeader('content-type', 'application/json');
      if (error instanceof HandledError) {
        logger.error(accountId, 'Sending Error', error.getExternalMessage());
        res
          .status(error.getStatusCode())
          .send({ message: [error.getExternalMessage()] });
        if (error.getInternalMessage()) {
          error.print();
        }
      } else {
        let errorId = Math.random().toString(36).substring(7);
        res
          .status(500)
          .send({ message: `Internal Server Error. Error id: ${errorId}.` });
        logger.error(accountId, `SERVER ERROR ${errorId} - ${accountId}`, {
          message: [error.message],
        });
        logger.error(accountId, `Error`, error);
      }
    });

    this.server = server.listen(this.port, function listening() {
      logger.log('sys', 'Softball App: Listening on', server.address().port);
    });

    // Helpers -- TODO use consistent declarations

    // Error handling, so we can catch errors that occur during async too
    function wrapForErrorProcessing(fn) {
      return async function (req, res, next) {
        try {
          await fn(req, res, next);
        } catch (error) {
          next(error);
        }
      };
    }

    // An async sleep function
    async function sleep(ms) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          resolve(ms);
        }, ms);
      });
    }

    function initSecondAuthToken(req, res) {
      // Make the cookie
      let token = uuidv4();
      res.cookie('nonHttpOnlyToken', token, {
        expires: new Date(253402300000000),
        httpOnly: false,
      });
      // Remember this cookie's token in the session
      var sessData = req.session;
      sessData.nonHttpOnlyToken = token;
    }

    async function generateToken(length = 30) {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(length, (err, buf) => {
          if (err) {
            reject(err);
          } else {
            // Make sure the token is url safe
            resolve(
              buf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
            );
          }
        });
      });
    }

    function checkFieldLength(field, maxLength) {
      if (field && field.length > maxLength) {
        throw new HandledError(
          'N/A',
          400,
          `Field ${field} exceeds the maximum length ${maxLength}`
        );
      }
    }

    function checkRequiredField(field, fieldName) {
      if (!field || field.trim().length === 0) {
        throw new HandledError(
          'N/A',
          400,
          `Field ${fieldName} is required but was not specified`
        );
      }
    }

    async function logIn(account, req, res) {
      logger.log(account.account_id, 'Logging in', account);
      try {
        await new Promise(function (resolve, reject) {
          req.logIn(account, function () {
            // We need to serialize some info to the session
            let sessionInfo = {
              accountId: account.account_id,
              email: account.email,
            };
            var doneWrapper = function (req) {
              var done = function (err, user) {
                if (err) {
                  reject(err);
                  return;
                }
                req._passport.session.user = sessionInfo;
                return;
              };
              return done;
            };
            req._passport.instance.serializeUser(sessionInfo, doneWrapper(req));
            initSecondAuthToken(req, res);
            resolve();
          });
        });
        logger.log(account.account_id, 'Login Successful -- backdoor!');
      } catch (e) {
        logger.error(account.account_id, 'ERROR', e);
        res.status(500).send();
      }
    }

    const extractSessionInfo = function (req, field) {
      if (
        req &&
        req.session &&
        req.session.passport &&
        req.session.passport.user
      ) {
        return req.session.passport.user[field];
      } else {
        return undefined;
      }
    };

    // Lock the account. Only one session for a single account can access the database at a time, otherwise there will be lots of race conditions.
    // Depending on the server configuration, locking info may be stored in a cache to allow multiple app servers to access and update the same locks.
    const lockAccount = async function (accountId) {
      let success = false;
      let counter = 0;
      do {
        success = await self.cacheCalls.lockAccount(accountId);

        if (!success) {
          logger.log(accountId, 'Account already locked, retrying in 200ms');
          await sleep(200); // TODO: Do we need a random backoff?
          counter++;
        }

        if (counter > 100) {
          throw new HandledError(
            accountId,
            503,
            'Another request is consuming system resources allocated for this account. Please try agin in a few minutes.'
          );
        }
      } while (!success);
    };

    const unlockAccount = async function (accountId) {
      await self.cacheCalls.unlockAccount(accountId);
    };

    const sendEmailValidationEmail = async function (accountId, email) {
      let token = await generateToken();
      let tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('base64');

      configAccessor
        .getEmailService()
        .sendMessage(
          accountId,
          email,
          'Welcome to Softball.app!',
          `Thank you for signing up for an account on https://softball.app. Please click this activation link to verify your email address: https://softball.app/account/verify-email/${token}`,
          welcomeEmailHtml(`https://softball.app/account/verify-email/${token}`)
        );

      return tokenHash;
    };
  }

  async stop() {
    // Shut doen the opt server
    let optServerShutdown = this.optServer.stop();

    // Shut down the app server
    let appShutdown = new Promise(
      function (resolve, reject) {
        logger.log(null, 'Closing App');
        this.server.close(function (err) {
          if (err) {
            reject(err);
          }
          logger.log(null, 'App Closed');
          resolve();
        });
      }.bind(this)
    );

    return Promise.all([optServerShutdown, appShutdown]);
  }
};

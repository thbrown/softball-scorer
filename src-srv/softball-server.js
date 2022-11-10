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
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const got = require('got');
const { v4: uuidv4 } = require('uuid');
const querystring = require('querystring');
const BucketSessionStore = require('gcp-bucket-session-store');

const configAccessor = require('./config-accessor');
const HandledError = require('./handled-error');
const logger = require('./logger');
const passwordResetEmailHtml = require('./email/password-reset-email-html');
const welcomeEmailHtml = require('./email/welcome-email-html');
const optimizationCompleteEmailHtml = require('./email/optimization-complete-email-html');
// const OptimizationResultsHtml = require('../common-optimization-results-html');
const SharedLib = require('../shared-lib').default;

const MONITORING_INTERVAL = 5000;

module.exports = class SoftballServer {
  constructor(appPort, databaseCalls, cacheCalls, optimizationCompute) {
    this.databaseCalls = databaseCalls;
    this.cacheCalls = cacheCalls;
    this.optimizationCompute = optimizationCompute;
    this.port = appPort;
  }

  start() {
    logger.log('sys', 'Starting');

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
            if (accountInfo && accountInfo.passwordHash && email) {
              isValid = await bcrypt.compare(
                password,
                accountInfo.passwordHash
              );
            }

            if (isValid) {
              let sessionInfo = {
                accountId: accountInfo.accountId,
                email: email,
              };
              logger.log(accountInfo.accountId, 'Login accepted');
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
            'https://www.youtube-nocookie.com/', // YouTube Embeds
            'http://localhost:8085/', // For testing optimizer selection locally
          ],
          mediaSrc: ['data:'], // This is for the noSleep lib, TODO: there might be a way to tighten this up
          imgSrc: [
            "'self'",
            'https://www.google-analytics.com',
            'https://stats.g.doubleclick.net',
            'https://i.ytimg.com', // YouTube thumbnails
            'https://yt3.ggpht.com', // More YouTube thumbnails
          ],
          objectSrc: ["'none'"],
          reportUri: '/server/report-violation',
        },
      })
    );
    //app.use(helmet.referrerPolicy({ policy: "same-origin" })); // This breaks embeded youtube on ios safari

    // Server everything in the build directory
    app.use(express.static('build'));

    app.use(
      bodyParser.json({
        limit: '3mb',
        type: ['json', 'application/json', 'application/csp-report'],
      })
    );
    app.use(
      passportSession({
        store: this.cacheCalls.getSessionStore(), // new BucketSessionStore({ bucketName: 'test-session-bucket' })
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
              req.logout(function () {});
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
          state = await this.databaseCalls.getClientState(accountId);
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
          state = await this.databaseCalls.getClientState(accountId);
        } finally {
          await unlockAccount(accountId);
        }
        res.status(200).send(JSON.stringify(state, null, 2));
      })
    );

    app.post(
      '/server/team-stats/edit',
      wrapForErrorProcessing(async (req, res, next) => {
        checkRequiredField(req.body.value, 'value');
        checkRequiredField(req.body.teamId, 'teamId');
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }
        let accountId = extractSessionInfo(req, 'accountId');
        logger.log(
          accountId,
          'Updating team publicId info',
          req.body.teamId,
          req.body.value
        );

        await this.databaseCalls.togglePublicTeam(
          accountId,
          req.body.teamId,
          req.body.value
        );
        res.status(204).send();
      })
    );

    app.get(
      '/server/team-stats/:publicTeamId',
      wrapForErrorProcessing(async (req, res) => {
        const { publicTeamId } = req.params;
        const ids = await this.databaseCalls.getAccountAndTeamIdsByTeamPublicId(
          publicTeamId
        );
        if (ids) {
          const { accountId, teamId } = ids;
          await lockAccount(accountId);
          let state;
          try {
            state = await this.databaseCalls.getClientStateForTeam(
              accountId,
              teamId
            );
          } finally {
            await unlockAccount(accountId);
          }
          // State comes back null if publicIdEnabled has been disabled by the account for the target team
          if (state === undefined) {
            res.status(404).send();
          } else {
            res.status(200).send(state);
          }
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
            logger.log(accountInfo.accountId, 'Login Successful!');
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
        req.logout(function () {});
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

        // Email verification token and it's hash
        let token = await generateToken();
        let tokenHash = crypto
          .createHash('sha256')
          .update(token)
          .digest('base64')
          .replace(/\//g, '_');

        let hashedPassword = await bcrypt.hash(req.body.password, 12);
        let account = await this.databaseCalls.signup(
          req.body.email,
          hashedPassword,
          tokenHash
        );

        await sendEmailValidationEmail(
          account.accountId,
          req.body.email,
          token,
          tokenHash
        );

        logger.log(account.accountId, 'Authenticating after successful signup');
        await logIn(account, req, res);

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
            .digest('base64')
            .replace(/\//g, '_');

          await this.databaseCalls.setPasswordTokenHash(
            account.accountId,
            tokenHash
          );

          configAccessor
            .getEmailService()
            .sendMessage(
              account.accountId,
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
          .digest('base64')
          .replace(/\//g, '_');
        let account = await this.databaseCalls.getAccountFromTokenHash(
          tokenHash
        );
        if (account) {
          logger.log(
            account.accountId,
            'Password update received. Token',
            req.body.token
          );
          // If the user reset their password, the email address is confirmed
          await this.databaseCalls.confirmEmail(account.accountId);

          let hashedPassword = await bcrypt.hash(req.body.password, 12);
          await this.databaseCalls.setPasswordHashAndExpireToken(
            account.accountId,
            hashedPassword
          );

          logger.log(
            null,
            'Password successfully reset',
            req.body.token,
            hashedPassword
          );

          // If an attacker somehow guesses the reset token and resets the password, they still don't know the email.
          // So, we wont log the password resetter in automatically. We can change this if we think it really affects
          // usability but I think it's okay. If users are resetting their passwords they are probably already engaged.
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
        let emailHasBeenValidated = accountInfo.emailConfirmed;

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

          // Email verification token
          let token = await generateToken();
          await sendEmailValidationEmail(accountId, accountInfo.email, token);

          // Save the token's hash to the db so we can verify it after the link in the email is clicked
          let tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('base64')
            .replace(/\//g, '_');
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
          // Delete the account
          await this.databaseCalls.deleteAccount(accountId);

          // TODO: Invalidate session somehow?
          logger.log(accountId, 'Account successfully deleted');

          res.status(204).send();
        } catch (error) {
          logger.error(
            accountId,
            'An error occurred while deleting the account'
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
          if (
            data.patch &&
            Array.isArray(data.patch) &&
            data.patch.length !== 0
          ) {
            logger.log(
              accountId,
              'Client has updates'
              //JSON.stringify(data.patch, null, 2)
            );

            // Note: I don't think we need this any more, it was useful with postgres, but now we can rely on the diffing lib to do the same thing
            //SharedLib.objectMerge.patch(state, data.patch, true);
            //let stateCopy = JSON.parse(JSON.stringify(state)); // Deep copy
            // Now we'll diff the patched version against our original copied version, this gives us a patch without any edits to deleted entries or additions of things that already exist
            //let cleanPatch = SharedLib.objectMerge.diff(stateCopy, state);

            // Pass the client's patch to the database to persist its changes
            logger.log(
              accountId,
              'Client patch. Number of patches: ',
              data.patch.length
            );
            await this.databaseCalls.patchState(data.patch, accountId);
            let oldHash = SharedLib.commonUtils.getHash(state);
            state = await this.databaseCalls.getClientState(accountId);

            // Useful for debugging
            /*logger.log(
              accountId,
              "updatedState",
              JSON.stringify(state, null, 2),
              SharedLib.commonUtils.getHash(state)
            );
            */
            anyChangesMade = true;
          } else {
            logger.log(accountId, 'No updates from client');
          }

          // Calculate the checksum of the current state
          state = state || (await this.databaseCalls.getClientState(accountId));
          let checksum = SharedLib.commonUtils.getHash(state);

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
              /*JSON.stringify(
                serverAncestor.optimizations[state.optimizations.length - 1],
                null,
                2
              )*/
            );
            if (data.type === 'any' && serverAncestor) {
              // Yes we have an ancestor!
              logger.log(accountId, 'performing patch sync w/ ancestor');

              // Apply the client's patch to the ancestor (this prevents us from sending back the change the client just sent us)
              SharedLib.objectMerge.patch(serverAncestor, data.patch, true);

              // Diff the ancestor and the localState (dbState) to get the patch we need to send back to the client
              let serverPatch = SharedLib.objectMerge.diff(
                serverAncestor,
                state
              );
              logger.log(
                accountId,
                'Server Patch',
                JSON.stringify(serverPatch, null, 2)
              );
              responseData.patch = serverPatch;
            } else {
              // No we have no ancestor OR sync status is 'full', send back the whole state
              logger.log(
                accountId,
                'performing full sync',
                'Requested Sync Type:',
                data.type,
                'Ancestor present?:',
                !!serverAncestor
              );

              // The browser specifically requested a full sync, something must have gone wrong with the patch sync.
              // Print the state string so we can compare what went wrong with the browser's version
              if (data.type === 'full') {
                logger.warn(
                  accountId,
                  'State',
                  SharedLib.commonUtils.getObjectString(state),
                  JSON.stringify(state, null, 2)
                );
              }

              responseData.base =
                state || (await this.databaseCalls.getClientState(accountId));
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

        // Convert client optimization id to the server one
        let optimizationId = req.body.optimizationId;

        try {
          // This lock is just to make sure we don't get two optimizations running at the same time
          // TODO: re-evaluate, we can run two at the same time
          await lockAccount(accountId);

          // Is there another optimization state IN_PROGRESS (or in ALLOCATING_RESOURCES)
          // If so, don't start another one
          /*
          let inProgressCount =
            await this.databaseCalls.getNumberOfOptimizationsInProgress(
              accountId
            );
          // Disabled for now
          if (inProgressCount === -1) {
            res
              .status(400)
              .send({ message: `There is already an optimization running.` });
            return;
          }
          */

          // TODO: Do some validation?
          // minimum players (this should be on the client side too)
          // must have id
          // required fields?
          // some size restriction?
          // Make sure optimization exists!

          // Don't run optimizations with estimated completion time greater than 12 hours
          /*
          if (estimatedTime > 43200) {
            res.status(400).send({
              error: 'BAD_ESTIMATED_COMPLETION_TIME',
              message:
                'Could not start the simulation because the estimated completion time for this lineup is greater then 12 hours. Reduce the estimated runtime and try again.',
            });
            return;
          }*/

          // If the send email checkbox is checked but the email address has not been validated, complain
          // This is also checked by the optimization server after the optimization completes
          let account = await this.databaseCalls.getAccountById(accountId);
          let optimization = await this.databaseCalls.getOptimizationDetails(
            accountId,
            optimizationId
          );
          if (optimization.sendEmail && !account.emailConfirmed) {
            res.status(400).send({
              error: 'EMAIL_NOT_VERIFIED',
              message:
                "The 'send me an email...' checkbox was checked but the email address associated with this account has not been verified. Please verify your email at (softball.app/account) or uncheck the box.",
            });
            return;
          }

          // Build the stats object
          let statsData = await this.databaseCalls.getClientState(accountId);
          statsData = processStatsData(statsData, optimization);
          //logger.log(null, JSON.stringify(statsData, null, 2));

          // TODO: Filter options string from selections (is this necessary?)
          // TODO: Filter overrides that don't apply to a player in the lineup

          /*
      // Filter out any deleted teams or games (since these can get out of sync)
      // TODO: Shouldn't this move to the server side?
      const filteredTeamList = teamIds.filter((teamId) =>
        state.getTeam(teamId)
      );
      state.setOptimizationField(
        this.props.optimization.id,
        'teamList',
        filteredTeamList
      );

      const filteredGameList = gameIds.filter((gameId) =>
        state.getTeam(gameId)
      );
      state.setOptimizationField(
        this.props.optimization.id,
        'gameList',
        filteredGameList
      );

      // Filter out any overrides that don't belong to a player in the playerList
      const overridePlayerIds = Object.keys(overrideData);
      const filteredOverrides = {};
      for (let i = 0; i < overridePlayerIds.length; i++) {
        if (playerIds.includes(overridePlayerIds[i])) {
          filteredOverrides[overridePlayerIds[i]] =
            overrideData[overridePlayerIds[i]];
        }
      }
      state.setOptimizationField(
        this.props.optimization.id,
        'overrideData',
        filteredOverrides
      );

      */

          // Common options that apply to all optimizers invoked from softball.app
          let standardOptions = {
            '-o': optimization.optimizerType,
            '-t': optimization.lineupType,
            '-l': optimization.playerList.join(),
            '-u': 5000,
            '-f': req.body.unpause ? false : true,
            '-e': false,
          };

          // Options for the selected optimizer (prefix with double dash)
          let prefixedCustomOptions = Object.assign(
            {},
            ...Object.keys(optimization.customOptionsData).map((key) => ({
              ['--' + key]: optimization.customOptionsData[key],
            }))
          );

          // Example flags:
          /*
            "-o": "0",
            "-i": "quebec",
            "-l": "Leroy,Roy,Ben,Joe,Oscar,Cheryl,Jessica,Ashley,Chelsea,Brianna",
            "-I": "7",
            "-G": "100",
            "-u": 5000,
            "-f": true,
            "-e": false,
            "PASSWORD": "<your_pwd>",
            "data": { ... }
          */
          let softballSimFlags = Object.assign(
            prefixedCustomOptions,
            standardOptions
          );
          logger.log(accountId, 'Final flags ', softballSimFlags);

          // Now we can start the actual optimization
          try {
            await this.databaseCalls.setOptimizationStatus(
              accountId,
              optimizationId,
              SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
            );

            // Get any existing result
            let queryResponse = await this.optimizationCompute.query(
              accountId,
              optimizationId
            );
            logger.log(accountId, 'QUERY RESPONSE ', queryResponse);
            let recentHash = SharedLib.commonUtils.getHash(
              queryResponse ? JSON.parse(queryResponse) : queryResponse
            );

            // Start the computer that will run the optimization
            let startMonitor = await this.optimizationCompute.start(
              accountId,
              optimizationId,
              statsData,
              softballSimFlags
            );
            logger.log(accountId, 'MONITOR: Starting? ', startMonitor);

            if (!startMonitor) {
              return;
            }

            // Retrieve the results of the optimization on an interval, update the db
            const MONITOR_NO_CHANGE_TIMEOUT = 60; // With a 5 sec interval this is 5 minutes
            let noChangeCounter = 0;
            let monitor = async function () {
              // Get the latest optimization result
              let queryResponse = await this.optimizationCompute.query(
                accountId,
                optimizationId
              );
              logger.log(accountId, 'QUERY RESPONSE ', queryResponse);
              let result = queryResponse
                ? JSON.parse(queryResponse)
                : queryResponse;
              let resultHash = SharedLib.commonUtils.getHash(result);

              // Has anything changed?
              let somethingChanged = resultHash !== recentHash;
              recentHash = resultHash;

              if (result != null && somethingChanged) {
                // Something changed, reset the timeout counter
                noChangeCounter = 0;

                // TODO: Lock account??

                // Save the new status to the db
                // TODO: Don't let anything other than PAUSED override PAUSING, it's confusing
                // The "Pausing" state comes from the client, never from the server
                //if (
                //  SharedLib.constants.OPTIMIZATION_STATUS_ENUM[result.status] ==
                //  SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSING // This will never be true
                //) {
                // Wait how can we find the old result?
                // Read
                //}

                // Save the new result to the db
                await this.databaseCalls.setOptimizationResultData(
                  accountId,
                  optimizationId,
                  result
                );

                // Save the status to the db
                await this.databaseCalls.setOptimizationStatus(
                  accountId,
                  optimizationId,
                  SharedLib.constants.OPTIMIZATION_STATUS_ENUM[result.status],
                  result.statusMessage
                );

                // Send success email! - if complete
                if (
                  SharedLib.constants.OPTIMIZATION_STATUS_ENUM[result.status] ==
                    SharedLib.constants.OPTIMIZATION_STATUS_ENUM.COMPLETE &&
                  optimization.sendEmail &&
                  account.emailConfirmed
                ) {
                  let emailAddress = extractSessionInfo(req, 'email');
                  let email = configAccessor.getEmailService();
                  email.sendMessage(
                    accountId,
                    emailAddress,
                    `Lineup Optimization ${optimization.name} Complete!`,
                    JSON.stringify(result, null, 2),
                    optimizationCompleteEmailHtml(
                      SharedLib.commonOptimizationResults.getResultsAsHtml(
                        JSON.stringify(result),
                        JSON.stringify(optimization.inputSummaryData)
                      ),
                      `https://softball.app/optimizations/${req.body.optimizationId}`
                    )
                  );
                  logger.log(accountId, 'Completion Email sent');
                }
              } else {
                // No changes detected
                noChangeCounter++;
              }

              // Don't keep monitoring if we've hit the timeout, transition to error
              if (noChangeCounter > MONITOR_NO_CHANGE_TIMEOUT) {
                logger.error(
                  accountId,
                  'Monitor Timeout',
                  MONITOR_NO_CHANGE_TIMEOUT
                );

                await this.databaseCalls.setOptimizationStatus(
                  accountId,
                  optimizationId,
                  SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ERROR,
                  'Monitor Timeout'
                );
                return;
              }

              // Keep monitoring if status is IN_PROGRESS or if there was no change
              if (
                (result !== null &&
                  // Not accounting for PAUSING here since that is assigned by the client and will never come back from the opt result
                  [
                    SharedLib.constants.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS,
                    SharedLib.constants.OPTIMIZATION_STATUS_ENUM
                      .ALLOCATING_RESOURCES,
                  ].includes(
                    SharedLib.constants.OPTIMIZATION_STATUS_ENUM[result.status]
                  )) ||
                somethingChanged
              ) {
                logger.log(
                  accountId,
                  'MONITOR: Checking again in ',
                  MONITORING_INTERVAL
                );
                setTimeout(monitor, MONITORING_INTERVAL);
              } else if (result === null) {
                logger.log(
                  accountId,
                  'MONITOR: Null, checking again in ',
                  MONITORING_INTERVAL
                );
                setTimeout(monitor, MONITORING_INTERVAL);
              } else {
                logger.log(
                  accountId,
                  'Monitor halting, reached terminal status ',
                  result ? result.status : result,
                  resultHash,
                  recentHash
                );
              }
            }.bind(this);
            monitor(accountId, optimizationId);
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
              SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ERROR,
              error.message
            );
            throw error;
          }
        } catch (error) {
          logger.log(accountId, 'Setting optimization status to error', error);
          await this.databaseCalls.setOptimizationStatus(
            accountId,
            optimizationId,
            SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ERROR,
            error.message
          );
          throw error;
        } finally {
          // Now unlock the account
          await unlockAccount(accountId);
        }

        // Return success
        res.status(204).send();
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
        try {
          // Convert client optimization id to the server one
          let optimizationId = req.body.optimizationId;

          await this.optimizationCompute.pause(accountId, optimizationId);

          // Return success
          res.status(204).send();
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

    app.post(
      '/server/estimate-optimization',
      wrapForErrorProcessing(async (req, res, next) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }

        let accountId = extractSessionInfo(req, 'accountId');

        // Convert client optimization id to the server one
        let optimizationId = req.body.optimizationId;

        let result = {};
        try {
          let statsData = undefined;
          let optimization = undefined;
          try {
            // Lock while we access the db, so we are guaranteed consistent data
            await lockAccount(accountId);

            optimization = await this.databaseCalls.getOptimizationDetails(
              accountId,
              optimizationId
            );

            // Build the stats object
            statsData = await this.databaseCalls.getClientState(accountId);
          } finally {
            // Now unlock the account
            await unlockAccount(accountId);
          }

          statsData = processStatsData(statsData, optimization);

          // TODO: Filter options string from selections (is this necessary?)
          // TODO: Filter overrides that don't apply to a player in the lineup

          // Common options that apply to all optimizers invoked from softball.app
          let standardOptions = {
            '-o': optimization.optimizerType,
            '-t': optimization.lineupType,
            '-l': optimization.playerList.join(),
            '-u': 5000,
            '-f': true,
            '-e': true, // estimate enabled
          };

          // Options for the selected optimizer (prefix with double dash)
          let prefixedCustomOptions = Object.assign(
            {},
            ...Object.keys(optimization.customOptionsData).map((key) => ({
              ['--' + key]: optimization.customOptionsData[key],
            }))
          );

          let softballSimFlags = Object.assign(
            prefixedCustomOptions,
            standardOptions
          );
          logger.log(accountId, 'Final flags est ', softballSimFlags);

          // Start the computer that will run the optimization
          result = await this.optimizationCompute.estimate(
            accountId,
            optimizationId,
            statsData,
            softballSimFlags
          );
        } catch (error) {
          logger.error(accountId, 'Error during estimate', error);
          let responseData = {};
          responseData.message = extractSessionInfo(req, error.message);
          res.status(400).send();
          return;
        }

        // Return success
        res.status(200).send(result);
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
    app.use(function (req) {
      throw new HandledError(
        'N/A',
        404,
        'Resource not found',
        JSON.stringify(
          {
            headers: req.headers,
            method: req.method,
            url: req.url,
            httpVersion: req.httpVersion,
            body: req.body,
            //cookies: req.cookies,
            path: req.path,
            protocol: req.protocol,
            query: req.query,
            hostname: req.hostname,
            ip: req.ip,
            originalUrl: req.originalUrl,
            params: req.params,
          },
          null,
          2
        )
      );
    });

    app.use(function (error, req, res, next) {
      let accountId = extractSessionInfo(req, 'accountId');

      if (error instanceof HandledError) {
        logger.error(accountId, 'Sending Error', error.getExternalMessage());
        res.setHeader('content-type', 'application/json');
        res
          .status(error.getStatusCode())
          .send({ message: [error.getExternalMessage()] });
        if (error.getInternalMessage()) {
          error.print();
        }
      } else {
        let errorId = Math.random().toString(36).substring(7);
        logger.error(accountId, 'Sending Error', errorId);
        res.setHeader('content-type', 'application/json');
        res
          .status(500)
          .send({ message: `Internal Server Error. Error id: ${errorId}.` });
        logger.error(accountId, `SERVER ERROR ${errorId}`, {
          message: error.message,
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
      if (field === undefined || field.toString().trim().length === 0) {
        throw new HandledError(
          'N/A',
          400,
          `Field ${fieldName} is required but was not specified`
        );
      }
    }

    async function logIn(account, req, res) {
      logger.log(account.accountId, 'Logging in');
      await new Promise(function (resolve, reject) {
        req.logIn(account, function () {
          // We need to serialize some info to the session
          let sessionInfo = {
            accountId: account.accountId,
            email: account.email,
          };
          var doneWrapper = function (req) {
            var done = function (err, user) {
              if (err) {
                reject(err);
                return;
              }
              req.session.passport.user = sessionInfo;
              return;
            };
            return done;
          };
          passport.serializeUser(sessionInfo, doneWrapper(req));
          initSecondAuthToken(req, res);
          resolve();
        });
      });
      logger.log(account.accountId, 'Login Successful -- backdoor!');
    }

    /**
     * Taylor the stats data so that it only contains information we need to run the optimization
     * This logic needs to be used both by the normal and the estimate optimization runs.
     */
    function processStatsData(statsData, optimization) {
      // Stats object should not include account or optimizer information
      delete statsData.account;
      delete statsData.optimizations;

      // Stats object should not include games from teams that aren't selected
      let teamIdSet = new Set(optimization.teamList);
      for (let team of statsData.teams) {
        if (!teamIdSet.has(team.id)) {
          statsData.teams = statsData.teams.filter(function (el) {
            return el.id != team.id;
          });
        }
      }

      // Overrides - Modifying the stats object such that the optimization respects overrides requires two steps:
      // 1) Hide old PAs: Replace the player id of all the overridden player's plate appearances with a new
      //    "Ghost" player so they will no longer factor in to the overridden player's stats.
      // 2) Add new PAs: Any overrides are added as new games where only the overridden player bats
      for (let overridePlayerId in optimization.overrideData) {
        // Overrides - Get a new id for the ghost player id
        let ghostPlayerId = SharedLib.idUtils.serverIdToClientId(uuidv4());

        // Overrides - Insert ghost player - a copy of the player that's being overridden
        let overriddenPlayer = statsData.players.reduce((prev, curr) => {
          return curr.id === overridePlayerId ? curr : prev;
        }, null);
        let ghostPlayer = JSON.parse(JSON.stringify(overriddenPlayer));
        ghostPlayer.id = ghostPlayerId;
        ghostPlayer.name = ghostPlayer.name + ' Ghost'; // Unnecessary but helps show whats going on
        statsData.players.push(ghostPlayer);

        // Overrides - Attribute all PAs of our overridenPlayer to our new ghost player
        for (let team of statsData.teams) {
          for (let game of team.games) {
            for (let pa of game.plateAppearances) {
              if (pa.playerId === overridePlayerId) {
                pa.playerId = ghostPlayerId;
              }
            }
          }
        }

        // Overrides - Insert new PAs for our overridden player under a new team and game
        statsData.teams.push({
          id: SharedLib.idUtils.serverIdToClientId(uuidv4()),
          name: 'Overrides' + overridePlayerId,
          //publicId: 'BhOVxvmOKKs4k91e',
          //publicIdEnabled: false,
          games: [
            {
              plateAppearances: optimization.overrideData[overridePlayerId],
              id: SharedLib.idUtils.serverIdToClientId(uuidv4()),
              opponent: 'Overrides ' + overridePlayerId,
              date: new Date().getTime(),
              //park: '',
              lineupType: 0,
              scoreUs: 0,
              scoreThem: 0,
              lineup: [overridePlayerId],
            },
          ],
        });
      }

      return statsData;
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

    const sendEmailValidationEmail = async function (accountId, email, token) {
      configAccessor
        .getEmailService()
        .sendMessage(
          accountId,
          email,
          'Welcome to Softball.app!',
          `Thank you for signing up for an account on https://softball.app. Please click this activation link to verify your email address: https://softball.app/account/verify-email/${token}`,
          welcomeEmailHtml(`https://softball.app/account/verify-email/${token}`)
        );
    };
  }

  async stop() {
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
    return Promise.all([appShutdown]);
  }
};

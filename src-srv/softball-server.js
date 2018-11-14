/*eslint no-process-exit:*/
"use strict";

const http = require("http");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const passport = require("passport");
const passportSession = require("express-session");
const LocalStrategy = require("passport-local").Strategy;
const bodyParser = require("body-parser");
const favicon = require("serve-favicon");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const hasher = require("object-hash");
const got = require("got");

const objectMerge = require("../object-merge.js");
const HandledError = require("./handled-error.js");
const config = require("./config");
const logger = require("./logger.js");

module.exports = class SoftballServer {
  constructor(databaseCalls, cacheCalls) {
    this.databaseCalls = databaseCalls;
    this.cacheCalls = cacheCalls;
    this.PORT = 8888;
  }

  start() {
    logger.log(null, "Starting");

    // Authentication
    let self = this;
    passport.use(
      new LocalStrategy(
        {
          usernameField: "email",
          passwordField: "password"
        },
        async function(email, password, cb) {
          logger.log(null, "Checking credentials...", email);

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
                email: email
              };
              logger.log(accountInfo.account_id, "Login accepted");
              cb(null, sessionInfo);
            } else {
              cb(null, false);
              logger.log(null, "Login rejected", email);
            }
          } catch (error) {
            logger.log(null, error, email);
            cb(null, false);
          }
        }
      )
    );

    passport.serializeUser(function(sessionInfo, cb) {
      cb(null, sessionInfo);
    });

    passport.deserializeUser(async function(sessionInfo, cb) {
      cb(null, sessionInfo);
    });

    // Prep the web server
    const app = express();
    const server = http.createServer(app);

    // Middleware
    app.use(
      helmet({
        hsts: false // Don't require HTTP Strict Transport Security (https) locally, nginx will set this header to true in production
      })
    );
    app.use(
      helmet.contentSecurityPolicy({
        directives: {
          defaultSrc: ["'self'"], // Only allow scripts/style/fonts/etc from this domain unless otherwise specified below
          styleSrc: [
            // TODO: use nonce to avoid recapcha styling errors: https://developers.google.com/recaptcha/docs/faq
            "'self'",
            "https://fonts.googleapis.com",
            "'sha256-eeE4BsGQZBvwOOvyAnxzD6PBzhU/5IfP4NdPMywc3VE='", // react draggable components
            "'sha256-6IIvUyrpNJsrV0PElO/SFu1ORPnryCprHLVIlaW4hDM='" // inline style (used by many react/babel components)
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: [
            "'self'",
            "https://www.google.com/recaptcha/api.js",
            "https://www.gstatic.com"
            //"'unsafe-eval'"
          ],
          connectSrc: [
            "'self'",
            "https://fonts.googleapis.com/css",
            "https://fonts.gstatic.com",
            "https://www.gstatic.com",
            "https://www.google.com/recaptcha/api.js"
          ],
          frameSrc: [
            "'self'",
            "https://www.google.com/", // ReCapcha
            "https://thbrown.github.io/" // YouTube Proxy
          ],
          reportUri: "/server/report-violation"
        }
      })
    );
    app.use(helmet.referrerPolicy({ policy: "same-origin" }));
    app.use(favicon(__dirname + "/../assets/fav-icon.png"));
    app.use(
      "/server/build",
      express.static(path.join(__dirname + "/../build").normalize())
    );
    app.use(
      "/server/assets",
      express.static(path.join(__dirname + "/../assets").normalize())
    );
    // Service worker must be served at project root to intercept all fetches
    app.use(
      "/service-worker",
      express.static(
        path.join(__dirname + "/../src/workers/service-worker.js").normalize()
      )
    );
    // Robots.txt is served from the root by convention
    app.use(
      "/robots.txt",
      express.static(path.join(__dirname + "/../robots.txt").normalize())
    );
    app.use(
      "/server/manifest",
      express.static(path.join(__dirname + "/../manifest.json").normalize())
    );
    app.use(
      "/server/simulation-worker",
      express.static(
        path
          .join(__dirname + "/../src/workers/simulation-worker.js")
          .normalize()
      )
    );
    app.use(
      bodyParser.json({
        limit: "3mb",
        type: ["json", "application/json", "application/csp-report"]
      })
    );
    app.use(
      passportSession({
        store: this.cacheCalls.getSessionStore(),
        secret:
          config.session && config.session.secretkey
            ? config.session.secretkey
            : crypto.randomBytes(20).toString("hex"),
        resave: false,
        saveUninitialized: false,
        name: "softball.sid",
        cookie: {
          httpOnly: true,
          expires: new Date(253402300000000),
          sameSite: "lax"
          // Secure header is set by nginx reverse proxy
        }
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());

    // Routes

    app.get(
      "/server/state",
      wrapForErrorProcessing(async (req, res) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }
        let accountId = extractSessionInfo(req, "accountId");
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
      "/server/state-pretty",
      wrapForErrorProcessing(async (req, res) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }
        let accountId = extractSessionInfo(req, "accountId");
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

    app.post(
      "/server/account/login",
      wrapForErrorProcessing((req, res, next) => {
        passport.authenticate("local", function(err, accountInfo, info) {
          if (err || !accountInfo) {
            logger.log(null, "Authentication Failed", accountInfo, err, info);
            res.status(400).send();
            return;
          }
          req.logIn(accountInfo, function() {
            logger.log(accountInfo.account_id, "Login Successful!");
            res.status(204).send();
          });
        })(req, res, next);
      })
    );

    app.post(
      "/server/account/logout",
      wrapForErrorProcessing((req, res, next) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }
        let accountId = extractSessionInfo(req, "accountId");
        logger.log(accountId, "Logging out");
        req.logout();
        res.status(204).send();
      })
    );

    app.post(
      "/server/account/signup",
      wrapForErrorProcessing(async (req, res, next) => {
        checkRequiredField(req.body.email, "email");
        checkFieldLength(req.body.email, 320);

        checkRequiredField(req.body.password, "password");
        checkFieldLength(req.body.password, 320);

        checkRequiredField(req.body.reCAPCHA, "reCAPCHA");

        if (config && config.recapcha && config.recapcha.secretkey) {
          let body = {
            secret: config.recapcha.secretkey,
            response: req.body.reCAPCHA,
            remoteip: req.connection.remoteAddress
          };
          try {
            const recapchaResponse = await got.post(
              `https://www.google.com/recaptcha/api/siteverify?secret=${
                config.recapcha.secretkey
              }&response=${req.body.reCAPCHA}`
            );
            let recapchaResponseBody = JSON.parse(recapchaResponse.body);
            if (!recapchaResponseBody.success) {
              throw new HandledError(
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
                500,
                "Failed to get recapcha approval from Google",
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

        logger.log(
          account.account_id,
          "Authenticating after successful signup"
        );
        logIn(account, req, res);

        res.status(204).send();
      })
    );

    app.post(
      "/server/account/reset-password-request",
      wrapForErrorProcessing(async (req, res, next) => {
        checkRequiredField(req.body.email, "email");
        let account = await this.databaseCalls.getAccountFromEmail(
          req.body.email
        );
        logger.log(null, "Reset password request for", req.body.email);
        if (account) {
          let token = await generateToken();
          let tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("base64");

          // TODO: send passwowrd reset email
          logger.log(null, "Would have sent email", token, req.body.email);

          await this.databaseCalls.setPasswordTokenHash(
            account.account_id,
            tokenHash
          );
          res.status(204).send();
        } else {
          logger.log("Password reset: No such email found", req.body.email);
          res.status(404).send();
        }
      })
    );

    app.post(
      "/server/account/reset-password",
      wrapForErrorProcessing(async (req, res, next) => {
        logger.log(null, "Password update recieved. Token", req.body.token);
        checkRequiredField(req.body.password, "password");
        checkFieldLength(req.body.password, 320);
        checkFieldLength(req.body.token, 320);
        let token = req.body.token;
        let tokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("base64");
        let account = await this.databaseCalls.getAccountFromTokenHash(
          tokenHash
        );
        if (account) {
          await this.databaseCalls.confirmEmail(account.account_id);

          let hashedPassword = await bcrypt.hash(req.body.password, 12);
          await this.databaseCalls.setPasswordHashAndExpireToken(
            account.account_id,
            hashedPassword
          );

          logger.log(null, "Password successfully reset", req.body.token);

          // If an attacker somehow guesses the reset token and resets the password, they still don't know the email.
          // So, we wont log the password resetter in automatically. We can change this if we think it really affects
          // usability but I think it's okay. If users are resetting their passwords they are probably aready engaged.
          // logIn(account, req, res);
          res.status(204).send();
        } else {
          logger.log(
            null,
            "Could not find account from reset token",
            req.body.token
          );
          res.status(404).send();
        }
      })
    );

    app.delete(
      "/server/account",
      wrapForErrorProcessing(async (req, res, next) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }

        let accountId = extractSessionInfo(req, "accountId");
        logger.log(accountId, `Deleting account`);

        await lockAccount(accountId);
        try {
          // First delete all the data
          let state = await this.databaseCalls.getState(accountId);
          let deletePatch = objectMerge.diff(state, { teams: [], players: [] });
          await this.databaseCalls.patchState(deletePatch, accountId);

          // Then delete the account
          await this.databaseCalls.deleteAccount(accountId);

          // TODO: Invalidate session somehow?
          logger.log(accountId, "Account successfully deleted");

          res.status(204).send();
        } catch (error) {
          logger.log(accountId, "An error occured while deleting the account");
          throw error;
        } finally {
          await unlockAccount(accountId);
        }
      })
    );

    /*
			req: {
				md5: db8a5d3c57a8e5f7aa7b
				patch: {...}
				type: {full|any}
			}

			res: {
				md5: db8a5d3c57a8e5f7aa7b
				patchs: []
					-- OR --
				base: {...}
			}
		*/
    app.post(
      "/server/sync",
      wrapForErrorProcessing(async (req, res) => {
        if (!req.isAuthenticated()) {
          res.status(403).send();
          return;
        }

        let accountId = extractSessionInfo(req, "accountId");
        let stateRecentPatches =
          (await this.cacheCalls.getPatches(accountId)) || [];
        let state = undefined;
        //console.log("State patches", stateRecentPatches);

        // We need this information to know what state the client is in
        let data = req.body;
        logger.log(
          accountId,
          "Sync request received by server ",
          JSON.stringify(data, null, 2)
        );
        if (!data["md5"]) {
          throw new HandledError(400, "Missing required field", data);
        }

        // Prevent race conditions across requests
        await lockAccount(accountId);

        // For testing locks
        // await sleep(10000);

        let responseData = {};

        try {
          // Check if the client sent updates to the server
          if (data.patch && Object.keys(data.patch).length !== 0) {
            logger.log(
              accountId,
              "client has updates",
              JSON.stringify(data.patch, null, 2)
            );

            state = state || (await this.databaseCalls.getState(accountId));
            let stateCopy = JSON.parse(JSON.stringify(state)); // Deep copy

            // Apply the patch that was supplied by the client, passing true allows us to ignore any changes that were applied to deleted entries or additions of things that already exist
            objectMerge.patch(state, data.patch, true);

            // Now we'll diff the patched version against our original copied version, this gives us a patch without any edits to deleted entries or additions of things that already exist
            let cleanPatch = objectMerge.diff(stateCopy, state);
            //logger.log(accountId, "cleanPatch", JSON.stringify(cleanPatch, null, 2));

            // We can pass the clean patch to the database to persist
            await this.databaseCalls.patchState(cleanPatch, accountId);
            state = await this.databaseCalls.getState(accountId);
            // Useful for debuging
            /*logger.log(
              accountId,
              "updatedState",
              JSON.stringify(state, null, 2),
              getMd5(state)
            );
            */

            // Now we can derive the patch for this update (with the correct server ids) as well as the checksum of the most recent state and timestamp
            let syncPatch = objectMerge.diff(stateCopy, state);
            let checksum = getMd5(state);

            // Update the checksum on the response object and the session
            responseData.md5 = checksum;
            await this.cacheCalls.setStateMd5(accountId, checksum);

            // Save the patch for this sync to the session (to speed up future syncs).
            let savedPatch = {};
            savedPatch.patch = syncPatch;
            savedPatch.md5 = checksum;
            stateRecentPatches.push(savedPatch);
            //console.log("Setting patches", stateRecentPatches);
            await this.cacheCalls.setPatches(accountId, stateRecentPatches);
          } else {
            logger.log(accountId, "No updates from client");
          }

          // Get info about the checksum of the current state from account info
          let stateMd5 = await this.cacheCalls.getStateMd5(accountId);

          // Calculate the checksum current state if it's not stored in session storage
          if (!stateMd5) {
            logger.log(
              accountId,
              "No state hash stored in the session, getting state info"
            );
            state = state || (await this.databaseCalls.getState(accountId));
            let checksum = getMd5(state);

            await this.cacheCalls.setStateMd5(accountId, checksum);
            stateMd5 = checksum;
          }

          // Check if the server has updates for the client.
          if (data.md5 !== stateMd5) {
            logger.log(
              accountId,
              "Server has updates. CLIENT: ",
              data.md5,
              " SERVER: ",
              stateMd5
            );
            // If we have a record of the patches we need to update the client, send those instead of the entire state
            let foundMatch = false;
            let patches = stateRecentPatches.filter(v => {
              if (v.md5 === data.md5) {
                foundMatch = true;
              }
              return foundMatch && v.md5 !== data.md5; // We want all patches after the matching md5
            });

            if (patches.length > 0 && data.type !== "full") {
              // Yay, we have patches saved that will update the client to the current state, just send those.
              logger.log(accountId, "patches found, sending those instead"); //, stateRecentPatches);
              let patchesOnly = patches.map(v => v.patch);
              responseData.patches = patchesOnly;
            } else {
              // We don't have any patches saved in the session for this timestamp, or the client requested we send the whole state back.
              logger.log(accountId, "no patches found, sending whole state");
              responseData.base =
                state || (await this.databaseCalls.getState(accountId));
            }
            responseData.md5 = stateMd5;
          } else {
            logger.log(accountId, "No updates from server", data.md5, stateMd5);
          }
        } finally {
          // Unlock the account
          await unlockAccount(accountId);
        }

        // Woot, done
        if (responseData.base) {
          let testCs = getMd5(responseData.base);
        }
        res.status(200).send(responseData);

        // Delete values if we are storing too many patches (Not the most refined technique, but it's something)
        while (JSON.stringify(stateRecentPatches).length > 20000) {
          logger.log(
            accountId,
            "Erasing old patch data. New length: " +
              stateRecentPatches.length -
              1
          );
          stateRecentPatches.splice(-1, 1);
        }
      })
    );

    app.get("/server/current-account", function(req, res) {
      if (!req.isAuthenticated()) {
        res.status(403).send();
        return;
      }
      let responseData = {};
      responseData.email = extractSessionInfo(req, "email");
      res.status(200).send(responseData);
    });

    // This route just accepts reports of Content Security Policy (CSP) violations
    // https://helmetjs.github.io/docs/csp/
    app.post("/server/report-violation", function(req, res) {
      let accountId = extractSessionInfo(req, "accountId");
      if (req.body) {
        logger.log(accountId, "CSP Violation: ", req.body);
      } else {
        logger.log(accountId, "CSP Violation: No data received!");
      }
      res.status(204).end();
    });

    // The root should retrun the whole app
    app.get(
      "/",
      wrapForErrorProcessing((req, res) => {
        res.sendFile(path.join(__dirname + "/../index.html").normalize());
      })
    );

    // Everything else loads the react app and is processed on the client side
    app.get(
      "*",
      wrapForErrorProcessing((req, res) => {
        logger.log(null, "unanticipated url", req.originalUrl);
        res.sendFile(path.join(__dirname + "/../index.html").normalize());
      })
    );

    // 404 on unrecognized routes
    app.use(function() {
      throw new HandledError(404, "Resource not found");
    });

    app.use(function(error, req, res, next) {
      let accountId = extractSessionInfo(req, "accountId");

      res.setHeader("content-type", "application/json");
      if (error instanceof HandledError) {
        logger.log(accountId, "Sending Error", error.getExternalMessage());
        res
          .status(error.getStatusCode())
          .send({ message: [error.getExternalMessage()] });
        if (error.getInternalMessage()) {
          error.print();
        }
      } else {
        let errorId = Math.random()
          .toString(36)
          .substring(7);
        res
          .status(500)
          .send({ message: `Internal Server Error. Error id: ${errorId}.` });
        logger.log(accountId, `SERVER ERROR ${errorId} - ${accountId}`, {
          message: [error.message]
        });
        logger.log(accountId, `Error`, error);
      }
    });

    this.server = server.listen(this.PORT, function listening() {
      logger.log(null, "Softball App: Listening on", server.address().port);
    });

    // Helpers -- TODO use consistent declarations

    // Error handling, so we can catch errors that occur during async too
    function wrapForErrorProcessing(fn) {
      return async function(req, res, next) {
        try {
          await fn(req, res, next);
        } catch (error) {
          //console.log("An error was thrown!", error);
          next(error);
        }
      };
    }

    // An async sleep function
    async function sleep(ms) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(ms);
        }, ms);
      });
    }

    // Calculate the md5 checksum of the data and return the result as a base64 string
    function getMd5(data) {
      let checksum = hasher(data, {
        algorithm: "md5",
        excludeValues: false,
        respectFunctionProperties: false,
        respectFunctionNames: false,
        respectType: false,
        encoding: "base64"
      });
      return checksum.slice(0, -2); // Remove trailing '=='
    }

    async function generateToken(length = 30) {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(length, (err, buf) => {
          if (err) {
            reject(err);
          } else {
            // Make sure the token is url safe
            resolve(
              buf
                .toString("base64")
                .replace(/\//g, "_")
                .replace(/\+/g, "-")
            );
          }
        });
      });
    }

    function checkFieldLength(field, maxLength) {
      if (field && field.length > maxLength) {
        throw new HandledError(
          400,
          `Field ${field} exceeds the maximum length ${maxLength}`
        );
      }
    }

    function checkRequiredField(field, fieldName) {
      if (!field || field.trim().length === 0) {
        throw new HandledError(
          400,
          `Field ${fieldName} is required but was not specified`
        );
      }
    }

    async function logIn(account, req, res) {
      logger.log(account.account_id, "Loggin in", account);
      let sessionInfo = {
        accountId: account.account_id,
        email: account.email
      };
      try {
        await new Promise(function(resolve, reject) {
          req.logIn(account, function() {
            // We need to serialize some info to the session
            let sessionInfo = {
              accountId: account.account_id,
              email: account.email
            };
            var doneWrapper = function(req) {
              var done = function(err, user) {
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
            resolve();
          });
        });
        logger.log(account.account_id, "Login Successful -- backdoor!");
        let accountId = extractSessionInfo(req, "accountId");
        logger.log(account.account_id, `Data ${accountId}`);
      } catch (e) {
        logger.log(account.account_id, "ERROR", e);
        res.status(500).send();
      }
    }

    const extractSessionInfo = function(req, field) {
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
    // Depending on the server configuration, locking info is may be stored in a cache to allow multiple app servers to access and update the same locks.
    const lockAccount = async function(accountId) {
      let success = false;
      let counter = 0;
      do {
        success = await self.cacheCalls.lockAccount(accountId);

        if (!success) {
          logger.log(accountId, "Account already locked, retrying in 200ms");
          await sleep(200); // TODO: Do we need a random backoff?
          counter++;
        }

        if (counter > 100) {
          throw new HandledError(
            503,
            "Another request is consuming system resources allocated for this account. Please try agin in a few minutes."
          );
        }
      } while (!success);
      logger.log(accountId, "Account Locked");
    };

    const unlockAccount = async function(accountId) {
      await self.cacheCalls.unlockAccount(accountId);
      logger.log(accountId, "Account Unlocked");
    };
  }

  stop() {
    logger.log(null, "Closing App");
    this.server.close();
  }
};

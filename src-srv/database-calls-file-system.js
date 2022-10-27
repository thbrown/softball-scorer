const { v4: uuidv4 } = require('uuid');

const HandledError = require('./handled-error.js');
const logger = require('./logger.js');
const SharedLib = require('../shared-lib').default;

const Ajv = require('ajv/dist/2020');

const fs = require('fs');
const path = require('path');

let databaseCalls = class DatabaseCalls {
  constructor(rootDirectory) {
    // Make the root directory (if it doesn't exist)
    if (!fs.existsSync(rootDirectory)) {
      fs.mkdirSync(rootDirectory);
    }
    // Make data directory (if it doesn't exist)
    this.dataDir = path.join(rootDirectory, 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir);
    }
    // Make email-lookup directory (if it doesn't exist)
    this.emailLookupDir = path.join(rootDirectory, 'email-lookup');
    if (!fs.existsSync(this.emailLookupDir)) {
      fs.mkdirSync(this.emailLookupDir);
    }
    // Make token-lookup directory (if it doesn't exist)
    this.tokenLookupDir = path.join(rootDirectory, 'token-lookup');
    if (!fs.existsSync(this.tokenLookupDir)) {
      fs.mkdirSync(this.tokenLookupDir);
    }
    // Make public-id-lookup directory (if it doesn't exist)
    this.publicIdLookupDir = path.join(rootDirectory, 'public-id-lookup');
    if (!fs.existsSync(this.publicIdLookupDir)) {
      fs.mkdirSync(this.publicIdLookupDir);
    }

    const ajv = new Ajv();
    this.validateSchema = ajv.compile(SharedLib.schema);
  }

  async signup(email, passwordHash, passwordTokenHash) {
    let accountId = SharedLib.hexToBase62(uuidv4());
    const newAccount = {
      accountId: accountId,
      email: email,
      optimizers: [0],
      balance: 0,
      emailConfirmed: false,
      passwordHash: passwordHash,
      passwordTokenHash: passwordTokenHash,
      passwordTokenExpiration: Date.now() + 3600000,
    };
    const newData = {
      teams: [],
      players: [],
      optimizations: [],
      account: newAccount,
    };

    // TODO: verify that there are no existing accounts with same email address
    if (fs.existsSync(path.join(this.emailLookupDir, email))) {
      throw new HandledError('N/A', 400, 'Account already exists'); // TODO consider just sending an email to the user instead
    }

    fs.writeFileSync(
      path.join(this.dataDir, accountId),
      JSON.stringify(newData)
    );
    fs.writeFileSync(
      path.join(this.tokenLookupDir, passwordTokenHash),
      JSON.stringify({ accountId })
    );

    // Do this last so we can retry signup on failure. If this succeeds duplicate signups will be blocked.
    fs.writeFileSync(
      path.join(this.emailLookupDir, email),
      JSON.stringify({ accountId })
    );

    logger.log(accountId, 'Account signup completed');
    return newAccount;
  }

  async getAccountFromEmail(email) {
    let emailLookupJSONString = fs.readFileSync(
      path.join(this.emailLookupDir, email)
    );
    return this.getAccountById(JSON.parse(emailLookupJSONString).accountId);
  }

  async getAccountById(accountId) {
    let accountDataJSONString = fs.readFileSync(
      path.join(this.dataDir, accountId)
    );
    return JSON.parse(accountDataJSONString).account;
  }

  // Returns undefined if data does not exist
  async getAccountAndTeamByTeamPublicId(publicId) {
    try {
      let publicIdLookupJSONString = fs.readFileSync(
        path.join(this.publicIdLookupDir, accountId)
      );
      return JSON.parse(publicIdLookupJSONString).account;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  getState(accountId) {
    let accountDataJSONString = fs.readFileSync(
      path.join(this.dataDir, accountId)
    );
    return JSON.parse(accountDataJSONString);
  }

  setState(accountId, value) {
    let accountDataJSONString = fs.readFileSync(
      path.join(this.dataDir, accountId)
    );
    return JSON.parse(accountDataJSONString);
  }

  // returns nothing
  async patchState(patch, accountId) {
    let currentState = this.getState(accountId);
    let newState = SharedLib.objectMerge.patch(currentState, patch);
    this.validateSchema(newState);
    fs.writeFileSync(
      path.join(this.dataDir, accountId),
      JSON.stringify(newState, null, 2)
    );
  }

  async getAccountFromTokenHash(passwordTokenHash) {
    let tokenLookupJSONString = fs.readFileSync(
      path.join(this.tokenLookupDir, passwordTokenHash)
    );
    let data = this.getState(JSON.parse(tokenLookupJSONString).accountId);
    return data.account;
  }

  async confirmEmail(accountId) {
    let state = this.getState(accountId);
    state.account.emailConfirmed = true;
    fs.writeFileSync(
      path.join(this.dataDir, accountId),
      JSON.stringify(state, null, 2)
    );
  }

  async setPasswordHashAndExpireToken(accountId, newPasswordHash) {
    let state = this.getState(accountId);
    let account = state.account;
    account.passwordHash = newPasswordHash;
    account.passwordTokenExpiration = Date.now();
    fs.writeFileSync(
      path.join(this.dataDir, accountId),
      JSON.stringify(state, null, 2)
    );
  }

  async setPasswordTokenHash(accountId, tokenHash) {
    let state = this.getState(accountId);

    let account = state.account;
    let oldTokenDir = path.join(this.tokenLookupDir, account.passwordTokenHash);
    account.passwordTokenHash = tokenHash;
    account.passwordTokenExpiration = Date.now() + 3600000;

    fs.writeFileSync(
      path.join(this.dataDir, accountId),
      JSON.stringify(state, null, 2)
    );
    fs.writeFileSync(
      path.join(this.tokenLookupDir, tokenHash),
      JSON.stringify({ accountId })
    );
    fs.unlinkSync(oldTokenDir);
  }

  async deleteAccount(accountId) {
    let data = this.getState(accountId);

    let emailLookupDir = path.join(this.emailLookupDir, data.email);
    fs.unlinkSync(emailLookupDir);

    let tokenLookupDir = path.join(this.tokenLookupDir, data.tokenHash);
    fs.unlinkSync(tokenLookupDir);

    for (let team of data.teams) {
      let publicIdLookupDir = path.join(this.publicIdLookupDir, team.publicId);
      fs.unlinkSync(publicIdLookupDir);
    }

    // Delete this last so we can retry delete if it fails
    let dataDir = path.join(this.dataDir, accountId);
    fs.unlinkSync(dataDir);
  }

  async getNumberOfOptimizationsInProgress(accountId) {
    throw new HandledError(accountId, 500, 'NOT YET IMPLEMENTED');
  }

  async setOptimizationStatus(
    accountId,
    optimizationId,
    newStatus,
    optionalMessage,
    optionalPreviousStatus
  ) {
    logger.log(
      accountId,
      'setting optimization status',
      newStatus,
      optionalMessage,
      optionalPreviousStatus
    );

    let message = optionalMessage ? optionalMessage : null;
    let state = this.getState(accountId);
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        if (optionalPreviousStatus === undefined) {
          state.optimizations[i].status = newStatus;
          state.optimizations[i].statusMessage = message;
          fs.writeFileSync(
            path.join(this.dataDir, accountId),
            JSON.stringify(state, null, 2)
          );
          return true;
        } else if (state.optimizations[i].status === optionalPreviousStatus) {
          state.optimizations[i].status = newStatus;
          state.optimizations[i].statusMessage = message;
          fs.writeFileSync(
            path.join(this.dataDir, accountId),
            JSON.stringify(state, null, 2)
          );
          return true;
        }
        return false;
      }
    }
    throw new Error(
      'Optimization not found 5 ' +
        optimizationId +
        ' ' +
        JSON.stringify(state.optimizations, null, 2)
    );
  }

  async setOptimizationResultData(accountId, optimizationId, newResults) {
    logger.log(accountId, 'setting optimization result data', newResults);
    let state = this.getState(accountId);
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        // Postgres converts to stringified data on read, there is no such logic for static, so we'll just store it as a stringified object.
        // No need to stringify execution data because that stays on the server side.
        state.optimizations[i].resultData = newResults;
        fs.writeFileSync(
          path.join(this.dataDir, accountId),
          JSON.stringify(state, null, 2)
        );
        return;
      }
    }
    throw new Error(
      'Optimization not found 4 ' +
        optimizationId +
        ' ' +
        JSON.stringify(state.optimizations, null, 2)
    );
  }

  async getOptimizationStatus(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization status');
    let state = this.getState(accountId);
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].status;
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationStatus');
  }

  async getOptimizationResultData(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization result data');
    let state = this.getState(accountId);
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].resultData;
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationResultData');
  }

  async getOptimizationDetails(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization result data');
    let state = this.getState(accountId);
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i];
      }
    }
    logger.warn(
      accountId,
      `no optimization found - getOptimizationDetails ${optimizationId}`
    );
  }

  disconnect() {
    logger.log(null, 'disconnecting from file system db (NO-OP)');
  }
};

module.exports = databaseCalls;

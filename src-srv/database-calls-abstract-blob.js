const HandledError = require('./handled-error.js');
const logger = require('./logger.js');
const SharedLib = require('../shared-lib').default;
const { BlobLocation } = require('./database-calls-abstract-blob-types');
const PatchManager = require('./patch-manager');

/**
 * Abstract class that allows code sharing between database implementations that store things as a blob of data.
 *
 * Implementations need only defined setup in the constructor, exists, deleteBlob, writeBlob, and readBlob.
 */
let databaseCalls = class DatabaseCallsAbstractBlob {
  constructor() {
    if (this.constructor == DatabaseCallsAbstractBlob) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  async writeBlob(accountId, location, blobName, content, generation) {
    throw new Error('writeBlob must be overridden by implementation');
  }

  async readBlob(accountId, location, blobName) {
    throw new Error('readBlob must be overridden by implementation');
  }

  async deleteBlob(accountId, location, blobName) {
    throw new Error('deleteBlob must be overridden by implementation');
  }

  async exists(accountId, location, blobName) {
    throw new Error('exists must be overridden by implementation');
  }

  async signup(email, passwordHash, passwordTokenHash) {
    let accountId = await SharedLib.idUtils.random64BitId();
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
      metadata: {
        version: SharedLib.schemaMigration.CURRENT_VERSION,
        scope: 'full',
      },
    };
    // Verify that there are no existing accounts with same email address
    if (await this.exists(accountId, BlobLocation.EMAIL_LOOKUP, email)) {
      throw new HandledError('N/A', 400, 'Account already exists'); // TODO consider just sending an email to the user instead
    }
    await this.writeBlob(accountId, BlobLocation.DATA, accountId, newData);
    await this.writeBlob(
      accountId,
      BlobLocation.TOKEN_LOOKUP,
      passwordTokenHash,
      {
        accountId,
      }
    );
    // Do this last so we can retry signup on failure. If this succeeds, duplicate signups will be blocked.
    await this.writeBlob(accountId, BlobLocation.EMAIL_LOOKUP, email, {
      accountId,
    });
    logger.log(accountId, 'Account signup completed');
    return newAccount;
  }

  async getAccountFromEmail(email) {
    let emailLookupBlob = await this.readBlob(
      accountId,
      BlobLocation.EMAIL_LOOKUP,
      email
    );
    return await this.getAccountById(emailLookupBlob.content.accountId);
  }

  async getAccountById(accountId) {
    let dataBlob = await this.readBlob(accountId, BlobLocation.DATA, accountId);
    return dataBlob.content.account;
  }
  // Returns undefined if data does not exist
  async getAccountAndTeamIdsByTeamPublicId(publicId) {
    try {
      let publicIdLookupBlob = await this.readBlob(
        accountId,
        BlobLocation.PUBLIC_ID_LOOKUP,
        publicId
      );
      let ids = publicIdLookupBlob.content;
      return ids;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  // Get clientState (this excludes private account info)
  async getClientState(accountId) {
    let stateBlob = await this._getFullStateBlob(accountId);
    let content = stateBlob.content;
    return SharedLib.schemaValidation.convertDocumentToClient(content);
  }

  async _getFullStateBlob(accountId) {
    return await this.readBlob(accountId, BlobLocation.DATA, accountId);
  }

  async setState(accountId, value) {
    await this.writeBlob(accountId, BlobLocation.DATA, accountId, value);
  }

  async patchState(patch, accountId) {
    let patchManager = new PatchManager();
    patch = patchManager.securePatch(patch, accountId);

    let currentStateBlob = await this._getFullStateBlob(accountId);
    let newState = SharedLib.objectMerge.patch(currentStateBlob.content, patch);

    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      newState,
      currentStateBlob.generation
    );
  }

  async getAccountFromTokenHash(passwordTokenHash) {
    let tokenLookupJSONString = await this.readBlob(
      accountId,
      BlobLocation.TOKEN_LOOKUP,
      passwordTokenHash
    );
    let data = await this._getFullStateBlob(
      tokenLookupJSONString.content.accountId
    );
    return data.content.account;
  }

  async confirmEmail(accountId) {
    let stateBlob = await this._getFullStateBlob(accountId);
    stateBlob.content.account.emailConfirmed = true;
    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      stateBlob,
      stateBlob.generation
    );
  }

  async setPasswordHashAndExpireToken(accountId, newPasswordHash) {
    let stateBlob = await this._getFullStateBlob(accountId);
    let account = stateBlob.content.account;
    account.passwordHash = newPasswordHash;
    account.passwordTokenExpiration = Date.now();
    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      stateBlob.content,
      stateBlob.generation
    );
  }

  async setPasswordTokenHash(accountId, tokenHash) {
    let stateBlob = await this._getFullStateBlob(accountId);
    let account = stateBlob.content.account;
    let oldToken = account.passwordTokenHash;
    account.passwordTokenHash = tokenHash;
    account.passwordTokenExpiration = Date.now() + 3600000;
    await this.writeBlob(accountId, BlobLocation.TOKEN_LOOKUP, accountId, {
      accountId,
    });
    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      stateBlob.content,
      stateBlob.generation
    );
    await this.deleteBlob(accountId, BlobLocation.TOKEN_LOOKUP, oldToken);
  }

  async deleteAccount(accountId) {
    let dataBlob = await this._getFullStateBlob(accountId);
    await this.deleteBlob(
      accountId,
      BlobLocation.EMAIL_LOOKUP,
      dataBlob.content.email
    );
    await this.deleteBlob(
      accountId,
      BlobLocation.TOKEN_LOOKUP,
      dataBlob.content.tokenHash
    );
    for (let team of dataBlob.content.teams) {
      await this.deleteBlob(
        accountId,
        BlobLocation.PUBLIC_ID_LOOKUP,
        team.publicId
      );
    }
    // Delete this last so we can retry delete if it fails
    await this.deleteBlob(accountId, BlobLocation.DATA, accountId);
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
    let stateBlob = await this._getFullStateBlob(accountId);
    let state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        if (optionalPreviousStatus === undefined) {
          state.optimizations[i].status = newStatus;
          state.optimizations[i].statusMessage = message;
          await this.writeBlob(
            accountId,
            BlobLocation.DATA,
            accountId,
            state,
            stateBlob.generation
          );
          return true;
        } else if (state.optimizations[i].status === optionalPreviousStatus) {
          state.optimizations[i].status = newStatus;
          state.optimizations[i].statusMessage = message;
          await this.writeBlob(
            accountId,
            BlobLocation.DATA,
            accountId,
            state,
            stateBlob.generation
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
    let stateBlob = await this._getFullStateBlob(accountId);
    let state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        // Postgres converts to stringified data on read, there is no such logic for static, so we'll just store it as a stringified object.
        // No need to stringify execution data because that stays on the server side.
        state.optimizations[i].resultData = newResults;
        await this.writeBlob(
          accountId,
          BlobLocation.DATA,
          accountId,
          state,
          stateBlob.generation
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
    let stateBlob = await this._getFullStateBlob(accountId);
    let state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].status;
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationStatus');
  }

  async getOptimizationResultData(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization result data');
    let stateBlob = await this._getFullStateBlob(accountId);
    let state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].resultData;
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationResultData');
  }

  async getOptimizationDetails(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization result data');
    let stateBlob = await this._getFullStateBlob(accountId);
    let state = stateBlob.content;
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
    logger.log(null, 'disconnecting from blob storage database (NO-OP)');
  }
};
module.exports = databaseCalls;

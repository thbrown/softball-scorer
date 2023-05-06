const HandledError = require('./handled-error.js');
const logger = require('./logger.js');
const SharedLib = require('../shared-lib');
const TLSchemas = SharedLib.schemaValidation.default.TLSchemas;

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
    let accountId = await SharedLib.idUtils.randomNBitId();
    const newAccount = {
      accountId: accountId,
      email: email,
      optimizers: [0, 1, 2],
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
      null, // We don't know
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
        null, // We don't know
        BlobLocation.PUBLIC_ID_LOOKUP,
        publicId
      );
      let ids = publicIdLookupBlob.content;
      return ids;
    } catch (err) {
      if (err.code === 'ENOENT' || err.code == '404') {
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

  /**
   * Get the client state for a particular team, used for the public stats page.
   *
   * Result construction is deliberately additive, so we don't expose unnecessary information as we add new things.
   *
   * Also, we only want to return something here if publicIdEnabled is true
   */
  async getClientStateForTeam(accountId, teamId) {
    // This result might be worth caching
    // TODO: We are leaking schema details here, creating more places that may need to change if the schema changes
    // We may need a common way to get empty shells for each top-level schema we have
    let result = {
      account: {
        optimizers: [],
      }, // TODO: we don't need account info here. Perhaps this requires a different top-level schema?
      players: [],
      teams: [],
      optimizations: [],
    };
    let wholeClientState = await this.getClientState(accountId);

    // Copy metadata
    result.metadata = wholeClientState.metadata;

    // Copy target team
    let targetTeam = null;
    for (let team of wholeClientState.teams) {
      if (team.id === teamId) {
        targetTeam = team;
        break;
      }
    }
    result.teams.push(targetTeam);

    // Return undefined if publicIdEnabled is false
    if (targetTeam.publicIdEnabled === false) {
      return undefined;
    }

    // Copy over all players who have had at least one plate appearance for a game on this team
    let playerSet = new Set();
    for (let game of targetTeam.games) {
      for (let pa of game.plateAppearances) {
        playerSet.add(pa.playerId);
      }
    }
    for (let player of wholeClientState.players) {
      if (playerSet.has(player.id)) {
        result.players.push(player);
      }
    }

    // Validate and return
    SharedLib.schemaValidation.validateSchema(result, TLSchemas.CLIENT);
    return result;
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
    let newState = SharedLib.objectMerge.patch(
      currentStateBlob.content,
      patch,
      false,
      false,
      accountId,
      logger
    );

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
      null, // We don't know
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
      stateBlob.content,
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
    await this.writeBlob(accountId, BlobLocation.TOKEN_LOOKUP, tokenHash, {
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
      dataBlob.content.account.email
    );
    await this.deleteBlob(
      accountId,
      BlobLocation.TOKEN_LOOKUP,
      dataBlob.content.account.passwordTokenHash
    );
    for (let team of dataBlob.content.teams) {
      if (team.publicId) {
        await this.deleteBlob(
          accountId,
          BlobLocation.PUBLIC_ID_LOOKUP,
          team.publicId
        );
      }
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
    pause,
    allowedPreviousStatus
  ) {
    logger.log(
      accountId,
      'setting optimization status',
      newStatus,
      optionalMessage,
      `pause? ${pause}`
    );
    let message = optionalMessage ? optionalMessage : null;
    let stateBlob = await this._getFullStateBlob(accountId);
    let state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        // First confirm that the optimization is one of the allowed statuses
        let curStatus = state.optimizations[i].status;
        if (
          allowedPreviousStatus !== undefined &&
          !allowedPreviousStatus.has(curStatus)
        ) {
          logger.warn(
            accountId,
            `Invalid optimization status transition from ${curStatus} to ${newStatus} (pause - ${pause}). Allowed initial statuses are ${new Array(
              ...allowedPreviousStatus
            ).join(' ')}`
          );
          return false;
        }

        // Set status, if provided
        if (newStatus !== undefined && newStatus != null) {
          state.optimizations[i].status = newStatus;
          state.optimizations[i].statusMessage = message;
        }
        // Set pause, if provided
        if (pause === true || pause === false) {
          state.optimizations[i].pause = pause;
        }
        await this.writeBlob(
          accountId,
          BlobLocation.DATA,
          accountId,
          state,
          stateBlob.generation
        );
        return true;
      }
    }
    throw new Error('Optimization not found 5 ' + optimizationId);
  }

  async setOptimizationResultData(accountId, optimizationId, newResults) {
    logger.log(
      accountId,
      'setting optimization result data',
      newResults.length
    );
    if (!newResults) {
      return; // No-op
    }
    let stateBlob = await this._getFullStateBlob(accountId);
    let state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
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
    throw new Error('Optimization not found 4 ' + optimizationId + ' ');
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

  async togglePublicTeam(accountId, teamId, value) {
    logger.log(accountId, 'toggling public team', teamId, value);
    let stateBlob = await this._getFullStateBlob(accountId);
    let state = stateBlob.content;
    for (let i = 0; i < state.teams.length; i++) {
      let team = state.teams[i];
      if (team.id === teamId) {
        team.publicIdEnabled = value;
        // Generate an id if needed
        if (team.publicId === undefined) {
          logger.log(accountId, 'Generating team public id', teamId, value);
          let generatedPublicId = await SharedLib.idUtils.randomNBitId(128);
          await this.writeBlob(
            accountId,
            BlobLocation.PUBLIC_ID_LOOKUP,
            generatedPublicId,
            { accountId, teamId }
          );
          team.publicId = generatedPublicId;
        }
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
  }

  disconnect() {
    logger.log(null, 'disconnecting from blob storage database (NO-OP)');
  }
};
module.exports = databaseCalls;

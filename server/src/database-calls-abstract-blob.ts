import SharedLib from 'shared-lib';
const TLSchemas = SharedLib.schemaValidation.TLSchemas;
import HandledError from './handled-error';
import logger from './logger';
import BlobLocation from './database-calls-abstract-blob-types';
import PatchManager from './patch-manager';

/**
 * Abstract class that allows code sharing between database implementations that store things as a blob of data.
 *
 * Implementations need only defined setup in the constructor, exists, deleteBlob, writeBlob, and readBlob.
 */
export default class DatabaseCallsAbstractBlob {
  constructor() {
    if (this.constructor == DatabaseCallsAbstractBlob) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  init() {}

  async writeBlob(...args): Promise<any> {
    throw new Error('writeBlob must be overridden by implementation');
  }

  async readBlob(...args): Promise<any> {
    throw new Error('readBlob must be overridden by implementation');
  }

  async deleteBlob(...args): Promise<any> {
    throw new Error('deleteBlob must be overridden by implementation');
  }

  async exists(...args): Promise<boolean> {
    throw new Error('exists must be overridden by implementation');
  }

  async signup(email: string, passwordHash: string, passwordTokenHash: string) {
    const accountId = await SharedLib.idUtils.randomNBitId();
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
    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      newData,
      TLSchemas.FULL
    );
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
    const emailLookupBlob: any = await this.readBlob(
      null, // We don't know
      BlobLocation.EMAIL_LOOKUP,
      email
    );
    return await this.getAccountById(emailLookupBlob.content.accountId);
  }

  async getAccountById(accountId) {
    const dataBlob: any = await this.readBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      TLSchemas.FULL
    );
    return dataBlob.content.account;
  }

  // Returns undefined if data does not exist
  async getAccountAndTeamIdsByTeamPublicId(publicId) {
    try {
      const publicIdLookupBlob: any = await this.readBlob(
        null, // We don't know
        BlobLocation.PUBLIC_ID_LOOKUP,
        publicId
      );
      const ids = publicIdLookupBlob.content;
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
    const stateBlob: any = await this._getFullStateBlob(accountId);
    const content = stateBlob.content;
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
    const result = {
      account: {
        optimizers: [],
      }, // TODO: we don't need account info here. Perhaps this requires a different top-level schema?
      players: [] as any[],
      teams: [] as any[],
      optimizations: [] as any[],
      metadata: {},
    };
    const wholeClientState = await this.getClientState(accountId);

    // Copy metadata
    result.metadata = wholeClientState.metadata;

    // Copy target team
    let targetTeam: any = null;
    for (const team of wholeClientState.teams) {
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
    const playerSet = new Set();
    for (const game of targetTeam.games) {
      for (const pa of game.plateAppearances) {
        playerSet.add(pa.playerId);
      }
    }
    for (const player of wholeClientState.players) {
      if (playerSet.has(player.id)) {
        result.players.push(player);
      }
    }

    // Validate and return
    SharedLib.schemaValidation.validateSchema(result, TLSchemas.CLIENT);
    return result;
  }

  async _getFullStateBlob(accountId): Promise<any> {
    return await this.readBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      TLSchemas.FULL
    );
  }

  async setState(accountId, value) {
    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      value,
      TLSchemas.FULL
    );
  }

  async patchState(patch, accountId) {
    const patchManager = new PatchManager();
    patch = patchManager.securePatch(patch, accountId);

    const currentStateBlob: any = await this._getFullStateBlob(accountId);
    const newState = SharedLib.objectMerge.patch(
      currentStateBlob.content,
      patch,
      true,
      false,
      accountId,
      logger
    );

    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      newState,
      TLSchemas.FULL,
      currentStateBlob.generation
    );
  }

  async getAccountFromTokenHash(passwordTokenHash) {
    const tokenLookupJSONString: any = await this.readBlob(
      null, // We don't know
      BlobLocation.TOKEN_LOOKUP,
      passwordTokenHash
    );
    const data: any = await this._getFullStateBlob(
      tokenLookupJSONString.content.accountId
    );
    return data.content.account;
  }

  async confirmEmail(accountId) {
    const stateBlob: any = await this._getFullStateBlob(accountId);
    stateBlob.content.account.emailConfirmed = true;
    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      stateBlob.content,
      TLSchemas.FULL,
      stateBlob.generation
    );
  }

  async setPasswordHashAndExpireToken(
    accountId: string,
    newPasswordHash: string
  ) {
    const stateBlob = await this._getFullStateBlob(accountId);
    const account = stateBlob.content.account;
    account.passwordHash = newPasswordHash;
    account.passwordTokenExpiration = Date.now();
    await this.writeBlob(
      accountId,
      BlobLocation.DATA,
      accountId,
      stateBlob.content,
      TLSchemas.FULL,
      stateBlob.generation
    );
  }

  async setPasswordTokenHash(accountId: string, tokenHash: string) {
    const stateBlob = await this._getFullStateBlob(accountId);
    const account = stateBlob.content.account;
    const oldToken = account.passwordTokenHash;
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
      TLSchemas.FULL,
      stateBlob.generation
    );
    await this.deleteBlob(accountId, BlobLocation.TOKEN_LOOKUP, oldToken);
  }

  async deleteAccount(accountId) {
    const dataBlob = await this._getFullStateBlob(accountId);
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
    for (const team of dataBlob.content.teams) {
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

  async getNumberOfOptimizationsInProgress(accountId: string) {
    throw new HandledError(accountId, 500, 'NOT YET IMPLEMENTED');
  }

  async setOptimizationStatus(
    accountId: string,
    optimizationId: string,
    newStatus: number | null,
    optionalMessage?: string | null,
    pause?: boolean | null,
    allowedPreviousStatus?: Set<number | undefined>
  ) {
    logger.log(
      accountId,
      'setting optimization status',
      newStatus,
      optionalMessage,
      `pause? ${pause}`
    );
    const message = optionalMessage ? optionalMessage : null;
    const stateBlob = await this._getFullStateBlob(accountId);
    const state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        // First confirm that the optimization is one of the allowed statuses
        const curStatus = state.optimizations[i].status;
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
          TLSchemas.FULL,
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
    const stateBlob = await this._getFullStateBlob(accountId);
    const state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        state.optimizations[i].resultData = newResults;
        await this.writeBlob(
          accountId,
          BlobLocation.DATA,
          accountId,
          state,
          TLSchemas.FULL,
          stateBlob.generation
        );
        return;
      }
    }
    throw new Error('Optimization not found 4 ' + optimizationId + ' ');
  }

  async getOptimizationStatus(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization status');
    const stateBlob = await this._getFullStateBlob(accountId);
    const state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].status;
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationStatus');
  }

  async getOptimizationResultData(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization result data');
    const stateBlob = await this._getFullStateBlob(accountId);
    const state = stateBlob.content;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].resultData;
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationResultData');
  }

  async getOptimizationDetails(accountId, optimizationId) {
    logger.log(accountId, 'getting optimization result data');
    const stateBlob = await this._getFullStateBlob(accountId);
    const state = stateBlob.content;
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
    const stateBlob = await this._getFullStateBlob(accountId);
    const state = stateBlob.content;
    for (let i = 0; i < state.teams.length; i++) {
      const team = state.teams[i];
      if (team.id === teamId) {
        team.publicIdEnabled = value;
        // Generate an id if needed
        if (team.publicId === undefined) {
          logger.log(accountId, 'Generating team public id', teamId, value);
          const generatedPublicId = await SharedLib.idUtils.randomNBitId(128);
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
          TLSchemas.FULL,
          stateBlob.generation
        );
        return;
      }
    }
  }

  async disconnect() {
    logger.log('', 'disconnecting from blob storage database (NO-OP)');
  }
}

const HandledError = require('./handled-error.js');

const logger = require('./logger.js');
const SharedLib = require('../shared-lib');

let databaseCalls = class DatabaseCalls {
  constructor() {
    this.idCounter = 2;
    this.ACCOUNTS = [
      {
        accountId: 1,
        email: 'test@softball.app',
        passwordHash:
          '$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2', // pizza
        passwordTokenHash: 'abcdefg',
        passwordTokenExpiration: Date.now() + 3600000,
        verifiedEmail: true,
      },
    ];
    this.STATES = {
      1: {
        optimizations: [
          {
            id: '0R8p2xFmJSiDAZ',
            name: '6/18 optimization',
            customOptionsData: '{"innings":7,"iterations":10000}',
            overrideData: '{}',
            status: 0,
            resultData: null,
            statusMessage: null,
            sendEmail: true,
            teamList: '["4fKFOTF7Wn4WIa","4W78nKNVldoDZ4","4jouU8AOMIpbj"]',
            gameList: '[]',
            playerList:
              '["4ZqtZbpYtlxOVW","47guOwUQN5QLPc","4f4CQExEegoHbV","4SFlePddQQh8OY","4ePGkCgKNTSnH4","4yIOlHpfiREBfJ"]',
            lineupType: 1,
            optimizationType: '0',
            inputSummaryData: null,
          },
        ],
        players: [
          {
            id: '4f4CQExEegoHbV',
            name: 'Harry',
            gender: 'M',
            songLink: null,
            songStart: null,
          },
          {
            id: '4yIOlHpfiREBfJ',
            name: 'Ron',
            gender: 'M',
            songLink: null,
            songStart: null,
          },
          {
            id: '4SFlePddQQh8OY',
            name: 'Hermione',
            gender: 'F',
            songLink: null,
            songStart: null,
          },
          {
            id: '47guOwUQN5QLPc',
            name: 'Gina',
            gender: 'F',
            songLink: null,
            songStart: null,
          },
          {
            id: '4ZqtZbpYtlxOVW',
            name: 'Carlos',
            gender: 'M',
            songLink: null,
            songStart: null,
          },
          {
            id: '4ePGkCgKNTSnH4',
            name: 'Jewels',
            gender: 'F',
            songLink: null,
            songStart: null,
          },
        ],
        teams: [
          {
            id: '4jouU8AOMIpbj',
            name: 'Big Guns',
            games: [
              {
                id: '4HFlIjRu8XBV0I',
                opponent: 'Bad Guys',
                lineup: ['4f4CQExEegoHbV', '4yIOlHpfiREBfJ', '4SFlePddQQh8OY'],
                date: '2018-10-10',
                park: 'Stazio',
                scoreUs: 0,
                scoreThem: 0,
                lineupType: 2,
                plateAppearances: [
                  {
                    id: '4K7eqMusZ9flF',
                    playerId: '4f4CQExEegoHbV',
                  },
                  {
                    id: '4kl5b2Aa59lkJw',
                    playerId: '4yIOlHpfiREBfJ',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                  },
                  {
                    id: '4tlFhCnQ79KTyV',
                    playerId: '4SFlePddQQh8OY',
                    result: '2B',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                  },
                  {
                    id: '4h2ZbOePr2inJ',
                    playerId: '4f4CQExEegoHbV',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: 'Out',
                  },
                  {
                    id: '4MkyWloxw2cMqL',
                    playerId: '4yIOlHpfiREBfJ',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: 'SAC',
                  },
                  {
                    id: '40fF3EKZVAqktS',
                    playerId: '4SFlePddQQh8OY',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: 'E',
                  },
                ],
              },
              {
                id: '4Ju8hnXrGUPtIk',
                opponent: 'Bad Guys 2',
                lineup: ['4f4CQExEegoHbV', '4yIOlHpfiREBfJ', '4SFlePddQQh8OY'],
                date: '2018-10-10',
                park: 'Stazio',
                scoreUs: 0,
                scoreThem: 0,
                lineupType: 2,
                plateAppearances: [
                  {
                    id: '4EhlxCjaM3VSUh',
                    playerId: '4f4CQExEegoHbV',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: 'Out',
                  },
                  {
                    id: '4GgpbT2BIAykck',
                    playerId: '4yIOlHpfiREBfJ',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: '2B',
                  },
                  {
                    id: '4HN7dirqjZvrXQ',
                    playerId: '4SFlePddQQh8OY',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: '1B',
                  },
                ],
              },
            ],
          },
          {
            id: '4W78nKNVldoDZ4',
            name: 'Just for fun',
            games: [],
          },
          {
            id: '4fKFOTF7Wn4WIa',
            name: 'Pizza Team',
            games: [
              {
                id: '4hHxL4AhHvS5El',
                opponent: 'Pizza Game',
                lineup: ['47guOwUQN5QLPc', '4ZqtZbpYtlxOVW', '4ePGkCgKNTSnH4'],
                date: '2018-10-10',
                park: 'Stazio',
                scoreUs: 0,
                scoreThem: 0,
                lineupType: 1,
                plateAppearances: [
                  {
                    id: '4FAKJaKkpvUGwv',
                    playerId: '47guOwUQN5QLPc',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: '1B',
                  },
                  {
                    id: '4yIffY8qsCpNr9',
                    playerId: '4ZqtZbpYtlxOVW',
                    location: {
                      x: 13141,
                      y: 22141,
                    },
                    result: '2B',
                  },
                  {
                    id: '4UvsHLN0x3MQIG',
                    playerId: '4ePGkCgKNTSnH4',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: '3B',
                  },
                  {
                    id: '4VNCsBleBuQJCy',
                    playerId: '47guOwUQN5QLPc',
                    location: {
                      x: 123,
                      y: 23515,
                    },
                    result: 'Out',
                  },
                  {
                    id: '4LBFbOLR3Ri7xC',
                    playerId: '4ZqtZbpYtlxOVW',
                    location: {
                      x: 12141,
                      y: 19141,
                    },
                    result: 'HRo',
                  },
                  {
                    id: '4ncOGowVfcNET3',
                    playerId: '4ePGkCgKNTSnH4',
                    location: {
                      x: 22141,
                      y: 12141,
                    },
                    result: '1B',
                  },
                ],
              },
              {
                id: '4M6UuAFJsfQukP',
                opponent: 'Another Game',
                lineup: [],
                date: '2018-10-10',
                park: 'Stazio',
                scoreUs: 0,
                scoreThem: 0,
                lineupType: 2,
                plateAppearances: [],
              },
            ],
          },
        ],
      },
    };
  }

  async getAccountFromEmail(email) {
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].email === email) {
        return this.ACCOUNTS[i];
      }
    }
    return undefined;
  }

  async getAccountById(id) {
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].accountId === id) {
        return this.ACCOUNTS[i];
      }
    }
    return undefined;
  }

  async getAccountAndTeamIdsByTeamPublicId(publicId) {
    //TODO implement this for testing purposes
    return undefined;
  }

  getState(accountId) {
    // Return a copy of the state
    return JSON.parse(JSON.stringify(this.STATES[accountId]));
  }

  async patchState(patch, accountId) {
    if (accountId === undefined) {
      throw new HandledError(accountId, 403, 'Please sign in first');
    }
    logger.log('Attempting to merge', this.STATES[accountId], patch);
    this.STATES[accountId] = SharedLib.objectMerge.patch(
      this.STATES[accountId],
      patch
    );
  }

  async signup(email, passwordHash, passwordTokenHash) {
    this.STATES[this.idCounter] = { teams: [], players: [], optimizations: [] };
    let newAccount = {
      accountId: this.idCounter,
      email: email,
      passwordHash: passwordHash,
      passwordTokenHash: passwordTokenHash,
      passwordTokenExpiration: Date.now() + 3600000,
      optimizers: '"[0}"',
      balance: 0,
    };
    this.ACCOUNTS.push(newAccount);
    this.idCounter++;
    logger.log(null, 'Account added', JSON.stringify(this.ACCOUNTS, null, 2));
    return JSON.parse(JSON.stringify(newAccount));
  }

  async getAccountFromTokenHash(passwordTokenHash) {
    logger.log(
      null,
      'Seraching for',
      passwordTokenHash.trim(),
      JSON.stringify(this.ACCOUNTS, null, 2)
    );
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].passwordTokenHash === passwordTokenHash) {
        if (this.ACCOUNTS[i].passwordTokenExpiration > Date.now()) {
          // TODO: 1000 above should be current time in millis
          return this.ACCOUNTS[i];
        } else {
          return undefined;
        }
      }
    }
    return undefined;
  }

  async confirmEmail(accountId) {
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].accountId === accountId) {
        this.ACCOUNTS[i].emailConfirmed = true;
      }
    }
    return undefined;
  }

  async setPasswordHashAndExpireToken(accountId, newPasswordHash) {
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].accountId === accountId) {
        this.ACCOUNTS[i].passwordTokenHash = newPasswordHash;
        this.ACCOUNTS[i].passwordTokenExpiration = 0;
      }
    }
    return undefined;
  }

  async setPasswordTokenHash(accountId, tokenHash) {
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].accountId === accountId) {
        this.ACCOUNTS[i].passwordTokenHash = tokenHash;
        this.ACCOUNTS[i].passwordTokenExpiration = Date.now() + 3600000;
      }
    }
    return undefined;
  }

  async deleteAccount(accountId) {
    logger.log(accountId, 'deleting');
    let indexToRemove = undefined;
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].accountId === accountId) {
        indexToRemove = i;
        break;
      }
    }
    this.ACCOUNTS.splice(indexToRemove, 1);
  }

  async getNumberOfOptimizationsInProgress(accountId) {
    logger.log(accountId, 'getting optimization in progress count');
    let state = this.STATES[accountId];
    let count = 0;
    for (let i = 0; i < state.optimizations.length; i++) {
      if (
        state.optimizations[i].status == 1 ||
        state.optimizations[i].status == 2 ||
        state.optimizations[i].status == 6 ||
        state.optimizations[i].status == 7
      ) {
        count++;
      }
    }
    return count;
  }

  async setOptimizationStatus(
    accountId,
    optimizationId,
    newStatus,
    optionalMessage,
    optionalPreviousStatus
  ) {
    optimizationId = SharedLib.idUtils.serverIdToClientId(optimizationId);
    logger.log(
      accountId,
      'setting optimization status',
      newStatus,
      optionalMessage,
      optionalPreviousStatus
    );
    let message = optionalMessage ? optionalMessage : null;

    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        if (optionalPreviousStatus === undefined) {
          state.optimizations[i].status = newStatus;
          state.optimizations[i].statusMessage = message;
          return true;
        } else if (state.optimizations[i].status === optionalPreviousStatus) {
          state.optimizations[i].status = newStatus;
          state.optimizations[i].statusMessage = message;
          return true;
        }
        return false;
      }
    }
    throw new Error(
      'Optimization not found 5 ' +
        optimizationId +
        ' ' +
        JSON.stringify(state.optimizations)
    );
  }

  async setOptimizationResultData(accountId, optimizationId, newResults) {
    optimizationId = SharedLib.idUtils.serverIdToClientId(optimizationId);
    logger.log(accountId, 'setting optimization result data', newResults);
    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        // Postgres converts to stringified data on read, there is no such logic for static, so we'll just store it as a stringified object.
        // No need to stringify execution data because that stays on the server side.
        state.optimizations[i].resultData = JSON.stringify(newResults);
        return;
      }
    }
    throw new Error(
      'Optimization not found 4 ' +
        optimizationId +
        ' ' +
        JSON.stringify(state.optimizations)
    );
  }

  async getOptimizationStatus(accountId, optimizationId) {
    optimizationId = SharedLib.idUtils.serverIdToClientId(optimizationId);
    logger.log(accountId, 'getting optimization status');
    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].status;
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationStatus');
    return undefined;
  }

  async getOptimizationResultData(accountId, optimizationId) {
    optimizationId = SharedLib.idUtils.serverIdToClientId(optimizationId);
    logger.log(accountId, 'getting optimization result data');
    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].resultData;
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationResultData');
    return undefined;
  }

  async getOptimizationDetails(accountId, optimizationId) {
    optimizationId = SharedLib.idUtils.serverIdToClientId(optimizationId);
    logger.log(accountId, 'getting optimization result data');
    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i];
      }
    }
    logger.warn(accountId, 'no optimization found - getOptimizationDetails');
    return undefined;
  }

  async getOptimizationExecutionData(accountId, optimizationId) {
    optimizationId = SharedLib.idUtils.serverIdToClientId(optimizationId);

    logger.log(
      accountId,
      'getting optimization execution data',
      optimizationId
    );
    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].executionData;
      }
    }
    logger.warn(
      accountId,
      'no optimization found - getOptimizationExecutionData'
    );
    return undefined;
  }

  disconnect() {
    logger.log(null, 'disconnecting from static db (NO-OP)');
  }
};

// Node only
module.exports = databaseCalls;

const objectMerge = require('../object-merge.js');
const HandledError = require('./handled-error.js');

const idUtils = require('../id-utils.js');
const logger = require('./logger.js');

let databaseCalls = class DatabaseCalls {
  constructor() {
    this.idCounter = 2;
    this.ACCOUNTS = [
      {
        account_id: 1,
        email: 'test@softball.app',
        password_hash:
          '$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2', // pizza
        password_token_hash: 'abcdefg',
        password_token_expiration: Date.now() + 3600000,
        verifiedEmail: true,
      },
    ];
    this.STATES = {
      1: {
        optimizations: [
          {
            id: '0R8p2xFmJSiDAZ',
            name: '6/18 optimization',
            type: 0,
            customData: '{"innings":7,"iterations":10000}',
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
            executionData: null,
          },
        ],
        players: [
          {
            id: '4f4CQExEegoHbV',
            name: 'Harry',
            gender: 'M',
            song_link: null,
            song_start: null,
          },
          {
            id: '4yIOlHpfiREBfJ',
            name: 'Ron',
            gender: 'M',
            song_link: null,
            song_start: null,
          },
          {
            id: '4SFlePddQQh8OY',
            name: 'Hermione',
            gender: 'F',
            song_link: null,
            song_start: null,
          },
          {
            id: '47guOwUQN5QLPc',
            name: 'Gina',
            gender: 'F',
            song_link: null,
            song_start: null,
          },
          {
            id: '4ZqtZbpYtlxOVW',
            name: 'Carlos',
            gender: 'M',
            song_link: null,
            song_start: null,
          },
          {
            id: '4ePGkCgKNTSnH4',
            name: 'Jewels',
            gender: 'F',
            song_link: null,
            song_start: null,
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
                    player_id: '4f4CQExEegoHbV',
                  },
                  {
                    id: '4kl5b2Aa59lkJw',
                    player_id: '4yIOlHpfiREBfJ',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                  },
                  {
                    id: '4tlFhCnQ79KTyV',
                    player_id: '4SFlePddQQh8OY',
                    result: '2B',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                  },
                  {
                    id: '4h2ZbOePr2inJ',
                    player_id: '4f4CQExEegoHbV',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: 'Out',
                  },
                  {
                    id: '4MkyWloxw2cMqL',
                    player_id: '4yIOlHpfiREBfJ',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: 'SAC',
                  },
                  {
                    id: '40fF3EKZVAqktS',
                    player_id: '4SFlePddQQh8OY',
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
                    player_id: '4f4CQExEegoHbV',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: 'Out',
                  },
                  {
                    id: '4GgpbT2BIAykck',
                    player_id: '4yIOlHpfiREBfJ',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: '2B',
                  },
                  {
                    id: '4HN7dirqjZvrXQ',
                    player_id: '4SFlePddQQh8OY',
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
                    player_id: '47guOwUQN5QLPc',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: '1B',
                  },
                  {
                    id: '4yIffY8qsCpNr9',
                    player_id: '4ZqtZbpYtlxOVW',
                    location: {
                      x: 13141,
                      y: 22141,
                    },
                    result: '2B',
                  },
                  {
                    id: '4UvsHLN0x3MQIG',
                    player_id: '4ePGkCgKNTSnH4',
                    location: {
                      x: 12141,
                      y: 12141,
                    },
                    result: '3B',
                  },
                  {
                    id: '4VNCsBleBuQJCy',
                    player_id: '47guOwUQN5QLPc',
                    location: {
                      x: 123,
                      y: 23515,
                    },
                    result: 'Out',
                  },
                  {
                    id: '4LBFbOLR3Ri7xC',
                    player_id: '4ZqtZbpYtlxOVW',
                    location: {
                      x: 12141,
                      y: 19141,
                    },
                    result: 'HRo',
                  },
                  {
                    id: '4ncOGowVfcNET3',
                    player_id: '4ePGkCgKNTSnH4',
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
      if (this.ACCOUNTS[i].account_id === id) {
        return this.ACCOUNTS[i];
      }
    }
    return undefined;
  }

  async getAccountAndTeamByTeamPublicId(publicId) {
    //TODO implement this for testing purposes
    return undefined;
  }

  getState(accountId) {
    // Return a copy of the state
    return JSON.parse(JSON.stringify(this.STATES[accountId]));
  }

  async patchState(patch, accountId) {
    if (accountId === undefined) {
      throw new HandledError(403, 'Please sign in first');
    }
    logger.log('Attempting to merge', this.STATES[accountId], patch);
    objectMerge.patch(this.STATES[accountId], patch);
  }

  async signup(email, passwordHash, passwordTokenHash) {
    this.STATES[this.idCounter] = { teams: [], players: [] };
    let newAccount = {
      account_id: this.idCounter,
      email: email,
      password_hash: passwordHash,
      password_token_hash: passwordTokenHash,
      password_token_expiration: Date.now() + 3600000,
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
      if (this.ACCOUNTS[i].password_token_hash === passwordTokenHash) {
        if (this.ACCOUNTS[i].password_token_expiration > Date.now()) {
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
      if (this.ACCOUNTS[i].account_id === accountId) {
        this.ACCOUNTS[i].verifiedEmail = true;
      }
    }
    return undefined;
  }

  async setPasswordHashAndExpireToken(accountId, newPasswordHash) {
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].account_id === accountId) {
        this.ACCOUNTS[i].password_token_hash = newPasswordHash;
        this.ACCOUNTS[i].password_token_expiration = 0;
      }
    }
    return undefined;
  }

  async setPasswordTokenHash(accountId, tokenHash) {
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].account_id === accountId) {
        this.ACCOUNTS[i].password_token_hash = tokenHash;
        this.ACCOUNTS[i].password_token_expiration = Date.now() + 3600000;
      }
    }
    return undefined;
  }

  async deleteAccount(accountId) {
    logger.log(accountId, 'deleting');
    let indexToRemove = undefined;
    for (let i = 0; i < this.ACCOUNTS.length; i++) {
      if (this.ACCOUNTS[i].account_id === accountId) {
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
        state.optimizations[i].status == 6
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
    optionalMessage
  ) {
    optimizationId = idUtils.serverIdToClientId(optimizationId);
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
    optimizationId = idUtils.serverIdToClientId(optimizationId);
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

  async getOptimizationResultData(accountId, optimizationId) {
    optimizationId = idUtils.serverIdToClientId(optimizationId);
    logger.log(accountId, 'getting optimization result data');
    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i].resultData;
      }
    }
    throw new Error(
      'Optimization not found 3 ' +
        optimizationId +
        ' ' +
        JSON.stringify(state.optimizations)
    );
  }

  async getOptimizationDetails(accountId, optimizationId) {
    optimizationId = idUtils.serverIdToClientId(optimizationId);
    logger.log(accountId, 'getting optimization result data');
    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        return state.optimizations[i];
      }
    }
    throw new Error(
      'Optimization not found 3 ' +
        optimizationId +
        ' ' +
        JSON.stringify(state.optimizations)
    );
  }

  async setOptimizationExecutionData(
    accountId,
    optimizationId,
    newExecutionData
  ) {
    optimizationId = idUtils.serverIdToClientId(optimizationId);
    logger.log(
      accountId,
      'setting optimization execution data',
      optimizationId
    );
    let state = this.STATES[accountId];
    for (let i = 0; i < state.optimizations.length; i++) {
      if (state.optimizations[i].id === optimizationId) {
        state.optimizations[i].executionData = newExecutionData;
        return;
      }
    }
    throw new Error(
      'Optimization not found 2 ' +
        optimizationId +
        ' ' +
        JSON.stringify(state.optimizations)
    );
  }

  async getOptimizationExecutionData(accountId, optimizationId) {
    optimizationId = idUtils.serverIdToClientId(optimizationId);

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
    throw new Error(
      'Optimization not found 1 ' +
        optimizationId +
        ' ' +
        JSON.stringify(state.optimizations)
    );
  }
};

// Node only
module.exports = databaseCalls;

import constants from '../utils/constants';
import { TLSchemas } from './schema-validation';

export const CURRENT_VERSION = 5;

export const SchemaMigrationTypes = {
  EXPORT: 'export',
  FULL: 'full',
  CLIENT: 'client',
};

export const getMigration = function (tlSchema) {
  const schemaNameMigrationMap = {};
  schemaNameMigrationMap[TLSchemas.EXPORT] = SchemaMigrationTypes.EXPORT;
  schemaNameMigrationMap[TLSchemas.FULL] = SchemaMigrationTypes.FULL;
  schemaNameMigrationMap[TLSchemas.CLIENT] = SchemaMigrationTypes.CLIENT;
  return schemaNameMigrationMap[tlSchema];
};

/**
 * When the json schema for an account's data gets updated, this function performs a schema migration on older data.
 *
 * For simplicity, version numbers consist of a single, serial integer value that conveys no semantic meaning about
 * the nature of the changes made between versions (e.g. version 1,2,3,4,5, etc...)
 *
 * To add a migration, add another if block to the bottom of this function. At a minimum you need to update the
 * metadata version of your document even if you are just adding fields.
 *
 * Then build shared `yarn --cwd ./shared build` and test with `yarn test schema-migration`
 *
 * We should try to never add any dependencies to this function because doing so means we can never change the behavior
 * of those dependencies without busting migrations. Since there is no way to enforce dependencies don't change, it's a
 * recipe for data corruption.
 *
 * This function is run whenever we read data into the app (e.g from the data base, on file import, from localstorage, etc...)
 *
 * @returns a string depending on the result of the migration:
 * "OKAY" - if json document is up-to-date and no action was taken
 * "UPDATED" - if the json document has been updated to the current schema successfully
 * "ERROR" - if there was an error while attempting to update the json document's schema
 * "REFRESH" - if the document's version is newer than the current app version
 */
export const updateSchema = function (
  accountId,
  inputJson,
  inputScope, // full, export, or client
  logger = {
    warn: function (...val) {
      val.shift(); // remove accountId
      console.warn(...val);
    },
    log: function (...val) {
      val.shift();
      console.log(...val);
    },
  }
) {
  try {
    let version = inputJson?.metadata?.version;
    let scope = inputJson?.metadata?.scope;

    if (scope !== undefined && inputScope !== scope) {
      throw new Error(
        `Input scope doesn't match document scope input was ${inputScope} document was ${scope}`
      );
    }

    if (version === CURRENT_VERSION) {
      /*
      logger.log(
        accountId,
        'Schema migration not required. Schema version: ',
        version
      );*/
      return 'OKAY';
    } else if (version > CURRENT_VERSION) {
      logger.warn(
        accountId,
        'Document version is newer than app version.',
        version
      );
      return 'REFRESH';
    }
    logger.log(accountId, 'Schema migration required ', version);

    // Upgrade to version 1 (from undefined version)
    if (version === undefined) {
      // Update account (optimizers is stored as an array instead of a string)
      inputJson.account.optimizers = JSON.parse(inputJson.account.optimizers);

      // Update players (camel case song_link and song_start)
      for (let player of inputJson.players) {
        let temp = player.song_link;
        delete player.song_link;
        player.songLink = temp;

        temp = player.song_start;
        delete player.song_start;
        player.songStart = temp;
      }

      // Update optimizers (data and list fields are now stored as JSON instead of a string)
      for (let optimization of inputJson.optimizations) {
        optimization.customOptionsData = JSON.parse(
          optimization.customOptionsData
        );
        optimization.resultData = JSON.parse(optimization.resultData);
        optimization.overrideData = JSON.parse(optimization.overrideData);
        // Overrides player_id should be playerId (this info is duplicate, but it makes the pa us simpler to include it)
        for (let playerId in optimization.overrideData) {
          for (let pa of optimization.overrideData[playerId]) {
            let temp = pa.player_id;
            delete pa.player_id;
            pa.playerId = temp;
          }
        }
        optimization.teamList = JSON.parse(optimization.teamList);
        optimization.gameList = JSON.parse(optimization.gameList);
        optimization.playerList = JSON.parse(optimization.playerList);
        optimization.optimizerType = optimization.optimizerType
          ? optimization.optimizerType
          : 0;
        optimization.inputSummaryData = JSON.parse(
          optimization.inputSummaryData
        );
        if (optimization.sendEmail === undefined) {
          optimization.sendEmail = false;
        }
      }

      // Update all games (scoreUs and scoreThem can no longer be null)
      for (let team of inputJson.teams) {
        for (let game of team.games) {
          if (game.scoreUs === null) {
            game.scoreUs = 0;
          }
          if (game.scoreThem === null) {
            game.scoreThem = 0;
          }
          delete game.park;
        }
      }

      // Update all plate appearances (player_id is camel cased)
      for (let team of inputJson.teams) {
        for (let game of team.games) {
          for (let pas of game.plateAppearances) {
            let temp = pas.player_id;
            delete pas.player_id;
            pas.playerId = temp;
          }
        }
      }

      // Update teams (remove read only publicId and publicLinkEnabled for export)
      if (inputScope === 'export') {
        for (let team of inputJson.teams) {
          delete team.publicId;
          delete team.publicIdEnabled;
        }
      } else {
        // We'll only keep publicIds of teams that are using it
        for (let team of inputJson.teams) {
          if (!team.publicIdEnabled) {
            delete team.publicId;
          }
        }
      }

      // No private info in client
      if (inputScope === 'client') {
        delete inputJson.account.passwordHash;
        delete inputJson.account.passwordTokenHash;
        delete inputJson.account.passwordTokenExpiration;
      }

      // No account info at all in export
      if (inputScope === 'export') {
        delete inputJson.account;
      }

      // Update json metadata
      inputJson.metadata = {
        version: 1,
        scope: inputScope,
      };
    }

    if (inputJson.metadata.version === 1) {
      // We are moving status "PAUSING" to a new field. It's possible for an opt to be in any number of statuses and also be pausing.
      for (let optimization of inputJson.optimizations) {
        optimization.status =
          optimization.status === 6
            ? constants.OPTIMIZATION_STATUS_ENUM.ERROR
            : optimization.status;
        optimization.pause = false;
      }
      inputJson.metadata = {
        version: 2,
        scope: inputScope,
      };

      // We are no longer exporting optimizations
      if (inputScope === 'export') {
        delete inputJson.optimizations;
      }
    }

    if (inputJson.metadata.version === 2) {
      // For all games - Convert score to an object
      for (let team of inputJson.teams) {
        for (let game of team.games) {
          game.scoreUs = { 1: game.scoreUs };
          game.scoreThem = { 1: game.scoreThem };
        }
      }

      // Copy and pasting this code from utils instead of introducing a dependency
      const sortObjectsByDate = function (listInput, { isAsc, eqCb }) {
        const list = listInput.slice();
        return list.sort((a, b) => {
          if (a.date === b.date) {
            if (eqCb) {
              return eqCb(a, b);
            } else {
              return a.id < b.id ? -1 : 1;
            }
          }
          if (isAsc) {
            return a.date < b.date ? -1 : 1;
          } else {
            return a.date < b.date ? 1 : -1;
          }
        });
      };

      // For all Teams - Sort games by date DSC
      for (let team of inputJson.teams) {
        const sorted = sortObjectsByDate(team.games, { isAsc: false });
        team.games = sorted;
      }

      // Update json metadata
      inputJson.metadata = {
        version: 3,
        scope: inputScope,
      };
    }

    if (inputJson.metadata.version === 3) {
      // Update all plate appearances (runners is empty object)
      for (let team of inputJson.teams) {
        for (let game of team.games) {
          for (let pa of game.plateAppearances) {
            pa.runners = {};
          }
        }
      }

      // Update json metadata
      inputJson.metadata = {
        version: 4,
        scope: inputScope,
      };
    }

    if (inputJson.metadata.version === 4) {
      // Update optimizers (player overrides should have runners)
      if (inputScope !== 'export') {
        for (let optimization of inputJson.optimizations) {
          for (let playerId in optimization.overrideData) {
            for (let pa of optimization.overrideData[playerId]) {
              pa.runners = {};
            }
          }
        }
      }

      inputJson.metadata = {
        version: 5,
        scope: inputScope,
      };
    }

    /*
    // Example migrations
    if (inputJson.metadata.version === 5) {
      // Blah blah blah
      inputJson.metadata = {
        version: 6,
        scope: inputScope,
      };
    }

    if (inputJson.metadata.version === 6) {
      // Blah blah blah
      inputJson.metadata = {
        version: 7,
        scope: inputScope,
      };
    }
    */

    logger.log(
      accountId,
      'Schema migration completed successfully, new version ',
      inputJson.metadata
    );
  } catch (e) {
    // If schema migration fails we'll ignore that and the subsequent schema validation failure will be surfaced to the user.
    // Log here for debugging reasons.
    logger.warn(accountId, 'Schema migration failed');
    logger.warn(accountId, e);
    return 'ERROR';
  }
  return 'UPDATED';
};

const exp = {
  updateSchema,
  CURRENT_VERSION,
};

export default exp;

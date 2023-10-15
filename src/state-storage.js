import SharedLib from 'shared-lib';
import { LsMigrationError, LsSchemaVersionError } from 'state-errors';

const CURRENT_LS_SCHEMA_VERSION = '7';
const SCHEMA_VERSION = 'SCHEMA_VERSION';
const LOCAL_DB_STATE = 'LOCAL_DB_STATE';
const ANCESTOR_DB_STATE = 'ANCESTOR_DB_STATE';

const TLSchemas = SharedLib.schemaValidation.TLSchemas;

/**
 * Separate out the localstorage stuff from the getGlobalState().
 *
 * We should probably re-work this so that that ONLY the ls calls are here and the rest goes back in the main state class
 */
export class LocalStorageStorage {
  saveDbState(localState, ancestorState) {
    if (typeof Storage !== 'undefined') {
      /*
      // Disable compression for now
      let compressedLocalState = LZString.compress(
        JSON.stringify(localState)
      );
      let compressedAncestorState = LZString.compress(
        JSON.stringify(ancestorState)
      );

      localStorage.setItem("SCHEMA_VERSION", CURRENT_LS_SCHEMA_VERSION);
      localStorage.setItem("LOCAL_DB_STATE", compressedLocalState);
      localStorage.setItem("ANCESTOR_DB_STATE", compressedAncestorState);
      */
      SharedLib.schemaValidation.validateSchema(localState, TLSchemas.CLIENT);
      SharedLib.schemaValidation.validateSchema(
        ancestorState,
        TLSchemas.CLIENT
      );

      localStorage.setItem(SCHEMA_VERSION, CURRENT_LS_SCHEMA_VERSION);
      localStorage.setItem(LOCAL_DB_STATE, JSON.stringify(localState));
      localStorage.setItem(ANCESTOR_DB_STATE, JSON.stringify(ancestorState));
    }
  }

  getDbState() {
    if (typeof Storage !== 'undefined') {
      // We could migrate the localstorage data here, or we can just be lazy and delete it
      if (localStorage.getItem(SCHEMA_VERSION) !== CURRENT_LS_SCHEMA_VERSION) {
        console.warn(`Invalid localStorage data ${Object.keys(localStorage)}`);
        throw new LsSchemaVersionError(
          `Out of date localstorage schema version was ${localStorage.getItem(
            SCHEMA_VERSION
          )} latest is ${CURRENT_LS_SCHEMA_VERSION}`
        );
      }

      // Retrieve, update, and validate getGlobalState(). Do nothing if anything in this process fails.
      try {
        let localDbState = JSON.parse(localStorage.getItem(LOCAL_DB_STATE));
        if (localDbState) {
          SharedLib.schemaMigration.updateSchema(null, localDbState, 'client');
          SharedLib.schemaValidation.validateSchema(
            localDbState,
            TLSchemas.CLIENT
          );
        }

        let ancestorDbState = JSON.parse(
          localStorage.getItem(ANCESTOR_DB_STATE)
        );
        if (ancestorDbState) {
          SharedLib.schemaMigration.updateSchema(
            null,
            ancestorDbState,
            'client'
          );
          SharedLib.schemaValidation.validateSchema(
            ancestorDbState,
            TLSchemas.CLIENT
          );
        }

        // Apply changes if there were no errors - we want both of them to update or none of them
        if (localDbState && ancestorDbState) {
          return {
            local: localDbState,
            ancestor: ancestorDbState,
          };
        }
      } catch (e) {
        console.warn(e);
        throw new LsMigrationError('Bad data in local storage');
      }
    }
  }

  saveApplicationState(online, sessionValid, activeUser) {
    if (typeof Storage !== 'undefined') {
      localStorage.setItem(SCHEMA_VERSION, CURRENT_LS_SCHEMA_VERSION);
      let applicationState = {
        online: online,
        sessionValid: sessionValid,
        activeUser: activeUser,
      };
      localStorage.setItem(
        'APPLICATION_STATE',
        JSON.stringify(applicationState)
      );
    }
  }

  getApplicationState() {
    return JSON.parse(localStorage.getItem('APPLICATION_STATE'));
  }

  clearStorage() {
    console.log('Clearing ls ');
    localStorage.clear();
  }
}

export class InMemoryStorage {
  saveDbState(localState, ancestorState) {
    this.localState = localState;
    this.ancestorState = ancestorState;
  }

  getDbState() {
    return {
      local: this.localDbState,
      ancestor: this.ancestorDbState,
    };
  }

  saveApplicationState(online, sessionValid, activeUser) {
    this.online = online;
    this.sessionValid = sessionValid;
    this.activeUser = activeUser;
  }

  getApplicationState() {
    return {
      online: this.online,
      sessionValid: this.sessionValid,
      activeUser: this.activeUser,
    };
  }

  clearStorage() {
    this.localState = undefined;
    this.ancestorState = undefined;
    this.online = undefined;
    this.sessionValid = undefined;
    this.activeUser = undefined;
  }
}

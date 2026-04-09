import SharedLib, { type TopLevelClient } from 'shared-lib';
import { LsMigrationError, LsSchemaVersionError } from './state-errors';

const CURRENT_LS_SCHEMA_VERSION = '7';
const SCHEMA_VERSION = 'SCHEMA_VERSION';
const LOCAL_DB_STATE = 'LOCAL_DB_STATE';
const ANCESTOR_DB_STATE = 'ANCESTOR_DB_STATE';

const TLSchemas = SharedLib.schemaValidation.TLSchemas;

export interface ApplicationState {
  online: boolean;
  sessionValid: boolean;
  activeUser: string | null;
}

export interface DbState {
  local: TopLevelClient;
  ancestor: TopLevelClient;
}

export interface StateStorage {
  saveDbState(localState: TopLevelClient, ancestorState: TopLevelClient): void;
  getDbState(): DbState | undefined;
  saveApplicationState(
    online: boolean,
    sessionValid: boolean,
    activeUser: string | null
  ): void;
  getApplicationState(): ApplicationState | null;
  clearStorage(): void;
}

/**
 * Separate out the localstorage stuff from the getGlobalState().
 *
 * We should probably re-work this so that that ONLY the ls calls are here and the rest goes back in the main state class
 */
export class LocalStorageStorage implements StateStorage {
  saveDbState(localState: TopLevelClient, ancestorState: TopLevelClient): void {
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

  getDbState(): DbState | undefined {
    if (typeof Storage !== 'undefined') {
      // We could migrate the localstorage data here, or we can just be lazy and delete it
      if (localStorage.getItem(SCHEMA_VERSION) !== CURRENT_LS_SCHEMA_VERSION) {
        console.warn(`Invalid localStorage data ${Object.keys(localStorage)}`);
        throw new LsSchemaVersionError(
          `Out of date or empty localstorage schema. Version was ${localStorage.getItem(
            SCHEMA_VERSION
          )} latest is ${CURRENT_LS_SCHEMA_VERSION}`
        );
      }

      // Retrieve, update, and validate getGlobalState(). Do nothing if anything in this process fails.
      try {
        const localDbStateStr = localStorage.getItem(LOCAL_DB_STATE);
        let localDbState: TopLevelClient | null = null;
        if (localDbStateStr) {
          localDbState = JSON.parse(localDbStateStr);
          if (localDbState) {
            SharedLib.schemaMigration.updateSchema(
              null,
              localDbState,
              'client'
            );
            SharedLib.schemaValidation.validateSchema(
              localDbState,
              TLSchemas.CLIENT
            );
          }
        }

        const ancestorDbStateStr = localStorage.getItem(ANCESTOR_DB_STATE);
        let ancestorDbState: TopLevelClient | null = null;
        if (ancestorDbStateStr) {
          ancestorDbState = JSON.parse(ancestorDbStateStr);
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
    return undefined;
  }

  saveApplicationState(
    online: boolean,
    sessionValid: boolean,
    activeUser: string | null
  ): void {
    if (typeof Storage !== 'undefined') {
      localStorage.setItem(SCHEMA_VERSION, CURRENT_LS_SCHEMA_VERSION);
      const applicationState: ApplicationState = {
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

  getApplicationState(): ApplicationState | null {
    const appStateStr = localStorage.getItem('APPLICATION_STATE');
    return appStateStr ? JSON.parse(appStateStr) : null;
  }

  clearStorage(): void {
    console.log('Clearing ls ');
    localStorage.clear();
  }
}

export class InMemoryStorage implements StateStorage {
  private localState?: TopLevelClient;
  private ancestorState?: TopLevelClient;
  private online?: boolean;
  private sessionValid?: boolean;
  private activeUser?: string | null;

  saveDbState(localState: TopLevelClient, ancestorState: TopLevelClient): void {
    this.localState = localState;
    this.ancestorState = ancestorState;
  }

  getDbState(): DbState | undefined {
    if (this.localState && this.ancestorState) {
      return {
        local: this.localState,
        ancestor: this.ancestorState,
      };
    }
    return undefined;
  }

  saveApplicationState(
    online: boolean,
    sessionValid: boolean,
    activeUser: string | null
  ): void {
    this.online = online;
    this.sessionValid = sessionValid;
    this.activeUser = activeUser;
  }

  getApplicationState(): ApplicationState | null {
    if (this.online !== undefined && this.sessionValid !== undefined) {
      return {
        online: this.online,
        sessionValid: this.sessionValid,
        activeUser: this.activeUser ?? null,
      };
    }
    return null;
  }

  clearStorage(): void {
    this.localState = undefined;
    this.ancestorState = undefined;
    this.online = undefined;
    this.sessionValid = undefined;
    this.activeUser = undefined;
  }
}

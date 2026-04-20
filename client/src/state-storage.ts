import { openDB, type IDBPDatabase } from 'idb';
import SharedLib, { type TopLevelClient } from 'shared-lib';
import { LsMigrationError, LsSchemaVersionError } from './state-errors';

const CURRENT_LS_SCHEMA_VERSION = '7';
const SCHEMA_VERSION = 'SCHEMA_VERSION';
const LOCAL_DB_STATE = 'LOCAL_DB_STATE';
const ANCESTOR_DB_STATE = 'ANCESTOR_DB_STATE';
const APPLICATION_STATE = 'APPLICATION_STATE';

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
  initialize(): Promise<void>;
  saveDbState(localState: TopLevelClient, ancestorState: TopLevelClient): void;
  getDbState(): Promise<DbState | undefined>;
  saveApplicationState(
    online: boolean,
    sessionValid: boolean,
    activeUser: string | null
  ): void;
  getApplicationState(): Promise<ApplicationState | null>;
  clearStorage(): void;
}

function migrateAndValidate(state: TopLevelClient): void {
  SharedLib.schemaMigration.updateSchema(null, state, 'client');
  SharedLib.schemaValidation.validateSchema(state, TLSchemas.CLIENT);
}

export class LocalStorageStorage implements StateStorage {
  async initialize(): Promise<void> {}

  saveDbState(localState: TopLevelClient, ancestorState: TopLevelClient): void {
    if (typeof Storage !== 'undefined') {
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

  getDbState(): Promise<DbState | undefined> {
    if (typeof Storage !== 'undefined') {
      if (localStorage.getItem(SCHEMA_VERSION) !== CURRENT_LS_SCHEMA_VERSION) {
        console.warn(`Invalid localStorage data ${Object.keys(localStorage)}`);
        throw new LsSchemaVersionError(
          `Out of date or empty localstorage schema. Version was ${localStorage.getItem(
            SCHEMA_VERSION
          )} latest is ${CURRENT_LS_SCHEMA_VERSION}`
        );
      }

      try {
        const localDbStateStr = localStorage.getItem(LOCAL_DB_STATE);
        let localDbState: TopLevelClient | null = null;
        if (localDbStateStr) {
          localDbState = JSON.parse(localDbStateStr);
          if (localDbState) {
            migrateAndValidate(localDbState);
          }
        }

        const ancestorDbStateStr = localStorage.getItem(ANCESTOR_DB_STATE);
        let ancestorDbState: TopLevelClient | null = null;
        if (ancestorDbStateStr) {
          ancestorDbState = JSON.parse(ancestorDbStateStr);
          if (ancestorDbState) {
            migrateAndValidate(ancestorDbState);
          }
        }

        if (localDbState && ancestorDbState) {
          return Promise.resolve({
            local: localDbState,
            ancestor: ancestorDbState,
          });
        }
      } catch (e) {
        console.warn(e);
        throw new LsMigrationError('Bad data in local storage');
      }
    }
    return Promise.resolve(undefined);
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
        APPLICATION_STATE,
        JSON.stringify(applicationState)
      );
    }
  }

  getApplicationState(): Promise<ApplicationState | null> {
    const appStateStr = localStorage.getItem(APPLICATION_STATE);
    return Promise.resolve(appStateStr ? JSON.parse(appStateStr) : null);
  }

  clearStorage(): void {
    localStorage.clear();
  }
}

export class InMemoryStorage implements StateStorage {
  private localState?: TopLevelClient;
  private ancestorState?: TopLevelClient;
  private online?: boolean;
  private sessionValid?: boolean;
  private activeUser?: string | null;

  async initialize(): Promise<void> {}

  saveDbState(localState: TopLevelClient, ancestorState: TopLevelClient): void {
    this.localState = localState;
    this.ancestorState = ancestorState;
  }

  getDbState(): Promise<DbState | undefined> {
    if (this.localState && this.ancestorState) {
      return Promise.resolve({
        local: this.localState,
        ancestor: this.ancestorState,
      });
    }
    return Promise.resolve(undefined);
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

  getApplicationState(): Promise<ApplicationState | null> {
    if (this.online !== undefined && this.sessionValid !== undefined) {
      return Promise.resolve({
        online: this.online,
        sessionValid: this.sessionValid,
        activeUser: this.activeUser ?? null,
      });
    }
    return Promise.resolve(null);
  }

  clearStorage(): void {
    this.localState = undefined;
    this.ancestorState = undefined;
    this.online = undefined;
    this.sessionValid = undefined;
    this.activeUser = undefined;
  }
}

const IDB_NAME = 'softball-scorer-db';
const IDB_VERSION = 1;

export class IndexedDBStorage implements StateStorage {
  private db: IDBPDatabase | null = null;

  private pendingLocal?: TopLevelClient;
  private pendingAncestor?: TopLevelClient;
  private flushScheduled = false;
  private pendingFlush: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    this.db = await openDB(IDB_NAME, IDB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state');
        }
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState');
        }
      },
    });
    await this._migrateFromLocalStorage();
  }

  private async _migrateFromLocalStorage(): Promise<void> {
    const existing = await this.getDbState();
    if (existing) return;

    const ls = new LocalStorageStorage();
    try {
      const lsState = await ls.getDbState();
      if (!lsState) return;

      this.saveDbState(lsState.local, lsState.ancestor);

      const appState = await ls.getApplicationState();
      if (appState) {
        this.saveApplicationState(
          appState.online,
          appState.sessionValid,
          appState.activeUser
        );
      }

      await this.flush();
      ls.clearStorage();
      console.log('[IDB] Migrated data from localStorage to IndexedDB');
    } catch (e) {
      console.log('[IDB] No localStorage data to migrate:', e);
    }
  }

  saveDbState(localState: TopLevelClient, ancestorState: TopLevelClient): void {
    this.pendingLocal = localState;
    this.pendingAncestor = ancestorState;

    if (!this.flushScheduled) {
      this.flushScheduled = true;
      this.pendingFlush = Promise.resolve().then(() => this._flush());
    }
  }

  flush(): Promise<void> {
    return this.pendingFlush;
  }

  private async _flush(): Promise<void> {
    this.flushScheduled = false;
    if (!this.db || !this.pendingLocal || !this.pendingAncestor) return;
    const local = this.pendingLocal;
    const ancestor = this.pendingAncestor;
    try {
      SharedLib.schemaValidation.validateSchema(local, TLSchemas.CLIENT);
      SharedLib.schemaValidation.validateSchema(ancestor, TLSchemas.CLIENT);
      const tx = this.db.transaction(['meta', 'state'], 'readwrite');
      tx.objectStore('meta').put(CURRENT_LS_SCHEMA_VERSION, SCHEMA_VERSION);
      tx.objectStore('state').put(local, LOCAL_DB_STATE);
      tx.objectStore('state').put(ancestor, ANCESTOR_DB_STATE);
      await tx.done;
    } catch (e) {
      console.error('[IDB] Write failed:', e);
    }
  }

  async getDbState(): Promise<DbState | undefined> {
    if (!this.db) return undefined;

    const tx = this.db.transaction(['meta', 'state'], 'readonly');
    const [version, localDbState, ancestorDbState] = await Promise.all([
      tx.objectStore('meta').get(SCHEMA_VERSION),
      tx.objectStore('state').get(LOCAL_DB_STATE),
      tx.objectStore('state').get(ANCESTOR_DB_STATE),
    ]);

    if (version === undefined) return undefined;
    if (version !== CURRENT_LS_SCHEMA_VERSION) {
      throw new LsSchemaVersionError(
        `Out of date IDB schema. Version was ${version} latest is ${CURRENT_LS_SCHEMA_VERSION}`
      );
    }

    if (!localDbState || !ancestorDbState) return undefined;

    try {
      migrateAndValidate(localDbState);
      migrateAndValidate(ancestorDbState);
      return { local: localDbState, ancestor: ancestorDbState };
    } catch (e) {
      console.warn(e);
      throw new LsMigrationError('Bad data in IndexedDB');
    }
  }

  saveApplicationState(
    online: boolean,
    sessionValid: boolean,
    activeUser: string | null
  ): void {
    if (!this.db) return;
    const appState: ApplicationState = { online, sessionValid, activeUser };
    this.db
      .put('appState', appState, APPLICATION_STATE)
      .catch((e) => console.error('[IDB] appState write failed:', e));
  }

  async getApplicationState(): Promise<ApplicationState | null> {
    if (!this.db) return null;
    return (await this.db.get('appState', APPLICATION_STATE)) ?? null;
  }

  clearStorage(): void {
    this.pendingLocal = undefined;
    this.pendingAncestor = undefined;
    this.flushScheduled = false;
    if (!this.db) return;
    Promise.all([
      this.db.clear('meta'),
      this.db.clear('state'),
      this.db.clear('appState'),
    ]).catch((e) => console.error('[IDB] clear failed:', e));
  }
}


import SharedLib from 'shared-lib';

/**
 * Wrapper of jsonState so that reference to that jsonState can be shared between consumers (like between state and state-index)
 */
export default class StateContainer {
  constructor(stateJson) {
    if (!SharedLib.commonUtils.isObject(stateJson)) {
      throw new Error(
        'This should be a state object, not a string or anything else'
      );
    }
    this._state = stateJson;
  }

  set(stateJson) {
    // TODO: schema check here??
    this._state = stateJson;
  }

  get() {
    return this._state;
  }
}

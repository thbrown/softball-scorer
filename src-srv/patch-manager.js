const HandledError = require('./handled-error.js');

const logger = require('./logger.js');
const SharedLib = require('../shared-lib').default;

// Don't add integers to PROHIBITED_KEYS, they will prohibit adds/edits to arrays at that index
// TODO: it would be great if we could get this from the json schema (look for the readOnly property)
const PROHIBITED_KEYS = [
  'accountId', // Account
  'password',
  'email',
  'emailConfirmed',
  'balance',
  'passwordHash',
  'passwordTokenHash',
  'passwordTokenExpiration',
  'publicId', // Team
  'publicIdEnabled',
];

let patchManager = class PatchManager {
  constructor() {
    this.prohibited = new Set(PROHIBITED_KEYS);
  }

  /**
   * Some data should not be updatable by a sync/patch operation. This function enforces non-updates for specified keys in the data json object.
   * We could possibly make this more targeted, but just blanket prohibiting updates with a forbidden key is simple, and simple is good, especially when it comes to security.
   */
  securePatch(patch, accountId) {
    // We don't want to leak details about how the patch implementation is designed, so we'll delegate to the patch implementation to do the work.
    return SharedLib.objectMerge.filterPatch(
      patch,
      this.prohibited,
      accountId,
      logger
    );
  }
};

module.exports = patchManager;

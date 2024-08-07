import HandledError from './handled-error';
import logger from './logger';
import * as SharedLib from 'shared-lib';
import * as context from './context';
import { Operation } from 'fast-json-patch';

const lockAccount = async function (accountId: string) {
  let success = false;
  let counter = 0;
  const self = context.getServer();

  do {
    success = await self.cacheCalls.lockAccount(accountId);

    if (!success) {
      logger.log(accountId, 'Account already locked, retrying in 200ms');
      await SharedLib.commonUtils.sleep(200); // TODO: Do we need a random backoff?
      counter++;
    }

    if (counter > 100) {
      throw new HandledError(
        accountId,
        503,
        'Another request is consuming system resources allocated for self account. Please try agin in a few minutes.'
      );
    }
  } while (!success);
};

const unlockAccount = async function (accountId: string) {
  const self = context.getServer();
  await self.cacheCalls.unlockAccount(accountId);
};

const validateRequest = (
  accountId: string,
  data: unknown & { md5?: string; checksum?: string }
) => {
  if (!data['checksum']) {
    if (data['md5']) {
      // We re-named this field (md5 -> checksum), doing this check prevents users from getting a scary error message
      // before they refresh the page and get the most recent version of the app. It can be removed later.
      data.checksum = data['md5'];
    } else {
      throw new HandledError(
        accountId,
        400,
        'Missing required field: checksum',
        JSON.stringify(data)
      );
    }
  }
};

const applyClientPatchChanges = async (accountId: string, data) => {
  const self = context.getServer();
  // Check if the client sent updates to the server
  if (data.patch && Array.isArray(data.patch) && data.patch.length !== 0) {
    logger.log(
      accountId,
      'Client has updates'
      //JSON.stringify(data.patch, null, 2)
    );

    // Pass the client's patch to the database to persist its changes
    logger.log(
      accountId,
      'Client patch. ',
      getPatchDetails(data.patch)
      //JSON.stringify(data.patch, null, 2)
    );
    await self.databaseCalls.patchState(data.patch, accountId);

    // Useful for debugging
    /*logger.log(
        accountId,
        "updatedState",
        JSON.stringify(state, null, 2),
        SharedLib.commonUtils.getHash(state)
      );
      */
    return { changesMade: true };
  } else {
    logger.log(accountId, 'No updates from client');
    return { changesMade: false };
  }
};

const applyServerPatchChanges = async ({
  accountId,
  sessionId,
  state,
  data,
}: {
  accountId: string;
  sessionId: string;
  state: any;
  data: any;
}) => {
  const self = context.getServer();
  // If we have an ancestor state cached and client did not request a full sync we'll send only a patch representing the server's updates
  // If the client requested a full sync or we don't have a cached ancestor we'll send the entire state to the client
  let serverAncestor = await self.cacheCalls.getAncestor(accountId, sessionId);
  logger.log(
    accountId,
    'Retrieving ancestor. Success: ',
    serverAncestor !== undefined,
    data.type
    //JSON.stringify(serverAncestor, null, 2)
  );

  let patch: null | Operation[] = null;
  let base: null | Operation[] = null;

  if (data.type === 'any' && serverAncestor) {
    // Yes we have an ancestor!
    logger.log(accountId, 'performing patch sync w/ ancestor');

    // Apply the client's patch to the ancestor (prevents us from sending back the change the client just sent us)
    serverAncestor = SharedLib.objectMerge.patch(
      serverAncestor,
      data.patch,
      true,
      false,
      accountId,
      logger
    );

    // Diff the ancestor and the localState (dbState) to get the patch we need to send back to the client
    const serverPatch = SharedLib.objectMerge.diff(serverAncestor, state);
    logger.log(
      accountId,
      'Server Patch',
      getPatchDetails(serverPatch),
      serverPatch // TODO: 2 chars but 0 patches???
    );

    patch = serverPatch;
  } else {
    // No we have no ancestor OR sync status is 'full', send back the whole state
    logger.log(
      accountId,
      'performing full sync',
      'Requested Sync Type:',
      data.type,
      'Ancestor present?:',
      !!serverAncestor
    );

    // The browser specifically requested a full sync, something must have gone wrong with the patch sync.
    // Print the state string so we can compare what went wrong with the browser's version
    if (data.type === 'full') {
      // Human readable
      logger.warn(accountId, 'state', JSON.stringify(state, null, 2));
      // Debug string
      logger.warn(
        accountId,
        SharedLib.commonUtils.insertNewlines(
          SharedLib.commonUtils.getObjectString(state)
        )
      );
    }

    base = state || (await self.databaseCalls.getClientState(accountId));
  }

  return {
    patch,
    base,
  };
};

export const sync = async ({
  accountId,
  data,
  sessionId,
}: {
  accountId: string;
  sessionId: string;
  data: any;
}) => {
  const self = context.getServer();
  const responseData: {
    base?: Operation[];
    patch?: Operation[];
    checksum?: string;
  } = {};

  validateRequest(accountId, data);

  await lockAccount(accountId);
  // For testing locks
  // await SharedLib.commonUtils.sleep(10000);
  try {
    let { changesMade } = await applyClientPatchChanges(accountId, data);
    const state = await self.databaseCalls.getClientState(accountId);
    const checksum = SharedLib.commonUtils.getHash(state);

    if (data.checksum !== checksum) {
      logger.log(
        accountId,
        'Server has updates. CLIENT: ',
        data.checksum,
        ' SERVER: ',
        checksum
      );

      const { patch, base } = await applyServerPatchChanges({
        accountId,
        sessionId: sessionId,
        state,
        data,
      });

      if (patch) {
        responseData.patch = patch;
      }
      if (base) {
        responseData.base = base;
      }

      changesMade = true;
    } else {
      logger.log(accountId, 'No updates from server', data.checksum, checksum);
    }

    responseData.checksum = checksum;

    if (changesMade) {
      await self.cacheCalls.setAncestor(accountId, sessionId, state);
    }
  } finally {
    // Unlock the account
    await unlockAccount(accountId);
  }

  return responseData;
};

/**
 * Build a rough summary of the patch for logging purposes
 */
const getPatchDetails = function (patch) {
  let adds = 0;
  let removes = 0;
  let replace = 0;
  let moves = 0;
  let copy = 0;
  for (const patchStatement of patch) {
    if (patchStatement.op === 'add') {
      adds++;
    } else if (patchStatement.op === 'remove') {
      removes++;
    } else if (patchStatement.op === 'replace') {
      replace++;
    } else if (patchStatement.op === 'move') {
      moves++;
    } else if (patchStatement.op === 'copy') {
      copy++;
    }
  }
  return [
    `Num Patches: ${patch.length}`,
    adds === 0 ? null : `Add: ${adds}`,
    removes === 0 ? null : `Remove: ${removes}`,
    replace === 0 ? null : `Replace: ${replace}`,
    moves === 0 ? null : `Move: ${moves}`,
    copy === 0 ? null : `Copy: ${copy}`,
    `Char Length: ${JSON.stringify(patch).length}`,
  ]
    .filter((v) => v !== null)
    .join(', ');
};

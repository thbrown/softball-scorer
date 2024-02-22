// const utils = require('./test-utils.js');
// const commonUtils = require('../common-utils.js');
// const objectMerge = require('../../object-merge.js');

import SharedLib from 'shared-lib';
import { sync } from './test-utils';
import { expect } from 'vitest';

export default class StateTester {
  localState = { teams: [], players: [], optimizations: [] };
  ancestorState = { teams: [], players: [], optimizations: [] };
  sessionId = '';
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async syncStateClientUpdatesOnly(newState) {
    const clientPatch = SharedLib.objectMerge.diff(
      this.ancestorState,
      newState
    );
    const clientHash = SharedLib.commonUtils.getHash(newState);

    // Useful for debugging
    //console.log(JSON.stringify(newState, null, 3), clientHash);
    const response = await sync(this.sessionId, clientHash, clientPatch);

    const serverChecksum = response.body.checksum;

    expect(serverChecksum).toEqual(clientHash);

    this.ancestorState = JSON.parse(JSON.stringify(newState));
    this.localState = JSON.parse(JSON.stringify(newState));
  }
}

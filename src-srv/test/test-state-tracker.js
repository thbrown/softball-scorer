const utils = require('./test-utils.js');
const commonUtils = require('../common-utils.js');
const objectMerge = require('../../object-merge.js');

module.exports = class StateTester {
  constructor(sessionId) {
    this.localState = { teams: [], players: [], optimizations: [] };
    this.ancestorState = { teams: [], players: [], optimizations: [] };
    this.sessionId = sessionId;
  }

  async syncStateClientUpdatesOnly(newState) {
    let clientPatch = objectMerge.diff(this.ancestorState, newState);
    let clientHash = commonUtils.getHash(newState);

    // Useful for debugging
    //console.log(JSON.stringify(newState, null, 3), clientHash);
    let response = await utils.sync(this.sessionId, clientHash, clientPatch);

    let serverChecksum = response.body.checksum;

    expect(serverChecksum).toEqual(clientHash);

    this.ancestorState = JSON.parse(JSON.stringify(newState));
    this.localState = JSON.parse(JSON.stringify(newState));
  }
};

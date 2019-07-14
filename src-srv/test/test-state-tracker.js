const utils = require('./test-utils.js');
const objectMerge = require('../../object-merge.js');

module.exports = class StateTester {
  constructor(sessionId) {
    this.localState = { teams: [], players: [], optimizations: [] };
    this.ancestorState = { teams: [], players: [], optimizations: [] };
    this.sessionId = sessionId;
  }

  async syncStateClientUpdatesOnly(newState) {
    let clientPatch = objectMerge.diff(this.ancestorState, newState);
    let clientHash = utils.getMd5(newState);

    // Useful for debugging
    //console.log(JSON.stringify(newState, null, 3), clientHash);
    let response = await utils.sync(this.sessionId, clientHash, clientPatch);

    let serverMd5 = response.body.md5;

    expect(serverMd5).toEqual(clientHash);

    this.ancestorState = JSON.parse(JSON.stringify(newState));
    this.localState = JSON.parse(JSON.stringify(newState));
  }
};

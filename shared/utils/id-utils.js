const baseX = require('base-x');
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const bs62 = baseX(BASE62);
const buffer = require('buffer').Buffer;
const crypto = require('crypto');

// Client ids are 14 chars base 62 (e.g. 1CHDaeMNJlrvWW)
exports.clientIdToServerId = function (clientId, accountId) {
  let hexAccountId = accountId.toString(parseInt(16)).padStart(8, '0');
  let hexId = bs62.decode(clientId).toString('hex');
  let sizedHexId = hexId
    .substring(hexId.length - 24, hexId.length)
    .padStart(24, '0');
  return hexAccountId + sizedHexId;
};

// Server ids are 32 char base 16 and are uuids, the first 8 characters represent the
// account id of the account this entity belongs to (e.g. 000000010000d3d7203977664fdb23cf)
exports.serverIdToClientId = function (serverId) {
  return bs62
    .encode(buffer.from(serverId.replace(/-/g, '').substr(12), 'hex'))
    .padStart(14, '0');
};

// Extracts the base 10 accountId from the serverId
exports.getAccountIdFromServerId = function (serverId) {
  return parseInt(serverId.substr(0, 8), 16);
};

exports.hexToBase62 = function (hex) {
  // Filter out any dashes from uuids as well
  return bs62.encode(buffer.from(hex.replace(/-/g, ''), 'hex'));
};

exports.base62ToHex = function (hex) {
  return bs62.decode(hex).toString('hex');
};

exports.randomNBitId = async function (n = 64) {
  return new Promise((resolve, reject) => {
    // 64 bits should allow us 100s of millions of non-colliding ids
    // https://preshing.com/20110504/hash-collision-probabilities/
    crypto.randomBytes(n / 8, function (err, buffer) {
      resolve(bs62.encode(buffer));
    });
  });
};

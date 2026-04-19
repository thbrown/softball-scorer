import baseX from 'base-x';
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const bs62 = baseX(BASE62);

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string): Uint8Array =>
  Uint8Array.from(hex.match(/../g)!, (b) => parseInt(b, 16));

// Client ids are 14 chars base 62 (e.g. 1CHDaeMNJlrvWW)
const clientIdToServerId = function (clientId: string, accountId: number): string {
  let hexAccountId = accountId.toString(parseInt('16')).padStart(8, '0');
  let hexId = toHex(bs62.decode(clientId));
  let sizedHexId = hexId
    .substring(hexId.length - 24, hexId.length)
    .padStart(24, '0');
  return hexAccountId + sizedHexId;
};

// Server ids are 32 char base 16 and are uuids, the first 8 characters represent the
// account id of the account this entity belongs to (e.g. 000000010000d3d7203977664fdb23cf)
const serverIdToClientId = function (serverId: string): string {
  return bs62
    .encode(fromHex(serverId.replace(/-/g, '').substr(12)))
    .padStart(14, '0');
};

// Extracts the base 10 accountId from the serverId
const getAccountIdFromServerId = function (serverId: string): number {
  return parseInt(serverId.substr(0, 8), 16);
};

const hexToBase62 = function (hex: string): string {
  return bs62.encode(fromHex(hex.replace(/-/g, '')));
};

const base62ToHex = function (hex: string): string {
  return toHex(bs62.decode(hex));
};

const randomNBitId = async function (n: number = 64): Promise<string> {
  const bytes = new Uint8Array(n / 8);
  globalThis.crypto.getRandomValues(bytes);
  return bs62.encode(bytes);
};

export default {
  clientIdToServerId,
  serverIdToClientId,
  getAccountIdFromServerId,
  hexToBase62,
  base62ToHex,
  randomNBitId,
};
export {
  clientIdToServerId,
  serverIdToClientId,
  getAccountIdFromServerId,
  hexToBase62,
  base62ToHex,
  randomNBitId,
};

'use strict';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const bs62 = require('base-x')(BASE62);

exports.hexUuidToBase62 = function( hexString ) {
	return bs62.encode(new Buffer(hexString.replace(/-/g, ''), "hex"));
};

exports.base62ToHexUuid = function( base62String ) {
	return bs62.decode(base62String).toString('hex');
};

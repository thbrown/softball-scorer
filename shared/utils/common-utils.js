const hasher = require('node-object-hash');

exports.factorial = function (n) {
  if (n < 0 || n > 20) {
    throw Error('Factorial out of range' + n);
  }
  const fact = [
    1,
    1,
    2,
    6,
    24,
    120,
    720,
    5040,
    40320,
    362880,
    3628800,
    39916800,
    479001600,
    6227020800,
    87178291200,
    1307674368000,
    20922789888000,
    355687428096000,
    6402373705728000,
    121645100408832000,
    2432902008176640000,
  ];
  return fact[n];
};

exports.binomial = function (n, k) {
  if (n === 0) {
    return 0;
  }
  if (k > n) {
    return 0;
  }
  return (
    exports.factorial(n) / (exports.factorial(k) * exports.factorial(n - k))
  );
};

// https://stackoverflow.com/questions/8211744/convert-time-interval-given-in-seconds-into-more-human-readable-form
exports.secondsToString = function (seconds) {
  function numberEnding(number) {
    return number > 1 ? 's' : '';
  }

  var years = Math.floor(seconds / 31536000);
  if (years) {
    return years + ' year' + numberEnding(years);
  }
  var days = Math.floor((seconds %= 31536000) / 86400);
  if (days) {
    return days + ' day' + numberEnding(days);
  }
  var hours = Math.floor((seconds %= 86400) / 3600);
  if (hours) {
    return hours + ' hour' + numberEnding(hours);
  }
  var minutes = Math.floor((seconds %= 3600) / 60);
  if (minutes) {
    return minutes + ' minute' + numberEnding(minutes);
  }
  var seconds = seconds % 60;
  if (seconds) {
    return seconds + ' second' + numberEnding(seconds);
  }
  return 'less than a second';
};

// Calculate the hash of the data and return the result as a base64 string
exports.getHash = function (data) {
  // I've tried other hashes here (like javascript xxHash) but md5 is faster in the browser and much faster in the server.
  var objectHasher = hasher({
    alg: 'md5',
    sort: true,
    coerce: false,
    enc: 'base64',
  });
  return objectHasher.hash(data).slice(0, -2); // Remove trailing '=='
};

// Get the string representation of an object for hashing, sorts properties of objects so representation is stable
exports.getObjectString = function (data) {
  var objectHasher = hasher({
    alg: 'md5',
    sort: true,
    coerce: false,
    enc: 'base64',
  });
  // Don't compute the hash, insted get the string that would be hashed
  return objectHasher.sortObject(data);
};

// Concatenate arrays and remove duplicates
exports.merge = function (array1, array2) {
  return [...new Set([...array1, ...array2])];
};

exports.truncate = function (str, n) {
  return str.length > n ? str.substr(0, n - 1) : str;
};

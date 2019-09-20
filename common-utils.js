const hasher = require('node-object-hash');

exports.factorial = function(n) {
  if (n < 0 || n > 20) {
    throw Error('Factorial out of range' + n);
  }
  let fact = [
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

exports.binomial = function(n, k) {
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
exports.secondsToString = function(seconds) {
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

// Calculate the md5 checksum of the data and return the result as a base64 string
exports.getHash = function(data) {
  var md5Hash = hasher({
    alg: 'md5',
    sort: false,
    coerce: false,
    enc: 'base64',
  });
  let checksum = md5Hash.hash(data);
  return checksum.slice(0, -2); // Remove trailing '=='
};

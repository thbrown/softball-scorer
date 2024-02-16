import hasher from 'node-object-hash';

export const factorial = function (n) {
  if (n < 0 || n > 20) {
    throw Error('Factorial out of range' + n);
  }
  const fact = [
    1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600,
    6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000,
    6402373705728000, 121645100408832000, 2432902008176640000,
  ];
  return fact[n];
};

export const binomial = function (n, k) {
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
export const secondsToString = function (seconds) {
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
    return seconds.toFixed(0) + ' second' + numberEnding(seconds);
  }
  return 'less than a second';
};

// Calculate the hash of the data and return the result as a base64 string
export const getHash = function (data, logger) {
  // I've tried other hashes here (like javascript xxHash) but md5 is faster in the browser and much faster on the server.
  var objectHasher = hasher({
    alg: 'md5',
    sort: {
      array: false,
      typedArray: false,
      object: true,
      set: false,
      map: false,
      bigint: false, // Not sure about this one, how do you sort an int?
    },
    coerce: false,
    enc: 'base64',
  });

  return objectHasher.hash(data).slice(0, -2); // Remove trailing '=='
};

// Get the string representation of an object for hashing, sorts properties of objects so representation is stable
export const getObjectString = function (data) {
  var objectHasher = hasher({
    alg: 'md5',
    sort: true,
    coerce: false,
    enc: 'base64',
  });
  // Don't compute the hash, instead get the string that would be hashed
  return objectHasher.sortObject(data);
};

// Concatenate arrays and remove duplicates
export const merge = function (array1, array2) {
  return [...new Set([...array1, ...array2])];
};

export const truncate = function (str, n) {
  return str.length > n ? str.substr(0, n - 1) : str;
};

export const round = function (toRound, decimalPlaces) {
  decimalPlaces = decimalPlaces ? decimalPlaces : 0;
  return (
    Math.round(toRound * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  );
};

export const formatPercentage = function (value, decimalPlaces) {
  decimalPlaces = decimalPlaces ? decimalPlaces : 0;
  if (isNaN(value)) {
    return '-%';
  }
  return (parseFloat(value) * 100).toFixed(decimalPlaces) + '%';
};

export const calculateFormattedAverage = function (numerator, denominator) {
  if (denominator === 0) {
    return '.000';
  } else if (numerator === denominator) {
    return '1.000';
  } else {
    return (numerator / denominator).toFixed(3).substr(1);
  }
};

export function percentageIncrease(start, end) {
  if (start === 0) {
    // Avoid division by zero if the starting value is zero
    console.warn(
      'Cannot calculate percentage increase when the starting value is zero.'
    );
    return null;
  }

  // Calculate the percentage increase formula: ((end - start) / start) * 100
  const percentageIncrease = (end - start) / Math.abs(start);

  return formatPercentage(percentageIncrease);
}

export const sortJson = function sortJson(object) {
  if (Array.isArray(object)) {
    let result = [];
    for (let el of object) {
      result.push(sortJson(el));
    }
    return result;
  } else if (isObject(object)) {
    let keys = Object.keys(object);
    keys.sort();
    var newObject = {};
    for (let key of keys) {
      newObject[key] = sortJson(object[key]);
    }
    return newObject;
  } else {
    return object;
  }
};

export const isObject = function isObject(input) {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
};

export const sleep = async function (ms) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(ms);
    }, ms);
  });
};

const exp = {
  factorial,
  binomial,
  secondsToString,
  getHash,
  getObjectString,
  merge,
  truncate,
  round,
  formatPercentage,
  sortJson,
};

export default exp;

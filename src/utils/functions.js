export const normalize = function (x, A, B, C, D) {
  return C + ((x - A) * (D - C)) / (B - A);
};

// NOTE: Does not modify in place, it creates a new array and returns the result
export const sortObjectsByDate = function (list, { isAsc, eqCb }) {
  return list.sort((a, b) => {
    if (a.date === b.date) {
      if (eqCb) {
        return eqCb(a, b);
      } else {
        return a.id < b.id ? -1 : 1;
      }
    }
    if (isAsc) {
      return a.date < b.date ? -1 : 1;
    } else {
      return a.date < b.date ? 1 : -1;
    }
  });
};

export const getShallowCopy = function (array) {
  return [...array];
};

export const toClientDate = function (serverDate) {
  return new Date(serverDate * 1000).toISOString().substring(0, 10);
};

/*
// Async decompression in web worker
export const decompress = async function (inputString) {
  return new Promise((resolve, reject) => {
    let worker = new URL(
      'web-workers/compress-worker.js',
      window.location.origin
    );
    const compressWorker = new Worker(worker);
    compressWorker.onmessage = function (e) {
      resolve(e.data);
    };
    compressWorker.postMessage(
      JSON.stringify({ compress: false, content: inputString })
    );
  });
};

// Async compression in web worker
export const compress = async function (inputString) {
  return new Promise((resolve, reject) => {
    let worker = new URL(
      'web-workers/compress-worker.js',
      window.location.origin
    );
    const compressWorker = new Worker(worker);
    compressWorker.onmessage = function (e) {
      resolve(e.data);
    };
    compressWorker.postMessage(
      JSON.stringify({ compress: true, content: inputString })
    );
  });
};
*/
export const mean = function (values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export const stdDev = function (values) {
  const µ = mean(values);
  const addedSquareDiffs = values
    .map((val) => val - µ)
    .map((diff) => diff ** 2)
    .reduce((sum, v) => sum + v, 0);
  const variance = addedSquareDiffs / (values.length - 1);
  return Math.sqrt(variance);
};

export const correlation = function (x, y) {
  const µ = { x: mean(x), y: mean(y) };
  const s = { x: stdDev(x), y: stdDev(y) };
  const addedMultipliedDifferences = x
    .map((val, i) => (val - µ.x) * (y[i] - µ.y))
    .reduce((sum, v) => sum + v, 0);
  const dividedByDevs = addedMultipliedDifferences / (s.x * s.y);
  return dividedByDevs / (x.length - 1);
};

export const isStatSig = function (r, n) {
  if (r === undefined || isNaN(r)) {
    return false;
  }
  let twoTailFiveSigTTable = {
    1: 12.71,
    2: 4.3,
    3: 3.18,
    4: 2.78,
    4: 2.57,
    5: 2.45,
    6: 2.37,
    7: 2.31,
    8: 2.26,
    9: 2.23,
    10: 2.2,
    11: 2.18,
    12: 2.16,
    13: 2.15,
    14: 2.13,
    15: 2.12,
    16: 2.11,
    17: 2.1,
    18: 2.09,
    19: 2.09,
    20: 2.08,
    21: 2.07,
    22: 2.07,
    23: 2.06,
    24: 2.06,
    25: 2.06,
    26: 2.05,
    27: 2.05,
    28: 2.05,
    29: 2.04,
    30: 2.03,
    35: 2.02,
    40: 2.01,
    45: 2.01,
    50: 2,
    55: 2,
    60: 2,
    65: 1.99,
    70: 1.99,
    95: 1.98,
    100: 1.97,
    500: 1.97,
  };

  // Degrees of freedom = n-2 for correlations
  let df = n - 2;
  if (df <= 0) {
    return false;
  }
  let tStat = r / Math.sqrt((1 - r ** 2) / df);

  let pValue = undefined;
  let counter = 0;
  while (true) {
    pValue = twoTailFiveSigTTable[df - counter];
    counter++;
    if (pValue !== undefined) {
      break;
    }
  }

  return Math.abs(tStat) > pValue;
};

export const autoCorrelation = function (input, lag) {
  let leadingArray = [];
  let laggingArray = [];
  for (let i = lag; i < input.length - lag; i++) {
    leadingArray.push(input[i]);
    laggingArray.push(input[i - lag]);
  }
  let r = correlation(leadingArray, laggingArray);
  let n = laggingArray.length;
  //if (isStatSig(r, n)) {
  //  console.log('SIG', leadingArray);
  //}

  return r;
};

export const logout = async function (state, dialog, setRoute) {
  let response = await state.requestAuth('POST', 'server/account/logout');
  if (response.status === 204) {
    state.resetState();
    dialog.show_notification('Logout successful.', function () {
      setRoute('/menu/login');
    });
  } else {
    // If we're offline we can't delete our sid cookie in javascript because is has the httpOnly header, it has to be done from the server.
    // Instead we'll delete our nonHttpOnlyToken cookie locally. Since both are required for performing an authenticated request
    // the server will invalidate the sid cookie next time any request succeeds.
    document.cookie =
      'nonHttpOnlyToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    state.resetState();
    dialog.show_notification('Logout successful.', function () {
      setRoute('/menu/login');
    });
  }
};

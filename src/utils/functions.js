import { compress as compressLib } from 'lz-string';

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

// Async decompression in web worker
export const decompress = async function (inputString) {
  return new Promise((resolve, reject) => {
    let worker = new URL('../workers/compress-worker.js', import.meta.url);
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
    let worker = new URL('../workers/compress-worker.js', import.meta.url);
    const compressWorker = new Worker(worker);
    compressWorker.onmessage = function (e) {
      resolve(e.data);
    };
    compressWorker.postMessage(
      JSON.stringify({ compress: true, content: inputString })
    );
  });
};

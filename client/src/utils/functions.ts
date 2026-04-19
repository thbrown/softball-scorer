import SharedLib from 'shared-lib';
import { getGlobalState } from '../state';
import expose from '../expose';

export const normalize = function (
  x: number,
  A: number,
  B: number,
  C: number,
  D: number
): number {
  return C + ((x - A) * (D - C)) / (B - A);
};

// NOTE: Does not modify in place, it creates a new array and returns the result
export const sortObjectsByDate = function <
  T extends { date?: number; id: string }
>(
  listInput: T[],
  { isAsc, eqCb }: { isAsc?: boolean; eqCb?: (a: T, b: T) => number }
): T[] {
  const list = listInput.slice();
  return list.sort((a, b) => {
    const dateA = a.date ?? 0;
    const dateB = b.date ?? 0;
    if (dateA === dateB) {
      if (eqCb) {
        return eqCb(a, b);
      } else {
        return a.id < b.id ? -1 : 1;
      }
    }
    if (isAsc) {
      return dateA < dateB ? -1 : 1;
    } else {
      return dateA < dateB ? 1 : -1;
    }
  });
};

export const getShallowCopy = function <T>(array: T[]): T[] {
  return [...array];
};

export const toClientDate = function (serverDate: number): string {
  return new Date(serverDate * 1000).toISOString().substring(0, 10);
};

export const distance = function (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const result = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return result;
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
export const mean = function (values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export const stdDev = function (values: number[]): number {
  const µ = mean(values);
  const addedSquareDiffs = values
    .map((val) => val - µ)
    .map((diff) => diff ** 2)
    .reduce((sum, v) => sum + v, 0);
  const variance = addedSquareDiffs / (values.length - 1);
  return Math.sqrt(variance);
};

export const correlation = function (x: number[], y: number[]): number {
  const µ = { x: mean(x), y: mean(y) };
  const s = { x: stdDev(x), y: stdDev(y) };
  const addedMultipliedDifferences = x
    .map((val, i) => (val - µ.x) * (y[i] - µ.y))
    .reduce((sum, v) => sum + v, 0);
  const dividedByDevs = addedMultipliedDifferences / (s.x * s.y);
  return dividedByDevs / (x.length - 1);
};

export const isStatSig = function (r: number | undefined, n: number): boolean {
  if (r === undefined || isNaN(r)) {
    return false;
  }
  const twoTailFiveSigTTable: Record<number, number> = {
    1: 12.71,
    2: 4.3,
    3: 3.18,
    4: 2.78,
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
  const df = n - 2;
  if (df <= 0) {
    return false;
  }
  const tStat = r / Math.sqrt((1 - r ** 2) / df);

  let pValue: number | undefined = undefined;
  let counter = 0;
  while (pValue === undefined) {
    pValue = twoTailFiveSigTTable[df - counter];
    counter++;
  }

  return Math.abs(tStat) > pValue;
};

export const autoCorrelation = function (input: number[], lag: number): number {
  const leadingArray: number[] = [];
  const laggingArray: number[] = [];
  for (let i = lag; i < input.length - lag; i++) {
    leadingArray.push(input[i]);
    laggingArray.push(input[i - lag]);
  }
  const r = correlation(leadingArray, laggingArray);
  const n = laggingArray.length;
  //if (isStatSig(r, n)) {
  //  console.log('SIG', leadingArray);
  //}

  return r;
};

interface Dialog {
  show_notification: (text: React.ReactNode, onConfirm?: () => void) => void;
  show_confirm: (
    text: React.ReactNode,
    onConfirm?: () => void,
    onCancel?: () => void
  ) => void;
  show_input: (
    nodeOrDefaultText: React.ReactNode | string,
    onConfirm?: (value: string) => void,
    onCancel?: () => void,
    startingValue?: string
  ) => void;
  show_yes_no_cancel: (
    text: React.ReactNode,
    onYes?: () => void,
    onNo?: () => void,
    onCancel?: () => void
  ) => void;
  set_shift_req: (value: boolean) => void;
  hide: () => void;
  is_visible: () => boolean;
}

export const logout = async function (
  dialog: Dialog,
  setRoute: (route: string) => void
): Promise<void> {
  const response = await getGlobalState().requestAuth(
    'POST',
    'server/account/logout'
  );
  console.log('LOGGING OUT', response.status);
  if (response.status === 204) {
    getGlobalState().resetState();
    dialog.show_notification('Logout successful.', function () {
      setRoute('/menu/login');
    });
  } else {
    // If we're offline we can't delete our sid cookie in javascript because is has the httpOnly header, it has to be done from the server.
    // Instead we'll delete our nonHttpOnlyToken cookie locally. Since both are required for performing an authenticated request
    // the server will invalidate the sid cookie next time any request succeeds.
    document.cookie =
      'nonHttpOnlyToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    getGlobalState().resetState();
    dialog.show_notification('Logout successful.', function () {
      setRoute('/menu/login');
    });
  }
};

export const findPreviousObject = function <T extends { id: string }>(
  objects: T[],
  targetId: string
): T | null {
  const targetIndex = objects.findIndex((obj) => obj.id === targetId);
  if (targetIndex === -1 || targetIndex === 0) {
    return null; // not found or first object in array
  }
  return objects[targetIndex - 1];
};

// Remove undefined, null, and empty arrays
export const cleanObject = function <T>(obj: T): T {
  // Check if the input is an object
  if (typeof obj === 'object' && obj !== null) {
    // Loop through each key in the object
    Object.keys(obj).forEach((key) => {
      const typedKey = key as keyof T;
      // Check if the value of the key is undefined or null
      if (obj[typedKey] === undefined || obj[typedKey] === null) {
        // Remove the key from the object
        delete obj[typedKey];
      } else if (Array.isArray(obj[typedKey])) {
        // If the value is an array, recursively clean the array
        const arr = obj[typedKey] as unknown[];
        const filtered = arr.filter(
          (element) => element !== undefined && element !== null
        );
        const mapped = filtered.map((element) => {
          if (Array.isArray(element)) {
            return element.filter(
              (innerElement) =>
                innerElement !== undefined && innerElement !== null
            );
          }
          return element;
        });
        (obj[typedKey] as unknown) = mapped;
        // Remove the key if the array is empty
        if (mapped.length === 0) {
          delete obj[typedKey];
        }
      } else if (typeof obj[typedKey] === 'object') {
        // If the value is an object, recursively clean the object
        (obj[typedKey] as unknown) = cleanObject(obj[typedKey]);
        // Remove the key if the object is empty
        if (Object.keys(obj[typedKey] as object).length === 0) {
          delete obj[typedKey];
        }
      }
    });
  }
  // Return the cleaned object
  return obj;
};

export function findLastIndex<T>(
  arr: T[],
  callback: (item: T, index: number, array: T[]) => boolean,
  startIndex?: number
): number {
  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function. Was ' + typeof callback);
  }

  if (startIndex === undefined) {
    startIndex = arr.length - 1;
  } else {
    if (typeof startIndex !== 'number') {
      throw new TypeError(
        'startIndex must be a number. Was ' + typeof startIndex
      );
    }

    if (startIndex < 0) {
      startIndex = arr.length + startIndex;
    }
  }

  for (let i = startIndex; i >= 0; i--) {
    if (callback(arr[i], i, arr)) {
      return i;
    }
  }

  console.warn("Couldn't find last index in ", arr, arr);
  return -1;
}

export function reRender(): void {
  expose.set_state('main', {
    render: true,
  });
}

// TODO: don't go through hex, just go dec to base62
export function dec2hex(dec: number): string {
  return ('0' + dec.toString(16)).substr(-2);
}

export function getNextId(): string {
  const len = 20;
  const arr = new Uint8Array((len || 40) / 2);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr, dec2hex).join('');
  return SharedLib.idUtils.hexToBase62(hex).padStart(14, '0');
}

export function getNextName(oldName: string): string {
  let newName = 'Duplicate of ' + oldName;
  try {
    // Try fancy renaming - like windows does when you copy a file
    const regex = /\([\d]+\)$/; // There is a minor bug here with leading zeros
    const matches = regex.exec(oldName);
    if (matches && matches.length > 0) {
      const nextNumber = parseInt(matches[0].slice(1, -1)) + 1;
      const slicedOriginal = oldName.slice(0, -matches[0].length);
      newName = `${slicedOriginal}(${nextNumber})`;
    } else {
      newName = `${oldName} (2)`;
    }
  } catch (e) {
    console.warn('regex failure', e);
  }
  return newName;
}

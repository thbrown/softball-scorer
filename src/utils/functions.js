export const normalize = function(x, A, B, C, D) {
  return C + ((x - A) * (D - C)) / (B - A);
};

// NOTE: Does not modify in place, it creates a new array and returns the result
export const sortObjectsByDate = function(list, { isAsc, eqCb }) {
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

export const getShallowCopy = function(array) {
  return [...array];
};

export const toClientDate = function(serverDate) {
  return new Date(serverDate * 1000).toISOString().substring(0, 10);
};

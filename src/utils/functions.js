export const normalize = function(x, A, B, C, D) {
  return C + ((x - A) * (D - C)) / (B - A);
};

export const sortObjectsByDate = function(list, isAsc) {
  return list.sort((a, b) => {
    if (a.date === b.date) {
      return 0;
    }
    if (isAsc) {
      return a.date < b.date ? -1 : 1;
    } else {
      return a.date < b.date ? 1 : -1;
    }
  });
};

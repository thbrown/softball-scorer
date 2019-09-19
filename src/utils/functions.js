export const normalize = function(x, A, B, C, D) {
  return C + ((x - A) * (D - C)) / (B - A);
};

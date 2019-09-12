let timeoutUtil = class TimeoutUtil {
  constructor(timeoutMs, onTimeout) {
    this.timeoutMs = timeoutMs;
    this.onTimeout = onTimeout;
    this.timer = setTimeout(onTimeout, timeoutMs);
  }

  reset() {
    clearTimeout(this.timer);
    this.timer = setTimeout(this.onTimeout, this.timeoutMs);
  }

  cancel() {
    clearTimeout(this.timer);
  }
};

module.exports = timeoutUtil;

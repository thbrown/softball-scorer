const timeoutUtil = class TimeoutUtil {
  timer: NodeJS.Timeout;
  timeoutMs: number;
  onTimeout: () => void;
  constructor(timeoutMs: number, onTimeout: () => void) {
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

export default timeoutUtil;

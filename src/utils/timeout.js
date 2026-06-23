export class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label]
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, label = 'Operation') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export class Deadline {
  /**
   * @param {number} totalMs
   */
  constructor(totalMs) {
    this.totalMs = totalMs;
    this.start = performance.now();
    this.controller = new AbortController();
  }

  elapsed() {
    return Math.round(performance.now() - this.start);
  }

  remaining() {
    return Math.max(0, this.totalMs - this.elapsed());
  }

  get signal() {
    return this.controller.signal;
  }

  isExpired() {
    return this.elapsed() >= this.totalMs;
  }

  abort() {
    this.controller.abort();
  }

  /**
   * @template T
   * @param {Promise<T>} promise
   * @param {number} sliceMs
   * @returns {Promise<T>}
   */
  race(promise, sliceMs) {
    const budget = Math.min(sliceMs, this.remaining());
    if (budget <= 0) {
      this.abort();
      return Promise.reject(new TimeoutError('Global deadline exceeded'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.abort();
        reject(new TimeoutError('Generation exceeded 10 second limit. Try lowering difficulty or density.'));
      }, budget);

      promise
        .then((v) => {
          clearTimeout(timer);
          if (this.isExpired()) {
            reject(new TimeoutError('Generation exceeded 10 second limit. Try lowering difficulty or density.'));
          } else {
            resolve(v);
          }
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });
  }
}

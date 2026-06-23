/**
 * Mulberry32 PRNG — deterministic pseudo-random from integer seed.
 */
export function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    nextInt(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
  };
}

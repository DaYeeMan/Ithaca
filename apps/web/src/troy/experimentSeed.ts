/** Fresh browser entropy for a new experiment; the engine remains reproducible. */
export function freshSeed(previous?: number): number {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff;
  return seed === previous ? (seed + 1) & 0x7fffffff : seed;
}

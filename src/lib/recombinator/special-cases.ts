// src/lib/recombinator/special-cases.ts
import type { Item } from './types.js';
import type { Rng } from './rng.js';

export type OneOneOutcome = '1p/0s' | '0p/1s' | '1p/1s';

/**
 * Guide §5: the only exception to Table 1 is 1p/0s + 0p/1s.
 * No white item; 33/33/33 over (1p/0s, 0p/1s, 1p/1s).
 */
export function isOneOneSpecialCase(a: Item, b: Item): boolean {
  const totalP = a.prefixes.length + b.prefixes.length;
  const totalS = a.suffixes.length + b.suffixes.length;
  return totalP === 1 && totalS === 1;
}

export function sampleOneOneOutcome(rng: Rng): OneOneOutcome {
  const r = rng.next();
  if (r < 1 / 3) return '1p/0s';
  if (r < 2 / 3) return '0p/1s';
  return '1p/1s';
}

// src/lib/recombinator/table1.ts
import type { Rng } from './rng.js';

/**
 * Table 1 from guide.txt §5: P(final mod count | total inputs in pool).
 * Indexed [totalInputs][finalCount]. Final count ranges 0..3.
 *
 * Source: Reddit guide "TLDR: Recombinator new use cases = GOOD" (3.25 Settlers).
 */
export const TABLE1: Record<number, [number, number, number, number]> = {
  0: [1, 0, 0, 0],
  1: [0.41, 0.59, 0, 0],
  2: [0, 0.67, 0.33, 0],
  3: [0, 0.39, 0.52, 0.1],
  4: [0, 0.11, 0.59, 0.31],
  5: [0, 0, 0.43, 0.57],
  6: [0, 0, 0.28, 0.72],
};

export function expectedDistribution(totalInputs: number): readonly number[] {
  const row = TABLE1[totalInputs];
  if (!row) throw new Error(`Table 1: total inputs ${totalInputs} out of range (0..6)`);
  return row;
}

export function sampleModCount(totalInputs: number, rng: Rng): number {
  const row = expectedDistribution(totalInputs);
  return rng.pickWeighted([...row]);
}

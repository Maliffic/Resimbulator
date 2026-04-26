// src/lib/recombinator/probability.ts
import type { Item, Mod, RecombineResult } from './types.js';
import type { Rng } from './rng.js';
import { simulateBatch } from './simulate.js';

export function allDesiredHit(
  result: Pick<RecombineResult, 'prefixes' | 'suffixes'>,
  desired: Mod[],
): boolean {
  const ids = new Set([...result.prefixes, ...result.suffixes].map((m) => m.id));
  return desired.every((m) => ids.has(m.id));
}

export function probabilityMonteCarlo(
  item1: Item,
  item2: Item,
  desired: Mod[],
  trials: number,
  rng: Rng,
): number {
  if (desired.length === 0) return 1;
  const results = simulateBatch(item1, item2, trials, rng);
  const hits = results.filter((r) => allDesiredHit(r, desired)).length;
  return hits / trials;
}

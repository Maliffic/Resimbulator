// src/lib/recombinator/simulate.ts
import type { Item, Mod, RecombineResult } from './types.js';
import type { Rng } from './rng.js';
import { sampleModCount } from './table1.js';
import { pickBase, pickFillOrder, pickEligibleMods } from './pick.js';
import { isExclusive } from './eligibility.js';
import { isOneOneSpecialCase, sampleOneOneOutcome } from './special-cases.js';

export function simulateOnce(item1: Item, item2: Item, rng: Rng): RecombineResult {
  if (isOneOneSpecialCase(item1, item2)) return simulateOneOne(item1, item2, rng);

  const basePick = pickBase(item1, item2, rng);
  const prefixPool = [...item1.prefixes, ...item2.prefixes];
  const suffixPool = [...item1.suffixes, ...item2.suffixes];
  const totalP = prefixPool.length;
  const totalS = suffixPool.length;
  const targetP = sampleModCount(totalP, rng);
  const targetS = sampleModCount(totalS, rng);
  const order = pickFillOrder(rng);

  let exclusivePicked = false;
  let prefixes: Mod[] = [];
  let suffixes: Mod[] = [];

  if (order === 'prefix-first') {
    const r1 = pickEligibleMods(prefixPool, targetP, basePick.baseContext, exclusivePicked, rng);
    prefixes = r1.picked;
    exclusivePicked = exclusivePicked || prefixes.some(isExclusive);
    const r2 = pickEligibleMods(suffixPool, targetS, basePick.baseContext, exclusivePicked, rng);
    suffixes = r2.picked;
  } else {
    const r1 = pickEligibleMods(suffixPool, targetS, basePick.baseContext, exclusivePicked, rng);
    suffixes = r1.picked;
    exclusivePicked = exclusivePicked || suffixes.some(isExclusive);
    const r2 = pickEligibleMods(prefixPool, targetP, basePick.baseContext, exclusivePicked, rng);
    prefixes = r2.picked;
  }

  return {
    baseFromItem: basePick.from,
    baseContext: basePick.baseContext,
    prefixes,
    suffixes,
    itemLevel: basePick.itemLevel,
  };
}

function simulateOneOne(item1: Item, item2: Item, rng: Rng): RecombineResult {
  const basePick = pickBase(item1, item2, rng);
  const outcome = sampleOneOneOutcome(rng);
  const allP = [...item1.prefixes, ...item2.prefixes];
  const allS = [...item1.suffixes, ...item2.suffixes];

  let prefixes: Mod[] = [];
  let suffixes: Mod[] = [];
  if (outcome === '1p/0s' || outcome === '1p/1s') {
    prefixes = pickEligibleMods(allP, 1, basePick.baseContext, false, rng).picked;
  }
  if (outcome === '0p/1s' || outcome === '1p/1s') {
    const exclusivePicked = prefixes.some(isExclusive);
    suffixes = pickEligibleMods(allS, 1, basePick.baseContext, exclusivePicked, rng).picked;
  }

  return {
    baseFromItem: basePick.from,
    baseContext: basePick.baseContext,
    prefixes,
    suffixes,
    itemLevel: basePick.itemLevel,
  };
}

export function simulateBatch(item1: Item, item2: Item, n: number, rng: Rng): RecombineResult[] {
  const out: RecombineResult[] = [];
  for (let i = 0; i < n; i++) out.push(simulateOnce(item1, item2, rng));
  return out;
}

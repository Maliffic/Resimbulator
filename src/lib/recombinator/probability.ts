// src/lib/recombinator/probability.ts
import type { Item, Mod, RecombineResult, BaseContext } from './types.js';
import type { Rng } from './rng.js';
import { simulateBatch } from './simulate.js';
import { TABLE1 } from './table1.js';
import { isOneOneSpecialCase } from './special-cases.js';
import { isEligible, isExclusive } from './eligibility.js';
import { computeItemLevel } from './ilevel.js';

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

/**
 * Exact-enumeration probability of getting all desired mods on the recombined item.
 *
 * Enumerates over: (which base wins), (prefix count outcome), (suffix count outcome),
 * (fill order), then for each terminal scenario computes the conditional probability
 * that every desired mod is in the picked subset using a uniform-without-replacement
 * combinatorial counter that respects exclusive lockout and NNN/Fractured eligibility.
 */
export function probabilityExact(item1: Item, item2: Item, desired: Mod[]): number {
  if (desired.length === 0) return 1;
  const split = probabilityExactByBase(item1, item2, desired);
  return split.weighted;
}

/**
 * Per-base conditional probabilities. `fromItem1` is P(all desired on result | base picked from item 1),
 * `fromItem2` is the same for item 2, and `weighted` is the unconditional probability (0.5 * fromItem1 + 0.5 * fromItem2).
 *
 * Useful for the NNN ladder strategy: when one base's NNN mods can't transfer to the other, the
 * per-base split shows where the success comes from.
 */
export function probabilityExactByBase(
  item1: Item,
  item2: Item,
  desired: Mod[],
): { fromItem1: number; fromItem2: number; weighted: number } {
  if (desired.length === 0) return { fromItem1: 1, fromItem2: 1, weighted: 1 };

  if (isOneOneSpecialCase(item1, item2)) {
    const a = probExactOneOneForBase(item1, item2, desired, 1);
    const b = probExactOneOneForBase(item1, item2, desired, 2);
    return { fromItem1: a, fromItem2: b, weighted: 0.5 * a + 0.5 * b };
  }

  const a = probExactStandardForBase(item1, item2, desired, 1);
  const b = probExactStandardForBase(item1, item2, desired, 2);
  return { fromItem1: a, fromItem2: b, weighted: 0.5 * a + 0.5 * b };
}

function probExactStandardForBase(item1: Item, item2: Item, desired: Mod[], fromPick: 1 | 2): number {
  const prefixPool = [...item1.prefixes, ...item2.prefixes];
  const suffixPool = [...item1.suffixes, ...item2.suffixes];
  const totalP = prefixPool.length;
  const totalS = suffixPool.length;
  const ilvl = computeItemLevel(item1.itemLevel, item2.itemLevel);
  const chosen = fromPick === 1 ? item1 : item2;
  const baseCtx: BaseContext = {
    base: chosen.base,
    itemClass: chosen.itemClass,
    attributeBase: chosen.attributeBase,
    defenceTags: chosen.defenceTags,
    influence: chosen.influence,
    itemLevel: ilvl,
    hostItemId: chosen.id,
  };
  const rowP = TABLE1[totalP]!;
  const rowS = TABLE1[totalS]!;
  let total = 0;
  for (let nP = 0; nP <= 3; nP++) {
    for (let nS = 0; nS <= 3; nS++) {
      const wP = rowP[nP] ?? 0;
      const wS = rowS[nS] ?? 0;
      if (wP === 0 || wS === 0) continue;
      for (const order of ['prefix-first', 'suffix-first'] as const) {
        const orderProb = 0.5;
        const condProb = probConditional(prefixPool, suffixPool, nP, nS, baseCtx, order, desired);
        total += wP * wS * orderProb * condProb;
      }
    }
  }
  return total;
}

/**
 * Probability that all desired mods are picked given fixed (nP, nS, base, fill order).
 * Iterates over all ordered fill sequences with exclusive lockout, summing the indicator
 * of "every desired in result". Pool sizes ≤6+6 keep this tractable.
 */
function probConditional(
  prefixPool: Mod[],
  suffixPool: Mod[],
  nP: number,
  nS: number,
  base: BaseContext,
  order: 'prefix-first' | 'suffix-first',
  desired: Mod[],
): number {
  const desiredSet = new Set(desired.map((m) => m.id));

  // Recursive uniform-pick enumerator. Returns probability of "all desired present in picked"
  // given we still need to pick (remainingP, remainingS) more mods.
  type State = {
    pickedP: string[]; pickedS: string[];
    remainingP: number; remainingS: number;
    exclusiveLocked: boolean;
    phase: 'prefix' | 'suffix';
  };

  function step(s: State): number {
    if (s.remainingP === 0 && s.remainingS === 0) {
      const all = new Set([...s.pickedP, ...s.pickedS]);
      for (const id of desiredSet) if (!all.has(id)) return 0;
      return 1;
    }

    // Decide which pool to pull from.
    let pullPrefix: boolean;
    if (order === 'prefix-first') {
      pullPrefix = s.remainingP > 0;
    } else {
      pullPrefix = !(s.remainingS > 0);
    }

    const pool = pullPrefix ? prefixPool : suffixPool;
    const already = pullPrefix ? s.pickedP : s.pickedS;
    const eligible = pool.filter((m) => !already.includes(m.id) && isEligible(m, base, s.exclusiveLocked));
    if (eligible.length === 0) {
      // Current pool exhausted — mirror the simulator's behavior: stop filling this pool,
      // continue with the other pool if it still has remaining picks.
      const newState: State = {
        ...s,
        remainingP: pullPrefix ? 0 : s.remainingP,
        remainingS: pullPrefix ? s.remainingS : 0,
      };
      if (newState.remainingP === 0 && newState.remainingS === 0) {
        // Both pools done. Check desired.
        const all = new Set([...s.pickedP, ...s.pickedS]);
        for (const id of desiredSet) if (!all.has(id)) return 0;
        return 1;
      }
      return step(newState);
    }

    const w = 1 / eligible.length;
    let acc = 0;
    for (const cand of eligible) {
      const becomesLocked = s.exclusiveLocked || isExclusive(cand);
      const next: State = {
        pickedP: pullPrefix ? [...s.pickedP, cand.id] : s.pickedP,
        pickedS: pullPrefix ? s.pickedS : [...s.pickedS, cand.id],
        remainingP: pullPrefix ? s.remainingP - 1 : s.remainingP,
        remainingS: pullPrefix ? s.remainingS : s.remainingS - 1,
        exclusiveLocked: becomesLocked,
        phase: s.phase,
      };
      acc += w * step(next);
    }
    return acc;
  }

  return step({
    pickedP: [], pickedS: [],
    remainingP: nP, remainingS: nS,
    exclusiveLocked: false,
    phase: order === 'prefix-first' ? 'prefix' : 'suffix',
  });
}

function probExactOneOneForBase(item1: Item, item2: Item, desired: Mod[], fromPick: 1 | 2): number {
  const ilvl = computeItemLevel(item1.itemLevel, item2.itemLevel);
  const chosen = fromPick === 1 ? item1 : item2;
  const baseCtx: BaseContext = {
    base: chosen.base,
    itemClass: chosen.itemClass,
    attributeBase: chosen.attributeBase,
    defenceTags: chosen.defenceTags,
    influence: chosen.influence,
    itemLevel: ilvl,
    hostItemId: chosen.id,
  };
  const allP = [...item1.prefixes, ...item2.prefixes];
  const allS = [...item1.suffixes, ...item2.suffixes];
  // 1p/0s, 0p/1s, 1p/1s each 1/3.
  let total = 0;
  total += (1 / 3) * probConditional(allP, allS, 1, 0, baseCtx, 'prefix-first', desired);
  total += (1 / 3) * probConditional(allP, allS, 0, 1, baseCtx, 'suffix-first', desired);
  total += (1 / 3) * 0.5 * (
    probConditional(allP, allS, 1, 1, baseCtx, 'prefix-first', desired) +
    probConditional(allP, allS, 1, 1, baseCtx, 'suffix-first', desired)
  );
  return total;
}

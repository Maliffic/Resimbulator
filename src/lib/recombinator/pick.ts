// src/lib/recombinator/pick.ts
import type { BaseContext, Item, Mod } from './types.js';
import type { Rng } from './rng.js';
import { isEligible, isExclusive } from './eligibility.js';
import { computeItemLevel } from './ilevel.js';

export type FillOrder = 'prefix-first' | 'suffix-first';

export type BasePick = {
  from: 1 | 2;
  baseContext: BaseContext;
  itemLevel: number;
};

export function pickBase(item1: Item, item2: Item, rng: Rng): BasePick {
  const from: 1 | 2 = rng.next() < 0.5 ? 1 : 2;
  const chosen = from === 1 ? item1 : item2;
  const ilvl = computeItemLevel(item1.itemLevel, item2.itemLevel);
  return {
    from,
    baseContext: {
      base: chosen.base,
      itemClass: chosen.itemClass,
      attributeBase: chosen.attributeBase,
      defenceTags: chosen.defenceTags,
      influence: chosen.influence,
      itemLevel: ilvl,
      hostItemId: chosen.id,
    },
    itemLevel: ilvl,
  };
}

export function pickFillOrder(rng: Rng): FillOrder {
  return rng.next() < 0.5 ? 'prefix-first' : 'suffix-first';
}

export function pickEligibleMods(
  pool: Mod[],
  count: number,
  base: BaseContext,
  exclusiveAlreadyPicked: boolean,
  rng: Rng,
): { picked: Mod[]; pickedExclusive: boolean } {
  const picked: Mod[] = [];
  let exclusiveSoFar = exclusiveAlreadyPicked;
  // Eligibility is recomputed each step because picking an exclusive locks others out.
  while (picked.length < count) {
    const eligible = pool.filter(
      (m) => !picked.includes(m) && isEligible(m, base, exclusiveSoFar),
    );
    if (eligible.length === 0) break; // can't reach target count; guide notes this is allowed
    const chosen = rng.pickOne(eligible);
    picked.push(chosen);
    if (isExclusive(chosen)) exclusiveSoFar = true;
  }
  return { picked, pickedExclusive: exclusiveSoFar !== exclusiveAlreadyPicked };
}

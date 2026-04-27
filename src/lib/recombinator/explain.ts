// src/lib/recombinator/explain.ts
//
// Builds a structured "why is the chance this number?" breakdown for a given pair of
// items + desired mods. Reuses the engine's eligibility rules but doesn't recompute
// the actual probabilities — those come from probabilityExactByBase.

import type { BaseContext, Item, Mod } from './types.js';
import { isEligible } from './eligibility.js';
import { probabilityExactByBase } from './probability.js';
import { expectedDistribution } from './table1.js';
import { computeItemLevel } from './ilevel.js';

export type PoolMod = {
  mod: Mod;
  sourceItem: 1 | 2;
  eligibleFromBase1: boolean;
  eligibleFromBase2: boolean;
  reasonBase1?: string;
  reasonBase2?: string;
};

export type Explanation = {
  base1: BaseContext;
  base2: BaseContext;
  prefixPool: PoolMod[];
  suffixPool: PoolMod[];
  /** Table 1 row for the prefix-pool size: [P(0), P(1), P(2), P(3)]. */
  prefixDistribution: readonly number[];
  suffixDistribution: readonly number[];
  fromBase1: number;
  fromBase2: number;
  weighted: number;
  desiredCount: number;
};

function makeBase(item: Item, ilvl: number): BaseContext {
  return {
    base: item.base,
    itemClass: item.itemClass,
    attributeBase: item.attributeBase,
    defenceTags: item.defenceTags,
    influence: item.influence,
    itemLevel: ilvl,
    hostItemId: item.id,
  };
}

function ineligibilityReason(mod: Mod, base: BaseContext): string | undefined {
  // We only call this when isEligible(mod, base, false) returned false.
  switch (mod.category) {
    case 'Implicit':
      return 'implicits do not transfer';
    case 'Fractured':
      return mod.hostItemId === base.hostItemId
        ? undefined
        : 'fractured — only travels if its host item is the chosen base';
    case 'NNN_Influenced':
      if (!mod.requiresInfluence) return undefined;
      return base.influence
        ? `requires ${mod.requiresInfluence} influence (base has ${base.influence})`
        : `requires ${mod.requiresInfluence} influence (base has none)`;
    case 'NNN_Defence':
      return mod.requiresDefenceTag
        ? `requires ${mod.requiresDefenceTag.replace('_', ' ')} on the base`
        : undefined;
    case 'NNN_Attribute':
      return mod.allowedAttributeBases
        ? `requires base attribute in ${mod.allowedAttributeBases.join('/')}`
        : undefined;
    default:
      return undefined;
  }
}

function buildPoolEntry(
  mod: Mod,
  sourceItem: 1 | 2,
  base1: BaseContext,
  base2: BaseContext,
): PoolMod {
  const eligibleFromBase1 = isEligible(mod, base1, false);
  const eligibleFromBase2 = isEligible(mod, base2, false);
  const entry: PoolMod = { mod, sourceItem, eligibleFromBase1, eligibleFromBase2 };
  if (!eligibleFromBase1) {
    const r = ineligibilityReason(mod, base1);
    if (r) entry.reasonBase1 = r;
  }
  if (!eligibleFromBase2) {
    const r = ineligibilityReason(mod, base2);
    if (r) entry.reasonBase2 = r;
  }
  return entry;
}

export function explainScenario(item1: Item, item2: Item, desired: Mod[]): Explanation {
  const ilvl = computeItemLevel(item1.itemLevel, item2.itemLevel);
  const base1 = makeBase(item1, ilvl);
  const base2 = makeBase(item2, ilvl);

  const prefixPool: PoolMod[] = [
    ...item1.prefixes.map((m) => buildPoolEntry(m, 1, base1, base2)),
    ...item2.prefixes.map((m) => buildPoolEntry(m, 2, base1, base2)),
  ];
  const suffixPool: PoolMod[] = [
    ...item1.suffixes.map((m) => buildPoolEntry(m, 1, base1, base2)),
    ...item2.suffixes.map((m) => buildPoolEntry(m, 2, base1, base2)),
  ];

  const prefixDistribution = prefixPool.length <= 6
    ? expectedDistribution(prefixPool.length)
    : [0, 0, 0, 0];
  const suffixDistribution = suffixPool.length <= 6
    ? expectedDistribution(suffixPool.length)
    : [0, 0, 0, 0];

  const split = probabilityExactByBase(item1, item2, desired);

  return {
    base1,
    base2,
    prefixPool,
    suffixPool,
    prefixDistribution,
    suffixDistribution,
    fromBase1: split.fromItem1,
    fromBase2: split.fromItem2,
    weighted: split.weighted,
    desiredCount: desired.length,
  };
}

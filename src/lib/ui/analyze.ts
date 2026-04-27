// src/lib/ui/analyze.ts
// Helpers for the Compare and Plan tabs — distill a saved scenario down to its
// chance / expected-attempts / cost summary.

import type { Item, Mod } from '$lib/recombinator/index.js';
import { probabilityExactByBase } from '$lib/recombinator/index.js';

export type ScenarioAnalysis = {
  chance: number;
  fromBase1: number;
  fromBase2: number;
  desiredCount: number;
  expectedTries: number;     // 1 / chance, ∞ when chance is 0
  expectedCost: number;      // expectedTries × costPerTry, ∞ when chance is 0
  /** Compatible item-class? false → recombine is impossible. */
  compatible: boolean;
};

function desiredFrom(item1: Item, item2: Item): Mod[] {
  return [
    ...item1.prefixes, ...item1.suffixes,
    ...item2.prefixes, ...item2.suffixes,
  ].filter((m) => m.desired === true);
}

export function analyzeScenario(item1: Item, item2: Item, costPerTry: number): ScenarioAnalysis {
  const compatible = item1.itemClass === item2.itemClass;
  if (!compatible) {
    return {
      chance: 0, fromBase1: 0, fromBase2: 0,
      desiredCount: desiredFrom(item1, item2).length,
      expectedTries: Infinity, expectedCost: Infinity,
      compatible: false,
    };
  }

  const desired = desiredFrom(item1, item2);
  if (desired.length === 0) {
    return {
      chance: 1, fromBase1: 1, fromBase2: 1,
      desiredCount: 0,
      expectedTries: 1, expectedCost: costPerTry,
      compatible: true,
    };
  }

  const split = probabilityExactByBase(item1, item2, desired);
  const expectedTries = split.weighted > 0 ? 1 / split.weighted : Infinity;
  const expectedCost = split.weighted > 0 ? expectedTries * costPerTry : Infinity;
  return {
    chance: split.weighted,
    fromBase1: split.fromItem1,
    fromBase2: split.fromItem2,
    desiredCount: desired.length,
    expectedTries,
    expectedCost,
    compatible: true,
  };
}

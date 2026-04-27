// src/lib/recombinator/index.ts
export type {
  Affix, ModCategory, AttributeBase, DefenceTag, Influence,
  Mod, Item, BaseContext, RecombineInput, RecombineResult,
} from './types.js';
export { SeededRng } from './rng.js';
export type { Rng } from './rng.js';
export { TABLE1, sampleModCount, expectedDistribution } from './table1.js';
export { computeItemLevel } from './ilevel.js';
export { isEligible, isExclusive } from './eligibility.js';
export { simulateOnce, simulateBatch } from './simulate.js';
export { probabilityExact, probabilityExactByBase, probabilityMonteCarlo, allDesiredHit } from './probability.js';
export { isOneOneSpecialCase, sampleOneOneOutcome } from './special-cases.js';
export { explainScenario } from './explain.js';
export type { Explanation, PoolMod } from './explain.js';

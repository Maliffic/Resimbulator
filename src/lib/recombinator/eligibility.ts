// src/lib/recombinator/eligibility.ts
import type { BaseContext, Mod, ModCategory } from './types.js';

const EXCLUSIVE_CATEGORIES: ReadonlySet<ModCategory> = new Set([
  'ExclusiveCrafted',
  'ExclusiveVeiled',
  'ExclusiveEssence',
  'ExclusiveBreach',
  'ExclusiveIncursion',
  'ExclusiveBeastAspect',
  'ExclusiveDelve',
  'ExclusiveElevated',
]);

export function isExclusive(mod: Mod): boolean {
  return EXCLUSIVE_CATEGORIES.has(mod.category);
}

export function isEligible(mod: Mod, base: BaseContext, exclusiveAlreadyPicked: boolean): boolean {
  if (exclusiveAlreadyPicked && isExclusive(mod)) return false;

  switch (mod.category) {
    case 'Implicit':
      return false; // implicits don't transfer at all (handled separately by base inheritance)
    case 'Fractured':
      return mod.hostItemId === base.hostItemId;
    case 'NNN_Influenced':
      return mod.requiresInfluence !== undefined && base.influence === mod.requiresInfluence;
    case 'NNN_Defence':
      return mod.requiresDefenceTag !== undefined && base.defenceTags.includes(mod.requiresDefenceTag);
    case 'NNN_Attribute':
      return mod.allowedAttributeBases?.includes(base.attributeBase) ?? false;
    default:
      return true;
  }
}

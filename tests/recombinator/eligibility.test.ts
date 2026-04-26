// tests/recombinator/eligibility.test.ts
import { describe, it, expect } from 'vitest';
import { isEligible } from '../../src/lib/recombinator/eligibility.js';
import type { Mod, BaseContext } from '../../src/lib/recombinator/types.js';

const baseStr: BaseContext = {
  base: 'Goliath Gauntlets',
  itemClass: 'Gloves',
  attributeBase: 'str',
  defenceTags: ['armour'],
  influence: undefined,
  itemLevel: 86,
  hostItemId: 'item_1',
};

const baseStrInt: BaseContext = {
  ...baseStr,
  base: 'Sacrificial Garb',
  itemClass: 'Body Armours',
  attributeBase: 'str_int',
  defenceTags: ['armour', 'energy_shield'],
};

const baseInfluenced: BaseContext = { ...baseStr, influence: 'warlord' };

const regular: Mod = { id: 'a', affix: 'prefix', category: 'RegularExplicit', name: 'X', tier: 1, statText: '' };
const fracturedItem1: Mod = { ...regular, id: 'b', category: 'Fractured', hostItemId: 'item_1' };
const fracturedItem2: Mod = { ...regular, id: 'c', category: 'Fractured', hostItemId: 'item_2' };
const influencedWarlord: Mod = { ...regular, id: 'd', category: 'NNN_Influenced', requiresInfluence: 'warlord' };
const influencedHunter: Mod = { ...regular, id: 'e', category: 'NNN_Influenced', requiresInfluence: 'hunter' };
const armourMod: Mod = { ...regular, id: 'f', category: 'NNN_Defence', requiresDefenceTag: 'armour' };
const esMod: Mod = { ...regular, id: 'g', category: 'NNN_Defence', requiresDefenceTag: 'energy_shield' };
const strLifeRegen: Mod = { ...regular, id: 'h', category: 'NNN_Attribute', allowedAttributeBases: ['str', 'str_dex', 'str_int'] };
const intMod: Mod = { ...regular, id: 'i', category: 'NNN_Attribute', allowedAttributeBases: ['int', 'str_int', 'dex_int'] };
const exclusive: Mod = { ...regular, id: 'j', category: 'ExclusiveBreach' };

describe('isEligible', () => {
  it('regular mods are always eligible regardless of base', () => {
    expect(isEligible(regular, baseStr, false)).toBe(true);
    expect(isEligible(regular, baseStrInt, true)).toBe(true);
  });

  it('fractured mod eligible only when its host item is the chosen base', () => {
    expect(isEligible(fracturedItem1, baseStr, false)).toBe(true);
    expect(isEligible(fracturedItem2, baseStr, false)).toBe(false);
  });

  it('NNN_Influenced eligible only on matching influence', () => {
    expect(isEligible(influencedWarlord, baseInfluenced, false)).toBe(true);
    expect(isEligible(influencedHunter, baseInfluenced, false)).toBe(false);
    expect(isEligible(influencedWarlord, baseStr, false)).toBe(false);
  });

  it('NNN_Defence eligible only when base has the required defence tag', () => {
    expect(isEligible(armourMod, baseStr, false)).toBe(true);
    expect(isEligible(esMod, baseStr, false)).toBe(false);
    expect(isEligible(esMod, baseStrInt, false)).toBe(true);
  });

  it('NNN_Attribute eligible only on listed attribute bases', () => {
    expect(isEligible(strLifeRegen, baseStr, false)).toBe(true);
    expect(isEligible(strLifeRegen, baseStrInt, false)).toBe(true);
    expect(isEligible(intMod, baseStr, false)).toBe(false);
    expect(isEligible(intMod, baseStrInt, false)).toBe(true);
  });

  it('exclusive mods are ineligible after one exclusive has been picked', () => {
    expect(isEligible(exclusive, baseStr, false)).toBe(true);
    expect(isEligible(exclusive, baseStr, true)).toBe(false);
  });

  it('non-exclusive mods are unaffected by the exclusive lockout', () => {
    expect(isEligible(regular, baseStr, true)).toBe(true);
    expect(isEligible(armourMod, baseStr, true)).toBe(true);
  });

  it('implicit mods always return false (transferred via base inheritance, not mod selection)', () => {
    const implicit: Mod = { ...regular, id: 'imp', category: 'Implicit' };
    expect(isEligible(implicit, baseStr, false)).toBe(false);
    expect(isEligible(implicit, baseStr, true)).toBe(false);
  });

  it('all 8 exclusive categories lock out uniformly when exclusiveAlreadyPicked is true', () => {
    const categories = [
      'ExclusiveCrafted',
      'ExclusiveVeiled',
      'ExclusiveEssence',
      'ExclusiveBreach',
      'ExclusiveIncursion',
      'ExclusiveBeastAspect',
      'ExclusiveDelve',
      'ExclusiveElevated',
    ] as const;
    for (const category of categories) {
      const m: Mod = { ...regular, id: `e_${category}`, category };
      expect(isEligible(m, baseStr, false)).toBe(true);
      expect(isEligible(m, baseStr, true)).toBe(false);
    }
  });
});

// tests/recombinator/types.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Item, Mod, ModCategory } from '../../src/lib/recombinator/types.js';

describe('types: Mod', () => {
  it('accepts a regular explicit mod', () => {
    const m: Mod = {
      id: 'mod_phys_1',
      affix: 'prefix',
      category: 'RegularExplicit',
      name: 'Tyrannical',
      tier: 1,
      statText: '166% increased Physical Damage',
    };
    expect(m.affix).toBe('prefix');
  });

  it('accepts a fractured mod with a hostItemId', () => {
    const m: Mod = {
      id: 'mod_mana_4',
      affix: 'prefix',
      category: 'Fractured',
      name: "Mage King's",
      tier: 4,
      statText: '+15 to maximum Mana',
      hostItemId: 'item_1',
    };
    expect(m.hostItemId).toBe('item_1');
  });
});

describe('types: Item', () => {
  it('groups prefixes/suffixes/implicits', () => {
    const item: Item = {
      id: 'item_1',
      base: 'Sacrificial Garb',
      itemClass: 'Body Armours',
      itemLevel: 86,
      attributeBase: 'str_int',
      defenceTags: ['armour', 'energy_shield'],
      influence: undefined,
      corrupted: false,
      synthesised: false,
      implicits: [],
      prefixes: [],
      suffixes: [],
    };
    expect(item.attributeBase).toBe('str_int');
  });
});

describe('types: ModCategory union', () => {
  it('includes the documented categories', () => {
    expectTypeOf<ModCategory>().toMatchTypeOf<
      | 'RegularExplicit'
      | 'ExclusiveCrafted'
      | 'ExclusiveVeiled'
      | 'ExclusiveEssence'
      | 'ExclusiveBreach'
      | 'ExclusiveIncursion'
      | 'ExclusiveBeastAspect'
      | 'ExclusiveDelve'
      | 'ExclusiveElevated'
      | 'NNN_Influenced'
      | 'NNN_Defence'
      | 'NNN_Attribute'
      | 'Fractured'
      | 'Implicit'
    >();
  });
});

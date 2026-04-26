// tests/recombinator/pick.test.ts
import { describe, it, expect } from 'vitest';
import { pickBase, pickFillOrder } from '../../src/lib/recombinator/pick.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';
import type { Item } from '../../src/lib/recombinator/types.js';

const item1: Item = {
  id: 'item_1',
  base: 'Sacrificial Garb',
  itemClass: 'Body Armours',
  itemLevel: 84,
  attributeBase: 'str_int',
  defenceTags: ['armour', 'energy_shield'],
  influence: undefined,
  corrupted: false,
  synthesised: false,
  implicits: [],
  prefixes: [],
  suffixes: [],
};

const item2: Item = { ...item1, id: 'item_2', base: 'Astral Plate', itemLevel: 86, attributeBase: 'str' };

describe('pickBase', () => {
  it('picks each item ~50% over many trials', () => {
    const rng = new SeededRng(123);
    let count1 = 0;
    for (let i = 0; i < 10_000; i++) {
      const r = pickBase(item1, item2, rng);
      if (r.from === 1) count1++;
    }
    expect(count1 / 10_000).toBeCloseTo(0.5, 1);
  });

  it('produces a BaseContext that copies the chosen base attributes', () => {
    const rng = new SeededRng(1);
    const r = pickBase(item1, item2, rng);
    const expected = r.from === 1 ? item1 : item2;
    expect(r.baseContext.base).toBe(expected.base);
    expect(r.baseContext.attributeBase).toBe(expected.attributeBase);
    expect(r.baseContext.defenceTags).toEqual(expected.defenceTags);
    expect(r.baseContext.hostItemId).toBe(expected.id);
  });

  it('computes the new ilvl per the formula', () => {
    const rng = new SeededRng(1);
    for (let i = 0; i < 50; i++) {
      const r = pickBase(item1, item2, rng);
      // (84 + 86) / 2 + 2 = 87 → capped at 86
      expect(r.itemLevel).toBe(86);
    }
  });
});

describe('pickFillOrder', () => {
  it('returns prefix-first or suffix-first ~50/50', () => {
    const rng = new SeededRng(7);
    let pre = 0;
    for (let i = 0; i < 10_000; i++) {
      if (pickFillOrder(rng) === 'prefix-first') pre++;
    }
    expect(pre / 10_000).toBeCloseTo(0.5, 1);
  });
});

import { pickEligibleMods } from '../../src/lib/recombinator/pick.js';
import type { Mod } from '../../src/lib/recombinator/types.js';

const reg = (id: string): Mod => ({
  id, affix: 'prefix', category: 'RegularExplicit', name: id, tier: 1, statText: '',
});
const exc = (id: string): Mod => ({
  id, affix: 'prefix', category: 'ExclusiveBreach', name: id, tier: 1, statText: '',
});

describe('pickEligibleMods', () => {
  const ctx = {
    base: 'X', itemClass: 'Y', attributeBase: 'str' as const, defenceTags: ['armour' as const],
    influence: undefined, itemLevel: 86, hostItemId: 'item_1',
  };

  it('picks the requested count when enough eligible mods exist', () => {
    const rng = new SeededRng(1);
    const pool = [reg('a'), reg('b'), reg('c'), reg('d')];
    const { picked } = pickEligibleMods(pool, 3, ctx, false, rng);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((m) => m.id)).size).toBe(3);
  });

  it('locks out further exclusive mods after one is picked', () => {
    const rng = new SeededRng(99);
    const pool = [exc('e1'), exc('e2'), exc('e3')];
    const { picked } = pickEligibleMods(pool, 3, ctx, false, rng);
    expect(picked.length).toBe(1); // can't pick more exclusives
  });

  it('returns fewer than count when pool is exhausted by eligibility', () => {
    const rng = new SeededRng(1);
    const pool = [exc('e1'), reg('a')];
    const { picked } = pickEligibleMods(pool, 3, ctx, true, rng);
    // Exclusive blocked by lockout; only the regular survives.
    expect(picked.map((m) => m.id)).toEqual(['a']);
  });
});

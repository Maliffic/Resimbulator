// tests/recombinator/cross-check.test.ts
import { describe, it, expect } from 'vitest';
import {
  probabilityExact, probabilityMonteCarlo, SeededRng,
} from '../../src/lib/recombinator/index.js';
import type { Item, Mod, ModCategory } from '../../src/lib/recombinator/index.js';

const CATEGORIES: ModCategory[] = ['RegularExplicit', 'ExclusiveCrafted', 'NNN_Influenced'];

function makeMod(rng: SeededRng, idx: number, affix: 'prefix' | 'suffix'): Mod {
  const cat = CATEGORIES[Math.floor(rng.next() * CATEGORIES.length)]!;
  const m: Mod = { id: `m${idx}`, affix, category: cat, name: `m${idx}`, tier: 1, statText: '' };
  if (cat === 'NNN_Influenced') m.requiresInfluence = 'warlord';
  return m;
}

function makeItem(rng: SeededRng, id: string, nP: number, nS: number, influenced: boolean): Item {
  return {
    id,
    base: 'X',
    itemClass: 'Y',
    itemLevel: 86,
    attributeBase: 'str_int',
    defenceTags: ['armour', 'energy_shield'],
    influence: influenced ? 'warlord' : undefined,
    corrupted: false, synthesised: false,
    implicits: [],
    prefixes: Array.from({ length: nP }, (_, i) => makeMod(rng, parseInt(`${id}${i}1`, 36), 'prefix')),
    suffixes: Array.from({ length: nS }, (_, i) => makeMod(rng, parseInt(`${id}${i}2`, 36), 'suffix')),
  };
}

describe('cross-check: probabilityExact vs probabilityMonteCarlo', () => {
  it('agrees within 1.5% on 30 random scenarios', () => {
    const rng = new SeededRng(2024);
    const failures: string[] = [];
    for (let s = 0; s < 30; s++) {
      const nP1 = Math.floor(rng.next() * 4);
      const nS1 = Math.floor(rng.next() * 4);
      const nP2 = Math.floor(rng.next() * 4);
      const nS2 = Math.floor(rng.next() * 4);
      const inf1 = rng.next() < 0.5;
      const inf2 = rng.next() < 0.5;
      const item1 = makeItem(rng, 'A', nP1, nS1, inf1);
      const item2 = makeItem(rng, 'B', nP2, nS2, inf2);
      const allMods = [...item1.prefixes, ...item1.suffixes, ...item2.prefixes, ...item2.suffixes];
      if (allMods.length === 0) continue;
      const desired = [allMods[Math.floor(rng.next() * allMods.length)]!];
      const exact = probabilityExact(item1, item2, desired);
      const mcRng = new SeededRng(s + 1);
      const mc = probabilityMonteCarlo(item1, item2, desired, 30_000, mcRng);
      if (Math.abs(exact - mc) > 0.015) failures.push(`scenario ${s}: exact=${exact.toFixed(4)} mc=${mc.toFixed(4)}`);
    }
    expect(failures).toEqual([]);
  });
});

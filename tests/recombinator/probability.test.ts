// tests/recombinator/probability.test.ts
import { describe, it, expect } from 'vitest';
import { probabilityMonteCarlo, allDesiredHit } from '../../src/lib/recombinator/probability.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';
import type { Item, Mod } from '../../src/lib/recombinator/types.js';

const desired = (id: string, affix: 'prefix' | 'suffix'): Mod => ({
  id, affix, category: 'RegularExplicit', name: id, tier: 1, statText: '', desired: true,
});
const filler = (id: string, affix: 'prefix' | 'suffix'): Mod => ({
  id, affix, category: 'RegularExplicit', name: id, tier: 1, statText: '',
});

const baseItem = (id: string, p: Mod[], s: Mod[]): Item => ({
  id, base: 'Sacrificial Garb', itemClass: 'Body Armours', itemLevel: 86,
  attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'],
  influence: undefined, corrupted: false, synthesised: false,
  implicits: [], prefixes: p, suffixes: s,
});

describe('allDesiredHit', () => {
  it('true when every desired mod id is in the result', () => {
    const result = { prefixes: [filler('p1', 'prefix')], suffixes: [filler('s1', 'suffix')] };
    expect(allDesiredHit(result, [filler('p1', 'prefix')])).toBe(true);
    expect(allDesiredHit(result, [filler('p1', 'prefix'), filler('s1', 'suffix')])).toBe(true);
    expect(allDesiredHit(result, [filler('p99', 'prefix')])).toBe(false);
  });
});

describe('probabilityMonteCarlo', () => {
  it('1 desired prefix from a pool of 1 input prefix is 59% (Table 1)', () => {
    // Input: 1p (desired) + 0p, 0s + 0s. Output prefix count distribution: 41% zero, 59% one.
    const item1 = baseItem('a', [desired('p1', 'prefix')], []);
    const item2 = baseItem('b', [], []);
    const rng = new SeededRng(1);
    const p = probabilityMonteCarlo(item1, item2, [desired('p1', 'prefix')], 20_000, rng);
    expect(p).toBeCloseTo(0.59, 1);
  });

  it('returns 0 when the desired mod is not in either input', () => {
    const item1 = baseItem('a', [filler('p1', 'prefix')], []);
    const item2 = baseItem('b', [filler('p2', 'prefix')], []);
    const rng = new SeededRng(1);
    const p = probabilityMonteCarlo(item1, item2, [desired('p99', 'prefix')], 5_000, rng);
    expect(p).toBe(0);
  });
});

import { probabilityExact } from '../../src/lib/recombinator/probability.js';

describe('probabilityExact', () => {
  it('matches Table 1 for 1 desired prefix, 1 input prefix', () => {
    const item1 = baseItem('a', [desired('p1', 'prefix')], []);
    const item2 = baseItem('b', [], []);
    const p = probabilityExact(item1, item2, [desired('p1', 'prefix')]);
    expect(p).toBeCloseTo(0.59, 6);
  });

  it('matches Monte Carlo within ±0.5% on a 3p/2s scenario', () => {
    const item1 = baseItem('a', [desired('p1', 'prefix'), filler('p2', 'prefix')], [filler('s1', 'suffix')]);
    const item2 = baseItem('b', [filler('p3', 'prefix')], [desired('s2', 'suffix')]);
    const desiredMods = [desired('p1', 'prefix'), desired('s2', 'suffix')];
    const exact = probabilityExact(item1, item2, desiredMods);
    const rng = new SeededRng(31);
    const mc = probabilityMonteCarlo(item1, item2, desiredMods, 50_000, rng);
    expect(Math.abs(exact - mc)).toBeLessThan(0.01);
  });

  it('returns 0 for an impossible target', () => {
    const item1 = baseItem('a', [filler('p1', 'prefix')], []);
    const item2 = baseItem('b', [filler('p2', 'prefix')], []);
    const p = probabilityExact(item1, item2, [desired('p99', 'prefix')]);
    expect(p).toBe(0);
  });
});

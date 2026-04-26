// tests/recombinator/simulate.test.ts
import { describe, it, expect } from 'vitest';
import { simulateOnce, simulateBatch } from '../../src/lib/recombinator/simulate.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';
import type { Item, Mod } from '../../src/lib/recombinator/types.js';

const reg = (id: string, affix: 'prefix' | 'suffix'): Mod => ({
  id, affix, category: 'RegularExplicit', name: id, tier: 1, statText: '',
});

const baseItem = (id: string, prefixes: Mod[], suffixes: Mod[]): Item => ({
  id, base: 'Sacrificial Garb', itemClass: 'Body Armours', itemLevel: 86,
  attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'],
  influence: undefined, corrupted: false, synthesised: false,
  implicits: [], prefixes, suffixes,
});

describe('simulateOnce', () => {
  it('returns a result with prefixes from the prefix pool and suffixes from the suffix pool', () => {
    const rng = new SeededRng(1);
    const item1 = baseItem('item_1', [reg('p1', 'prefix'), reg('p2', 'prefix')], [reg('s1', 'suffix')]);
    const item2 = baseItem('item_2', [reg('p3', 'prefix')], [reg('s2', 'suffix'), reg('s3', 'suffix')]);
    const r = simulateOnce(item1, item2, rng);
    for (const p of r.prefixes) expect(p.affix).toBe('prefix');
    for (const s of r.suffixes) expect(s.affix).toBe('suffix');
    expect(['item_1', 'item_2']).toContain(r.baseContext.hostItemId);
  });

  it('respects Table 1 distribution over many trials (3 input prefixes)', () => {
    const item1 = baseItem('item_1', [reg('p1', 'prefix'), reg('p2', 'prefix')], []);
    const item2 = baseItem('item_2', [reg('p3', 'prefix')], []);
    const rng = new SeededRng(42);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 20_000; i++) {
      const n = simulateOnce(item1, item2, rng).prefixes.length;
      counts[n] = (counts[n] ?? 0) + 1;
    }
    // Expected for 3 inputs: [0, 0.39, 0.52, 0.10]
    expect((counts[1] ?? 0) / 20_000).toBeCloseTo(0.39, 1);
    expect((counts[2] ?? 0) / 20_000).toBeCloseTo(0.52, 1);
    expect((counts[3] ?? 0) / 20_000).toBeCloseTo(0.1, 1);
  });

  it('triggers special case for 1p + 1s', () => {
    const item1 = baseItem('item_1', [reg('p', 'prefix')], []);
    const item2 = baseItem('item_2', [], [reg('s', 'suffix')]);
    const rng = new SeededRng(1);
    const counts = { p: 0, s: 0, ps: 0 };
    for (let i = 0; i < 30_000; i++) {
      const r = simulateOnce(item1, item2, rng);
      const k = `${r.prefixes.length}p${r.suffixes.length}s`;
      if (k === '1p0s') counts.p++;
      else if (k === '0p1s') counts.s++;
      else if (k === '1p1s') counts.ps++;
      else throw new Error(`unexpected outcome ${k}`);
    }
    expect(counts.p / 30_000).toBeCloseTo(1 / 3, 1);
    expect(counts.s / 30_000).toBeCloseTo(1 / 3, 1);
    expect(counts.ps / 30_000).toBeCloseTo(1 / 3, 1);
  });
});

describe('simulateBatch', () => {
  it('runs n trials and returns an array of n results', () => {
    const rng = new SeededRng(1);
    const item1 = baseItem('item_1', [reg('p1', 'prefix')], [reg('s1', 'suffix')]);
    const item2 = baseItem('item_2', [reg('p2', 'prefix')], [reg('s2', 'suffix')]);
    const results = simulateBatch(item1, item2, 100, rng);
    expect(results).toHaveLength(100);
  });
});

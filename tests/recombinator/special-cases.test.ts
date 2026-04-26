// tests/recombinator/special-cases.test.ts
import { describe, it, expect } from 'vitest';
import { isOneOneSpecialCase, sampleOneOneOutcome } from '../../src/lib/recombinator/special-cases.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';
import type { Item } from '../../src/lib/recombinator/types.js';

const blank = (id: string, prefixes: number, suffixes: number): Item => ({
  id, base: 'X', itemClass: 'Y', itemLevel: 86,
  attributeBase: 'str', defenceTags: ['armour'], influence: undefined,
  corrupted: false, synthesised: false,
  implicits: [],
  prefixes: Array.from({ length: prefixes }, (_, i) => ({
    id: `${id}_p${i}`, affix: 'prefix', category: 'RegularExplicit', name: 'P', tier: 1, statText: '',
  })),
  suffixes: Array.from({ length: suffixes }, (_, i) => ({
    id: `${id}_s${i}`, affix: 'suffix', category: 'RegularExplicit', name: 'S', tier: 1, statText: '',
  })),
});

describe('isOneOneSpecialCase', () => {
  it('true only for 1p/0s + 0p/1s (either order)', () => {
    expect(isOneOneSpecialCase(blank('a', 1, 0), blank('b', 0, 1))).toBe(true);
    expect(isOneOneSpecialCase(blank('a', 0, 1), blank('b', 1, 0))).toBe(true);
    expect(isOneOneSpecialCase(blank('a', 1, 1), blank('b', 0, 1))).toBe(false);
    expect(isOneOneSpecialCase(blank('a', 1, 0), blank('b', 1, 0))).toBe(false);
  });
});

describe('sampleOneOneOutcome', () => {
  it('produces 1p/0s, 0p/1s, 1p/1s each at ~33%', () => {
    const rng = new SeededRng(11);
    const counts = { p: 0, s: 0, ps: 0 };
    for (let i = 0; i < 30_000; i++) {
      const r = sampleOneOneOutcome(rng);
      counts[r === '1p/0s' ? 'p' : r === '0p/1s' ? 's' : 'ps']++;
    }
    expect(counts.p / 30_000).toBeCloseTo(1 / 3, 1);
    expect(counts.s / 30_000).toBeCloseTo(1 / 3, 1);
    expect(counts.ps / 30_000).toBeCloseTo(1 / 3, 1);
  });
});

// tests/recombinator/rng.test.ts
import { describe, it, expect } from 'vitest';
import { SeededRng } from '../../src/lib/recombinator/rng.js';

describe('SeededRng', () => {
  it('is deterministic for a given seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBeCloseTo(b.next(), 12);
    }
  });

  it('produces values in [0, 1)', () => {
    const r = new SeededRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('pickWeighted picks proportional to weights', () => {
    const r = new SeededRng(7);
    const counts = [0, 0, 0];
    for (let i = 0; i < 10_000; i++) {
      const idx = r.pickWeighted([1, 2, 7]);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    expect(counts[0]! / 10_000).toBeCloseTo(0.1, 1);
    expect(counts[1]! / 10_000).toBeCloseTo(0.2, 1);
    expect(counts[2]! / 10_000).toBeCloseTo(0.7, 1);
  });

  it('pickOne returns one of the given items', () => {
    const r = new SeededRng(1);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(r.pickOne(items));
    }
  });
});

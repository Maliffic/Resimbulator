// tests/recombinator/table1.test.ts
import { describe, it, expect } from 'vitest';
import { TABLE1, sampleModCount, expectedDistribution } from '../../src/lib/recombinator/table1.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';

describe('TABLE1 data', () => {
  it('has rows for 1..6 inputs and probabilities sum to ~1 (guide values are rounded)', () => {
    for (let n = 1; n <= 6; n++) {
      const row = TABLE1[n]!;
      const sum = row[0] + row[1] + row[2] + row[3];
      // Guide reports rounded percentages; some rows sum to ~1.01.
      expect(sum).toBeGreaterThan(0.98);
      expect(sum).toBeLessThan(1.02);
    }
  });

  it('matches the guide §5 Table 1 numbers', () => {
    expect(TABLE1[1]).toEqual([0.41, 0.59, 0, 0]);
    expect(TABLE1[2]).toEqual([0, 0.67, 0.33, 0]);
    expect(TABLE1[3]).toEqual([0, 0.39, 0.52, 0.1]);
    expect(TABLE1[4]).toEqual([0, 0.11, 0.59, 0.31]);
    expect(TABLE1[5]).toEqual([0, 0, 0.43, 0.57]);
    expect(TABLE1[6]).toEqual([0, 0, 0.28, 0.72]);
  });
});

describe('sampleModCount', () => {
  it('returns 0 input → always 0', () => {
    const rng = new SeededRng(1);
    for (let i = 0; i < 100; i++) expect(sampleModCount(0, rng)).toBe(0);
  });

  it('approximates the distribution for n=4 over many trials', () => {
    const rng = new SeededRng(99);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 20_000; i++) {
      const idx = sampleModCount(4, rng);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    const dist = counts.map((c) => c / 20_000);
    expect(dist[0]).toBeCloseTo(0, 1);
    expect(dist[1]).toBeCloseTo(0.11, 1);
    expect(dist[2]).toBeCloseTo(0.59, 1);
    expect(dist[3]).toBeCloseTo(0.31, 1);
  });

  it('throws on n > 6', () => {
    const rng = new SeededRng(1);
    expect(() => sampleModCount(7, rng)).toThrow(/out of range/);
  });
});

describe('expectedDistribution', () => {
  it('returns the row for n=3', () => {
    expect(expectedDistribution(3)).toEqual([0, 0.39, 0.52, 0.1]);
  });
});

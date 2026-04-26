// tests/recombinator/ilevel.test.ts
import { describe, it, expect } from 'vitest';
import { computeItemLevel } from '../../src/lib/recombinator/ilevel.js';

describe('computeItemLevel (guide §2)', () => {
  it('average + 2, capped at max', () => {
    // (80 + 84) / 2 + 2 = 84 → capped at max(80, 84) = 84
    expect(computeItemLevel(80, 84)).toBe(84);
  });

  it('caps when both items are at max ilvl', () => {
    // (86 + 86) / 2 + 2 = 88 → capped at max(86, 86) = 86
    expect(computeItemLevel(86, 86)).toBe(86);
  });

  it('rounds the average down before adding 2', () => {
    // (83 + 84) / 2 = 83.5 → floor to 83 → +2 = 85 → capped at max(83, 84) = 84
    expect(computeItemLevel(83, 84)).toBe(84);
  });

  it('handles same low ilvls', () => {
    // (50 + 50) / 2 + 2 = 52 → capped at 50
    expect(computeItemLevel(50, 50)).toBe(50);
  });
});

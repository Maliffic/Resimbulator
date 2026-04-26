// tests/recombinator/index.test.ts
import { describe, it, expect } from 'vitest';
import * as engine from '../../src/lib/recombinator/index.js';

describe('engine public API', () => {
  it('exports the documented symbols', () => {
    expect(typeof engine.simulateOnce).toBe('function');
    expect(typeof engine.simulateBatch).toBe('function');
    expect(typeof engine.probabilityExact).toBe('function');
    expect(typeof engine.probabilityMonteCarlo).toBe('function');
    expect(typeof engine.SeededRng).toBe('function');
    expect(engine.TABLE1[3]).toEqual([0, 0.39, 0.52, 0.1]);
  });
});

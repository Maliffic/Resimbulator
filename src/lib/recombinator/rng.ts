// src/lib/recombinator/rng.ts

export interface Rng {
  next(): number;
  pickWeighted(weights: number[]): number;
  pickOne<T>(items: readonly T[]): T;
}

/**
 * Mulberry32 — small, fast, deterministic PRNG. Sufficient for sim/test purposes.
 */
export class SeededRng implements Rng {
  private state: number;

  constructor(seed: number) {
    // Avoid degenerate seed=0 by xoring with a constant.
    this.state = (seed ^ 0x9e3779b9) >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  pickWeighted(weights: number[]): number {
    const total = weights.reduce((s, w) => s + w, 0);
    if (total <= 0) throw new Error('pickWeighted: weights sum to 0');
    const r = this.next() * total;
    let acc = 0;
    for (let i = 0; i < weights.length; i++) {
      acc += weights[i]!;
      if (r < acc) return i;
    }
    return weights.length - 1;
  }

  pickOne<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pickOne: empty array');
    return items[Math.floor(this.next() * items.length)]!;
  }
}

// tests/recombinator/guide-examples.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { probabilityExact, probabilityMonteCarlo, SeededRng } from '../../src/lib/recombinator/index.js';
import type { Item, Mod } from '../../src/lib/recombinator/index.js';

type Fixture = {
  _comment?: string;
  item1: Omit<Item, 'influence'> & { influence: Item['influence'] | null };
  item2: Omit<Item, 'influence'> & { influence: Item['influence'] | null };
  desired: string[];
  expectedProbability: number;
  tolerance: number;
};

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures');

function loadFixture(name: string): {
  item1: Item; item2: Item; desired: Mod[];
  expected: number; tol: number;
} {
  const raw = JSON.parse(readFileSync(`${FIXTURES_DIR}/${name}`, 'utf8')) as Fixture;
  const fix = (it: Fixture['item1']): Item => ({ ...it, influence: it.influence ?? undefined });
  const item1 = fix(raw.item1);
  const item2 = fix(raw.item2);
  const allMods = [...item1.prefixes, ...item1.suffixes, ...item2.prefixes, ...item2.suffixes];
  const desired = raw.desired.map((id) => {
    const m = allMods.find((mm) => mm.id === id);
    if (!m) throw new Error(`fixture ${name}: desired mod ${id} not found`);
    return m;
  });
  return { item1, item2, desired, expected: raw.expectedProbability, tol: raw.tolerance };
}

describe('guide examples', () => {
  it('§6 setup: P(breach on result | grasping mail + uninfluenced base) ≈ 83.25% (unconditional; differs from guide\'s base-conditional 50%)', () => {
    const { item1, item2, desired, expected, tol } = loadFixture('guide-grasping-mail.json');
    const exact = probabilityExact(item1, item2, desired);
    expect(Math.abs(exact - expected)).toBeLessThan(tol);
    const rng = new SeededRng(13);
    const mc = probabilityMonteCarlo(item1, item2, desired, 50_000, rng);
    expect(Math.abs(mc - expected)).toBeLessThan(tol);
  });
});

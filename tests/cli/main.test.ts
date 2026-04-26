// tests/cli/main.test.ts
import { describe, it, expect } from 'vitest';
import { runCli } from '../../src/cli/main.js';

const fixture = JSON.stringify({
  command: 'probability',
  seed: 1,
  trials: 2000,
  item1: {
    id: 'a', base: 'X', itemClass: 'Y', itemLevel: 86,
    attributeBase: 'str_int', defenceTags: ['armour'],
    corrupted: false, synthesised: false,
    implicits: [], prefixes: [
      { id: 'p1', affix: 'prefix', category: 'RegularExplicit', name: 'p1', tier: 1, statText: '', desired: true }
    ], suffixes: [],
  },
  item2: {
    id: 'b', base: 'X', itemClass: 'Y', itemLevel: 86,
    attributeBase: 'str_int', defenceTags: ['armour'],
    corrupted: false, synthesised: false,
    implicits: [], prefixes: [], suffixes: [],
  },
});

describe('CLI', () => {
  it('probability command returns exact + monte-carlo numbers', async () => {
    const out = await runCli(fixture);
    expect(out.command).toBe('probability');
    if (out.command !== 'probability') throw new Error('typeguard');
    expect(out.exact).toBeCloseTo(0.59, 2);
    expect(out.monteCarlo).toBeCloseTo(0.59, 1);
  });

  it('simulate command returns N results', async () => {
    const fix = JSON.parse(fixture);
    fix.command = 'simulate';
    fix.trials = 5;
    const out = await runCli(JSON.stringify(fix));
    expect(out.command).toBe('simulate');
    if (out.command !== 'simulate') throw new Error('typeguard');
    expect(out.results).toHaveLength(5);
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/clipboard');

describe('CLI parse command', () => {
  it('parses clipboard text from stdin into a ParsedItem', async () => {
    const clipboard = readFileSync(resolve(FIXTURES_DIR, 'rare-with-hints.txt'), 'utf8');
    const input = JSON.stringify({ command: 'parse', clipboard });
    const out = await runCli(input);
    expect(out.command).toBe('parse');
    if (out.command !== 'parse') throw new Error('typeguard');
    expect(out.parsed.rarity).toBe('Rare');
    expect(out.parsed.prefixes).toHaveLength(2);
  });
});

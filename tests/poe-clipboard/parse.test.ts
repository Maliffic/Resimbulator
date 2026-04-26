// tests/poe-clipboard/parse.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';
import { parse } from '../../src/lib/poe-clipboard/parse.js';

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/clipboard');

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith('.txt'))
  .sort();

describe('parse() against clipboard fixtures', () => {
  for (const file of fixtureFiles) {
    it(`parses ${basename(file)} into a stable structure`, () => {
      const text = readFileSync(resolve(FIXTURES_DIR, file), 'utf8');
      const parsed = parse(text);
      expect(parsed).toMatchSnapshot();
    });
  }
});

describe('parse() field-level checks', () => {
  it('rare-with-hints: identifies 2 prefixes + 1 suffix, no implicits', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'rare-with-hints.txt'), 'utf8');
    const parsed = parse(text);
    expect(parsed.rarity).toBe('Rare');
    expect(parsed.itemLevel).toBe(86);
    expect(parsed.quality).toBe(20);
    expect(parsed.prefixes).toHaveLength(2);
    expect(parsed.suffixes).toHaveLength(1);
    expect(parsed.implicits).toHaveLength(0);
    expect(parsed.corrupted).toBe(false);
    expect(parsed.synthesised).toBe(false);
  });

  it('rare-with-crafted: tags the suffix with crafted flag', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'rare-with-crafted.txt'), 'utf8');
    const parsed = parse(text);
    expect(parsed.suffixes[0]?.hint?.flags).toContain('crafted');
  });

  it('rare-with-fractured: tags the prefix mod with fractured flag', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'rare-with-fractured.txt'), 'utf8');
    const parsed = parse(text);
    expect(parsed.prefixes[0]?.hint?.flags).toContain('fractured');
  });

  it('rare-warlord-influenced: detects warlord influence', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'rare-warlord-influenced.txt'), 'utf8');
    expect(parse(text).influence).toBe('warlord');
  });

  it('magic-2-mods: 1 prefix + 1 suffix on a magic item', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'magic-2-mods.txt'), 'utf8');
    const parsed = parse(text);
    expect(parsed.rarity).toBe('Magic');
    expect(parsed.prefixes).toHaveLength(1);
    expect(parsed.suffixes).toHaveLength(1);
  });

  it('normal-no-mods: no mods at all', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'normal-no-mods.txt'), 'utf8');
    const parsed = parse(text);
    expect(parsed.rarity).toBe('Normal');
    expect(parsed.prefixes).toHaveLength(0);
    expect(parsed.suffixes).toHaveLength(0);
    expect(parsed.implicits).toHaveLength(0);
  });

  it('unique-item: parses unique with implicits + explicits', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'unique-item.txt'), 'utf8');
    const parsed = parse(text);
    expect(parsed.rarity).toBe('Unique');
    expect(parsed.implicits).toHaveLength(1);
    expect(parsed.unknown).toHaveLength(2);
  });

  it('corrupted-item: detects Corrupted flag', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'corrupted-item.txt'), 'utf8');
    expect(parse(text).corrupted).toBe(true);
  });

  it('synthesised-item: detects Synthesised flag and an implicit', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'synthesised-item.txt'), 'utf8');
    const parsed = parse(text);
    expect(parsed.synthesised).toBe(true);
    expect(parsed.implicits).toHaveLength(1);
  });

  it('no-type-hints: implicit detected via inline marker, others go to unknown', () => {
    const text = readFileSync(resolve(FIXTURES_DIR, 'no-type-hints.txt'), 'utf8');
    const parsed = parse(text);
    expect(parsed.implicits).toHaveLength(1);
    expect(parsed.unknown).toHaveLength(3);
  });
});

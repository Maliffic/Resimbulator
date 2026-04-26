// tests/poe-clipboard/flags.test.ts
import { describe, it, expect } from 'vitest';
import {
  detectCorrupted, detectSynthesised, detectInfluence, parseItemLevel, parseQuality,
} from '../../src/lib/poe-clipboard/flags.js';

describe('detectCorrupted', () => {
  it('returns true if any section contains a "Corrupted" single-line marker', () => {
    expect(detectCorrupted([['Quality: +20%'], ['Corrupted']])).toBe(true);
    expect(detectCorrupted([['Quality: +20%']])).toBe(false);
  });
});

describe('detectSynthesised', () => {
  it('returns true if any section contains a "Synthesised Item" line', () => {
    expect(detectSynthesised([['Synthesised Item']])).toBe(true);
    expect(detectSynthesised([['Item Level: 86']])).toBe(false);
  });
});

describe('detectInfluence', () => {
  it.each([
    ['Shaper Item', 'shaper'],
    ['Elder Item', 'elder'],
    ['Crusader Item', 'crusader'],
    ['Hunter Item', 'hunter'],
    ['Warlord Item', 'warlord'],
    ['Redeemer Item', 'redeemer'],
  ])('detects "%s" → %s', (line, expected) => {
    expect(detectInfluence([['header'], [line]])).toBe(expected);
  });

  it('returns undefined when no influence line is present', () => {
    expect(detectInfluence([['header']])).toBeUndefined();
  });
});

describe('parseItemLevel', () => {
  it('extracts the integer from "Item Level: N"', () => {
    expect(parseItemLevel([['Foo'], ['Item Level: 86']])).toBe(86);
  });

  it('throws when no Item Level section is found', () => {
    expect(() => parseItemLevel([['Foo']])).toThrow(/Item Level/);
  });
});

describe('parseQuality', () => {
  it('extracts the percent from "Quality: +N%"', () => {
    expect(parseQuality([['Quality: +20% (augmented)']])).toBe(20);
  });

  it('returns undefined when no Quality line is present', () => {
    expect(parseQuality([['Foo']])).toBeUndefined();
  });
});

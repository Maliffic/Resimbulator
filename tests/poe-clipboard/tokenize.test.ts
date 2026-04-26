import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/lib/poe-clipboard/tokenize.js';

describe('tokenize', () => {
  it('splits by `--------` separator lines', () => {
    const input = `Item Class: Body Armours
Rarity: Rare
Cataclysm Veil
Sacrificial Garb
--------
Item Level: 86
--------
{ Prefix Modifier "Tyrannical" (Tier: 1) }
166% increased Physical Damage`;
    const sections = tokenize(input);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toEqual(['Item Class: Body Armours', 'Rarity: Rare', 'Cataclysm Veil', 'Sacrificial Garb']);
    expect(sections[1]).toEqual(['Item Level: 86']);
    expect(sections[2]).toEqual([
      '{ Prefix Modifier "Tyrannical" (Tier: 1) }',
      '166% increased Physical Damage',
    ]);
  });

  it('drops empty leading/trailing sections', () => {
    const input = `--------
foo
--------`;
    expect(tokenize(input)).toEqual([['foo']]);
  });

  it('handles CRLF line endings', () => {
    const input = `a\r\n--------\r\nb`;
    expect(tokenize(input)).toEqual([['a'], ['b']]);
  });

  it('trims trailing whitespace on lines but preserves leading whitespace', () => {
    const input = `  a   \n--------\nb`;
    expect(tokenize(input)).toEqual([['  a'], ['b']]);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });
});

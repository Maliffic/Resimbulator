# Resimbinator Clipboard Parser Implementation Plan (Plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Path of Exile clipboard parser that turns the in-game Ctrl+C text into a structured `ParsedItem`. Handle items with and without "Show Modifier Type Hints" enabled. Tag mods with the metadata the future categorizer (Plan 3) needs: affix, mod name, tier, tags, and whether the mod is implicit / fractured / crafted / veiled. Validate against ~10 synthetic fixture items spanning the format's variations.

**Architecture:** A self-contained `lib/poe-clipboard/` package with a section tokenizer, a header parser, a mod-block parser, and a top-level `parse()` orchestrator. Each parser is a pure function that consumes a slice of input and produces a piece of the `ParsedItem`. No external deps. The `ParsedItem` shape is parser-specific (NOT the engine's `Item` shape) because mod categorization is Plan 3's responsibility — the parser captures raw clipboard data, Plan 3 transforms.

**Tech Stack:** Same as Plan 1 — TypeScript 5.x, Node 20+, Vitest. Snapshot tests for parser fixtures via Vitest's `expect(...).toMatchSnapshot()`. No new runtime dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-26-Resimbinator -design.md` section "Clipboard parser".

**Out of scope for Plan 2:**

- Mod categorization (Plan 3 — needs the mod database)
- Translating `ParsedItem` → engine `Item` (Plan 3)
- UI integration (Plan 4)

**Dependencies:** Plan 1 (engine) is complete. The parser doesn't import from the engine; the categorizer in Plan 3 will bridge the two.

---

## File Structure

Created in this plan:

```
src/lib/poe-clipboard/
  types.ts                 # ParsedItem, ParsedMod, ParsedHeader
  tokenize.ts              # split by `--------` into sections
  header.ts                # parse the first section (rarity/class/name/base/influence)
  mod-block.ts             # parse `{ ... } statline ` blocks within a mod section
  flags.ts                 # detect Corrupted, Synthesised, inline (implicit)/(fractured) markers
  parse.ts                 # top-level orchestrator
  index.ts                 # public API barrel

src/cli/
  main.ts                  # MODIFIED: add a `parse` command that reads clipboard text on stdin

tests/poe-clipboard/
  tokenize.test.ts
  header.test.ts
  mod-block.test.ts
  flags.test.ts
  parse.test.ts            # snapshot tests against fixture items

tests/fixtures/clipboard/
  rare-with-hints.txt              # rare item, type hints on, regular mods only
  rare-with-crafted.txt            # rare item, has a crafted suffix
  rare-with-fractured.txt          # rare item, has a fractured prefix
  rare-warlord-influenced.txt      # rare warlord-influenced item
  magic-2-mods.txt                 # magic item with 1 prefix + 1 suffix
  normal-no-mods.txt               # normal item, no explicit mods
  unique-item.txt                  # unique item (has explicit mods)
  corrupted-item.txt               # rare item with Corrupted suffix
  synthesised-item.txt             # synthesised base item with implicit
  no-type-hints.txt                # rare item with hints OFF (only stat lines)
```

Each parser file has one responsibility. The fixtures are committed `.txt` files (not test-inlined strings) so they're easy to update when GGG changes the format and easy to inspect in a diff.

---

## Task 1: Types

**Files:**

- Create: `src/lib/poe-clipboard/types.ts`
- Test: `tests/poe-clipboard/types.test.ts` _(omit — types-only, verified at compile time by the other tests that import these types)_

- [ ] **Step 1: Write `types.ts`**

```ts
// src/lib/poe-clipboard/types.ts

export type Rarity = 'Normal' | 'Magic' | 'Rare' | 'Unique';

export type Influence = 'shaper' | 'elder' | 'crusader' | 'hunter' | 'warlord' | 'redeemer';

export type ParsedHeader = {
  rarity: Rarity;
  itemClass: string;
  /** For rare/unique: the prefix-suffix line (e.g. "Cataclysm Veil"). For magic: the magic-mod modified base name. */
  name: string;
  /** The base type (e.g. "Sacrificial Garb"). For unique items, this is the unique's base. */
  base: string;
  influence?: Influence;
  itemLevel: number;
  quality?: number;
  corrupted: boolean;
  synthesised: boolean;
};

export type ModFlag = 'crafted' | 'veiled' | 'fractured' | 'implicit';

export type ParsedMod = {
  affix: 'prefix' | 'suffix' | 'implicit';
  /** Set when type hints are present in the clipboard. */
  hint?: {
    name: string;
    /** Null for untiered mods (essences). */
    tier: number | null;
    tags: string[];
    flags: ModFlag[];
  };
  /** The 1+ stat lines that follow the type-hint block (or stand alone if hints are off). */
  statLines: string[];
};

export type ParsedItem = ParsedHeader & {
  implicits: ParsedMod[];
  prefixes: ParsedMod[];
  suffixes: ParsedMod[];
  /** Mods whose affix couldn't be determined (e.g. type hints off and no inline marker). Plan 3's categorizer will resolve these. */
  unknown: ParsedMod[];
};
```

- [ ] **Step 2: Run typecheck**

```bash
cd /home/nick/projects/personal/Resimbinator
npm run typecheck
```

Expected: exit 0 (no test file yet for this task — types are checked by downstream tasks).

- [ ] **Step 3: Commit**

```bash
git add src/lib/poe-clipboard/types.ts
git commit -m "feat(parser): ParsedItem / ParsedMod types"
```

---

## Task 2: Section tokenizer

The PoE clipboard separates sections with `--------` lines. Trim, split, drop empty sections, return as `string[][]` (sections of lines).

**Files:**

- Create: `src/lib/poe-clipboard/tokenize.ts`
- Test: `tests/poe-clipboard/tokenize.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/poe-clipboard/tokenize.test.ts
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
    expect(sections[0]).toEqual([
      'Item Class: Body Armours',
      'Rarity: Rare',
      'Cataclysm Veil',
      'Sacrificial Garb',
    ]);
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
```

- [ ] **Step 2: Run** — expect FAIL with "Cannot find module"

```bash
npm test -- tests/poe-clipboard/tokenize.test.ts
```

- [ ] **Step 3: Implement `tokenize.ts`**

```ts
// src/lib/poe-clipboard/tokenize.ts

const SEPARATOR = /^-{4,}$/;

/**
 * Split a PoE clipboard dump into sections separated by `--------` lines.
 * Trims trailing whitespace from each line and drops empty sections.
 */
export function tokenize(input: string): string[][] {
  const lines = input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''));
  const sections: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (SEPARATOR.test(line)) {
      if (current.length > 0) sections.push(current);
      current = [];
    } else if (line.length > 0 || current.length > 0) {
      // skip leading empty lines but keep mid-section ones
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current);
  return sections.filter((s) => s.some((l) => l.trim().length > 0));
}
```

- [ ] **Step 4: Run** — expect PASS (5 tests)

```bash
npm test -- tests/poe-clipboard/tokenize.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/poe-clipboard/tokenize.ts tests/poe-clipboard/tokenize.test.ts
git commit -m "feat(parser): section tokenizer for clipboard text"
```

---

## Task 3: Header parser

Parses the first section: `Item Class: X`, `Rarity: Y`, `<name>`, `<base>`. Returns rarity, item class, name, base. Influence detection (e.g. `Warlord Item` line) lives in Task 5 (flags) since it can appear elsewhere.

**Files:**

- Create: `src/lib/poe-clipboard/header.ts`
- Test: `tests/poe-clipboard/header.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/poe-clipboard/header.test.ts
import { describe, it, expect } from 'vitest';
import { parseHeader } from '../../src/lib/poe-clipboard/header.js';

describe('parseHeader', () => {
  it('parses a rare item header (4 lines: class, rarity, name, base)', () => {
    const h = parseHeader([
      'Item Class: Body Armours',
      'Rarity: Rare',
      'Cataclysm Veil',
      'Sacrificial Garb',
    ]);
    expect(h.rarity).toBe('Rare');
    expect(h.itemClass).toBe('Body Armours');
    expect(h.name).toBe('Cataclysm Veil');
    expect(h.base).toBe('Sacrificial Garb');
  });

  it('parses a magic item header (3 lines: class, rarity, magic name)', () => {
    const h = parseHeader([
      'Item Class: Wands',
      'Rarity: Magic',
      'Tyrannical Opal Wand of the Order',
    ]);
    expect(h.rarity).toBe('Magic');
    expect(h.itemClass).toBe('Wands');
    expect(h.name).toBe('Tyrannical Opal Wand of the Order');
    // Magic items embed the base inside the modified name; the parser leaves it as-is in `name` and copies to `base`.
    expect(h.base).toBe('Tyrannical Opal Wand of the Order');
  });

  it('parses a normal item header (3 lines: class, rarity, name=base)', () => {
    const h = parseHeader(['Item Class: Body Armours', 'Rarity: Normal', 'Sacrificial Garb']);
    expect(h.rarity).toBe('Normal');
    expect(h.itemClass).toBe('Body Armours');
    expect(h.name).toBe('Sacrificial Garb');
    expect(h.base).toBe('Sacrificial Garb');
  });

  it('parses a unique item header', () => {
    const h = parseHeader([
      'Item Class: Body Armours',
      'Rarity: Unique',
      "Kaom's Heart",
      'Glorious Plate',
    ]);
    expect(h.rarity).toBe('Unique');
    expect(h.name).toBe("Kaom's Heart");
    expect(h.base).toBe('Glorious Plate');
  });

  it('throws on missing Rarity line', () => {
    expect(() => parseHeader(['Item Class: Body Armours', 'Foo'])).toThrow(/Rarity/);
  });

  it('throws on unknown rarity', () => {
    expect(() => parseHeader(['Item Class: Body Armours', 'Rarity: Mythical', 'Foo'])).toThrow(
      /rarity/i,
    );
  });
});
```

- [ ] **Step 2: Run** — FAIL

```bash
npm test -- tests/poe-clipboard/header.test.ts
```

- [ ] **Step 3: Implement `header.ts`**

```ts
// src/lib/poe-clipboard/header.ts
import type { Rarity } from './types.js';

const VALID_RARITIES: ReadonlySet<Rarity> = new Set(['Normal', 'Magic', 'Rare', 'Unique']);

export function parseHeader(section: string[]): {
  rarity: Rarity;
  itemClass: string;
  name: string;
  base: string;
} {
  const itemClassLine = section.find((l) => l.startsWith('Item Class:'));
  const rarityLine = section.find((l) => l.startsWith('Rarity:'));
  if (!rarityLine) throw new Error('Header section missing Rarity line');

  const rarity = rarityLine.replace('Rarity:', '').trim() as Rarity;
  if (!VALID_RARITIES.has(rarity)) throw new Error(`Unknown rarity: ${rarity}`);

  const itemClass = itemClassLine ? itemClassLine.replace('Item Class:', '').trim() : '';

  const nameLines = section.filter((l) => !l.startsWith('Item Class:') && !l.startsWith('Rarity:'));

  let name: string;
  let base: string;
  if (rarity === 'Rare' || rarity === 'Unique') {
    // 2 lines: name, base
    name = nameLines[0] ?? '';
    base = nameLines[1] ?? name;
  } else {
    // 1 line: combined name (Magic) or base name (Normal)
    name = nameLines[0] ?? '';
    base = name;
  }

  return { rarity, itemClass, name, base };
}
```

- [ ] **Step 4: Run** — PASS (6 tests)

```bash
npm test -- tests/poe-clipboard/header.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/poe-clipboard/header.ts tests/poe-clipboard/header.test.ts
git commit -m "feat(parser): header parser (rarity, item class, name, base)"
```

---

## Task 4: Mod-block parser

Parses a single mod section. Each mod block is either:

```
{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage, Attack, Physical }
166% increased Physical Damage
```

or (no type hints):

```
166% increased Physical Damage
```

A section can contain multiple mod blocks. Returns `ParsedMod[]`.

**Files:**

- Create: `src/lib/poe-clipboard/mod-block.ts`
- Test: `tests/poe-clipboard/mod-block.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/poe-clipboard/mod-block.test.ts
import { describe, it, expect } from 'vitest';
import { parseModSection } from '../../src/lib/poe-clipboard/mod-block.js';

describe('parseModSection (with type hints)', () => {
  it('parses a single prefix mod with hint', () => {
    const mods = parseModSection([
      '{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage, Attack, Physical }',
      '166% increased Physical Damage',
    ]);
    expect(mods).toHaveLength(1);
    expect(mods[0]?.affix).toBe('prefix');
    expect(mods[0]?.hint?.name).toBe('Tyrannical');
    expect(mods[0]?.hint?.tier).toBe(1);
    expect(mods[0]?.hint?.tags).toEqual(['Damage', 'Attack', 'Physical']);
    expect(mods[0]?.hint?.flags).toEqual([]);
    expect(mods[0]?.statLines).toEqual(['166% increased Physical Damage']);
  });

  it('parses a Crafted mod', () => {
    const mods = parseModSection([
      '{ Crafted Suffix Modifier "of Crafting" (Tier: 1) — Caster, Skill }',
      '+1 to Level of Socketed Gems',
    ]);
    expect(mods[0]?.affix).toBe('suffix');
    expect(mods[0]?.hint?.flags).toContain('crafted');
  });

  it('parses a Veiled mod', () => {
    const mods = parseModSection(['{ Veiled Prefix }', 'Veiled Prefix']);
    expect(mods[0]?.hint?.flags).toContain('veiled');
  });

  it('parses a Fractured mod', () => {
    const mods = parseModSection([
      '{ Fractured Modifier "Mage King\'s" (Tier: 4) — Defences, Caster }',
      '+15 to maximum Mana',
    ]);
    expect(mods[0]?.hint?.flags).toContain('fractured');
  });

  it('parses an untiered essence mod (no Tier: line)', () => {
    const mods = parseModSection([
      '{ Prefix Modifier "Essence Plating" — Defences }',
      'Adds 50 to 100 Armour',
    ]);
    expect(mods[0]?.hint?.tier).toBeNull();
    expect(mods[0]?.hint?.tags).toEqual(['Defences']);
  });

  it('parses an Implicit mod', () => {
    const mods = parseModSection([
      '{ Implicit Modifier — Life }',
      '+22 to maximum Life (implicit)',
    ]);
    expect(mods[0]?.affix).toBe('implicit');
    expect(mods[0]?.hint?.flags).toContain('implicit');
  });

  it('parses multi-line stat blocks (mod with two stat lines)', () => {
    const mods = parseModSection([
      '{ Prefix Modifier "Hyperborean" (Tier: 1) — Cold, Damage }',
      'Adds 1 to 2 Cold Damage to Attacks',
      '+10 to Cold Damage',
    ]);
    expect(mods[0]?.statLines).toHaveLength(2);
  });

  it('parses multiple mods in one section', () => {
    const mods = parseModSection([
      '{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage }',
      '166% increased Physical Damage',
      '{ Suffix Modifier "of Insulation" (Tier: 5) — Resistance }',
      '+19% to Cold Resistance',
    ]);
    expect(mods).toHaveLength(2);
    expect(mods[0]?.affix).toBe('prefix');
    expect(mods[1]?.affix).toBe('suffix');
  });
});

describe('parseModSection (no type hints)', () => {
  it('falls back to stat-line-only mods, marking inline (implicit) and (fractured)', () => {
    const mods = parseModSection([
      '+22 to maximum Life (implicit)',
      '166% increased Physical Damage',
      '+15 to maximum Mana (fractured)',
    ]);
    expect(mods).toHaveLength(3);
    expect(mods[0]?.affix).toBe('implicit');
    expect(mods[0]?.hint).toBeUndefined();
    expect(mods[1]?.affix).toBeUndefined();
    expect(mods[2]?.affix).toBeUndefined();
    expect(mods[2]?.hint).toBeUndefined();
    // The parser preserves the trailing markers in statLines so Plan 3 can use them.
    expect(mods[2]?.statLines[0]).toContain('(fractured)');
  });
});
```

NOTE: When type hints are off, `affix` is `undefined` for non-implicit mods. Plan 3's categorizer assigns it via mod-database lookup. The fallback test verifies this; it's intentional.

But wait — the test sets `expect(mods[1]?.affix).toBeUndefined()` and `expect(mods[2]?.affix).toBeUndefined()`. The `ParsedMod.affix` field is `'prefix' | 'suffix' | 'implicit'` — not optional. To allow undefined, we need to widen it. Update Task 1 retroactively? No — adjust here: change `affix` to `'prefix' | 'suffix' | 'implicit' | undefined` in `ParsedMod`. But that has knock-on effects.

Decision: keep `affix` REQUIRED in `ParsedMod`. For no-type-hints fallback, set `affix` to `'implicit'` if `(implicit)` marker present, else default to a special placeholder. Better: introduce a new affix value `'unknown'` for fallback cases.

Update `types.ts`: change `ParsedMod.affix` to `'prefix' | 'suffix' | 'implicit' | 'unknown'`. Test correspondingly:

```ts
expect(mods[0]?.affix).toBe('implicit');
expect(mods[1]?.affix).toBe('unknown');
expect(mods[2]?.affix).toBe('unknown');
```

This requires editing `types.ts` from Task 1. Roll the change in here (since this task's test exposes the need). The implementer must update `types.ts` accordingly.

REVISED test for the fallback case:

```ts
describe('parseModSection (no type hints)', () => {
  it('falls back to stat-line-only mods, marking inline (implicit)/(fractured)', () => {
    const mods = parseModSection([
      '+22 to maximum Life (implicit)',
      '166% increased Physical Damage',
      '+15 to maximum Mana (fractured)',
    ]);
    expect(mods).toHaveLength(3);
    expect(mods[0]?.affix).toBe('implicit');
    expect(mods[0]?.hint).toBeUndefined();
    expect(mods[1]?.affix).toBe('unknown');
    expect(mods[1]?.hint).toBeUndefined();
    expect(mods[2]?.affix).toBe('unknown');
    expect(mods[2]?.hint).toBeUndefined();
    expect(mods[2]?.statLines[0]).toContain('(fractured)');
  });
});
```

(Use this revised version in Step 1 above.)

- [ ] **Step 2: Run** — FAIL

- [ ] **Step 3: Update `types.ts` to widen `ParsedMod.affix`**

In `src/lib/poe-clipboard/types.ts`, change:

```ts
export type ParsedMod = {
  affix: 'prefix' | 'suffix' | 'implicit';
```

to:

```ts
export type ParsedMod = {
  affix: 'prefix' | 'suffix' | 'implicit' | 'unknown';
```

Also update `ParsedItem`'s `unknown: ParsedMod[]` description in the comment since it now has a more specific shape — but the field stays the same.

- [ ] **Step 4: Implement `mod-block.ts`**

```ts
// src/lib/poe-clipboard/mod-block.ts
import type { ParsedMod, ModFlag } from './types.js';

const HINT_LINE = /^\{\s*(.+?)\s*\}$/;
const TIER_RE = /\(Tier:\s*(\d+)\)/;
const HINT_FLAGS: { keyword: string; flag: ModFlag }[] = [
  { keyword: 'Crafted', flag: 'crafted' },
  { keyword: 'Veiled', flag: 'veiled' },
  { keyword: 'Fractured', flag: 'fractured' },
  { keyword: 'Implicit', flag: 'implicit' },
];

type Hint = NonNullable<ParsedMod['hint']> & { affix: ParsedMod['affix'] };

function parseHint(line: string): Hint | undefined {
  const m = HINT_LINE.exec(line);
  if (!m) return undefined;
  const inner = m[1]!;

  // Determine affix
  let affix: ParsedMod['affix'] = 'unknown';
  if (/Implicit/i.test(inner)) affix = 'implicit';
  else if (/Suffix/i.test(inner)) affix = 'suffix';
  else if (/Prefix/i.test(inner)) affix = 'prefix';

  // Flags (Crafted, Veiled, Fractured, Implicit)
  const flags: ModFlag[] = HINT_FLAGS.filter(({ keyword }) =>
    new RegExp(`\\b${keyword}\\b`).test(inner),
  ).map((f) => f.flag);

  // Mod name (between quotes), if present
  const nameMatch = /"([^"]+)"/.exec(inner);
  const name = nameMatch?.[1] ?? '';

  // Tier (or null for untiered essences)
  const tierMatch = TIER_RE.exec(inner);
  const tier = tierMatch ? parseInt(tierMatch[1]!, 10) : null;

  // Tags after the em-dash
  let tags: string[] = [];
  const dashIdx = inner.indexOf('—');
  if (dashIdx >= 0) {
    tags = inner
      .slice(dashIdx + 1)
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  return { affix, name, tier, tags, flags };
}

export function parseModSection(section: string[]): ParsedMod[] {
  const mods: ParsedMod[] = [];
  let i = 0;
  while (i < section.length) {
    const line = section[i]!;
    const hint = parseHint(line);
    if (hint) {
      // Collect stat lines until next hint or end of section
      i++;
      const statLines: string[] = [];
      while (i < section.length && !HINT_LINE.test(section[i]!)) {
        statLines.push(section[i]!);
        i++;
      }
      const { affix, name, tier, tags, flags } = hint;
      mods.push({ affix, hint: { name, tier, tags, flags }, statLines });
    } else {
      // No type hints — single line is the whole mod
      const inline = line;
      const isImplicit = /\(implicit\)/i.test(inline);
      mods.push({
        affix: isImplicit ? 'implicit' : 'unknown',
        statLines: [inline],
      });
      i++;
    }
  }
  return mods;
}
```

- [ ] **Step 5: Run** — PASS (all describe blocks)

```bash
npm test -- tests/poe-clipboard/mod-block.test.ts
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/poe-clipboard/mod-block.ts src/lib/poe-clipboard/types.ts tests/poe-clipboard/mod-block.test.ts
git commit -m "feat(parser): mod-block parser with type-hint extraction"
```

---

## Task 5: Item flags (corrupted, synthesised, influenced, ilvl, quality)

These are scattered across various single-line sections. This task adds detection helpers used by the top-level orchestrator.

**Files:**

- Create: `src/lib/poe-clipboard/flags.ts`
- Test: `tests/poe-clipboard/flags.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/poe-clipboard/flags.test.ts
import { describe, it, expect } from 'vitest';
import {
  detectCorrupted,
  detectSynthesised,
  detectInfluence,
  parseItemLevel,
  parseQuality,
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
```

- [ ] **Step 2: Run** — FAIL

- [ ] **Step 3: Implement `flags.ts`**

```ts
// src/lib/poe-clipboard/flags.ts
import type { Influence } from './types.js';

const INFLUENCE_MAP: Record<string, Influence> = {
  'Shaper Item': 'shaper',
  'Elder Item': 'elder',
  'Crusader Item': 'crusader',
  'Hunter Item': 'hunter',
  'Warlord Item': 'warlord',
  'Redeemer Item': 'redeemer',
};

export function detectCorrupted(sections: string[][]): boolean {
  return sections.some((sec) => sec.some((l) => l.trim() === 'Corrupted'));
}

export function detectSynthesised(sections: string[][]): boolean {
  return sections.some((sec) => sec.some((l) => l.trim() === 'Synthesised Item'));
}

export function detectInfluence(sections: string[][]): Influence | undefined {
  for (const sec of sections) {
    for (const line of sec) {
      const inf = INFLUENCE_MAP[line.trim()];
      if (inf) return inf;
    }
  }
  return undefined;
}

export function parseItemLevel(sections: string[][]): number {
  for (const sec of sections) {
    for (const line of sec) {
      const m = /^Item Level:\s*(\d+)$/.exec(line.trim());
      if (m) return parseInt(m[1]!, 10);
    }
  }
  throw new Error('No Item Level line found in clipboard text');
}

export function parseQuality(sections: string[][]): number | undefined {
  for (const sec of sections) {
    for (const line of sec) {
      const m = /^Quality:\s*\+(\d+)%/.exec(line.trim());
      if (m) return parseInt(m[1]!, 10);
    }
  }
  return undefined;
}
```

- [ ] **Step 4: Run** — PASS (all blocks)

```bash
npm test -- tests/poe-clipboard/flags.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/poe-clipboard/flags.ts tests/poe-clipboard/flags.test.ts
git commit -m "feat(parser): item flags + ilvl + quality + influence detection"
```

---

## Task 6: Top-level `parse` orchestrator

Wires tokenize → header → flags → mod-block. Walks the sections, identifying mod sections by the presence of `{` lines or otherwise unrecognized non-metadata sections. Sorts parsed mods into `prefixes`, `suffixes`, `implicits`, and `unknown` buckets.

**Files:**

- Create: `src/lib/poe-clipboard/parse.ts`
- Test: skipped here — `parse` is exercised by Task 7 fixture tests, which are the real validation.

- [ ] **Step 1: Implement `parse.ts`**

```ts
// src/lib/poe-clipboard/parse.ts
import type { ParsedItem, ParsedMod } from './types.js';
import { tokenize } from './tokenize.js';
import { parseHeader } from './header.js';
import { parseModSection } from './mod-block.js';
import {
  detectCorrupted,
  detectSynthesised,
  detectInfluence,
  parseItemLevel,
  parseQuality,
} from './flags.js';

const METADATA_PREFIXES = [
  'Item Class:',
  'Rarity:',
  'Quality:',
  'Armour:',
  'Energy Shield:',
  'Evasion Rating:',
  'Ward:',
  'Block:',
  'Critical Strike Chance:',
  'Attacks per Second:',
  'Physical Damage:',
  'Elemental Damage:',
  'Chaos Damage:',
  'Requirements:',
  'Level:',
  'Str:',
  'Dex:',
  'Int:',
  'Sockets:',
  'Item Level:',
  'Talisman Tier:',
];

function isMetadataSection(section: string[]): boolean {
  if (section.some((l) => /^\{.+\}$/.test(l.trim()))) return false;
  return section.every((l) => METADATA_PREFIXES.some((p) => l.trim().startsWith(p)));
}

function isStandaloneFlagSection(section: string[]): boolean {
  if (section.length !== 1) return false;
  const line = section[0]!.trim();
  return (
    line === 'Corrupted' ||
    line === 'Synthesised Item' ||
    line === 'Mirrored' ||
    /\bItem$/.test(line)
  ); // catches "Warlord Item" etc.
}

export function parse(input: string): ParsedItem {
  const sections = tokenize(input);
  if (sections.length === 0) throw new Error('Empty clipboard input');

  const header = parseHeader(sections[0]!);
  const itemLevel = parseItemLevel(sections);
  const quality = parseQuality(sections);
  const influence = detectInfluence(sections);
  const corrupted = detectCorrupted(sections);
  const synthesised = detectSynthesised(sections);

  // Mod sections are everything that isn't header / metadata / standalone-flag
  const prefixes: ParsedMod[] = [];
  const suffixes: ParsedMod[] = [];
  const implicits: ParsedMod[] = [];
  const unknown: ParsedMod[] = [];

  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i]!;
    if (isMetadataSection(sec) || isStandaloneFlagSection(sec)) continue;
    const mods = parseModSection(sec);
    for (const m of mods) {
      if (m.affix === 'prefix') prefixes.push(m);
      else if (m.affix === 'suffix') suffixes.push(m);
      else if (m.affix === 'implicit') implicits.push(m);
      else unknown.push(m);
    }
  }

  const out: ParsedItem = {
    rarity: header.rarity,
    itemClass: header.itemClass,
    name: header.name,
    base: header.base,
    itemLevel,
    corrupted,
    synthesised,
    implicits,
    prefixes,
    suffixes,
    unknown,
  };
  if (influence !== undefined) out.influence = influence;
  if (quality !== undefined) out.quality = quality;
  return out;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/poe-clipboard/parse.ts
git commit -m "feat(parser): top-level parse() orchestrator"
```

---

## Task 7: Fixture-based snapshot tests

Real validation: 10 hand-crafted fixture files spanning the format's variation, parsed and snapshot-tested. Snapshot-testing means the implementer writes the fixtures and runs once; Vitest stores the output; future runs compare and flag any drift.

**Files:**

- Create: `tests/fixtures/clipboard/` directory with 10 `.txt` files (content listed below)
- Create: `tests/poe-clipboard/parse.test.ts`

- [ ] **Step 1: Create fixture `tests/fixtures/clipboard/rare-with-hints.txt`**

```
Item Class: Body Armours
Rarity: Rare
Cataclysm Veil
Sacrificial Garb
--------
Quality: +20% (augmented)
Armour: 850 (augmented)
Energy Shield: 167 (augmented)
--------
Requirements:
Level: 70
Str: 86
Int: 86
--------
Sockets: G-G-R-R-R-R
--------
Item Level: 86
--------
{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage, Attack, Physical }
166% increased Physical Damage
{ Prefix Modifier "Brisk's" (Tier: 5) — Speed }
8% increased Movement Speed
{ Suffix Modifier "of Insulation" (Tier: 5) — Elemental, Resistance }
+19% to Cold Resistance
```

- [ ] **Step 2: Create fixture `tests/fixtures/clipboard/rare-with-crafted.txt`**

```
Item Class: Body Armours
Rarity: Rare
Sample Item
Sacrificial Garb
--------
Item Level: 86
--------
{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage }
166% increased Physical Damage
{ Crafted Suffix Modifier "of Crafting" (Tier: 1) — Caster, Skill }
+1 to Level of Socketed Gems
```

- [ ] **Step 3: Create fixture `tests/fixtures/clipboard/rare-with-fractured.txt`**

```
Item Class: Body Armours
Rarity: Rare
Sample Item
Sacrificial Garb
--------
Item Level: 86
--------
{ Fractured Modifier "Mage King's" (Tier: 4) — Defences, Caster }
+15 to maximum Mana (fractured)
{ Suffix Modifier "of Insulation" (Tier: 5) — Resistance }
+19% to Cold Resistance
```

- [ ] **Step 4: Create fixture `tests/fixtures/clipboard/rare-warlord-influenced.txt`**

```
Item Class: Body Armours
Rarity: Rare
Sample Item
Sacrificial Garb
--------
Item Level: 84
--------
Warlord Item
--------
{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage }
166% increased Physical Damage
{ Suffix Modifier "of Insulation" (Tier: 5) — Resistance }
+19% to Cold Resistance
```

- [ ] **Step 5: Create fixture `tests/fixtures/clipboard/magic-2-mods.txt`**

```
Item Class: Wands
Rarity: Magic
Tyrannical Opal Wand of the Order
--------
Item Level: 86
--------
{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage }
166% increased Physical Damage
{ Suffix Modifier "of the Order" (Tier: 1) — Caster }
+10% spell damage
```

- [ ] **Step 6: Create fixture `tests/fixtures/clipboard/normal-no-mods.txt`**

```
Item Class: Body Armours
Rarity: Normal
Sacrificial Garb
--------
Item Level: 86
```

- [ ] **Step 7: Create fixture `tests/fixtures/clipboard/unique-item.txt`**

```
Item Class: Body Armours
Rarity: Unique
Kaom's Heart
Glorious Plate
--------
Armour: 1234
--------
Item Level: 86
--------
{ Implicit Modifier — Life }
+500 to maximum Life (implicit)
--------
+1000 to maximum Life
20% reduced Mana Cost of Skills
```

- [ ] **Step 8: Create fixture `tests/fixtures/clipboard/corrupted-item.txt`**

```
Item Class: Body Armours
Rarity: Rare
Sample Item
Sacrificial Garb
--------
Item Level: 86
--------
{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage }
166% increased Physical Damage
--------
Corrupted
```

- [ ] **Step 9: Create fixture `tests/fixtures/clipboard/synthesised-item.txt`**

```
Item Class: Gloves
Rarity: Rare
Sample Item
Synthesised Sorcerer Gloves
--------
Item Level: 86
--------
Synthesised Item
--------
{ Implicit Modifier — Life }
+25 to maximum Life (implicit)
--------
{ Prefix Modifier "Hale" (Tier: 1) — Life }
+100 to maximum Life
```

- [ ] **Step 10: Create fixture `tests/fixtures/clipboard/no-type-hints.txt`**

```
Item Class: Body Armours
Rarity: Rare
Sample Item
Sacrificial Garb
--------
Item Level: 86
--------
166% increased Physical Damage
+19% to Cold Resistance
+22 to maximum Life (implicit)
+15 to maximum Mana (fractured)
```

- [ ] **Step 11: Write the snapshot test**

Create `tests/poe-clipboard/parse.test.ts`:

```ts
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

  it('rare-with-fractured: tags the prefix with fractured flag', () => {
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
    // Two explicit lines, no type hints — both go to "unknown"
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
    // 3 non-implicit lines: 2 explicit + 1 fractured → all "unknown" (Plan 3 categorizes)
    expect(parsed.unknown).toHaveLength(3);
  });
});
```

- [ ] **Step 12: Run** — first run creates snapshots; subsequent runs verify

```bash
cd /home/nick/projects/personal/Resimbinator
npm test -- tests/poe-clipboard/parse.test.ts
npm run typecheck
```

Expected: 10 snapshot tests + 10 field-level tests pass. The first run creates `__snapshots__/parse.test.ts.snap` containing the parsed shapes. Inspect it briefly for sanity.

- [ ] **Step 13: Commit**

```bash
git add tests/fixtures/clipboard/ tests/poe-clipboard/parse.test.ts tests/poe-clipboard/__snapshots__/
git commit -m "test(parser): 10 fixture snapshots covering rarity/influence/flags variations"
```

---

## Task 8: Public API surface

**Files:**

- Create: `src/lib/poe-clipboard/index.ts`
- Test: `tests/poe-clipboard/index.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/poe-clipboard/index.test.ts
import { describe, it, expect } from 'vitest';
import * as parser from '../../src/lib/poe-clipboard/index.js';

describe('clipboard parser public API', () => {
  it('exports the documented symbols', () => {
    expect(typeof parser.parse).toBe('function');
    expect(typeof parser.tokenize).toBe('function');
  });
});
```

- [ ] **Step 2: Run** — FAIL

- [ ] **Step 3: Implement `index.ts`**

```ts
// src/lib/poe-clipboard/index.ts
export type { Rarity, Influence, ParsedHeader, ParsedMod, ParsedItem, ModFlag } from './types.js';
export { tokenize } from './tokenize.js';
export { parse } from './parse.js';
```

- [ ] **Step 4: Run** — PASS

```bash
npm test -- tests/poe-clipboard/index.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/poe-clipboard/index.ts tests/poe-clipboard/index.test.ts
git commit -m "feat(parser): public API surface"
```

---

## Task 9: CLI `parse` command

Extend the existing CLI to accept a third command: `parse`. Reads clipboard text on stdin (when input is not JSON-shaped), prints the `ParsedItem` as JSON.

**Files:**

- Modify: `src/cli/main.ts`
- Modify: `tests/cli/main.test.ts`

- [ ] **Step 1: Add a failing test to `tests/cli/main.test.ts`**

Append to the existing file (after the existing `describe('CLI', ...)`):

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/clipboard');

describe('CLI parse command', () => {
  it('parses clipboard text from stdin into a ParsedItem', async () => {
    const clipboard = readFileSync(resolve(FIXTURES_DIR, 'rare-with-hints.txt'), 'utf8');
    // The CLI accepts a JSON envelope: { command: "parse", clipboard: "..." }
    const input = JSON.stringify({ command: 'parse', clipboard });
    const out = await runCli(input);
    expect(out.command).toBe('parse');
    if (out.command !== 'parse') throw new Error('typeguard');
    expect(out.parsed.rarity).toBe('Rare');
    expect(out.parsed.prefixes).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run** — FAIL (`out.command === 'parse'` but the type doesn't include `parse`)

```bash
npm test -- tests/cli/main.test.ts
```

- [ ] **Step 3: Update `src/cli/main.ts`**

Modify the file. Add `parse` to the command union and add a corresponding output variant. Specifically, replace:

```ts
export type CliInput = {
  command: 'probability' | 'simulate';
  seed?: number;
  trials?: number;
  item1: Item;
  item2: Item;
};

export type CliOutput =
  | { command: 'probability'; exact: number; monteCarlo: number }
  | {
      command: 'simulate';
      results: Array<{ baseFromItem: 1 | 2; prefixes: string[]; suffixes: string[] }>;
    };
```

with:

```ts
import { parse as parseClipboard } from '../lib/poe-clipboard/index.js';
import type { ParsedItem } from '../lib/poe-clipboard/index.js';

export type CliInput =
  | {
      command: 'probability' | 'simulate';
      seed?: number;
      trials?: number;
      item1: Item;
      item2: Item;
    }
  | { command: 'parse'; clipboard: string };

export type CliOutput =
  | { command: 'probability'; exact: number; monteCarlo: number }
  | {
      command: 'simulate';
      results: Array<{ baseFromItem: 1 | 2; prefixes: string[]; suffixes: string[] }>;
    }
  | { command: 'parse'; parsed: ParsedItem };
```

Then add the parse branch inside `runCli`. Find the existing `if (input.command === 'probability')` ... `else { ... }` block and replace its surrounding logic with:

```ts
if (input.command === 'parse') {
  return { command: 'parse', parsed: parseClipboard(input.clipboard) };
}

const seed = input.seed ?? Date.now();
const rng = new SeededRng(seed);

const allMods: Mod[] = [
  ...input.item1.prefixes,
  ...input.item1.suffixes,
  ...input.item2.prefixes,
  ...input.item2.suffixes,
];
const desired = allMods.filter((m) => m.desired === true);

if (input.command === 'probability') {
  // ... existing probability branch unchanged ...
} else {
  // ... existing simulate branch unchanged ...
}
```

- [ ] **Step 4: Run** — PASS

```bash
npm test -- tests/cli/main.test.ts
npm run typecheck
```

- [ ] **Step 5: Smoke test**

```bash
cat tests/fixtures/clipboard/rare-with-hints.txt | python3 -c "import json,sys;print(json.dumps({'command':'parse','clipboard':sys.stdin.read()}))" | npm run engine
```

Expected: pretty-printed JSON of the parsed item with rarity Rare, 2 prefixes, 1 suffix.

- [ ] **Step 6: Commit**

```bash
git add src/cli/main.ts tests/cli/main.test.ts
git commit -m "feat(cli): parse command for clipboard text"
```

---

## Task 10: README update

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update README**

In `README.md`, find the "What's coming (planned)" section and update it to reflect Plan 2 being done. Add a "Parser" section under "What's here so far":

Insert after the existing CLI section:

````markdown
## Parser

The clipboard parser turns PoE's in-game Ctrl+C output into a structured `ParsedItem`. It handles items with and without "Show Modifier Type Hints" enabled.

```bash
cat my-item.txt | python3 -c "import json,sys; print(json.dumps({'command':'parse','clipboard':sys.stdin.read()}))" | npm run engine
```
````

Output is a JSON `ParsedItem` with `prefixes`, `suffixes`, `implicits`, plus `unknown` mods that the upcoming Plan 3 categorizer will resolve.

````

And update the "What's coming" list to:

```markdown
- **Plan 3:** RePoE-backed mod database + categorizer (translates `ParsedItem` to engine `Item`)
- **Plan 4:** SvelteKit UI, persistence, share-URL, deploy
````

(Plan 2 was the parser; it's now done.)

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README update for Plan 2 (parser shipped)"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run the full suite**

```bash
cd /home/nick/projects/personal/Resimbinator
npm test
npm run typecheck
npm run lint
```

All green. Total test count should be 52 (Plan 1) + ~15-20 new parser tests = ~70 tests.

- [ ] **Step 2: Confirm git log**

```bash
git log --oneline
```

Should show all Plan 1 commits plus ~10 new commits from Plan 2.

- [ ] **Step 3: Smoke test Plan 2 end-to-end**

```bash
cat tests/fixtures/clipboard/rare-with-fractured.txt | python3 -c "import json,sys;print(json.dumps({'command':'parse','clipboard':sys.stdin.read()}))" | npm run engine
```

Confirm: parsed output shows fractured prefix with `flags: ["fractured"]`.

---

## Plan-2 acceptance criteria

When this plan is complete, the repo:

1. Has a `lib/poe-clipboard/parse()` function that takes raw clipboard text and returns a structured `ParsedItem`
2. Handles all 10 fixture variations (rare, magic, normal, unique, with/without type hints, corrupted, synthesised, influenced, fractured, crafted)
3. Sorts mods into `implicits`, `prefixes`, `suffixes`, and `unknown` (the last for type-hints-off cases that need Plan 3 to categorize)
4. Detects flags: corrupted, synthesised, influence, item level, quality
5. CLI exposes a `parse` command alongside the existing `probability` and `simulate`
6. All snapshots stable; lint + typecheck + tests all green

## What's next after Plan 2

**Plan 3 (mod database + categorizer):**

- Build-time RePoE fetch script → `static/mod-db.json`
- `categorize(parsedMod, baseContext)` → `ModCategory`
- Translator that bridges `ParsedItem` (parser output) → `Item` (engine input)
- Tests against real fixture mods

After Plan 3 is done, the engine + parser + categorizer chain will be a complete CLI tool: paste a PoE item, get probability of any desired mods. Plan 4 wraps it all in the SvelteKit UI.

## Open questions for the user

If you want this to be a polished community tool eventually (which we deferred during brainstorming), it would help to gather **5-10 real PoE clipboard exports** from your characters to add to the fixture set. The synthetic fixtures in this plan cover the documented format, but real items in the wild may surface edge cases I haven't predicted. Optional — Plan 2 can ship with synthetic fixtures and we add real ones to Plan 3 when you have them handy.

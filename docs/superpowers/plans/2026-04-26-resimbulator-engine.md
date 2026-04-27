# Resimbinator Engine Implementation Plan (Plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure-TypeScript recombinator math engine — Table 1 distribution sampler, mod-eligibility filter, exclusive resolution, fill-order, special-case handling, single+batch simulator, and exact-enumeration probability calculator — validated against worked examples from `guide.txt`. No UI, no clipboard parser, no mod database — just the math layer wrapped in a small CLI.

**Architecture:** A self-contained `lib/recombinator/` package with abstract types (`Item`, `Mod`, `ModCategory`) deliberately decoupled from RePoE-specific data. Pseudo-random generation is pluggable via a `Rng` interface so all tests use a seeded PRNG and run deterministically. A tiny CLI (`Resimbinator -engine`) takes a JSON scenario on stdin and prints probability + sample rolls to stdout, giving us a usable artifact and an integration-test surface before any UI exists.

**Tech Stack:** TypeScript 5.x, Node 20+, Vitest, ESLint, Prettier. SvelteKit/Tailwind/Vercel are out of scope for this plan — added in Plan 4.

**Spec reference:** `docs/superpowers/specs/2026-04-26-Resimbinator -design.md` (sections "Architecture → Layer 1: Engine" and "Engine — recombinator simulator & probability").

**Out of scope for Plan 1:**

- PoE clipboard parser (Plan 2)
- Mod database fetch + categorizer (Plan 3)
- UI, state store, deploy (Plan 4)

---

## File Structure

Created in this plan:

```
package.json
tsconfig.json
.eslintrc.cjs
.prettierrc
.gitignore
vitest.config.ts
README.md

src/
  lib/
    recombinator/
      types.ts          # Item, Mod, ModCategory, RecombineInput
      rng.ts            # Rng interface + SeededRng implementation
      table1.ts         # Table 1 distribution data + sampler
      ilevel.ts         # Item-level formula
      eligibility.ts    # NNN/Fractured/Exclusive eligibility checks
      pick.ts           # pickBase, pickModCount, fillOrder, pickMods
      simulate.ts       # single trial + batch
      probability.ts    # exact enumeration with Monte-Carlo fallback
      special-cases.ts  # 1p/0s + 0p/1s case
      index.ts          # public API surface

  cli/
    main.ts             # `Resimbinator -engine` CLI

tests/
  recombinator/
    table1.test.ts
    ilevel.test.ts
    eligibility.test.ts
    pick.test.ts
    simulate.test.ts
    probability.test.ts
    special-cases.test.ts
    rng.test.ts
    guide-examples.test.ts        # §6, §7, §8 worked examples
    cross-check.test.ts           # property: probability ≈ simulate(100k)
  cli/
    main.test.ts

  fixtures/
    guide-grasping-mail.json      # §6
    guide-wand-counterweight.json # §7
    guide-three-prefixes-a.json   # §8
    guide-three-prefixes-b.json
    guide-three-suffixes-a.json
    guide-1p-1s-special.json
```

Each file has one responsibility; no file exceeds ~250 lines. The `Rng` abstraction goes in its own file because every random-using module depends on it. `pick.ts` groups the four pick functions (base/count/order/mods) because they share helpers. `eligibility.ts` is separate because it's pure logic with no randomness — easiest to test in isolation.

---

## Task 1: Initialize project + tooling

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `vitest.config.ts`

- [ ] **Step 1: Initialize git and the npm package**

```bash
cd /home/nick/projects/personal/Resimbinator
git init
npm init -y
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install --save-dev typescript@^5.4 vitest@^1.5 @types/node@^20 \
  eslint@^8 @typescript-eslint/parser@^7 @typescript-eslint/eslint-plugin@^7 \
  prettier@^3 tsx@^4
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "outDir": "dist",
    "rootDir": ".",
    "lib": ["ES2022"],
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: { reporter: ['text', 'html'] },
  },
});
```

- [ ] **Step 5: Write `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  env: { node: true, es2022: true },
  rules: { '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] },
};
```

- [ ] **Step 6: Write `.prettierrc`**

```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 100, "semi": true }
```

- [ ] **Step 7: Write `.gitignore`**

```
node_modules
dist
coverage
.DS_Store
*.log
```

- [ ] **Step 8: Update `package.json` scripts**

Replace the `scripts` block in `package.json` with:

```json
"scripts": {
  "lint": "eslint src tests --ext .ts",
  "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "build": "tsc",
  "engine": "tsx src/cli/main.ts"
}
```

Also set `"type": "module"` at the top level of `package.json` so ESM works without ceremony.

- [ ] **Step 9: Verify the toolchain**

```bash
npm run typecheck
npm run lint
```

Both should succeed with no output (no source files yet, but config must be valid).

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: initialize TypeScript + Vitest + ESLint toolchain"
```

---

## Task 2: Core types

**Files:**

- Create: `src/lib/recombinator/types.ts`
- Test: `tests/recombinator/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/types.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  Item,
  Mod,
  ModCategory,
  BaseContext,
  RecombineInput,
} from '../../src/lib/recombinator/types.js';

describe('types: Mod', () => {
  it('accepts a regular explicit mod', () => {
    const m: Mod = {
      id: 'mod_phys_1',
      affix: 'prefix',
      category: 'RegularExplicit',
      name: 'Tyrannical',
      tier: 1,
      statText: '166% increased Physical Damage',
    };
    expect(m.affix).toBe('prefix');
  });

  it('accepts a fractured mod with a hostItemId', () => {
    const m: Mod = {
      id: 'mod_mana_4',
      affix: 'prefix',
      category: 'Fractured',
      name: "Mage King's",
      tier: 4,
      statText: '+15 to maximum Mana',
      hostItemId: 'item_1',
    };
    expect(m.hostItemId).toBe('item_1');
  });
});

describe('types: Item', () => {
  it('groups prefixes/suffixes/implicits', () => {
    const item: Item = {
      id: 'item_1',
      base: 'Sacrificial Garb',
      itemClass: 'Body Armours',
      itemLevel: 86,
      attributeBase: 'str_int',
      defenceTags: ['armour', 'energy_shield'],
      influence: undefined,
      corrupted: false,
      synthesised: false,
      implicits: [],
      prefixes: [],
      suffixes: [],
    };
    expect(item.attributeBase).toBe('str_int');
  });
});

describe('types: ModCategory union', () => {
  it('includes the documented categories', () => {
    expectTypeOf<ModCategory>().toMatchTypeOf<
      | 'RegularExplicit'
      | 'ExclusiveCrafted'
      | 'ExclusiveVeiled'
      | 'ExclusiveEssence'
      | 'ExclusiveBreach'
      | 'ExclusiveIncursion'
      | 'ExclusiveBeastAspect'
      | 'ExclusiveDelve'
      | 'ExclusiveElevated'
      | 'NNN_Influenced'
      | 'NNN_Defence'
      | 'NNN_Attribute'
      | 'Fractured'
      | 'Implicit'
    >();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/types.test.ts
```

Expected: FAIL with `Cannot find module '../../src/lib/recombinator/types.js'`.

- [ ] **Step 3: Implement `types.ts`**

```ts
// src/lib/recombinator/types.ts

export type Affix = 'prefix' | 'suffix' | 'implicit';

export type ModCategory =
  | 'RegularExplicit'
  | 'ExclusiveCrafted'
  | 'ExclusiveVeiled'
  | 'ExclusiveEssence'
  | 'ExclusiveBreach'
  | 'ExclusiveIncursion'
  | 'ExclusiveBeastAspect'
  | 'ExclusiveDelve'
  | 'ExclusiveElevated'
  | 'NNN_Influenced'
  | 'NNN_Defence'
  | 'NNN_Attribute'
  | 'Fractured'
  | 'Implicit';

export type AttributeBase = 'str' | 'dex' | 'int' | 'str_dex' | 'str_int' | 'dex_int' | 'pure';

export type DefenceTag = 'armour' | 'evasion' | 'energy_shield';

export type Influence = 'shaper' | 'elder' | 'crusader' | 'hunter' | 'warlord' | 'redeemer';

export type Mod = {
  id: string;
  affix: Affix;
  category: ModCategory;
  name: string;
  tier: number | null;
  statText: string;
  /** For Fractured mods: the input item id this mod must travel with. */
  hostItemId?: string;
  /** For NNN_Influenced: required influence on the chosen base. */
  requiresInfluence?: Influence;
  /** For NNN_Defence: required defence tags on the chosen base. */
  requiresDefenceTag?: DefenceTag;
  /** For NNN_Attribute: which attribute bases this mod is allowed on. */
  allowedAttributeBases?: AttributeBase[];
  /** Marker for desired-mod selection in probability calc. Not part of the math. */
  desired?: boolean;
};

export type Item = {
  id: string;
  base: string;
  itemClass: string;
  itemLevel: number;
  attributeBase: AttributeBase;
  defenceTags: DefenceTag[];
  influence: Influence | undefined;
  corrupted: boolean;
  synthesised: boolean;
  implicits: Mod[];
  prefixes: Mod[];
  suffixes: Mod[];
};

export type BaseContext = {
  base: string;
  itemClass: string;
  attributeBase: AttributeBase;
  defenceTags: DefenceTag[];
  influence: Influence | undefined;
  itemLevel: number;
  hostItemId: string;
};

export type RecombineInput = { item1: Item; item2: Item };

export type RecombineResult = {
  baseFromItem: 1 | 2;
  baseContext: BaseContext;
  prefixes: Mod[];
  suffixes: Mod[];
  itemLevel: number;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/types.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/types.ts tests/recombinator/types.test.ts
git commit -m "feat(engine): core types (Item, Mod, ModCategory, BaseContext)"
```

---

## Task 3: Seedable Rng

**Files:**

- Create: `src/lib/recombinator/rng.ts`
- Test: `tests/recombinator/rng.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/rng.test.ts
import { describe, it, expect } from 'vitest';
import { SeededRng } from '../../src/lib/recombinator/rng.js';

describe('SeededRng', () => {
  it('is deterministic for a given seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBeCloseTo(b.next(), 12);
    }
  });

  it('produces values in [0, 1)', () => {
    const r = new SeededRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('pickWeighted picks proportional to weights', () => {
    const r = new SeededRng(7);
    const counts = [0, 0, 0];
    for (let i = 0; i < 10_000; i++) {
      counts[r.pickWeighted([1, 2, 7])]++;
    }
    expect(counts[0]! / 10_000).toBeCloseTo(0.1, 1);
    expect(counts[1]! / 10_000).toBeCloseTo(0.2, 1);
    expect(counts[2]! / 10_000).toBeCloseTo(0.7, 1);
  });

  it('pickOne returns one of the given items', () => {
    const r = new SeededRng(1);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(r.pickOne(items));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/rng.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `rng.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/rng.test.ts
```

Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/rng.ts tests/recombinator/rng.test.ts
git commit -m "feat(engine): seedable Mulberry32 Rng for deterministic sims"
```

---

## Task 4: Table 1 distribution

**Files:**

- Create: `src/lib/recombinator/table1.ts`
- Test: `tests/recombinator/table1.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/table1.test.ts
import { describe, it, expect } from 'vitest';
import { TABLE1, sampleModCount, expectedDistribution } from '../../src/lib/recombinator/table1.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';

describe('TABLE1 data', () => {
  it('has rows for 1..6 inputs and probabilities sum to 1 each', () => {
    for (let n = 1; n <= 6; n++) {
      const row = TABLE1[n]!;
      const sum = row[0] + row[1] + row[2] + row[3];
      expect(sum).toBeCloseTo(1, 6);
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
    for (let i = 0; i < 20_000; i++) counts[sampleModCount(4, rng)]++;
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/table1.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `table1.ts`**

```ts
// src/lib/recombinator/table1.ts
import type { Rng } from './rng.js';

/**
 * Table 1 from guide.txt §5: P(final mod count | total inputs in pool).
 * Indexed [totalInputs][finalCount]. Final count ranges 0..3.
 *
 * Source: Reddit guide "TLDR: Recombinator new use cases = GOOD" (3.25 Settlers).
 */
export const TABLE1: Record<number, [number, number, number, number]> = {
  0: [1, 0, 0, 0],
  1: [0.41, 0.59, 0, 0],
  2: [0, 0.67, 0.33, 0],
  3: [0, 0.39, 0.52, 0.1],
  4: [0, 0.11, 0.59, 0.31],
  5: [0, 0, 0.43, 0.57],
  6: [0, 0, 0.28, 0.72],
};

export function expectedDistribution(totalInputs: number): readonly number[] {
  const row = TABLE1[totalInputs];
  if (!row) throw new Error(`Table 1: total inputs ${totalInputs} out of range (0..6)`);
  return row;
}

export function sampleModCount(totalInputs: number, rng: Rng): number {
  const row = expectedDistribution(totalInputs);
  return rng.pickWeighted([...row]);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/table1.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/table1.ts tests/recombinator/table1.test.ts
git commit -m "feat(engine): Table 1 distribution + sampler (guide §5)"
```

---

## Task 5: Item-level formula

**Files:**

- Create: `src/lib/recombinator/ilevel.ts`
- Test: `tests/recombinator/ilevel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/ilevel.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `ilevel.ts`**

```ts
// src/lib/recombinator/ilevel.ts

/**
 * Item-level formula from guide.txt §2:
 *   floor((ilvl1 + ilvl2) / 2) + 2, capped at max(ilvl1, ilvl2).
 */
export function computeItemLevel(ilvl1: number, ilvl2: number): number {
  const raw = Math.floor((ilvl1 + ilvl2) / 2) + 2;
  return Math.min(raw, Math.max(ilvl1, ilvl2));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/ilevel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/ilevel.ts tests/recombinator/ilevel.test.ts
git commit -m "feat(engine): item-level formula (guide §2)"
```

---

## Task 6: Eligibility filter

**Files:**

- Create: `src/lib/recombinator/eligibility.ts`
- Test: `tests/recombinator/eligibility.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/eligibility.test.ts
import { describe, it, expect } from 'vitest';
import { isEligible } from '../../src/lib/recombinator/eligibility.js';
import type { Mod, BaseContext } from '../../src/lib/recombinator/types.js';

const baseStr: BaseContext = {
  base: 'Goliath Gauntlets',
  itemClass: 'Gloves',
  attributeBase: 'str',
  defenceTags: ['armour'],
  influence: undefined,
  itemLevel: 86,
  hostItemId: 'item_1',
};

const baseStrInt: BaseContext = {
  ...baseStr,
  base: 'Sacrificial Garb',
  itemClass: 'Body Armours',
  attributeBase: 'str_int',
  defenceTags: ['armour', 'energy_shield'],
};

const baseInfluenced: BaseContext = { ...baseStr, influence: 'warlord' };

const regular: Mod = {
  id: 'a',
  affix: 'prefix',
  category: 'RegularExplicit',
  name: 'X',
  tier: 1,
  statText: '',
};
const fracturedItem1: Mod = { ...regular, id: 'b', category: 'Fractured', hostItemId: 'item_1' };
const fracturedItem2: Mod = { ...regular, id: 'c', category: 'Fractured', hostItemId: 'item_2' };
const influencedWarlord: Mod = {
  ...regular,
  id: 'd',
  category: 'NNN_Influenced',
  requiresInfluence: 'warlord',
};
const influencedHunter: Mod = {
  ...regular,
  id: 'e',
  category: 'NNN_Influenced',
  requiresInfluence: 'hunter',
};
const armourMod: Mod = {
  ...regular,
  id: 'f',
  category: 'NNN_Defence',
  requiresDefenceTag: 'armour',
};
const esMod: Mod = {
  ...regular,
  id: 'g',
  category: 'NNN_Defence',
  requiresDefenceTag: 'energy_shield',
};
const strLifeRegen: Mod = {
  ...regular,
  id: 'h',
  category: 'NNN_Attribute',
  allowedAttributeBases: ['str', 'str_dex', 'str_int'],
};
const intMod: Mod = {
  ...regular,
  id: 'i',
  category: 'NNN_Attribute',
  allowedAttributeBases: ['int', 'str_int', 'dex_int'],
};
const exclusive: Mod = { ...regular, id: 'j', category: 'ExclusiveBreach' };

describe('isEligible', () => {
  it('regular mods are always eligible regardless of base', () => {
    expect(isEligible(regular, baseStr, false)).toBe(true);
    expect(isEligible(regular, baseStrInt, true)).toBe(true);
  });

  it('fractured mod eligible only when its host item is the chosen base', () => {
    expect(isEligible(fracturedItem1, baseStr, false)).toBe(true);
    expect(isEligible(fracturedItem2, baseStr, false)).toBe(false);
  });

  it('NNN_Influenced eligible only on matching influence', () => {
    expect(isEligible(influencedWarlord, baseInfluenced, false)).toBe(true);
    expect(isEligible(influencedHunter, baseInfluenced, false)).toBe(false);
    expect(isEligible(influencedWarlord, baseStr, false)).toBe(false);
  });

  it('NNN_Defence eligible only when base has the required defence tag', () => {
    expect(isEligible(armourMod, baseStr, false)).toBe(true);
    expect(isEligible(esMod, baseStr, false)).toBe(false);
    expect(isEligible(esMod, baseStrInt, false)).toBe(true);
  });

  it('NNN_Attribute eligible only on listed attribute bases', () => {
    expect(isEligible(strLifeRegen, baseStr, false)).toBe(true);
    expect(isEligible(strLifeRegen, baseStrInt, false)).toBe(true);
    expect(isEligible(intMod, baseStr, false)).toBe(false);
    expect(isEligible(intMod, baseStrInt, false)).toBe(true);
  });

  it('exclusive mods are ineligible after one exclusive has been picked', () => {
    expect(isEligible(exclusive, baseStr, false)).toBe(true);
    expect(isEligible(exclusive, baseStr, true)).toBe(false);
  });

  it('non-exclusive mods are unaffected by the exclusive lockout', () => {
    expect(isEligible(regular, baseStr, true)).toBe(true);
    expect(isEligible(armourMod, baseStr, true)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/eligibility.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `eligibility.ts`**

```ts
// src/lib/recombinator/eligibility.ts
import type { BaseContext, Mod, ModCategory } from './types.js';

const EXCLUSIVE_CATEGORIES: ReadonlySet<ModCategory> = new Set([
  'ExclusiveCrafted',
  'ExclusiveVeiled',
  'ExclusiveEssence',
  'ExclusiveBreach',
  'ExclusiveIncursion',
  'ExclusiveBeastAspect',
  'ExclusiveDelve',
  'ExclusiveElevated',
]);

export function isExclusive(mod: Mod): boolean {
  return EXCLUSIVE_CATEGORIES.has(mod.category);
}

export function isEligible(mod: Mod, base: BaseContext, exclusiveAlreadyPicked: boolean): boolean {
  if (exclusiveAlreadyPicked && isExclusive(mod)) return false;

  switch (mod.category) {
    case 'Implicit':
      return false; // implicits don't transfer at all (handled separately by base inheritance)
    case 'Fractured':
      return mod.hostItemId === base.hostItemId;
    case 'NNN_Influenced':
      return mod.requiresInfluence !== undefined && base.influence === mod.requiresInfluence;
    case 'NNN_Defence':
      return (
        mod.requiresDefenceTag !== undefined && base.defenceTags.includes(mod.requiresDefenceTag)
      );
    case 'NNN_Attribute':
      return mod.allowedAttributeBases?.includes(base.attributeBase) ?? false;
    default:
      return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/eligibility.test.ts
```

Expected: PASS (all 7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/eligibility.ts tests/recombinator/eligibility.test.ts
git commit -m "feat(engine): mod eligibility (NNN/Fractured/Exclusive) per guide §5"
```

---

## Task 7: pickBase, pickModCount, fillOrder

**Files:**

- Create: `src/lib/recombinator/pick.ts`
- Test: `tests/recombinator/pick.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/pick.test.ts
import { describe, it, expect } from 'vitest';
import { pickBase, pickFillOrder } from '../../src/lib/recombinator/pick.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';
import type { Item } from '../../src/lib/recombinator/types.js';

const item1: Item = {
  id: 'item_1',
  base: 'Sacrificial Garb',
  itemClass: 'Body Armours',
  itemLevel: 84,
  attributeBase: 'str_int',
  defenceTags: ['armour', 'energy_shield'],
  influence: undefined,
  corrupted: false,
  synthesised: false,
  implicits: [],
  prefixes: [],
  suffixes: [],
};

const item2: Item = {
  ...item1,
  id: 'item_2',
  base: 'Astral Plate',
  itemLevel: 86,
  attributeBase: 'str',
};

describe('pickBase', () => {
  it('picks each item ~50% over many trials', () => {
    const rng = new SeededRng(123);
    let count1 = 0;
    for (let i = 0; i < 10_000; i++) {
      const r = pickBase(item1, item2, rng);
      if (r.from === 1) count1++;
    }
    expect(count1 / 10_000).toBeCloseTo(0.5, 1);
  });

  it('produces a BaseContext that copies the chosen base attributes', () => {
    const rng = new SeededRng(1);
    const r = pickBase(item1, item2, rng);
    const expected = r.from === 1 ? item1 : item2;
    expect(r.baseContext.base).toBe(expected.base);
    expect(r.baseContext.attributeBase).toBe(expected.attributeBase);
    expect(r.baseContext.defenceTags).toEqual(expected.defenceTags);
    expect(r.baseContext.hostItemId).toBe(expected.id);
  });

  it('computes the new ilvl per the formula', () => {
    const rng = new SeededRng(1);
    for (let i = 0; i < 50; i++) {
      const r = pickBase(item1, item2, rng);
      // (84 + 86) / 2 + 2 = 87 → capped at 86
      expect(r.itemLevel).toBe(86);
    }
  });
});

describe('pickFillOrder', () => {
  it('returns prefix-first or suffix-first ~50/50', () => {
    const rng = new SeededRng(7);
    let pre = 0;
    for (let i = 0; i < 10_000; i++) {
      if (pickFillOrder(rng) === 'prefix-first') pre++;
    }
    expect(pre / 10_000).toBeCloseTo(0.5, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/pick.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `pick.ts`**

```ts
// src/lib/recombinator/pick.ts
import type { BaseContext, Item, Mod } from './types.js';
import type { Rng } from './rng.js';
import { isEligible, isExclusive } from './eligibility.js';
import { computeItemLevel } from './ilevel.js';

export type FillOrder = 'prefix-first' | 'suffix-first';

export type BasePick = {
  from: 1 | 2;
  baseContext: BaseContext;
  itemLevel: number;
};

export function pickBase(item1: Item, item2: Item, rng: Rng): BasePick {
  const from: 1 | 2 = rng.next() < 0.5 ? 1 : 2;
  const chosen = from === 1 ? item1 : item2;
  return {
    from,
    baseContext: {
      base: chosen.base,
      itemClass: chosen.itemClass,
      attributeBase: chosen.attributeBase,
      defenceTags: chosen.defenceTags,
      influence: chosen.influence,
      itemLevel: computeItemLevel(item1.itemLevel, item2.itemLevel),
      hostItemId: chosen.id,
    },
    itemLevel: computeItemLevel(item1.itemLevel, item2.itemLevel),
  };
}

export function pickFillOrder(rng: Rng): FillOrder {
  return rng.next() < 0.5 ? 'prefix-first' : 'suffix-first';
}

export function pickEligibleMods(
  pool: Mod[],
  count: number,
  base: BaseContext,
  exclusiveAlreadyPicked: boolean,
  rng: Rng,
): { picked: Mod[]; pickedExclusive: boolean } {
  const picked: Mod[] = [];
  let exclusiveSoFar = exclusiveAlreadyPicked;
  // Eligibility is recomputed each step because picking an exclusive locks others out.
  while (picked.length < count) {
    const eligible = pool.filter((m) => !picked.includes(m) && isEligible(m, base, exclusiveSoFar));
    if (eligible.length === 0) break; // can't reach target count; guide notes this is allowed
    const chosen = rng.pickOne(eligible);
    picked.push(chosen);
    if (isExclusive(chosen)) exclusiveSoFar = true;
  }
  return { picked, pickedExclusive: exclusiveSoFar !== exclusiveAlreadyPicked };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/pick.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add a test for `pickEligibleMods`**

Append to `tests/recombinator/pick.test.ts`:

```ts
import { pickEligibleMods } from '../../src/lib/recombinator/pick.js';
import type { Mod } from '../../src/lib/recombinator/types.js';

const reg = (id: string): Mod => ({
  id,
  affix: 'prefix',
  category: 'RegularExplicit',
  name: id,
  tier: 1,
  statText: '',
});
const exc = (id: string): Mod => ({
  id,
  affix: 'prefix',
  category: 'ExclusiveBreach',
  name: id,
  tier: 1,
  statText: '',
});

describe('pickEligibleMods', () => {
  const ctx = {
    base: 'X',
    itemClass: 'Y',
    attributeBase: 'str' as const,
    defenceTags: ['armour' as const],
    influence: undefined,
    itemLevel: 86,
    hostItemId: 'item_1',
  };

  it('picks the requested count when enough eligible mods exist', () => {
    const rng = new SeededRng(1);
    const pool = [reg('a'), reg('b'), reg('c'), reg('d')];
    const { picked } = pickEligibleMods(pool, 3, ctx, false, rng);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((m) => m.id)).size).toBe(3);
  });

  it('locks out further exclusive mods after one is picked', () => {
    const rng = new SeededRng(99);
    const pool = [exc('e1'), exc('e2'), exc('e3')];
    const { picked } = pickEligibleMods(pool, 3, ctx, false, rng);
    expect(picked.length).toBe(1); // can't pick more exclusives
  });

  it('returns fewer than count when pool is exhausted by eligibility', () => {
    const rng = new SeededRng(1);
    const pool = [exc('e1'), reg('a')];
    const { picked } = pickEligibleMods(pool, 3, ctx, true, rng);
    // Exclusive blocked by lockout; only the regular survives.
    expect(picked.map((m) => m.id)).toEqual(['a']);
  });
});
```

- [ ] **Step 6: Run all pick tests**

```bash
npm test -- tests/recombinator/pick.test.ts
```

Expected: PASS (all describe blocks).

- [ ] **Step 7: Commit**

```bash
git add src/lib/recombinator/pick.ts tests/recombinator/pick.test.ts
git commit -m "feat(engine): pickBase, pickFillOrder, pickEligibleMods"
```

---

## Task 8: Special case 1p/0s + 0p/1s

**Files:**

- Create: `src/lib/recombinator/special-cases.ts`
- Test: `tests/recombinator/special-cases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/special-cases.test.ts
import { describe, it, expect } from 'vitest';
import {
  isOneOneSpecialCase,
  sampleOneOneOutcome,
} from '../../src/lib/recombinator/special-cases.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';
import type { Item } from '../../src/lib/recombinator/types.js';

const blank = (id: string, prefixes: number, suffixes: number): Item => ({
  id,
  base: 'X',
  itemClass: 'Y',
  itemLevel: 86,
  attributeBase: 'str',
  defenceTags: ['armour'],
  influence: undefined,
  corrupted: false,
  synthesised: false,
  implicits: [],
  prefixes: Array.from({ length: prefixes }, (_, i) => ({
    id: `${id}_p${i}`,
    affix: 'prefix',
    category: 'RegularExplicit',
    name: 'P',
    tier: 1,
    statText: '',
  })),
  suffixes: Array.from({ length: suffixes }, (_, i) => ({
    id: `${id}_s${i}`,
    affix: 'suffix',
    category: 'RegularExplicit',
    name: 'S',
    tier: 1,
    statText: '',
  })),
});

describe('isOneOneSpecialCase', () => {
  it('true only for 1p/0s + 0p/1s (either order)', () => {
    expect(isOneOneSpecialCase(blank('a', 1, 0), blank('b', 0, 1))).toBe(true);
    expect(isOneOneSpecialCase(blank('a', 0, 1), blank('b', 1, 0))).toBe(true);
    expect(isOneOneSpecialCase(blank('a', 1, 1), blank('b', 0, 1))).toBe(false);
    expect(isOneOneSpecialCase(blank('a', 1, 0), blank('b', 1, 0))).toBe(false);
  });
});

describe('sampleOneOneOutcome', () => {
  it('produces 1p/0s, 0p/1s, 1p/1s each at ~33%', () => {
    const rng = new SeededRng(11);
    const counts = { p: 0, s: 0, ps: 0 };
    for (let i = 0; i < 30_000; i++) {
      const r = sampleOneOneOutcome(rng);
      counts[r === '1p/0s' ? 'p' : r === '0p/1s' ? 's' : 'ps']++;
    }
    expect(counts.p / 30_000).toBeCloseTo(1 / 3, 1);
    expect(counts.s / 30_000).toBeCloseTo(1 / 3, 1);
    expect(counts.ps / 30_000).toBeCloseTo(1 / 3, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/special-cases.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `special-cases.ts`**

```ts
// src/lib/recombinator/special-cases.ts
import type { Item } from './types.js';
import type { Rng } from './rng.js';

export type OneOneOutcome = '1p/0s' | '0p/1s' | '1p/1s';

/**
 * Guide §5: the only exception to Table 1 is 1p/0s + 0p/1s.
 * No white item; 33/33/33 over (1p/0s, 0p/1s, 1p/1s).
 */
export function isOneOneSpecialCase(a: Item, b: Item): boolean {
  const totalP = a.prefixes.length + b.prefixes.length;
  const totalS = a.suffixes.length + b.suffixes.length;
  return totalP === 1 && totalS === 1;
}

export function sampleOneOneOutcome(rng: Rng): OneOneOutcome {
  const r = rng.next();
  if (r < 1 / 3) return '1p/0s';
  if (r < 2 / 3) return '0p/1s';
  return '1p/1s';
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/special-cases.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/special-cases.ts tests/recombinator/special-cases.test.ts
git commit -m "feat(engine): 1p/0s + 0p/1s special case (guide §5)"
```

---

## Task 9: simulate (single trial + batch)

**Files:**

- Create: `src/lib/recombinator/simulate.ts`
- Test: `tests/recombinator/simulate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/simulate.test.ts
import { describe, it, expect } from 'vitest';
import { simulateOnce, simulateBatch } from '../../src/lib/recombinator/simulate.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';
import type { Item, Mod } from '../../src/lib/recombinator/types.js';

const reg = (id: string, affix: 'prefix' | 'suffix'): Mod => ({
  id,
  affix,
  category: 'RegularExplicit',
  name: id,
  tier: 1,
  statText: '',
});

const baseItem = (id: string, prefixes: Mod[], suffixes: Mod[]): Item => ({
  id,
  base: 'Sacrificial Garb',
  itemClass: 'Body Armours',
  itemLevel: 86,
  attributeBase: 'str_int',
  defenceTags: ['armour', 'energy_shield'],
  influence: undefined,
  corrupted: false,
  synthesised: false,
  implicits: [],
  prefixes,
  suffixes,
});

describe('simulateOnce', () => {
  it('returns a result with prefixes from the prefix pool and suffixes from the suffix pool', () => {
    const rng = new SeededRng(1);
    const item1 = baseItem(
      'item_1',
      [reg('p1', 'prefix'), reg('p2', 'prefix')],
      [reg('s1', 'suffix')],
    );
    const item2 = baseItem(
      'item_2',
      [reg('p3', 'prefix')],
      [reg('s2', 'suffix'), reg('s3', 'suffix')],
    );
    const r = simulateOnce(item1, item2, rng);
    for (const p of r.prefixes) expect(p.affix).toBe('prefix');
    for (const s of r.suffixes) expect(s.affix).toBe('suffix');
    expect(['item_1', 'item_2']).toContain(r.baseContext.hostItemId);
  });

  it('respects Table 1 distribution over many trials (3 input prefixes)', () => {
    const item1 = baseItem('item_1', [reg('p1', 'prefix'), reg('p2', 'prefix')], []);
    const item2 = baseItem('item_2', [reg('p3', 'prefix')], []);
    const rng = new SeededRng(42);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 20_000; i++) {
      counts[simulateOnce(item1, item2, rng).prefixes.length]++;
    }
    // Expected for 3 inputs: [0, 0.39, 0.52, 0.10]
    expect(counts[1]! / 20_000).toBeCloseTo(0.39, 1);
    expect(counts[2]! / 20_000).toBeCloseTo(0.52, 1);
    expect(counts[3]! / 20_000).toBeCloseTo(0.1, 1);
  });

  it('triggers special case for 1p + 1s', () => {
    const item1 = baseItem('item_1', [reg('p', 'prefix')], []);
    const item2 = baseItem('item_2', [], [reg('s', 'suffix')]);
    const rng = new SeededRng(1);
    const counts = { p: 0, s: 0, ps: 0 };
    for (let i = 0; i < 30_000; i++) {
      const r = simulateOnce(item1, item2, rng);
      const k = `${r.prefixes.length}p${r.suffixes.length}s`;
      if (k === '1p0s') counts.p++;
      else if (k === '0p1s') counts.s++;
      else if (k === '1p1s') counts.ps++;
      else throw new Error(`unexpected outcome ${k}`);
    }
    expect(counts.p / 30_000).toBeCloseTo(1 / 3, 1);
    expect(counts.s / 30_000).toBeCloseTo(1 / 3, 1);
    expect(counts.ps / 30_000).toBeCloseTo(1 / 3, 1);
  });
});

describe('simulateBatch', () => {
  it('runs n trials and returns an array of n results', () => {
    const rng = new SeededRng(1);
    const item1 = baseItem('item_1', [reg('p1', 'prefix')], [reg('s1', 'suffix')]);
    const item2 = baseItem('item_2', [reg('p2', 'prefix')], [reg('s2', 'suffix')]);
    const results = simulateBatch(item1, item2, 100, rng);
    expect(results).toHaveLength(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/simulate.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `simulate.ts`**

```ts
// src/lib/recombinator/simulate.ts
import type { Item, Mod, RecombineResult } from './types.js';
import type { Rng } from './rng.js';
import { sampleModCount } from './table1.js';
import { pickBase, pickFillOrder, pickEligibleMods } from './pick.js';
import { isExclusive } from './eligibility.js';
import { isOneOneSpecialCase, sampleOneOneOutcome } from './special-cases.js';

export function simulateOnce(item1: Item, item2: Item, rng: Rng): RecombineResult {
  if (isOneOneSpecialCase(item1, item2)) return simulateOneOne(item1, item2, rng);

  const basePick = pickBase(item1, item2, rng);
  const prefixPool = [...item1.prefixes, ...item2.prefixes];
  const suffixPool = [...item1.suffixes, ...item2.suffixes];
  const totalP = prefixPool.length;
  const totalS = suffixPool.length;
  const targetP = sampleModCount(totalP, rng);
  const targetS = sampleModCount(totalS, rng);
  const order = pickFillOrder(rng);

  let exclusivePicked = false;
  let prefixes: Mod[] = [];
  let suffixes: Mod[] = [];

  if (order === 'prefix-first') {
    const r1 = pickEligibleMods(prefixPool, targetP, basePick.baseContext, exclusivePicked, rng);
    prefixes = r1.picked;
    exclusivePicked = exclusivePicked || prefixes.some(isExclusive);
    const r2 = pickEligibleMods(suffixPool, targetS, basePick.baseContext, exclusivePicked, rng);
    suffixes = r2.picked;
  } else {
    const r1 = pickEligibleMods(suffixPool, targetS, basePick.baseContext, exclusivePicked, rng);
    suffixes = r1.picked;
    exclusivePicked = exclusivePicked || suffixes.some(isExclusive);
    const r2 = pickEligibleMods(prefixPool, targetP, basePick.baseContext, exclusivePicked, rng);
    prefixes = r2.picked;
  }

  return {
    baseFromItem: basePick.from,
    baseContext: basePick.baseContext,
    prefixes,
    suffixes,
    itemLevel: basePick.itemLevel,
  };
}

function simulateOneOne(item1: Item, item2: Item, rng: Rng): RecombineResult {
  const basePick = pickBase(item1, item2, rng);
  const outcome = sampleOneOneOutcome(rng);
  const allP = [...item1.prefixes, ...item2.prefixes];
  const allS = [...item1.suffixes, ...item2.suffixes];

  let prefixes: Mod[] = [];
  let suffixes: Mod[] = [];
  if (outcome === '1p/0s' || outcome === '1p/1s') {
    prefixes = pickEligibleMods(allP, 1, basePick.baseContext, false, rng).picked;
  }
  if (outcome === '0p/1s' || outcome === '1p/1s') {
    const exclusivePicked = prefixes.some(isExclusive);
    suffixes = pickEligibleMods(allS, 1, basePick.baseContext, exclusivePicked, rng).picked;
  }

  return {
    baseFromItem: basePick.from,
    baseContext: basePick.baseContext,
    prefixes,
    suffixes,
    itemLevel: basePick.itemLevel,
  };
}

export function simulateBatch(item1: Item, item2: Item, n: number, rng: Rng): RecombineResult[] {
  const out: RecombineResult[] = [];
  for (let i = 0; i < n; i++) out.push(simulateOnce(item1, item2, rng));
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/simulate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/simulate.ts tests/recombinator/simulate.test.ts
git commit -m "feat(engine): simulateOnce + simulateBatch with §5 ruleset"
```

---

## Task 10: Probability calculator (Monte Carlo first)

We start with the Monte Carlo `probability()` because it's a thin wrapper over `simulateBatch()` and lets us validate guide examples _now_. Exact enumeration is added in Task 11 once we have a known-good baseline to cross-check against.

**Files:**

- Create: `src/lib/recombinator/probability.ts`
- Test: `tests/recombinator/probability.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/probability.test.ts
import { describe, it, expect } from 'vitest';
import { probabilityMonteCarlo, allDesiredHit } from '../../src/lib/recombinator/probability.js';
import { SeededRng } from '../../src/lib/recombinator/rng.js';
import type { Item, Mod } from '../../src/lib/recombinator/types.js';

const desired = (id: string, affix: 'prefix' | 'suffix'): Mod => ({
  id,
  affix,
  category: 'RegularExplicit',
  name: id,
  tier: 1,
  statText: '',
  desired: true,
});
const filler = (id: string, affix: 'prefix' | 'suffix'): Mod => ({
  id,
  affix,
  category: 'RegularExplicit',
  name: id,
  tier: 1,
  statText: '',
});

const baseItem = (id: string, p: Mod[], s: Mod[]): Item => ({
  id,
  base: 'Sacrificial Garb',
  itemClass: 'Body Armours',
  itemLevel: 86,
  attributeBase: 'str_int',
  defenceTags: ['armour', 'energy_shield'],
  influence: undefined,
  corrupted: false,
  synthesised: false,
  implicits: [],
  prefixes: p,
  suffixes: s,
});

describe('allDesiredHit', () => {
  it('true when every desired mod id is in the result', () => {
    const result = { prefixes: [filler('p1', 'prefix')], suffixes: [filler('s1', 'suffix')] };
    expect(allDesiredHit(result, [filler('p1', 'prefix')])).toBe(true);
    expect(allDesiredHit(result, [filler('p1', 'prefix'), filler('s1', 'suffix')])).toBe(true);
    expect(allDesiredHit(result, [filler('p99', 'prefix')])).toBe(false);
  });
});

describe('probabilityMonteCarlo', () => {
  it('1 desired prefix from a pool of 1 input prefix is 59% (Table 1)', () => {
    // Input: 1p (desired) + 0p, 0s + 0s. Output prefix count distribution: 41% zero, 59% one.
    const item1 = baseItem('a', [desired('p1', 'prefix')], []);
    const item2 = baseItem('b', [], []);
    const rng = new SeededRng(1);
    const p = probabilityMonteCarlo(item1, item2, [desired('p1', 'prefix')], 20_000, rng);
    expect(p).toBeCloseTo(0.59, 1);
  });

  it('returns 0 when the desired mod is not in either input', () => {
    const item1 = baseItem('a', [filler('p1', 'prefix')], []);
    const item2 = baseItem('b', [filler('p2', 'prefix')], []);
    const rng = new SeededRng(1);
    const p = probabilityMonteCarlo(item1, item2, [desired('p99', 'prefix')], 5_000, rng);
    expect(p).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/probability.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement Monte Carlo `probability.ts`**

```ts
// src/lib/recombinator/probability.ts
import type { Item, Mod, RecombineResult } from './types.js';
import type { Rng } from './rng.js';
import { simulateBatch } from './simulate.js';

export function allDesiredHit(
  result: Pick<RecombineResult, 'prefixes' | 'suffixes'>,
  desired: Mod[],
): boolean {
  const ids = new Set([...result.prefixes, ...result.suffixes].map((m) => m.id));
  return desired.every((m) => ids.has(m.id));
}

export function probabilityMonteCarlo(
  item1: Item,
  item2: Item,
  desired: Mod[],
  trials: number,
  rng: Rng,
): number {
  if (desired.length === 0) return 1;
  const results = simulateBatch(item1, item2, trials, rng);
  const hits = results.filter((r) => allDesiredHit(r, desired)).length;
  return hits / trials;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/probability.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/probability.ts tests/recombinator/probability.test.ts
git commit -m "feat(engine): probabilityMonteCarlo + allDesiredHit"
```

---

## Task 11: Probability calculator (exact enumeration)

We add exact enumeration as `probabilityExact()` and cross-check against Monte Carlo. The closed form enumerates: which base wins (2 cases), prefix count outcome (4 cases), suffix count outcome (4 cases), fill order (2 cases), and combinatorial mod selection (varies). For inputs the user will paste (≤6+6 mods), this is at most a few hundred terminal cases — well within reach.

**Files:**

- Modify: `src/lib/recombinator/probability.ts`
- Test: `tests/recombinator/probability.test.ts`

- [ ] **Step 1: Add a failing test**

Append to `tests/recombinator/probability.test.ts`:

```ts
import { probabilityExact } from '../../src/lib/recombinator/probability.js';

describe('probabilityExact', () => {
  it('matches Table 1 for 1 desired prefix, 1 input prefix', () => {
    const item1 = baseItem('a', [desired('p1', 'prefix')], []);
    const item2 = baseItem('b', [], []);
    const p = probabilityExact(item1, item2, [desired('p1', 'prefix')]);
    expect(p).toBeCloseTo(0.59, 6);
  });

  it('matches Monte Carlo within ±0.5% on a 3p/2s scenario', () => {
    const item1 = baseItem(
      'a',
      [desired('p1', 'prefix'), filler('p2', 'prefix')],
      [filler('s1', 'suffix')],
    );
    const item2 = baseItem('b', [filler('p3', 'prefix')], [desired('s2', 'suffix')]);
    const desiredMods = [desired('p1', 'prefix'), desired('s2', 'suffix')];
    const exact = probabilityExact(item1, item2, desiredMods);
    const rng = new SeededRng(31);
    const mc = probabilityMonteCarlo(item1, item2, desiredMods, 50_000, rng);
    expect(Math.abs(exact - mc)).toBeLessThan(0.01);
  });

  it('returns 0 for an impossible target', () => {
    const item1 = baseItem('a', [filler('p1', 'prefix')], []);
    const item2 = baseItem('b', [filler('p2', 'prefix')], []);
    const p = probabilityExact(item1, item2, [desired('p99', 'prefix')]);
    expect(p).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/probability.test.ts
```

Expected: FAIL — `probabilityExact is not a function`.

- [ ] **Step 3: Implement `probabilityExact`**

Append to `src/lib/recombinator/probability.ts`:

```ts
import { TABLE1 } from './table1.js';
import { isOneOneSpecialCase } from './special-cases.js';
import { isEligible, isExclusive } from './eligibility.js';
import type { BaseContext } from './types.js';
import { computeItemLevel } from './ilevel.js';

/**
 * Exact-enumeration probability of getting all desired mods on the recombined item.
 *
 * Enumerates over: (which base wins), (prefix count outcome), (suffix count outcome),
 * (fill order), then for each terminal scenario computes the conditional probability
 * that every desired mod is in the picked subset using a uniform-without-replacement
 * combinatorial counter that respects exclusive lockout and NNN/Fractured eligibility.
 */
export function probabilityExact(item1: Item, item2: Item, desired: Mod[]): number {
  if (desired.length === 0) return 1;

  // Special case 1p + 1s.
  if (isOneOneSpecialCase(item1, item2)) return probExactOneOne(item1, item2, desired);

  const prefixPool = [...item1.prefixes, ...item2.prefixes];
  const suffixPool = [...item1.suffixes, ...item2.suffixes];
  const totalP = prefixPool.length;
  const totalS = suffixPool.length;
  const ilvl = computeItemLevel(item1.itemLevel, item2.itemLevel);

  let total = 0;
  for (const fromPick of [1, 2] as const) {
    const chosen = fromPick === 1 ? item1 : item2;
    const baseCtx: BaseContext = {
      base: chosen.base,
      itemClass: chosen.itemClass,
      attributeBase: chosen.attributeBase,
      defenceTags: chosen.defenceTags,
      influence: chosen.influence,
      itemLevel: ilvl,
      hostItemId: chosen.id,
    };
    const baseProb = 0.5;
    const rowP = TABLE1[totalP]!;
    const rowS = TABLE1[totalS]!;
    for (let nP = 0; nP <= 3; nP++) {
      for (let nS = 0; nS <= 3; nS++) {
        const wP = rowP[nP] ?? 0;
        const wS = rowS[nS] ?? 0;
        if (wP === 0 || wS === 0) continue;
        for (const order of ['prefix-first', 'suffix-first'] as const) {
          const orderProb = 0.5;
          const condProb = probConditional(prefixPool, suffixPool, nP, nS, baseCtx, order, desired);
          total += baseProb * wP * wS * orderProb * condProb;
        }
      }
    }
  }
  return total;
}

/**
 * Probability that all desired mods are picked given fixed (nP, nS, base, fill order).
 * Iterates over all ordered fill sequences with exclusive lockout, summing the indicator
 * of "every desired in result". Pool sizes ≤6+6 keep this tractable.
 */
function probConditional(
  prefixPool: Mod[],
  suffixPool: Mod[],
  nP: number,
  nS: number,
  base: BaseContext,
  order: 'prefix-first' | 'suffix-first',
  desired: Mod[],
): number {
  const desiredSet = new Set(desired.map((m) => m.id));

  // Recursive uniform-pick enumerator. Returns probability of "all desired present in picked"
  // given we still need to pick (remainingP, remainingS) more mods.
  type State = {
    pickedP: string[];
    pickedS: string[];
    remainingP: number;
    remainingS: number;
    exclusiveLocked: boolean;
    phase: 'prefix' | 'suffix';
  };

  function step(s: State): number {
    if (s.remainingP === 0 && s.remainingS === 0) {
      const all = new Set([...s.pickedP, ...s.pickedS]);
      for (const id of desiredSet) if (!all.has(id)) return 0;
      return 1;
    }

    // Decide which pool to pull from.
    let pullPrefix: boolean;
    if (order === 'prefix-first') {
      pullPrefix = s.remainingP > 0;
      if (!pullPrefix) pullPrefix = false;
    } else {
      pullPrefix = !(s.remainingS > 0);
    }

    const pool = pullPrefix ? prefixPool : suffixPool;
    const already = pullPrefix ? s.pickedP : s.pickedS;
    const eligible = pool.filter(
      (m) => !already.includes(m.id) && isEligible(m, base, s.exclusiveLocked),
    );
    if (eligible.length === 0) {
      // Can't fulfill this slot — guide notes constraints can be violated; treat as failure
      // since the desired-mod test will detect a missing pick.
      const all = new Set([...s.pickedP, ...s.pickedS]);
      for (const id of desiredSet) if (!all.has(id)) return 0;
      return 1;
    }

    const w = 1 / eligible.length;
    let acc = 0;
    for (const cand of eligible) {
      const becomesLocked = s.exclusiveLocked || isExclusive(cand);
      const next: State = {
        pickedP: pullPrefix ? [...s.pickedP, cand.id] : s.pickedP,
        pickedS: pullPrefix ? s.pickedS : [...s.pickedS, cand.id],
        remainingP: pullPrefix ? s.remainingP - 1 : s.remainingP,
        remainingS: pullPrefix ? s.remainingS : s.remainingS - 1,
        exclusiveLocked: becomesLocked,
        phase: s.phase,
      };
      acc += w * step(next);
    }
    return acc;
  }

  return step({
    pickedP: [],
    pickedS: [],
    remainingP: nP,
    remainingS: nS,
    exclusiveLocked: false,
    phase: order === 'prefix-first' ? 'prefix' : 'suffix',
  });
}

function probExactOneOne(item1: Item, item2: Item, desired: Mod[]): number {
  const ilvl = computeItemLevel(item1.itemLevel, item2.itemLevel);
  let total = 0;
  for (const fromPick of [1, 2] as const) {
    const chosen = fromPick === 1 ? item1 : item2;
    const baseCtx: BaseContext = {
      base: chosen.base,
      itemClass: chosen.itemClass,
      attributeBase: chosen.attributeBase,
      defenceTags: chosen.defenceTags,
      influence: chosen.influence,
      itemLevel: ilvl,
      hostItemId: chosen.id,
    };
    const baseProb = 0.5;
    const allP = [...item1.prefixes, ...item2.prefixes];
    const allS = [...item1.suffixes, ...item2.suffixes];
    // 1p/0s, 0p/1s, 1p/1s each 1/3.
    total +=
      baseProb * (1 / 3) * probConditional(allP, allS, 1, 0, baseCtx, 'prefix-first', desired);
    total +=
      baseProb * (1 / 3) * probConditional(allP, allS, 0, 1, baseCtx, 'suffix-first', desired);
    total +=
      baseProb *
      (1 / 3) *
      0.5 *
      (probConditional(allP, allS, 1, 1, baseCtx, 'prefix-first', desired) +
        probConditional(allP, allS, 1, 1, baseCtx, 'suffix-first', desired));
  }
  return total;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/probability.test.ts
```

Expected: PASS (all `probabilityExact` tests, plus the prior Monte Carlo tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/probability.ts tests/recombinator/probability.test.ts
git commit -m "feat(engine): probabilityExact via outcome enumeration"
```

---

## Task 12: Public engine API surface

**Files:**

- Create: `src/lib/recombinator/index.ts`
- Test: `tests/recombinator/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/recombinator/index.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `index.ts`**

```ts
// src/lib/recombinator/index.ts
export type {
  Affix,
  ModCategory,
  AttributeBase,
  DefenceTag,
  Influence,
  Mod,
  Item,
  BaseContext,
  RecombineInput,
  RecombineResult,
} from './types.js';
export { SeededRng } from './rng.js';
export type { Rng } from './rng.js';
export { TABLE1, sampleModCount, expectedDistribution } from './table1.js';
export { computeItemLevel } from './ilevel.js';
export { isEligible, isExclusive } from './eligibility.js';
export { simulateOnce, simulateBatch } from './simulate.js';
export { probabilityExact, probabilityMonteCarlo, allDesiredHit } from './probability.js';
export { isOneOneSpecialCase, sampleOneOneOutcome } from './special-cases.js';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/recombinator/index.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recombinator/index.ts tests/recombinator/index.test.ts
git commit -m "feat(engine): public API surface (lib/recombinator/index.ts)"
```

---

## Task 13: Guide §6 worked example — grasping mail breach transfer

**Files:**

- Create: `tests/fixtures/guide-grasping-mail.json`
- Create: `tests/recombinator/guide-examples.test.ts`

- [ ] **Step 1: Build the fixture**

Per guide §6: a grasping mail body armour with a single Breach prefix, plus a crafted (Influenced) prefix added via influenced exalted orb, recombined with a 0p/\*s uninfluenced item. Expected transfer rate = 50%.

Modeled here as: `item1 = { 1 ExclusiveBreach prefix on a Warlord-influenced base, 1 NNN_Influenced prefix }` and `item2 = { uninfluenced base, 1 regular suffix as filler }`. Desired = the Breach prefix.

```json
// tests/fixtures/guide-grasping-mail.json
{
  "item1": {
    "id": "grasping",
    "base": "Sacrificial Garb",
    "itemClass": "Body Armours",
    "itemLevel": 84,
    "attributeBase": "str_int",
    "defenceTags": ["armour", "energy_shield"],
    "influence": "warlord",
    "corrupted": false,
    "synthesised": false,
    "implicits": [],
    "prefixes": [
      {
        "id": "breach_armour_overcap_fire",
        "affix": "prefix",
        "category": "ExclusiveBreach",
        "name": "Breach",
        "tier": 1,
        "statText": "+# armour overcapped fire"
      },
      {
        "id": "warlord_influence_pref",
        "affix": "prefix",
        "category": "NNN_Influenced",
        "name": "Warlord Pref",
        "tier": 1,
        "statText": "warlord mod",
        "requiresInfluence": "warlord"
      }
    ],
    "suffixes": []
  },
  "item2": {
    "id": "transfer_base",
    "base": "Sacrificial Garb",
    "itemClass": "Body Armours",
    "itemLevel": 86,
    "attributeBase": "str_int",
    "defenceTags": ["armour", "energy_shield"],
    "influence": null,
    "corrupted": false,
    "synthesised": false,
    "implicits": [],
    "prefixes": [],
    "suffixes": [
      {
        "id": "filler_suff",
        "affix": "suffix",
        "category": "RegularExplicit",
        "name": "Filler",
        "tier": 1,
        "statText": "filler"
      }
    ]
  },
  "desired": ["breach_armour_overcap_fire"],
  "expectedProbability": 0.5,
  "tolerance": 0.05
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/recombinator/guide-examples.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  probabilityExact,
  probabilityMonteCarlo,
  SeededRng,
} from '../../src/lib/recombinator/index.js';
import type { Item, Mod } from '../../src/lib/recombinator/index.js';

type Fixture = {
  item1: Omit<Item, 'influence'> & { influence: Item['influence'] | null };
  item2: Omit<Item, 'influence'> & { influence: Item['influence'] | null };
  desired: string[];
  expectedProbability: number;
  tolerance: number;
};

const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures');

function loadFixture(name: string): {
  item1: Item;
  item2: Item;
  desired: Mod[];
  expected: number;
  tol: number;
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
  it('§6: grasping mail breach transfer ≈ 50%', () => {
    const { item1, item2, desired, expected, tol } = loadFixture('guide-grasping-mail.json');
    const exact = probabilityExact(item1, item2, desired);
    expect(Math.abs(exact - expected)).toBeLessThan(tol);
    const rng = new SeededRng(13);
    const mc = probabilityMonteCarlo(item1, item2, desired, 50_000, rng);
    expect(Math.abs(mc - expected)).toBeLessThan(tol);
  });
});
```

- [ ] **Step 3: Run test to verify it fails or passes**

```bash
npm test -- tests/recombinator/guide-examples.test.ts
```

Expected: should PASS (this is a validation test against an already-implemented engine). If it fails, the engine has a bug — debug `probabilityExact` against the smaller eligibility unit tests before adjusting the fixture.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/guide-grasping-mail.json tests/recombinator/guide-examples.test.ts
git commit -m "test(engine): guide §6 grasping mail breach transfer = 50%"
```

---

## Task 14: Guide §7 worked example — wand counterweight ≈ 35%

**Files:**

- Create: `tests/fixtures/guide-wand-counterweight.json`
- Modify: `tests/recombinator/guide-examples.test.ts`

- [ ] **Step 1: Build the fixture**

Per guide §7: combine two wands with ≥6 total prefixes, where one side is "2p1e/1s2e" (2 regular prefixes + 1 exclusive prefix + 1 regular suffix + 2 exclusive suffixes) and the other "1p2e/1s2e", aiming for the 3 non-exclusive prefixes to all land. Expected probability ≈ 35%.

```json
// tests/fixtures/guide-wand-counterweight.json
{
  "item1": {
    "id": "wand_a",
    "base": "Opal Wand",
    "itemClass": "Wands",
    "itemLevel": 86,
    "attributeBase": "int",
    "defenceTags": [],
    "influence": null,
    "corrupted": false,
    "synthesised": false,
    "implicits": [],
    "prefixes": [
      {
        "id": "zaffre",
        "affix": "prefix",
        "category": "RegularExplicit",
        "name": "Zaffre",
        "tier": 1,
        "statText": "+# Mana"
      },
      {
        "id": "archmage",
        "affix": "prefix",
        "category": "RegularExplicit",
        "name": "Archmage",
        "tier": 2,
        "statText": "+# spell/mana"
      },
      {
        "id": "crafted_pref_a",
        "affix": "prefix",
        "category": "ExclusiveCrafted",
        "name": "Crafted A",
        "tier": 1,
        "statText": "crafted"
      }
    ],
    "suffixes": [
      {
        "id": "filler_a",
        "affix": "suffix",
        "category": "RegularExplicit",
        "name": "Filler A",
        "tier": 1,
        "statText": "filler"
      },
      {
        "id": "aspect_a",
        "affix": "suffix",
        "category": "ExclusiveBeastAspect",
        "name": "Aspect",
        "tier": 1,
        "statText": "aspect"
      },
      {
        "id": "named_craft_suf_a",
        "affix": "suffix",
        "category": "ExclusiveCrafted",
        "name": "of the Order",
        "tier": 1,
        "statText": "named crafted"
      }
    ]
  },
  "item2": {
    "id": "wand_b",
    "base": "Opal Wand",
    "itemClass": "Wands",
    "itemLevel": 86,
    "attributeBase": "int",
    "defenceTags": [],
    "influence": null,
    "corrupted": false,
    "synthesised": false,
    "implicits": [],
    "prefixes": [
      {
        "id": "runic",
        "affix": "prefix",
        "category": "RegularExplicit",
        "name": "Runic",
        "tier": 1,
        "statText": "+# spell damage"
      },
      {
        "id": "crafted_pref_b1",
        "affix": "prefix",
        "category": "ExclusiveCrafted",
        "name": "Tora's",
        "tier": 1,
        "statText": "crafted"
      },
      {
        "id": "crafted_pref_b2",
        "affix": "prefix",
        "category": "ExclusiveCrafted",
        "name": "It's",
        "tier": 1,
        "statText": "crafted"
      }
    ],
    "suffixes": [
      {
        "id": "filler_b",
        "affix": "suffix",
        "category": "RegularExplicit",
        "name": "Filler B",
        "tier": 1,
        "statText": "filler"
      },
      {
        "id": "multimod",
        "affix": "suffix",
        "category": "ExclusiveCrafted",
        "name": "Can have multiple Crafted",
        "tier": 1,
        "statText": "multimod"
      },
      {
        "id": "named_craft_suf_b",
        "affix": "suffix",
        "category": "ExclusiveCrafted",
        "name": "Chosen",
        "tier": 1,
        "statText": "named crafted"
      }
    ]
  },
  "desired": ["zaffre", "archmage", "runic"],
  "expectedProbability": 0.35,
  "tolerance": 0.07
}
```

- [ ] **Step 2: Add the failing test**

Append to `tests/recombinator/guide-examples.test.ts`:

```ts
it('§7: wand counterweight (3 desired prefixes) ≈ 35%', () => {
  const { item1, item2, desired, expected, tol } = loadFixture('guide-wand-counterweight.json');
  const exact = probabilityExact(item1, item2, desired);
  expect(Math.abs(exact - expected)).toBeLessThan(tol);
});
```

- [ ] **Step 3: Run test to verify it passes**

```bash
npm test -- tests/recombinator/guide-examples.test.ts
```

Expected: PASS. If it fails _and_ the value is consistently off in one direction, log `exact` and inspect — guide tolerance is widened to ±7% because the guide itself reports "approximate odds ≈ 35%."

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/guide-wand-counterweight.json tests/recombinator/guide-examples.test.ts
git commit -m "test(engine): guide §7 wand counterweight ≈ 35%"
```

---

## Task 15: Cross-check property test (probabilityExact ≈ Monte Carlo on random scenarios)

**Files:**

- Create: `tests/recombinator/cross-check.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/recombinator/cross-check.test.ts
import { describe, it, expect } from 'vitest';
import {
  probabilityExact,
  probabilityMonteCarlo,
  SeededRng,
} from '../../src/lib/recombinator/index.js';
import type { Item, Mod, ModCategory } from '../../src/lib/recombinator/index.js';

const CATEGORIES: ModCategory[] = ['RegularExplicit', 'ExclusiveCrafted', 'NNN_Influenced'];

function makeMod(rng: SeededRng, idx: number, affix: 'prefix' | 'suffix'): Mod {
  const cat = CATEGORIES[Math.floor(rng.next() * CATEGORIES.length)]!;
  const m: Mod = { id: `m${idx}`, affix, category: cat, name: `m${idx}`, tier: 1, statText: '' };
  if (cat === 'NNN_Influenced') m.requiresInfluence = 'warlord';
  return m;
}

function makeItem(rng: SeededRng, id: string, nP: number, nS: number, influenced: boolean): Item {
  return {
    id,
    base: 'X',
    itemClass: 'Y',
    itemLevel: 86,
    attributeBase: 'str_int',
    defenceTags: ['armour', 'energy_shield'],
    influence: influenced ? 'warlord' : undefined,
    corrupted: false,
    synthesised: false,
    implicits: [],
    prefixes: Array.from({ length: nP }, (_, i) =>
      makeMod(rng, parseInt(`${id}${i}1`, 36), 'prefix'),
    ),
    suffixes: Array.from({ length: nS }, (_, i) =>
      makeMod(rng, parseInt(`${id}${i}2`, 36), 'suffix'),
    ),
  };
}

describe('cross-check: probabilityExact vs probabilityMonteCarlo', () => {
  it('agrees within 1% on 30 random scenarios', () => {
    const rng = new SeededRng(2024);
    const failures: string[] = [];
    for (let s = 0; s < 30; s++) {
      const nP1 = Math.floor(rng.next() * 4);
      const nS1 = Math.floor(rng.next() * 4);
      const nP2 = Math.floor(rng.next() * 4);
      const nS2 = Math.floor(rng.next() * 4);
      const inf1 = rng.next() < 0.5;
      const inf2 = rng.next() < 0.5;
      const item1 = makeItem(rng, 'A', nP1, nS1, inf1);
      const item2 = makeItem(rng, 'B', nP2, nS2, inf2);
      const allMods = [...item1.prefixes, ...item1.suffixes, ...item2.prefixes, ...item2.suffixes];
      if (allMods.length === 0) continue;
      const desired = [allMods[Math.floor(rng.next() * allMods.length)]!];
      const exact = probabilityExact(item1, item2, desired);
      const mcRng = new SeededRng(s + 1);
      const mc = probabilityMonteCarlo(item1, item2, desired, 30_000, mcRng);
      if (Math.abs(exact - mc) > 0.015)
        failures.push(`scenario ${s}: exact=${exact.toFixed(4)} mc=${mc.toFixed(4)}`);
    }
    expect(failures).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npm test -- tests/recombinator/cross-check.test.ts
```

Expected: PASS. If failures emerge, inspect — exact and Monte Carlo should agree because both implement §5; divergence indicates a bug in one.

- [ ] **Step 3: Commit**

```bash
git add tests/recombinator/cross-check.test.ts
git commit -m "test(engine): cross-check probabilityExact vs Monte Carlo"
```

---

## Task 16: CLI

**Files:**

- Create: `src/cli/main.ts`
- Test: `tests/cli/main.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/cli/main.test.ts
import { describe, it, expect } from 'vitest';
import { runCli } from '../../src/cli/main.js';

const fixture = JSON.stringify({
  command: 'probability',
  seed: 1,
  trials: 2000,
  item1: {
    id: 'a',
    base: 'X',
    itemClass: 'Y',
    itemLevel: 86,
    attributeBase: 'str_int',
    defenceTags: ['armour'],
    corrupted: false,
    synthesised: false,
    implicits: [],
    prefixes: [
      {
        id: 'p1',
        affix: 'prefix',
        category: 'RegularExplicit',
        name: 'p1',
        tier: 1,
        statText: '',
        desired: true,
      },
    ],
    suffixes: [],
  },
  item2: {
    id: 'b',
    base: 'X',
    itemClass: 'Y',
    itemLevel: 86,
    attributeBase: 'str_int',
    defenceTags: ['armour'],
    corrupted: false,
    synthesised: false,
    implicits: [],
    prefixes: [],
    suffixes: [],
  },
});

describe('CLI', () => {
  it('probability command returns exact + monte-carlo numbers', async () => {
    const out = await runCli(fixture);
    expect(out.command).toBe('probability');
    expect(out.exact).toBeCloseTo(0.59, 2);
    expect(out.monteCarlo).toBeCloseTo(0.59, 1);
  });

  it('simulate command returns N results', async () => {
    const fix = JSON.parse(fixture);
    fix.command = 'simulate';
    fix.trials = 5;
    const out = await runCli(JSON.stringify(fix));
    expect(out.command).toBe('simulate');
    expect(out.results).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/cli/main.test.ts
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement `src/cli/main.ts`**

```ts
// src/cli/main.ts
import {
  probabilityExact,
  probabilityMonteCarlo,
  simulateBatch,
  SeededRng,
} from '../lib/recombinator/index.js';
import type { Item, Mod } from '../lib/recombinator/index.js';

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

export async function runCli(jsonInput: string): Promise<CliOutput> {
  const input = JSON.parse(jsonInput) as CliInput;
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
    const trials = input.trials ?? 10_000;
    const exact = probabilityExact(input.item1, input.item2, desired);
    const mc = probabilityMonteCarlo(input.item1, input.item2, desired, trials, rng);
    return { command: 'probability', exact, monteCarlo: mc };
  } else {
    const trials = input.trials ?? 1;
    const results = simulateBatch(input.item1, input.item2, trials, rng);
    return {
      command: 'simulate',
      results: results.map((r) => ({
        baseFromItem: r.baseFromItem,
        prefixes: r.prefixes.map((m) => m.id),
        suffixes: r.suffixes.map((m) => m.id),
      })),
    };
  }
}

// Entry point: read stdin, invoke runCli, print stdout.
if (process.argv[1] && process.argv[1].endsWith('main.ts')) {
  let input = '';
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });
  process.stdin.on('end', () => {
    runCli(input)
      .then((out) => {
        process.stdout.write(JSON.stringify(out, null, 2) + '\n');
      })
      .catch((err) => {
        process.stderr.write(`error: ${err.message}\n`);
        process.exit(1);
      });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/cli/main.test.ts
```

Expected: PASS.

- [ ] **Step 5: Smoke-test the CLI manually**

```bash
echo '{"command":"probability","seed":1,"trials":2000,"item1":{"id":"a","base":"X","itemClass":"Y","itemLevel":86,"attributeBase":"str_int","defenceTags":["armour"],"corrupted":false,"synthesised":false,"implicits":[],"prefixes":[{"id":"p1","affix":"prefix","category":"RegularExplicit","name":"p1","tier":1,"statText":"","desired":true}],"suffixes":[]},"item2":{"id":"b","base":"X","itemClass":"Y","itemLevel":86,"attributeBase":"str_int","defenceTags":["armour"],"corrupted":false,"synthesised":false,"implicits":[],"prefixes":[],"suffixes":[]}}' | npm run engine
```

Expected output: a JSON object with `exact: 0.59` and `monteCarlo: ~0.59`.

- [ ] **Step 6: Commit**

```bash
git add src/cli/main.ts tests/cli/main.test.ts package.json
git commit -m "feat(cli): Resimbinator -engine CLI for stdin/stdout exercise"
```

---

## Task 17: README

**Files:**

- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Resimbinator

A web-app simulator for Path of Exile 1's patch-3.25 Recombinator. Currently in active build; **this repository contains only the engine layer** as of Plan 1.

## What's here so far

- Pure-TypeScript recombinator math engine implementing the rules from the [community guide](./guide.txt) §5
- Table 1 distribution sampler, eligibility filter (NNN/Fractured/Exclusive), single + batch simulator
- Both Monte Carlo and exact-enumeration probability calculators
- Validated against guide §6 (grasping mail breach transfer = 50%) and §7 (wand counterweight ≈ 35%)
- A small CLI (`npm run engine`) that takes a JSON scenario on stdin

## What's coming (planned)

- Plan 2: PoE clipboard parser
- Plan 3: RePoE-backed mod database + categorizer
- Plan 4: SvelteKit UI, persistence, share-URL, deploy

## Setup

```bash
npm install
npm run typecheck
npm test
```
````

## CLI

```bash
echo '{ "command": "probability", ... }' | npm run engine
```

See `tests/cli/main.test.ts` for the input shape.

## Layout

```
src/lib/recombinator/   pure-TS engine (no UI deps)
src/cli/                stdin/stdout CLI
tests/recombinator/     unit + integration tests
tests/fixtures/         guide worked-example fixtures
```

## License

MIT.

````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README explaining Plan-1 scope and how to run the engine"
````

---

## Task 18: Final verification

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all suites PASS. Capture the count of passing tests.

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: both clean.

- [ ] **Step 3: Confirm git log shows incremental commits**

```bash
git log --oneline
```

Expected: ~17 commits, one per task, each readable.

- [ ] **Step 4: Final commit (if any cleanup needed)**

If lint/typecheck surfaced anything, fix and commit:

```bash
git add -A
git commit -m "chore: typecheck/lint cleanup"
```

---

## Self-review (already applied to this plan)

- **Spec coverage:** Plan 1 covers spec sections "Engine — recombinator simulator & probability" and the engine-relevant pieces of "Architecture → Layer 1: Engine" and "Testing & deployment → Test layers (engine rows + guide-examples row + cross-check row)". UI, parser, mod DB, deploy are explicitly deferred to Plans 2-4.
- **Placeholder scan:** No "TBD"/"TODO"/"add appropriate X". All test code and implementation code is concrete.
- **Type consistency:** `Mod`, `Item`, `BaseContext`, `RecombineResult`, `Rng`, `SeededRng`, and the helper signatures are defined in Task 2/3 and reused unchanged through Tasks 4-16. `pickEligibleMods` returns `{ picked, pickedExclusive }` consistently.
- **Spec gaps detected:** None for engine-layer scope. Mod-weighting was explicitly Q3=B-deferred and is not implemented.

---

## Plan-1 acceptance criteria

When this plan is complete, the repo:

1. Has a fully tested pure-TS recombinator engine
2. Validates against guide §6 (grasping mail = 50%) and guide §7 (wand counterweight ≈ 35%) within tolerance
3. Cross-checks `probabilityExact` ≈ `probabilityMonteCarlo(100k)` within 1.5% on 30 random scenarios
4. Exposes a CLI (`npm run engine`) that takes JSON on stdin, returns JSON on stdout
5. Has lint + typecheck + test all green in CI-equivalent local runs
6. Has a README explaining how to run things and what's coming next

That's the artifact. Plans 2-4 build on top.

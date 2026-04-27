# Resimbinator UI Implementation Plan (Plan 4 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the engine + parser + categorizer in a SvelteKit SPA. Paste two items, mark desired mods, see live chance %, click "Recombine" for a roll, click "Run 1000×" for a histogram. Persist state to localStorage. Share scenarios via URL. Deploy to Vercel as a static site.

**Architecture:** SvelteKit + adapter-static, Tailwind CSS for styling, no backend. The `src/lib/` engine/parser/mods code is unchanged — the UI imports from it as-is. New runtime deps: `pako` (deflate for URL state), `@sveltejs/kit`, `svelte`, `tailwindcss`, `vite`. The mod database (`static/mod-db.json`) is fetched on first load and cached in IndexedDB. One small shim is needed: the translator's `node:crypto` import must be swapped for `globalThis.crypto` so it runs in the browser too.

**Tech Stack:** SvelteKit 2.x (Svelte 5 with runes), Tailwind CSS 3.x, Vite 5, `@sveltejs/adapter-static`, `pako` for compression. Vitest carries over for unit tests; Playwright optional (deferred).

**Spec reference:** `docs/superpowers/specs/2026-04-26-Resimbinator -design.md` sections "UI layout" and "Persistence & share-URL".

**Out of scope for Plan 4 (deferrable to v1.1):**

- In-app mod editor (add/remove/modify mods after pasting). v1 is paste-only; users repaste from PoE to test variations.
- Mod-search dialog with full DB browsing
- Theme toggle / settings panel polish
- Playwright E2E tests
- Polished About page / SEO

**Dependencies:** Plans 1, 2, 3 complete.

---

## File Structure

Created or modified in this plan:

```
package.json                      # MODIFIED: add SvelteKit + Tailwind + pako; add scripts
tsconfig.json                     # MODIFIED: extend SvelteKit's generated tsconfig
svelte.config.js                  # NEW
vite.config.ts                    # NEW
postcss.config.js                 # NEW
tailwind.config.js                # NEW
.gitignore                        # MODIFIED: add .svelte-kit/, build/

src/
  app.html                        # SvelteKit doc-shell
  app.d.ts                        # SvelteKit ambient types
  app.css                         # Tailwind directives
  routes/
    +layout.svelte                # global layout
    +page.svelte                  # the main app page

  lib/                            # existing engine/parser/mods unchanged...
  lib/mods/translate.ts           # MODIFIED: swap node:crypto for globalThis.crypto

  lib/ui/                         # NEW
    state.svelte.ts               # Svelte runes state store
    persist.ts                    # localStorage save/load
    url-state.ts                  # encode/decode share URL
    mod-db-fetch.ts               # browser-side mod-DB fetch + IndexedDB cache

  components/                     # NEW
    TopBar.svelte
    ItemPanel.svelte
    ModRow.svelte
    ModList.svelte
    StatsPanel.svelte
    NotationLine.svelte
    RecombineResultDialog.svelte
    BatchSimDialog.svelte
    BatchSimChart.svelte

static/
  mod-db.json                     # NOT committed; user runs `npm run update-mod-db`
  mod-db-fixture.json             # COMMITTED; used in dev/tests so the app works without fetch

tests/
  ui/state.test.ts                # state store unit tests
  ui/url-state.test.ts            # URL encode/decode round-trip
  ui/persist.test.ts              # localStorage round-trip

deploy/
  vercel.json                     # static-site config
```

---

## Task 1: Install SvelteKit + Tailwind deps; configure base files

**Files:**

- Modify: `package.json`
- Create: `svelte.config.js`
- Create: `vite.config.ts`
- Create: `postcss.config.js`
- Create: `tailwind.config.js`
- Create: `src/app.html`, `src/app.d.ts`, `src/app.css`
- Create: `src/routes/+layout.svelte`, `src/routes/+page.svelte`
- Modify: `tsconfig.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install deps**

```bash
cd /home/nick/projects/personal/Resimbinator
npm install --save-dev \
  @sveltejs/kit@^2 \
  @sveltejs/adapter-static@^3 \
  @sveltejs/vite-plugin-svelte@^4 \
  svelte@^5 \
  svelte-check@^4 \
  vite@^5 \
  tailwindcss@^3.4 \
  postcss@^8 \
  autoprefixer@^10 \
  @types/pako@^2

npm install --save pako@^2
```

- [ ] **Step 2: Update `package.json` scripts**

Replace the `scripts` block to add SvelteKit-aware scripts. The new block:

```json
"scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check": "svelte-check --tsconfig ./tsconfig.json",
  "lint": "eslint src tests --ext .ts,.svelte --no-error-on-unmatched-pattern",
  "format": "prettier --write 'src/**/*.{ts,svelte}' 'tests/**/*.ts'",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "engine": "tsx src/cli/main.ts",
  "update-mod-db": "tsx scripts/build-mod-db.ts"
}
```

- [ ] **Step 3: Create `svelte.config.js`**

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
    }),
  },
};

export default config;
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
```

(Replaces the existing `vitest.config.ts` — delete that file.)

- [ ] **Step 5: Delete `vitest.config.ts`**

```bash
rm vitest.config.ts
```

- [ ] **Step 6: Create `postcss.config.js`**

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create `tailwind.config.js`**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Mod category chip colors. Accessible enough for color-blind users.
        chip: {
          regular: '#4b5563', // gray-600
          exclusive: '#dc2626', // red-600
          nnn: '#d97706', // amber-600
          fractured: '#2563eb', // blue-600
          implicit: '#6b7280', // gray-500
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 8: Create `src/app.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Resimbinator</title>
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover" class="bg-gray-950 text-gray-100">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 9: Create `src/app.d.ts`**

```ts
// src/app.d.ts
declare global {
  namespace App {}
}
export {};
```

- [ ] **Step 10: Create `src/app.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 11: Create `src/routes/+layout.svelte`**

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children?.()}
```

- [ ] **Step 12: Create a placeholder `src/routes/+page.svelte`**

```svelte
<script lang="ts">
  // Placeholder — Task 7 wires up the real app.
</script>

<main class="min-h-screen p-6">
  <h1 class="text-3xl font-semibold">Resimbinator </h1>
  <p class="text-gray-400 mt-2">UI scaffold — feature wiring lands in subsequent tasks.</p>
</main>
```

- [ ] **Step 13: Update `tsconfig.json`**

Replace the existing `tsconfig.json` content with one that extends SvelteKit's generated config:

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

NOTE: SvelteKit generates `.svelte-kit/tsconfig.json` on first build. Run `npm run dev` once to populate this. The Task 1 verification step does that.

- [ ] **Step 14: Update `.gitignore`**

Add the SvelteKit-generated and build dirs:

```
node_modules
dist
build
.svelte-kit
coverage
.DS_Store
*.log
static/mod-db.json
```

- [ ] **Step 15: Verify dev server starts**

```bash
npm run dev &
sleep 3 && curl -s http://localhost:5173/ | grep -i 'Resimbinator ' && pkill -f 'vite dev'
```

Expected: page returns containing "Resimbinator " text. (Or run `npm run dev` and visit `http://localhost:5173/` manually to verify.)

- [ ] **Step 16: Verify existing tests still pass**

```bash
npm test
```

Expected: 132 tests still pass (engine, parser, mods, CLI). The SvelteKit setup shouldn't break anything in `src/lib/` or `tests/`.

- [ ] **Step 17: Commit**

```bash
git add svelte.config.js vite.config.ts postcss.config.js tailwind.config.js \
        src/app.html src/app.d.ts src/app.css \
        src/routes/+layout.svelte src/routes/+page.svelte \
        tsconfig.json .gitignore package.json package-lock.json
git rm vitest.config.ts
git commit -m "feat(ui): SvelteKit + Tailwind scaffold (placeholder page)"
```

---

## Task 2: Browser-safe `randomUUID` shim in translator

The translator imports `randomUUID` from `node:crypto`. In the browser, that import doesn't resolve. Switch to `globalThis.crypto.randomUUID()` which works in both Node 20+ and modern browsers.

**Files:**

- Modify: `src/lib/mods/translate.ts`

- [ ] **Step 1: Edit `translate.ts`**

Find the line:

```ts
import { randomUUID } from 'node:crypto';
```

Delete it.

Find the two usages:

```ts
const id = randomUUID();
```

Replace with:

```ts
const id = globalThis.crypto.randomUUID();
```

(Both occurrences — one in `translate()`, one in `translateMod()`.)

- [ ] **Step 2: Verify tests + typecheck**

```bash
npm test -- tests/mods/translate.test.ts
npm run typecheck
```

Both still green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mods/translate.ts
git commit -m "fix(mods): use globalThis.crypto for browser compatibility"
```

---

## Task 3: Browser-side mod-DB fetch + IndexedDB cache

In the SPA, fetch the mod-DB JSON once on first load, then cache in IndexedDB. Subsequent loads use the cache.

**Files:**

- Create: `src/lib/ui/mod-db-fetch.ts`
- Create: `static/mod-db-fixture.json` (committed dev fallback — copy of `tests/fixtures/mods/fixture-mod-db.json`)

- [ ] **Step 1: Copy the mod-DB fixture for dev/build**

```bash
cp tests/fixtures/mods/fixture-mod-db.json static/mod-db-fixture.json
```

(This is the dev fallback so the UI works out of the box without `npm run update-mod-db`. In production, users can swap to `static/mod-db.json` for the full RePoE-derived data.)

- [ ] **Step 2: Implement `src/lib/ui/mod-db-fetch.ts`**

```ts
// src/lib/ui/mod-db-fetch.ts
import type { ModDef, ModDb } from '$lib/mods/index.js';
import { loadModDb } from '$lib/mods/index.js';

const DB_NAME = 'Resimbinator ';
const DB_VERSION = 1;
const STORE = 'mod-db';
const KEY = 'singleton';

export async function loadFromCache(): Promise<ModDef[] | null> {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, 'readonly');
      const get = tx.objectStore(STORE).get(KEY);
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

export async function saveToCache(entries: ModDef[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entries, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    };
    req.onerror = () => resolve();
  });
}

export async function loadModDbFromNetwork(): Promise<ModDef[]> {
  // Try the production mod-db first; fall back to the dev fixture.
  for (const path of ['/mod-db.json', '/mod-db-fixture.json']) {
    try {
      const res = await fetch(path);
      if (res.ok) return await res.json();
    } catch {
      // try next
    }
  }
  throw new Error('Failed to load mod-db.json');
}

export async function getModDb(): Promise<ModDb> {
  const cached = await loadFromCache();
  if (cached) return loadModDb(cached);

  const fresh = await loadModDbFromNetwork();
  await saveToCache(fresh);
  return loadModDb(fresh);
}
```

NOTE: SvelteKit's `$lib` alias maps to `src/lib/`. The imports use that.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/mod-db-fetch.ts static/mod-db-fixture.json
git commit -m "feat(ui): browser mod-db loader with IndexedDB cache + network fetch"
```

---

## Task 4: State store using Svelte runes

The state holds two items, derived chance, simulation results, and settings.

**Files:**

- Create: `src/lib/ui/state.svelte.ts`
- Create: `tests/ui/state.test.ts`

- [ ] **Step 1: Write a failing test**

```ts
// tests/ui/state.test.ts
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/lib/ui/state.svelte.js';
import type { Item } from '../../src/lib/recombinator/index.js';
import { loadModDb } from '../../src/lib/mods/index.js';
import { readFileSync } from 'node:fs';

const fixtureDb = loadModDb(
  JSON.parse(readFileSync('tests/fixtures/mods/fixture-mod-db.json', 'utf8')),
);

const sampleItem = (id: string): Item => ({
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
});

describe('state store', () => {
  it('starts empty', () => {
    const s = createState(fixtureDb);
    expect(s.item1).toBeNull();
    expect(s.item2).toBeNull();
  });

  it('setItem replaces a slot', () => {
    const s = createState(fixtureDb);
    const it = sampleItem('a');
    s.setItem(1, it);
    expect(s.item1?.id).toBe('a');
  });

  it('toggleDesired flips the desired flag on a mod', () => {
    const s = createState(fixtureDb);
    const it = sampleItem('a');
    s.setItem(1, it);
    s.toggleDesired('a', 'p1');
    expect(s.item1?.prefixes[0]?.desired).toBe(false);
  });

  it('reset clears both items', () => {
    const s = createState(fixtureDb);
    s.setItem(1, sampleItem('a'));
    s.setItem(2, sampleItem('b'));
    s.reset();
    expect(s.item1).toBeNull();
    expect(s.item2).toBeNull();
  });
});
```

- [ ] **Step 2: Run** — FAIL

```bash
npm test -- tests/ui/state.test.ts
```

- [ ] **Step 3: Implement `src/lib/ui/state.svelte.ts`**

```ts
// src/lib/ui/state.svelte.ts
import type { Item } from '$lib/recombinator/index.js';
import type { ModDb } from '$lib/mods/index.js';
import { probabilityExact } from '$lib/recombinator/index.js';

export type Settings = {
  batchSimTrials: number;
};

export const DEFAULT_SETTINGS: Settings = {
  batchSimTrials: 1000,
};

export type AppState = {
  item1: Item | null;
  item2: Item | null;
  settings: Settings;
  // Methods
  setItem(slot: 1 | 2, item: Item | null): void;
  toggleDesired(itemId: string, modId: string): void;
  reset(): void;
  // Derived
  readonly chance: number;
  readonly desiredCount: number;
};

export function createState(_modDb: ModDb): AppState {
  let item1 = $state<Item | null>(null);
  let item2 = $state<Item | null>(null);
  const settings = $state<Settings>({ ...DEFAULT_SETTINGS });

  const allDesired = $derived.by(() => {
    const all = [
      ...(item1?.prefixes ?? []),
      ...(item1?.suffixes ?? []),
      ...(item2?.prefixes ?? []),
      ...(item2?.suffixes ?? []),
    ];
    return all.filter((m) => m.desired === true);
  });

  const chance = $derived.by(() => {
    if (!item1 || !item2) return 0;
    if (allDesired.length === 0) return 1;
    return probabilityExact(item1, item2, allDesired);
  });

  return {
    get item1() {
      return item1;
    },
    get item2() {
      return item2;
    },
    settings,
    setItem(slot, it) {
      if (slot === 1) item1 = it;
      else item2 = it;
    },
    toggleDesired(itemId, modId) {
      const flip = (it: Item | null): Item | null => {
        if (!it || it.id !== itemId) return it;
        const flipMods = (mods: typeof it.prefixes) =>
          mods.map((m) => (m.id === modId ? { ...m, desired: !m.desired } : m));
        return {
          ...it,
          prefixes: flipMods(it.prefixes),
          suffixes: flipMods(it.suffixes),
          implicits: flipMods(it.implicits),
        };
      };
      item1 = flip(item1);
      item2 = flip(item2);
    },
    reset() {
      item1 = null;
      item2 = null;
    },
    get chance() {
      return chance;
    },
    get desiredCount() {
      return allDesired.length;
    },
  };
}
```

NOTE: This uses Svelte 5 runes (`$state`, `$derived.by`). Vitest tests work because runes are TS-compiled-and-runnable; only `*.svelte` files need preprocessor magic.

- [ ] **Step 4: Run + typecheck**

```bash
npm test -- tests/ui/state.test.ts
npm run typecheck
```

Both pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/state.svelte.ts tests/ui/state.test.ts
git commit -m "feat(ui): state store with reactive chance via Svelte runes"
```

---

## Task 5: localStorage persistence

**Files:**

- Create: `src/lib/ui/persist.ts`
- Create: `tests/ui/persist.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/ui/persist.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveState, loadState } from '../../src/lib/ui/persist.js';
import type { Item } from '../../src/lib/recombinator/index.js';

const sampleItem = (id: string): Item => ({
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
  prefixes: [],
  suffixes: [],
});

const fakeStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    key: (i) => Array.from(map.keys())[i] ?? null,
  };
};

describe('persist', () => {
  let storage: Storage;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it('round-trips empty state', () => {
    saveState({ item1: null, item2: null }, storage);
    const loaded = loadState(storage);
    expect(loaded.item1).toBeNull();
    expect(loaded.item2).toBeNull();
  });

  it('round-trips a populated state', () => {
    const it = sampleItem('a');
    saveState({ item1: it, item2: null }, storage);
    const loaded = loadState(storage);
    expect(loaded.item1?.id).toBe('a');
    expect(loaded.item2).toBeNull();
  });

  it('returns empty state on missing key', () => {
    const loaded = loadState(storage);
    expect(loaded.item1).toBeNull();
    expect(loaded.item2).toBeNull();
  });

  it('returns empty state on corrupt JSON', () => {
    storage.setItem('Resimbinator :state:v1', 'not json');
    const loaded = loadState(storage);
    expect(loaded.item1).toBeNull();
  });
});
```

- [ ] **Step 2: Implement `src/lib/ui/persist.ts`**

```ts
// src/lib/ui/persist.ts
import type { Item } from '$lib/recombinator/index.js';

const KEY = 'Resimbinator :state:v1';

export type PersistedState = {
  item1: Item | null;
  item2: Item | null;
};

export function saveState(state: PersistedState, storage: Storage): void {
  try {
    storage.setItem(KEY, JSON.stringify({ schemaVersion: 1, ...state }));
  } catch {
    // Storage may be full or disabled; silently ignore.
  }
}

export function loadState(storage: Storage): PersistedState {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { item1: null, item2: null };
    const parsed = JSON.parse(raw) as PersistedState & { schemaVersion?: number };
    return { item1: parsed.item1 ?? null, item2: parsed.item2 ?? null };
  } catch {
    return { item1: null, item2: null };
  }
}
```

- [ ] **Step 3: Run + typecheck + commit**

```bash
npm test -- tests/ui/persist.test.ts
npm run typecheck
git add src/lib/ui/persist.ts tests/ui/persist.test.ts
git commit -m "feat(ui): localStorage persistence with versioned schema"
```

---

## Task 6: Share-URL encoding

**Files:**

- Create: `src/lib/ui/url-state.ts`
- Create: `tests/ui/url-state.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/ui/url-state.test.ts
import { describe, it, expect } from 'vitest';
import { encodeStateToUrl, decodeStateFromUrl } from '../../src/lib/ui/url-state.js';
import type { Item } from '../../src/lib/recombinator/index.js';

const sampleItem = (id: string): Item => ({
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
  prefixes: [
    {
      id: 'p1',
      affix: 'prefix',
      category: 'RegularExplicit',
      name: 'P1',
      tier: 1,
      statText: '+# Damage',
    },
  ],
  suffixes: [],
});

describe('url-state', () => {
  it('encodes and decodes a non-empty state', () => {
    const state = { item1: sampleItem('a'), item2: sampleItem('b') };
    const encoded = encodeStateToUrl(state);
    expect(encoded).toBeTypeOf('string');
    expect(encoded.length).toBeLessThan(2000);
    const decoded = decodeStateFromUrl(encoded);
    expect(decoded.item1?.id).toBe('a');
    expect(decoded.item2?.id).toBe('b');
    expect(decoded.item1?.prefixes[0]?.name).toBe('P1');
  });

  it('round-trips empty state', () => {
    const encoded = encodeStateToUrl({ item1: null, item2: null });
    const decoded = decodeStateFromUrl(encoded);
    expect(decoded.item1).toBeNull();
    expect(decoded.item2).toBeNull();
  });

  it('throws on garbled input', () => {
    expect(() => decodeStateFromUrl('not-base64-deflate')).toThrow();
  });
});
```

- [ ] **Step 2: Implement `src/lib/ui/url-state.ts`**

```ts
// src/lib/ui/url-state.ts
import { deflateRaw, inflateRaw } from 'pako';
import type { Item } from '$lib/recombinator/index.js';

export type UrlState = {
  item1: Item | null;
  item2: Item | null;
};

export function encodeStateToUrl(state: UrlState): string {
  const json = JSON.stringify(state);
  const deflated = deflateRaw(json);
  return base64UrlEncode(deflated);
}

export function decodeStateFromUrl(encoded: string): UrlState {
  const bytes = base64UrlDecode(encoded);
  const inflated = inflateRaw(bytes, { to: 'string' });
  const parsed = JSON.parse(inflated) as UrlState;
  return { item1: parsed.item1 ?? null, item2: parsed.item2 ?? null };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = (typeof btoa !== 'undefined' ? btoa : nodeBtoa)(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = (typeof atob !== 'undefined' ? atob : nodeAtob)(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function nodeBtoa(s: string): string {
  return Buffer.from(s, 'binary').toString('base64');
}

function nodeAtob(s: string): string {
  return Buffer.from(s, 'base64').toString('binary');
}
```

- [ ] **Step 3: Run + typecheck + commit**

```bash
npm test -- tests/ui/url-state.test.ts
npm run typecheck
git add src/lib/ui/url-state.ts tests/ui/url-state.test.ts
git commit -m "feat(ui): share-URL encoding via deflate + base64url"
```

---

## Task 7: ItemPanel component (paste textarea + populated view)

**Files:**

- Create: `src/components/ItemPanel.svelte`
- Create: `src/components/ModRow.svelte`
- Create: `src/components/ModList.svelte`

- [ ] **Step 1: `ModRow.svelte`**

```svelte
<!-- src/components/ModRow.svelte -->
<script lang="ts">
  import type { Mod } from '$lib/recombinator/index.js';

  type Props = {
    mod: Mod;
    onToggleDesired: () => void;
  };

  let { mod, onToggleDesired }: Props = $props();

  const chipColor = (cat: Mod['category']): string => {
    if (cat === 'Implicit') return 'bg-chip-implicit';
    if (cat === 'Fractured') return 'bg-chip-fractured';
    if (cat.startsWith('NNN_')) return 'bg-chip-nnn';
    if (cat.startsWith('Exclusive')) return 'bg-chip-exclusive';
    return 'bg-chip-regular';
  };

  const chipLabel = (cat: Mod['category']): string => {
    if (cat === 'RegularExplicit') return 'Regular';
    if (cat === 'Implicit') return 'Implicit';
    if (cat === 'Fractured') return 'Fractured';
    if (cat.startsWith('NNN_')) return cat.slice(4);
    if (cat.startsWith('Exclusive')) return cat.slice(9);
    return cat;
  };
</script>

<div class="flex items-start gap-2 p-2 rounded hover:bg-gray-800/50">
  <span class="text-xs px-1.5 py-0.5 rounded {chipColor(mod.category)} text-white shrink-0 mt-1">
    {chipLabel(mod.category)}
  </span>
  <span class="text-xs text-gray-400 shrink-0 mt-1.5">
    {mod.affix === 'prefix' ? 'P' : mod.affix === 'suffix' ? 'S' : 'I'}{mod.tier ? ` T${mod.tier}` : ''}
  </span>
  <div class="flex-1 min-w-0">
    {#if mod.name}
      <div class="text-xs italic text-gray-500">{mod.name}</div>
    {/if}
    <div class="text-sm text-gray-100 break-words">{mod.statText}</div>
  </div>
  {#if mod.affix !== 'implicit'}
    <label class="shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={mod.desired === true}
        onchange={onToggleDesired}
        class="w-4 h-4 accent-emerald-500"
      />
    </label>
  {/if}
</div>
```

- [ ] **Step 2: `ModList.svelte`**

```svelte
<!-- src/components/ModList.svelte -->
<script lang="ts">
  import type { Item } from '$lib/recombinator/index.js';
  import ModRow from './ModRow.svelte';

  type Props = {
    item: Item;
    onToggleDesired: (modId: string) => void;
  };

  let { item, onToggleDesired }: Props = $props();
</script>

<div class="space-y-1">
  {#each item.implicits as mod (mod.id)}
    <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
  {/each}
  {#each item.prefixes as mod (mod.id)}
    <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
  {/each}
  {#each item.suffixes as mod (mod.id)}
    <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
  {/each}
</div>
```

- [ ] **Step 3: `ItemPanel.svelte`**

```svelte
<!-- src/components/ItemPanel.svelte -->
<script lang="ts">
  import type { Item } from '$lib/recombinator/index.js';
  import type { ModDb } from '$lib/mods/index.js';
  import { parse as parseClipboard } from '$lib/poe-clipboard/index.js';
  import { translate } from '$lib/mods/index.js';
  import ModList from './ModList.svelte';

  type Props = {
    item: Item | null;
    modDb: ModDb;
    label: string;
    onItemChange: (item: Item | null) => void;
    onToggleDesired: (modId: string) => void;
  };

  let { item, modDb, label, onItemChange, onToggleDesired }: Props = $props();
  let pasteText = $state('');
  let parseError = $state<string | null>(null);

  function handlePaste() {
    parseError = null;
    if (!pasteText.trim()) return;
    try {
      const parsed = parseClipboard(pasteText);
      const translated = translate(parsed, modDb);
      onItemChange(translated);
      pasteText = '';
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Failed to parse';
    }
  }

  function handleRepaste() {
    onItemChange(null);
  }
</script>

<div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col h-full min-h-[400px]">
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-sm font-semibold text-gray-300">{label}</h2>
    {#if item}
      <button class="text-xs text-gray-500 hover:text-gray-300" onclick={handleRepaste}>
        Repaste
      </button>
    {/if}
  </div>

  {#if item}
    <div class="border-b border-gray-800 pb-3 mb-3">
      <div class="text-base font-semibold text-yellow-500">{item.base}</div>
      <div class="text-xs text-gray-500">
        ilvl {item.itemLevel}
        {#if item.influence}· {item.influence}{/if}
        {#if item.corrupted}· corrupted{/if}
        {#if item.synthesised}· synthesised{/if}
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <ModList {item} {onToggleDesired} />
    </div>
  {:else}
    <div class="flex-1 flex flex-col gap-2">
      <textarea
        bind:value={pasteText}
        placeholder="Paste an item from PoE (Ctrl+C in-game)"
        class="flex-1 bg-gray-950 border border-gray-800 rounded p-3 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-emerald-700"
      ></textarea>
      <button
        class="bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-500 rounded px-4 py-2 text-sm font-semibold transition"
        onclick={handlePaste}
        disabled={!pasteText.trim()}
      >
        Parse item
      </button>
      {#if parseError}
        <div class="text-xs text-red-400">{parseError}</div>
      {/if}
    </div>
  {/if}
</div>
```

- [ ] **Step 4: Verify dev server still runs and compiles**

```bash
npm run dev &
sleep 3 && pkill -f 'vite dev'
```

If the server starts without errors, the components compile. (The page doesn't yet wire them up — that's Task 9.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemPanel.svelte src/components/ModRow.svelte src/components/ModList.svelte
git commit -m "feat(ui): ItemPanel + ModList + ModRow components"
```

---

## Task 8: Stats panel + result + batch-sim modals

**Files:**

- Create: `src/components/StatsPanel.svelte`
- Create: `src/components/RecombineResultDialog.svelte`
- Create: `src/components/BatchSimDialog.svelte`
- Create: `src/components/BatchSimChart.svelte`

- [ ] **Step 1: `BatchSimChart.svelte`**

```svelte
<!-- src/components/BatchSimChart.svelte -->
<script lang="ts">
  type Props = { counts: number[]; total: number; label: string };
  let { counts, total, label }: Props = $props();
  const max = Math.max(...counts, 1);
</script>

<div class="space-y-2">
  <div class="text-xs text-gray-400">{label}</div>
  <div class="flex items-end gap-2 h-32">
    {#each counts as count, i}
      <div class="flex-1 flex flex-col items-center gap-1">
        <div
          class="w-full bg-emerald-600 rounded-t"
          style="height: {(count / max) * 100}%"
        ></div>
        <div class="text-xs text-gray-300">{count}</div>
        <div class="text-xs text-gray-500">{i}</div>
      </div>
    {/each}
  </div>
  <div class="text-xs text-gray-500">total: {total}</div>
</div>
```

- [ ] **Step 2: `RecombineResultDialog.svelte`**

```svelte
<!-- src/components/RecombineResultDialog.svelte -->
<script lang="ts">
  import type { RecombineResult } from '$lib/recombinator/index.js';
  import ModRow from './ModRow.svelte';

  type Props = {
    result: RecombineResult;
    onClose: () => void;
    onAgain: () => void;
  };
  let { result, onClose, onAgain }: Props = $props();
</script>

<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onclick={onClose}>
  <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full" onclick={(e) => e.stopPropagation()}>
    <h2 class="text-lg font-semibold mb-3">Recombined item</h2>
    <div class="text-sm text-gray-400 mb-3">
      Base from item {result.baseFromItem} · ilvl {result.itemLevel}
    </div>
    <div class="space-y-1 max-h-72 overflow-y-auto mb-4">
      {#each result.prefixes as mod (mod.id)}
        <ModRow {mod} onToggleDesired={() => {}} />
      {/each}
      {#each result.suffixes as mod (mod.id)}
        <ModRow {mod} onToggleDesired={() => {}} />
      {/each}
      {#if result.prefixes.length === 0 && result.suffixes.length === 0}
        <div class="text-xs text-gray-500 italic">No mods landed (white outcome).</div>
      {/if}
    </div>
    <div class="flex gap-2">
      <button class="flex-1 bg-emerald-700 hover:bg-emerald-600 rounded px-4 py-2 text-sm" onclick={onAgain}>
        Recombine again
      </button>
      <button class="bg-gray-800 hover:bg-gray-700 rounded px-4 py-2 text-sm" onclick={onClose}>
        Close
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: `BatchSimDialog.svelte`**

```svelte
<!-- src/components/BatchSimDialog.svelte -->
<script lang="ts">
  import BatchSimChart from './BatchSimChart.svelte';

  type Props = {
    prefixHistogram: number[];
    suffixHistogram: number[];
    desiredHits: number;
    total: number;
    expectedTries: number;
    onClose: () => void;
  };
  let { prefixHistogram, suffixHistogram, desiredHits, total, expectedTries, onClose }: Props = $props();

  const hitRate = total > 0 ? (desiredHits / total) * 100 : 0;
</script>

<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onclick={onClose}>
  <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full" onclick={(e) => e.stopPropagation()}>
    <h2 class="text-lg font-semibold mb-3">Batch simulation ({total.toLocaleString()} trials)</h2>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="bg-gray-950 border border-gray-800 rounded p-3">
        <div class="text-xs text-gray-500">Hit your target</div>
        <div class="text-2xl font-semibold">{desiredHits.toLocaleString()} / {total.toLocaleString()}</div>
        <div class="text-xs text-gray-400">{hitRate.toFixed(2)}%</div>
      </div>
      <div class="bg-gray-950 border border-gray-800 rounded p-3">
        <div class="text-xs text-gray-500">Expected attempts to hit once</div>
        <div class="text-2xl font-semibold">{Number.isFinite(expectedTries) ? `~${expectedTries.toFixed(1)}` : '∞'}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <BatchSimChart counts={prefixHistogram} {total} label="Prefix count distribution" />
      <BatchSimChart counts={suffixHistogram} {total} label="Suffix count distribution" />
    </div>

    <div class="flex justify-end">
      <button class="bg-gray-800 hover:bg-gray-700 rounded px-4 py-2 text-sm" onclick={onClose}>Close</button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: `StatsPanel.svelte`**

```svelte
<!-- src/components/StatsPanel.svelte -->
<script lang="ts">
  import type { Item, RecombineResult } from '$lib/recombinator/index.js';
  import {
    SeededRng, simulateOnce, simulateBatch, allDesiredHit,
  } from '$lib/recombinator/index.js';
  import RecombineResultDialog from './RecombineResultDialog.svelte';
  import BatchSimDialog from './BatchSimDialog.svelte';

  type Props = {
    item1: Item | null;
    item2: Item | null;
    chance: number;
    desiredCount: number;
    batchTrials: number;
  };

  let { item1, item2, chance, desiredCount, batchTrials }: Props = $props();

  let result = $state<RecombineResult | null>(null);
  let batchData = $state<{
    prefixHistogram: number[];
    suffixHistogram: number[];
    desiredHits: number;
    total: number;
    expectedTries: number;
  } | null>(null);

  function recombineOnce() {
    if (!item1 || !item2) return;
    const rng = new SeededRng(Date.now());
    result = simulateOnce(item1, item2, rng);
  }

  function recombineBatch() {
    if (!item1 || !item2) return;
    const rng = new SeededRng(Date.now());
    const results = simulateBatch(item1, item2, batchTrials, rng);
    const prefixHistogram = [0, 0, 0, 0];
    const suffixHistogram = [0, 0, 0, 0];
    let desiredHits = 0;
    const desired = [...item1.prefixes, ...item1.suffixes, ...item2.prefixes, ...item2.suffixes].filter((m) => m.desired === true);
    for (const r of results) {
      const np = r.prefixes.length;
      const ns = r.suffixes.length;
      prefixHistogram[np] = (prefixHistogram[np] ?? 0) + 1;
      suffixHistogram[ns] = (suffixHistogram[ns] ?? 0) + 1;
      if (allDesiredHit(r, desired)) desiredHits++;
    }
    batchData = {
      prefixHistogram, suffixHistogram, desiredHits, total: batchTrials,
      expectedTries: chance > 0 ? 1 / chance : Infinity,
    };
  }

  const ready = $derived(item1 !== null && item2 !== null);
</script>

<div class="bg-gray-900 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[400px]">
  {#if ready}
    <div class="text-5xl font-bold text-emerald-400">
      {(chance * 100).toFixed(1)}%
    </div>
    <div class="text-xs text-gray-500 mt-2">
      {desiredCount === 0 ? 'no desired mods marked' : `${desiredCount} desired mod${desiredCount === 1 ? '' : 's'}`}
    </div>

    <div class="mt-6 flex flex-col gap-2 w-full max-w-xs">
      <button
        class="bg-emerald-700 hover:bg-emerald-600 rounded px-4 py-2 text-sm font-semibold"
        onclick={recombineOnce}
      >
        Recombine once
      </button>
      <button
        class="bg-gray-800 hover:bg-gray-700 rounded px-4 py-2 text-sm font-semibold"
        onclick={recombineBatch}
      >
        Run {batchTrials.toLocaleString()}×
      </button>
    </div>
  {:else}
    <div class="text-gray-500 text-sm">Paste items in both panels to see chance.</div>
  {/if}
</div>

{#if result}
  <RecombineResultDialog
    {result}
    onClose={() => (result = null)}
    onAgain={() => { recombineOnce(); }}
  />
{/if}

{#if batchData}
  <BatchSimDialog
    prefixHistogram={batchData.prefixHistogram}
    suffixHistogram={batchData.suffixHistogram}
    desiredHits={batchData.desiredHits}
    total={batchData.total}
    expectedTries={batchData.expectedTries}
    onClose={() => (batchData = null)}
  />
{/if}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/StatsPanel.svelte src/components/RecombineResultDialog.svelte src/components/BatchSimDialog.svelte src/components/BatchSimChart.svelte
git commit -m "feat(ui): StatsPanel + recombine result + batch sim dialogs"
```

---

## Task 9: TopBar + main page wiring

**Files:**

- Create: `src/components/TopBar.svelte`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: `TopBar.svelte`**

```svelte
<!-- src/components/TopBar.svelte -->
<script lang="ts">
  type Props = {
    onShare: () => void;
    onReset: () => void;
  };
  let { onShare, onReset }: Props = $props();

  let copyConfirm = $state(false);

  async function handleShare() {
    onShare();
    copyConfirm = true;
    setTimeout(() => { copyConfirm = false; }, 2000);
  }
</script>

<header class="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
  <div class="font-semibold text-lg">
    <span class="text-emerald-400">Resimbinator </span>
    <span class="text-xs text-gray-500 ml-2">PoE 3.25 Recombinator simulator</span>
  </div>
  <div class="flex gap-2">
    <button class="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded" onclick={handleShare}>
      {copyConfirm ? 'Copied!' : 'Share scenario'}
    </button>
    <button class="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded" onclick={onReset}>
      Reset
    </button>
  </div>
</header>
```

- [ ] **Step 2: Replace `src/routes/+page.svelte`**

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createState } from '$lib/ui/state.svelte.js';
  import { getModDb } from '$lib/ui/mod-db-fetch.js';
  import { saveState, loadState } from '$lib/ui/persist.js';
  import { encodeStateToUrl, decodeStateFromUrl } from '$lib/ui/url-state.js';
  import type { ModDb } from '$lib/mods/index.js';
  import TopBar from '../components/TopBar.svelte';
  import ItemPanel from '../components/ItemPanel.svelte';
  import StatsPanel from '../components/StatsPanel.svelte';

  let modDb = $state<ModDb | null>(null);
  let appState = $state<ReturnType<typeof createState> | null>(null);
  let loadError = $state<string | null>(null);

  onMount(async () => {
    try {
      modDb = await getModDb();
      appState = createState(modDb);

      // Resolve initial state: URL > localStorage > empty
      const params = new URLSearchParams(window.location.search);
      const shared = params.get('s');
      if (shared) {
        try {
          const decoded = decodeStateFromUrl(shared);
          if (decoded.item1) appState.setItem(1, decoded.item1);
          if (decoded.item2) appState.setItem(2, decoded.item2);
          // Strip the param so refresh doesn't re-load shared state.
          history.replaceState({}, '', window.location.pathname);
        } catch {
          loadError = 'Failed to decode shared state';
        }
      } else {
        const persisted = loadState(window.localStorage);
        if (persisted.item1) appState.setItem(1, persisted.item1);
        if (persisted.item2) appState.setItem(2, persisted.item2);
      }

      // Auto-save on every change
      $effect(() => {
        if (!appState) return;
        saveState({ item1: appState.item1, item2: appState.item2 }, window.localStorage);
      });
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to load mod database';
    }
  });

  function handleShare() {
    if (!appState) return;
    const encoded = encodeStateToUrl({ item1: appState.item1, item2: appState.item2 });
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  function handleReset() {
    if (!appState) return;
    if (confirm('Clear both items?')) appState.reset();
  }
</script>

<TopBar onShare={handleShare} onReset={handleReset} />

<main class="p-6">
  {#if loadError}
    <div class="bg-red-900/30 border border-red-800 rounded p-4 text-red-200">
      {loadError}
    </div>
  {:else if !appState || !modDb}
    <div class="text-center text-gray-500 py-20">Loading mod database...</div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,400px)_1fr] gap-4 max-w-7xl mx-auto">
      <ItemPanel
        item={appState.item1}
        modDb={modDb}
        label="Item 1"
        onItemChange={(it) => appState!.setItem(1, it)}
        onToggleDesired={(modId) => {
          if (appState!.item1) appState!.toggleDesired(appState!.item1.id, modId);
        }}
      />
      <StatsPanel
        item1={appState.item1}
        item2={appState.item2}
        chance={appState.chance}
        desiredCount={appState.desiredCount}
        batchTrials={appState.settings.batchSimTrials}
      />
      <ItemPanel
        item={appState.item2}
        modDb={modDb}
        label="Item 2"
        onItemChange={(it) => appState!.setItem(2, it)}
        onToggleDesired={(modId) => {
          if (appState!.item2) appState!.toggleDesired(appState!.item2.id, modId);
        }}
      />
    </div>
  {/if}
</main>
```

- [ ] **Step 3: Smoke-test in dev server**

```bash
npm run dev &
sleep 4
curl -s http://localhost:5173/ -o /tmp/page.html
grep -i 'Resimbinator ' /tmp/page.html
grep -i 'paste an item' /tmp/page.html
pkill -f 'vite dev'
```

Expected: both grep matches succeed.

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.svelte src/routes/+page.svelte
git commit -m "feat(ui): TopBar + main page wiring (paste, recombine, share, reset)"
```

---

## Task 10: Production build + deploy config

**Files:**

- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Verify production build succeeds**

```bash
npm run build
```

Expected: writes `build/` directory, no errors. The output is a static SPA.

- [ ] **Step 2: Verify the built site loads**

```bash
npm run preview &
sleep 4
curl -s http://localhost:4173/ | grep -i 'Resimbinator '
pkill -f 'vite preview'
```

- [ ] **Step 3: Create `vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": null,
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 4: Update README**

Replace the "What's coming (planned)" section with:

```markdown
## Live demo

Deploy to Vercel: `vercel --prod` (or connect the repo to Vercel for push-to-deploy).

The app is a static SPA — works on any static host: GitHub Pages, Netlify, Cloudflare Pages, or self-hosted.
```

Add a "Run the app locally" section after Setup:

````markdown
## Run the app locally

```bash
npm run dev
```
````

Open `http://localhost:5173`. Paste two items from PoE (Ctrl+C in-game), check the desired mods, see the chance update live, and click Recombine.

Production build:

```bash
npm run build && npm run preview
```

````

- [ ] **Step 5: Commit**

```bash
git add vercel.json README.md
git commit -m "feat(ui): Vercel deploy config + README app run instructions"
````

---

## Task 11: Final verification

- [ ] **Step 1: Full test suite**

```bash
cd /home/nick/projects/personal/Resimbinator
npm test
npm run typecheck
npm run lint
npm run build
```

All green.

- [ ] **Step 2: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:5173/` in a browser. Verify:

1. Page loads with empty state
2. Paste a real PoE item into item 1 — populates with mods + category chips
3. Paste a second item — chance % shows
4. Toggle desired checkboxes — chance updates live
5. Click "Recombine once" — modal shows result
6. Click "Run 1000×" — histogram modal shows
7. Reload page — items persist (localStorage)
8. Click "Share scenario" — URL copied to clipboard
9. Open the URL in a new tab — same scenario loads

If any of those fail, investigate before declaring Plan 4 done.

- [ ] **Step 3: Confirm git log**

```bash
git log --oneline | head -15
```

Should show ~10 new commits from Plan 4.

---

## Plan-4 acceptance criteria

When this plan is complete, the repo:

1. Has a SvelteKit + Tailwind static SPA at `localhost:5173`
2. Wires the existing engine + parser + categorizer into a 3-region UI
3. Auto-persists state to localStorage and supports share-via-URL
4. Builds to a static `build/` directory and includes a `vercel.json` for one-command deploy
5. All tests + typecheck + lint + build green

## What's deferred to v1.1

- In-app mod editor (add/remove/modify mods after pasting)
- Mod-search dialog with full database browse
- Settings panel (theme toggle, batch trial count, etc.)
- Playwright E2E tests
- About page / SEO polish
- More base items in the curated database
- RePoE-derived attribute/defence restrictions in the build script (`scripts/build-mod-db.ts` currently only captures generation_type and domain)

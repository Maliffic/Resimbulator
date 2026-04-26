# Resimbulator — Design

A web app that simulates Path of Exile 1's patch-3.25 (Settlers-of-Kalguur) Recombinator with full guide-accurate ruleset, automatic mod-category detection, paste-from-game support, and both probability calculation and random simulation.

Replaces an existing Excel-based calculator (`Copy of Recombinator Calculator V1.2.xlsx`) which uses outdated Sentinel-era math and doesn't model exclusive or non-native-natural mods at all.

## Goals & non-goals

**Goals**

- Paste an item directly from PoE (Ctrl+C in-game) and have it parsed into structured mods
- Automatically tag every mod with its category (Regular / Exclusive subtypes / Non-Native Natural subtypes / Fractured / Implicit) using a bundled mod database
- Show live recombination probability as the user marks desired mods
- Simulate single recombines (one rolled result item) and batch (1000+) for outcome distribution
- Implement the full §5 ruleset from the 3.25 community guide (Table 1 distribution, exclusive interaction, NNN base-type filtering, fractured base-tied transfer, the 1p/0s + 0p/1s special case, prefix/suffix-fill 50/50)
- Allow editing pasted items (add, remove, modify mods) so guide-described strategies can be tested without re-copying from PoE
- Deploy as a static SPA, share scenarios via URL

**Non-goals (v1)**

- Mod weighting (the guide notes the weighting formula is poorly characterized and effect is weak; deferred)
- Item library / multi-step chain planner — only two input slots in v1
- PoE2 recombinator (different mechanic)
- Public-community polish (SEO, analytics, feedback intake)
- PoE-skinned item rendering — modern dashboard look only

## Source material

- `Copy of Recombinator Calculator V1.2.xlsx` — the existing spreadsheet (Sentinel-era math, two-sheet workbook with Calc and hardcoded tables; informs the layout of what users want to fill in but its math is superseded)
- `guide.txt` — community 3.25 recombinator guide (Reddit/Prohibited-Library), authoritative source for Table 1, exclusive mod list, NNN definitions, special cases, and worked examples used as test fixtures

## Brainstorming decisions

| Question | Decision | Reason |
|---|---|---|
| Calculator, simulator, or both? | Both — live %, single-roll simulate, batch simulate | Math is shared between calc and sim; once calc exists, sim is nearly free |
| Mod-detail depth (what "NNN" meant) | Full guide §3 (Exclusive) and §4 (NNN) categorization | User explicitly called out NNN; guide makes clear these dominate odds |
| Math depth | §5 full ruleset minus weighting | Aligns with categorization scope; weighting data isn't reliable yet |
| Mod categorization mechanism | Full mod database (RePoE) | Zero-click categorization across the whole game data set |
| Visual style | Modern web dashboard with category chips | Calculator/simulator UI is dashboard-shaped; PoE-skin would clash |
| Audience | Deployed personal tool (not public community tool) | Lowest commitment, share-via-URL covers cross-device + sharing-with-friends |
| Item interaction | Paste + edit (no library) | Editing is required to test guide strategies; library is a clean v2 split |
| Tech stack | SvelteKit + TypeScript | Form/state-heavy single-page app, small bundle matters with mod DB |

## Architecture

Three logical layers, deployed as a static SPA. No backend, no database server.

### Layer 1: Engine (pure TypeScript)

UI-agnostic, deterministic, exhaustively unit-tested.

- `lib/poe-clipboard/parse.ts` — clipboard text → `ParsedItem`
- `lib/mods/database.ts` — mod lookup by id, by name+tier+affix, or by stat-text regex
- `lib/mods/categorize.ts` — `ParsedItem` → `TaggedItem` (mods stamped with category)
- `lib/recombinator/table1.ts` — Table 1 distribution (literal, from guide §5)
- `lib/recombinator/rules.ts` — base pick, mod-count pick, eligibility filter, exclusive resolution, fill-order, special case
- `lib/recombinator/probability.ts` — exact enumeration with Monte Carlo fallback
- `lib/recombinator/simulate.ts` — single and batch random rolls

### Layer 2: State store

- Svelte runes (`$state`, `$derived`) holding both items, computed chance, simulation results, settings
- `lib/items/store.svelte.ts` — main store
- `lib/items/url-state.ts` — encode/decode share URLs (deflate + base64url via `pako`)
- localStorage auto-persist (versioned schema, migration-capable)

### Layer 3: UI (Svelte components)

- `routes/+page.svelte` — three-region layout
- `components/TopBar.svelte` — share, reset, settings, about
- `components/ItemPanel.svelte` — empty (paste textarea) ↔ populated (mod list) state
- `components/ModList.svelte`, `components/ModRow.svelte` — list + per-mod row
- `components/ModSearchDialog.svelte` — fuzzy-search the mod database to add a mod
- `components/EditModDialog.svelte` — edit tier / roll value / desired flag
- `components/StatsPanel.svelte` — chance %, notation line, sim buttons
- `components/NotationLine.svelte` — `(2p1e/1s) + (1p/2s)` summary
- `components/RecombineResultDialog.svelte` — single-roll outcome view
- `components/BatchSimDialog.svelte`, `components/BatchSimChart.svelte` — histogram + summary stats

### Build & deploy

- `@sveltejs/adapter-static` → static export
- Vercel free tier (or GitHub Pages — equivalent effort) with push-to-deploy on `main`
- Mod database (`static/mod-db.json`) generated at build time by `scripts/build-mod-db.ts` from RePoE; cached in IndexedDB after first load

## Data flow

```
Paste PoE text → Parser → ParsedItem
                              ↓
                          Categorizer ← Mod DB (static JSON)
                              ↓
              ┌─────  TaggedItem  ─────┐
              ↓                         ↓
         Probability              Simulator (on click)
         (live, every state        (1× or 1000×)
          change)                      ↓
              ↓                   Result item(s) +
        Chance %                  outcome histogram
```

## Engine — recombinator simulator & probability

Both `probability(items, desiredMods)` and `simulate(items, n)` share the same internal ruleset, applied per §5 of the guide.

### Internal ruleset

1. **`pickBase(item1, item2)`** — 50/50 between the two. Output inherits everything except defence percentile (rerolled). Item level = `min(max(ilvl1, ilvl2), avg(ilvl1, ilvl2) + 2)`.

2. **`pickModCount(totalInPool)`** — samples Table 1:

   | Inputs | →0 | →1 | →2 | →3 |
   |---|---|---|---|---|
   | 1 | 41% | 59% | 0% | 0% |
   | 2 | 0% | 67% | 33% | 0% |
   | 3 | 0% | 39% | 52% | 10% |
   | 4 | 0% | 11% | 59% | 31% |
   | 5 | 0% | 0% | 43% | 57% |
   | 6 | 0% | 0% | 28% | 72% |

3. **`fillOrder()`** — 50/50 prefix-first or suffix-first. Affects which pool exhausts the single exclusive-mod slot.

4. **`pickMods(pool, count, chosenBase, alreadyHasExclusive)`** — uniform random selection from eligible mods. Eligibility filters out:
   - NNN mods incompatible with `chosenBase`
   - Fractured mods whose host item wasn't `chosenBase`
   - All exclusive mods if `alreadyHasExclusive` is true

5. **Special case `1p/0s + 0p/1s`** — bypasses Table 1, returns one of `1p/0s`, `0p/1s`, `1p/1s` each at 33%.

### `simulate(items, n)` flow per trial

```
base ← pickBase()
totalP, totalS ← count prefixes/suffixes from BOTH inputs
nP ← pickModCount(totalP)
nS ← pickModCount(totalS)
order ← fillOrder()
fill in order(nP, nS), tracking alreadyHasExclusive across both pools
return new item with base + selected mods
```

### `probability(items, desiredMods)`

- Enumerates the outcome space exactly when feasible (small: ~3 base picks × ~16 count combos × small subset choices). Computes exact probability per outcome and sums matching ones.
- Falls back to Monte Carlo (10k trials) only if enumeration explodes — rare, occurs when both items have many exclusive/NNN mods that branch eligibility.

### Validation

- Unit tests for each ruleset function
- Integration tests against guide worked examples (§6 grasping mail = 50%, §7 wand counterweight ≈ 35%, §8 cases)
- Property test: `probability()` and `simulate(100k)` agree within ±0.5% on 50 randomly generated scenarios
- Cross-check against the spreadsheet on no-exclusive/no-NNN cases, accounting for the spreadsheet's older Table 1

## Mod database & categorization

### Source

[RePoE](https://github.com/lvlvllvlvllvlvl/RePoE) — community-maintained JSON dump of GGG's data files, refreshed each league. Used by Path of Building, Awakened PoE Trade, Craft of Exile. Specifically `mods.json` and `base_items.json`.

### Build-time pipeline

`scripts/build-mod-db.ts` fetches RePoE, transforms into a slim app shape:

```ts
type ModDef = {
  id: string;
  name: string;
  affix: 'prefix' | 'suffix';
  tier: number | null;     // null = untiered essence (per guide §3)
  tags: string[];
  statRanges: StatRange[];
  statText: string[];
  category: ModCategory;
  requirements?: { influence?: string; attribute?: string; defence?: string };
};
```

Output: `static/mod-db.json`, ~5–8 MB raw, ~1–1.5 MB gzipped. Bundle size budget warns at 2 MB and fails at 3 MB to prevent quiet bloat.

### Category derivation

| Category | Rule |
|---|---|
| RegularExplicit | generation_type = `prefix`/`suffix`, no flags below |
| ExclusiveCrafted | domain = `crafted` OR generation_type = `crafted` |
| ExclusiveVeiled | has `veiled` tag |
| ExclusiveEssence | from essence source AND tier is null |
| ExclusiveBreach | domain = `breach` OR spawn_tag includes `breach` |
| ExclusiveIncursion | domain = `incursion` |
| ExclusiveBeastAspect | name matches `/^Aspect of/` |
| ExclusiveDelve | domain = `delve` |
| ExclusiveElevated | has elevated-influence flag |
| NNN_Influenced | generation_type ∈ {shaper, elder, crusader, hunter, warlord, redeemer} |
| NNN_Defence | has `armour`/`evasion`/`energy_shield` tags |
| NNN_Attribute | spawn_weights gated on str/dex/int base (includes Suppress, life regen %, ES recharge rate, etc. — guide §4 lists Suppress as a subset of attribute-specific affixes) |
| Fractured | set on mod *instance* by parser (per-item, not per-mod) |
| Implicit | generation_type ∈ {unique, corrupted, enchant} OR clipboard `(implicit)` marker |

### Lookup strategy

Two-stage match from parser to database:

1. **By name + tier + affix** — when PoE clipboard provides type hints (~99% of normal use). Exact match, sub-millisecond.
2. **By stat-text template** — fallback when type hints are off. Stat line `"166% increased Physical Damage"` → template `"#% increased Physical Damage"` → lookup.

### Contextual NNN

Some NNN flags are evaluated *per simulation trial*, not statically — a Strength-base affix is NNN only when the picked base is Dex/Int. The mod database stores the requirements; the simulator's `eligibility(mod, chosenBase)` check applies them.

### Per-league update

```bash
npm run update-mod-db
```

Re-fetches RePoE, regenerates JSON, snapshot tests flag any new mod patterns. Commit and push.

## Clipboard parser

### Input format

PoE's clipboard format with sections separated by `--------`:

```
Item Class: Body Armours
Rarity: Rare
<item name>
<base type>
--------
Quality: +20% (augmented)
Armour: 850 (augmented)
...
--------
Requirements: ...
--------
Sockets: ...
--------
Item Level: 86
--------
{ Implicit Modifier — Life }                         ← only with Type Hints
+22 to maximum Life (implicit)
--------
{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage, Attack, Physical }
166% increased Physical Damage
{ Suffix Modifier "of Insulation" (Tier: 5) — Elemental, Resistance }
+19% to Cold Resistance
{ Crafted Suffix Modifier "of Crafting" (Tier: 1) — Caster, Skill }
+1 to Level of Socketed Gems
{ Fractured Modifier "Mage King's" (Tier: 4) — Defences, Caster }
+15 to maximum Mana (fractured)
--------
Corrupted        ← optional
```

### Parser

`lib/poe-clipboard/parse.ts`:

1. Tokenize by `--------` lines
2. Section 1 → header (rarity, item class, name, base, influence flag)
3. Recognize known sections by leading line (`Quality:`, `Requirements:`, `Sockets:`, `Item Level:`)
4. Mod sections — for each `{ ... }` type-hint block parse:
   - affix (Prefix/Suffix/Implicit)
   - flags (Crafted, Veiled, Fractured)
   - mod name (between quotes)
   - tier (`(Tier: N)`, or null = essence)
   - tags (after `—`, comma-separated)
   - 1–2 stat lines following until next `{` or `--------`
5. Inline markers `(implicit)` / `(fractured)` / `(crafted)` on stat lines as backup categorization
6. `Corrupted` line → flag on item

### Output

```ts
type ParsedItem = {
  rarity: 'Normal' | 'Magic' | 'Rare' | 'Unique';
  itemClass: string;
  name: string;
  base: string;
  itemLevel: number;
  quality?: number;
  influence?: 'shaper' | 'elder' | 'crusader' | 'hunter' | 'warlord' | 'redeemer';
  corrupted: boolean;
  synthesised: boolean;
  implicits: ParsedMod[];
  prefixes: ParsedMod[];
  suffixes: ParsedMod[];
};

type ParsedMod = {
  hint?: { name: string; tier: number | null; tags: string[]; flags: string[] };
  statLines: string[];
};
```

### Robustness

- **No type hints** — stat-line regex matches against the database. Yellow non-blocking banner suggests enabling PoE's *Show Modifier Type Hints* setting.
- **Unknown lines** — kept as raw; categorizer offers manual-tag dropdown.
- **Non-recombinable items** — Unique, corrupted, and synthesised items parse successfully but display a warning ("can't be recombined in-game; sim runs anyway for hypotheticals").
- **Other handled cases** — Magic items (1–2 mods), Normal items (no mods), hybrid bases, multiple implicits.

### Tests

`fixtures/clipboard/` — ~30 real items across rare/magic/normal/unique, with/without type hints, fractured, influenced, essence, beast aspect, corrupted, hybrid, synthesised. Snapshot-tested.

## UI layout

Single page, three regions, modals for one-off interactions. No routing.

### Page skeleton

```
┌───────────────────────────────────────────────────────────────┐
│  Resimbulator        Share scenario  Reset  Settings  About   │
├──────────────────────┬─────────────────────┬──────────────────┤
│   ITEM 1             │     CHANCE          │   ITEM 2         │
│   ┌──────────────┐   │   ┌─────────────┐   │  ┌──────────────┐│
│   │ [paste box]  │   │   │   63.3%     │   │  │ [paste box]  ││
│   │  or item     │   │   │  of getting │   │  │  or item     ││
│   │              │   │   │ desired mods│   │  │              ││
│   │  mods list   │   │   └─────────────┘   │  │  mods list   ││
│   │  (with chips │   │   Notation:         │  │  (with chips ││
│   │  and edit)   │   │   2p1e/1s + 1p/2s   │  │              ││
│   │              │   │   [Recombine once]  │  │              ││
│   │  + Add mod   │   │   [Run 1000×]       │  │  + Add mod   ││
│   └──────────────┘   │                     │  └──────────────┘│
└──────────────────────┴─────────────────────┴──────────────────┘
```

Responsive: collapses to vertical stack (item1 → stats → item2) below ~900 px.

### `ItemPanel`

- **Empty state** — large textarea, placeholder "Paste an item from PoE (Ctrl+C in-game)". Auto-detects on paste, parses, transitions to populated state.
- **Populated state header** — rarity-colored item header, base type, item level, influence badge if present, "Repaste" link.
- **Mod list** — one row per mod: category chip (gray/red/amber/blue/dim), affix tag (P/S badge), tier (T1), mod name (italic gray), stat text (main line), desired checkbox (right). Hover icons: edit, delete, re-categorize.
- **Add mod button** — opens fuzzy-search dialog over mod database, filter by prefix/suffix.
- **Edit mod dialog** — swap tier, change roll value, toggle desired/locked.

### `StatsPanel`

- **Big chance %** — updates live; subtle transition animation.
- **Notation line** — `(2p1e/1s) + (1p/2s)`. Click for breakdown popover.
- **Recombine once** — opens result modal with rolled item. Buttons: "Recombine again," "Save as input 1," "Save as input 2" (chain planning without library).
- **Run 1000×** — opens batch sim modal: histogram of desired-mods-hit (0/1/2/3 prefix and suffix), "Hit your target N times in 1000 (M%)," "Expected attempts to hit once: ~K," copy-to-clipboard summary.
- **Inline warnings** — non-recombinable items (corrupted/unique) flagged.

### Mod row example

```
🟥 [P] T1  Tyrannical              ☑ desired
   166% increased Physical Damage
🟦 [P] T4  Mage King's   FRACTURED ☐
   +15 to maximum Mana
🟨 [S] T3  of Hephaestus            ☐
   +35% to Fire Resistance       NNN: Influenced
🟥 [S] T1  of Crafting              ☑ desired
   +1 to Level of Socketed Gems
```

Chip colors are accessible (shape-coded so colorblind/grayscale works).

### Top bar

- **Share scenario** — copies share URL
- **Reset** — confirm dialog, clears items, keeps settings
- **Settings** — mod-database last-update date, batch-sim default trial count, theme
- **About** — math overview, credit to guide

### Components

```
TopBar.svelte
ItemPanel.svelte
ModList.svelte
ModRow.svelte
ModSearchDialog.svelte
EditModDialog.svelte
StatsPanel.svelte
NotationLine.svelte
RecombineResultDialog.svelte
BatchSimDialog.svelte
BatchSimChart.svelte    (hand-rolled SVG, no chart lib needed for 4-bar histogram)
```

## Persistence & share-URL

### localStorage — working state

Auto-saves on every change. Key: `resimbulator:state:v1`. Versioned schema with sequential migrators (`v1→v2`, etc.).

```ts
{
  schemaVersion: 1,
  item1: SerializedItem | null,
  item2: SerializedItem | null,
  settings: {
    batchSimTrials: number;          // default 1000
    showAdvancedRollDetails: boolean;
    theme: 'system' | 'dark' | 'light';
  }
}
```

`SerializedItem` references mod-db entries by id — items don't duplicate stat text. Total payload ~couple KB per item, well under 5 MB localStorage budget. Mod database itself lives in build assets / IndexedDB, never localStorage.

### Share URL

```
https://<deployed-host>/?s=eyJ2IjoxLCJpMSI6...
```

`?s=` = JSON state, `pako.deflateRaw`-compressed, base64url-encoded. Compression matters: raw items can hit 2–3 KB. Deflated typically 500–800 bytes — fits standard URL limits.

If a URL exceeds ~2000 chars, share dialog falls back to "Copy as JSON" or downloadable `scenario.json`.

### Page-load resolution

1. If `?s=` present → decode → load → "Loaded from shared link" toast with "Save to my workspace" button. Ignore localStorage for that session.
2. Else → load from localStorage if present.
3. Else → empty panels.

### Reset

- **Reset** — confirm dialog, clears items, keeps settings
- **Hard reset** (Settings → confirmation) — clears localStorage entirely

## Testing & deployment

### Test layers

| Layer | What | Where |
|---|---|---|
| Unit | Engine — Table 1 sampler, eligibility, exclusive resolution, base/count/order picks, special case | `lib/recombinator/*.test.ts` |
| Unit | Parser on ~30 real clipboard fixtures (every shape) | `lib/poe-clipboard/*.test.ts` |
| Unit | Categorizer — every category, contextual NNN per base | `lib/mods/*.test.ts` |
| Integration | Guide worked examples: §6 grasping mail (50%), §7 wand (~35%), §8 cases — exact values | `lib/recombinator/guide-examples.test.ts` |
| Integration | Property test: `probability()` vs Monte Carlo `simulate(100k)` within ±0.5% on 50 random scenarios | `lib/recombinator/cross-check.test.ts` |
| End-to-end | Paste → mark desired → see chance → Recombine → result. Share URL roundtrip. localStorage persistence. | `e2e/*.spec.ts` |

Tooling: Vitest (unit + integration), Playwright (e2e).

### CI

GitHub Actions on every push: lint, typecheck, unit, e2e. Bundle size budget enforced (warn > 2 MB, fail > 3 MB).

### Deploy

- Vercel free tier with push-to-deploy on `main`. Preview deploys per PR.
- GitHub Pages alternative — `adapter-static` with `base` configured. Equivalent effort.
- Custom domain optional; the auto-assigned Vercel subdomain is fine.

### Per-league update workflow

1. `npm run update-mod-db` — re-fetch RePoE, regenerate `static/mod-db.json`
2. Run parser fixtures; snapshots flag new patterns
3. Commit, push, auto-deploy

## Out of scope (v2 candidates)

- Item library and multi-step chain planner
- Mod weighting (deferred until guide data is firmer)
- PoE2 recombinator (different mechanic)
- Public-tool polish (SEO, analytics, About content, feedback intake)
- PoE-skinned item rendering (hybrid mode)

## Open implementation questions for the plan

These are deliberately deferred to the implementation plan, not the design:

- Exact Tailwind theme tokens
- Whether the mod-DB lookup uses a hash map of ids or also builds a stat-template trie
- Test fixture acquisition (collect real items vs. synthesize)
- Whether to ship a sample scenarios dropdown for first-run users

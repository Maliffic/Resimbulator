# Resimbulator

A web-app simulator for Path of Exile 1's patch-3.25 (Settlers of Kalguur) Recombinator. Paste two items from the game, mark the mods you want, see the chance of getting them on a recombine. Roll once, or run 1,000 trials and see the histogram.

## What's in here

**Engine (Plan 1):**
- Pure-TypeScript recombinator math engine implementing the rules from the [community guide](./guide.txt) §5
- Table 1 distribution sampler, eligibility filter (NNN / Fractured / Exclusive), single + batch simulator
- Both Monte Carlo and exact-enumeration probability calculators
- Validated against guide §6 (grasping mail breach scenario) and §7 (wand counterweight ≈ 35%)
- Cross-check property test: `probabilityExact` agrees with `probabilityMonteCarlo(30k trials)` within 1.5% on 30 random scenarios

**Clipboard parser (Plan 2):**
- Parses PoE's in-game Ctrl+C output into a structured `ParsedItem`
- Handles items with and without "Show Modifier Type Hints" enabled
- Detects rarity, item class, base, item level, quality, influence, corrupted, synthesised
- Extracts mod tier, name, tags, and `crafted/veiled/fractured/implicit` flags
- Validated against 10 fixture variations

**Mods + categorizer (Plan 3):**
- Hand-curated base-items database (~40 popular Settlers crafting bases)
- RePoE-derived mod database build script (`npm run update-mod-db`)
- Categorizer: maps each `ParsedMod` to the correct `ModCategory` and applies per-mod requirements
- Translator: `ParsedItem` → engine `Item`, ready for the simulator

**SvelteKit UI (Plan 4):**
- Three-panel layout (item 1 / live chance / item 2)
- Paste from PoE → live category-chip rendering of mods
- Toggle "desired" checkboxes → chance % updates instantly
- "Recombine once" → modal with rolled item
- "Run 1000×" → histogram of prefix/suffix counts + hit rate + expected attempts
- Auto-saves to localStorage, share scenarios via URL

## Setup

```bash
npm install
npm run typecheck
npm test
```

## Run the app locally

```bash
npm run dev
```

Open `http://localhost:5173`. Paste two items from PoE (Ctrl+C in-game), tick the mods you want, see the chance update live, click Recombine.

Production build:

```bash
npm run build && npm run preview
```

## Deploy

`vercel.json` is included for one-command deploy:

```bash
vercel --prod
```

The app is a static SPA — works on any static host: GitHub Pages, Netlify, Cloudflare Pages.

## Mod database

The UI ships with a small dev-fixture mod database (`static/mod-db-fixture.json`) that covers the categorizer's rule-coverage tests but isn't comprehensive. To populate the full RePoE-derived database (one-time, requires network):

```bash
npm run update-mod-db
```

Writes `static/mod-db.json` (~1-2 MB gzipped). The UI prefers `mod-db.json` and falls back to the fixture.

## CLI

There's also a stdin/stdout CLI for headless use:

```bash
echo '{"command":"probability","seed":1,"trials":10000,"item1":{...},"item2":{...}}' | npm run engine
```

Commands: `probability`, `simulate`, `parse`, `translate`. See `tests/cli/main.test.ts` for input shapes.

## Layout

```
src/lib/recombinator/    pure-TS math engine
src/lib/poe-clipboard/   clipboard parser
src/lib/mods/            mod database + categorizer + translator
src/lib/ui/              UI state, persistence, URL share, mod-DB browser fetch
src/components/          Svelte components (ItemPanel, StatsPanel, dialogs, etc.)
src/routes/              SvelteKit pages
src/cli/                 stdin/stdout CLI
scripts/                 build-mod-db.ts
tests/                   unit + integration + snapshot tests
docs/superpowers/        design + implementation plans
```

## Validation

`npm test` executes the full suite (currently 146 tests across 26 files):

- Engine unit + integration tests, guide examples, cross-check property test
- Parser unit tests + fixture snapshot tests
- Categorizer rule coverage + translator round-trips
- UI: state helpers, localStorage round-trip, URL encode/decode
- CLI integration tests

## License

MIT.

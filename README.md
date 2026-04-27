# Resimbinator

A web-app simulator for Path of Exile 1's patch-3.25 (Settlers of Kalguur) Recombinator. Paste two items from the game (or hit "Random pair"), mark the mods you want, and see the chance — broken down by which base wins, with the math behind it.

**Live: https://resimbinator.vercel.app**

## What it does

- **Paste from PoE** (Ctrl+C in-game). Parses the clipboard format with or without "Show Modifier Type Hints"
- **Or generate a random pair** if you don't want to grab items by hand — picks two bases of the same item class, samples real mods (~70% regular / 25% NNN / 5% exclusive) so the chip variety is visible
- **Tick desired mods** → chance % updates instantly, plus a per-base split (`base ← item 1` / `base ← item 2`) that exposes the NNN ladder mechanic
- **Show breakdown** dialog — walks through the math: the 50/50 base pick, the combined mod pool with per-base eligibility (✓/✗ with reasons like "requires evasion on the base"), the Table 1 row for affix counts, and the weighted-sum formula
- **Inline editing** — × any mod to delete, "+ Add prefix/suffix" to search the mod-DB and insert one (filtered by what's eligible for the host base)
- **Recombine once** → modal with the rolled item; **Run 1000×** → histogram of prefix/suffix counts + hit rate + expected attempts
- **Cost calculator** → enter a divine-per-try cost, total expected cost shows up next to the chance
- **Library dialog** with five tabs:
  - **Examples** — preset scenarios that demonstrate each rule (NNN_Defence, NNN_Influenced, exclusive collision, fractured-host)
  - **My saved** — name and store scenarios in localStorage
  - **Compare** — pick saved scenarios, see chance / per-base split / expected tries / cost in a table
  - **Plan** — chain saved scenarios as sequential steps with cumulative cost
  - **Workflow** — wire stages into a DAG (multi-step crafts like the NNN-ladder method); cost rolls up the tree
- **Help dialog** with the full mod-category reference (NNN, Fractured, Exclusive, edge cases not modelled)
- **Auto-save** to localStorage; share a scenario via URL

## Tech

- SvelteKit 2 (Svelte 5 runes) + TypeScript + Tailwind, static-adapter SPA
- Pure-TS recombinator engine — no Svelte deps, fully unit-tested
- RePoE-derived mod database (~12k entries) built via `bun run update-mod-db`
- Bun for install / build / test
- Vercel for hosting (`vercel.json` included)

## Run locally

```bash
bun install
bun run dev
```

Open http://localhost:5173, paste an item or hit "Generate random pair".

```bash
bun run build && bun run preview   # production build + local preview
bun run test                       # vitest suite
bun run check                      # svelte-check + tsc
```

## Mod database

The UI ships with a tiny dev fixture (`static/mod-db-fixture.json`) that's enough for the categorizer's rule tests. To populate the full RePoE-derived database (~3 MB, one-time, requires network):

```bash
bun run update-mod-db
```

This writes `static/mod-db.json`. The UI prefers `mod-db.json` and falls back to the fixture.

## Project layout

```
src/lib/recombinator/    pure-TS math engine (Table 1 sampler, eligibility, exact + Monte Carlo, explain)
src/lib/poe-clipboard/   clipboard parser
src/lib/mods/            mod database, categorizer, translator
src/lib/ui/              UI state, persist, URL share, generate, presets, analyze
src/components/          Svelte components (panels, dialogs, mod rows)
src/routes/              SvelteKit pages
src/cli/                 stdin/stdout CLI (probability/simulate/parse/translate)
scripts/                 build-mod-db.ts
tests/                   unit + integration + snapshot tests
docs/                    design notes, NNN-ladder workflow reference
```

## Validation

`bun run test` runs the full suite — currently 146 tests across 26 files:

- Engine unit + integration tests, guide §6 (grasping mail breach) and §7 (wand counterweight ≈ 35%) examples, cross-check property test against Monte Carlo
- Parser unit tests + fixture snapshots for ~10 clipboard variations
- Categorizer rule coverage + translator round-trips
- UI: state helpers, localStorage round-trip, URL encode/decode
- CLI integration tests

## Caveats / not modelled

- Legacy IIQ mod (permanent leagues only)
- Has Abyssal Socket + base-at-max-sockets interaction
- Workflow tab assumes one successful donor per stage — variance from batched parallel attempts isn't modelled
- Generated stat texts are humanized RePoE stat IDs (`additional_strength` → "+47 to Strength"), not the exact PoE wording

## Disclaimer

Not affiliated with or endorsed by Grinding Gear Games. Path of Exile is © Grinding Gear Games. Mod data sourced from the open-source [RePoE](https://github.com/repoe-fork/repoe-fork.github.io) project. Recombinator mechanics are based on the [community guide](docs/guide.txt) and the [PoE Wiki](https://www.poewiki.net/wiki/Recombinator).

## License

MIT.

# Resimbulator

A web-app simulator for Path of Exile 1's patch-3.25 (Settlers of Kalguur) Recombinator. Currently in active build; **this repository contains the engine + clipboard parser layers** as of Plan 2.

## What's here so far

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
- Sorts mods into `prefixes`, `suffixes`, `implicits`, and `unknown` (the last for type-hints-off cases that need Plan 3 to categorize)
- Validated against 10 fixture variations (rare, magic, normal, unique, hinted, hint-less, fractured, crafted, influenced, corrupted, synthesised)

**CLI (`npm run engine`):**
- `probability` — exact + Monte Carlo probability of getting desired mods
- `simulate` — N rolled outcomes
- `parse` — clipboard text → `ParsedItem`

## What's coming (planned)

- **Plan 3:** RePoE-backed mod database + categorizer (translates `ParsedItem` to engine `Item`)
- **Plan 4:** SvelteKit UI, persistence, share-URL, deploy

## Setup

```bash
npm install
npm run typecheck
npm test
```

## CLI

The CLI takes a JSON envelope on stdin and prints results on stdout.

**Probability / simulate:**
```bash
echo '{
  "command": "probability",
  "seed": 1,
  "trials": 10000,
  "item1": { ... },
  "item2": { ... }
}' | npm run engine
```

`command` is `"probability"` (returns exact + Monte Carlo) or `"simulate"` (returns N rolled results). Mods are tagged as desired by setting `desired: true` on the mod object.

**Parse a clipboard dump:**
```bash
cat my-item.txt | python3 -c "import json,sys; print(json.dumps({'command':'parse','clipboard':sys.stdin.read()}))" | npm run engine
```

Returns a JSON `ParsedItem` with `prefixes`, `suffixes`, `implicits`, and `unknown` mods (the last of which Plan 3's categorizer will resolve).

See `tests/cli/main.test.ts` for the full input shapes.

## Layout

```
src/lib/recombinator/    pure-TS engine (no UI deps)
src/lib/poe-clipboard/   clipboard parser (no UI deps)
src/cli/                 stdin/stdout CLI
tests/recombinator/      engine unit + integration tests
tests/poe-clipboard/     parser unit + snapshot tests
tests/cli/               CLI tests
tests/fixtures/          guide worked-example fixtures + clipboard fixtures
docs/superpowers/        design + implementation plans
```

## Validation

`npm test` executes the full suite (currently 107 tests across 19 files):

- Engine unit tests (types, rng, table1, ilevel, eligibility, pick, special-cases, simulate, probability)
- Engine guide-examples (§6, §7)
- Engine cross-check property test (exact ≈ Monte Carlo on random scenarios)
- Parser unit tests (tokenize, header, mod-block, flags)
- Parser fixture snapshot tests (10 fixture items)
- Parser field-level tests (rarity, flag detection, mod counts per fixture)
- Public-API smoke tests (engine, parser)
- CLI integration tests (probability, simulate, parse)

## License

MIT.

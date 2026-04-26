# Resimbulator

A web-app simulator for Path of Exile 1's patch-3.25 (Settlers of Kalguur) Recombinator. Currently in active build; **this repository contains the engine + clipboard parser + categorizer layers** as of Plan 3.

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
- Sorts mods into `prefixes`, `suffixes`, `implicits`, and `unknown`
- Validated against 10 fixture variations

**Mods + categorizer (Plan 3):**
- Hand-curated base-items database (~40 popular Settlers crafting bases)
- RePoE-derived mod database build script (`npm run update-mod-db`)
- Categorizer: maps each `ParsedMod` to the correct `ModCategory` and applies per-mod requirements (`requiresInfluence`, `requiresDefenceTag`, `allowedAttributeBases`, `hostItemId`)
- Translator: `ParsedItem` → engine `Item`, ready for the simulator

**CLI (`npm run engine`):**
- `probability` — exact + Monte Carlo probability of getting desired mods
- `simulate` — N rolled outcomes
- `parse` — clipboard text → `ParsedItem`
- `translate` — clipboard text + mod-DB → engine `Item`

## What's coming (planned)

- **Plan 4:** SvelteKit UI, persistence, share-URL, Vercel deploy

## Setup

```bash
npm install
npm run typecheck
npm test
```

To populate the production mod database (one-time, requires network):

```bash
npm run update-mod-db
```

This fetches RePoE and writes `static/mod-db.json` (~1-2 MB gzipped). Tests don't require this — they use a small inline fixture.

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

**Parse a clipboard dump:**
```bash
cat my-item.txt | python3 -c "import json,sys; print(json.dumps({'command':'parse','clipboard':sys.stdin.read()}))" | npm run engine
```

**Translate clipboard → engine `Item`:**
```bash
cat my-item.txt | python3 -c "
import json, sys
clip = sys.stdin.read()
db = json.load(open('tests/fixtures/mods/fixture-mod-db.json'))  # or static/mod-db.json after update
print(json.dumps({'command': 'translate', 'clipboard': clip, 'modDb': db}))
" | npm run engine
```

See `tests/cli/main.test.ts` for the full input shapes.

## Layout

```
src/lib/recombinator/    pure-TS engine
src/lib/poe-clipboard/   clipboard parser
src/lib/mods/            mod database + categorizer + translator
src/cli/                 stdin/stdout CLI
scripts/                 build-mod-db.ts (npm run update-mod-db)
tests/recombinator/      engine unit + integration tests
tests/poe-clipboard/     parser unit + snapshot tests
tests/mods/              mods/categorizer/translator tests
tests/cli/               CLI tests
tests/fixtures/          guide examples + clipboard fixtures + mod-DB fixture
docs/superpowers/        design + implementation plans
```

## Validation

`npm test` executes the full suite. Coverage:

- Engine unit tests (types, rng, table1, ilevel, eligibility, pick, special-cases, simulate, probability)
- Engine guide-examples (§6, §7)
- Engine cross-check property test
- Parser unit tests (tokenize, header, mod-block, flags)
- Parser fixture snapshot + field-level tests (10 fixture items)
- Mod-DB loader tests
- Categorizer tests (11 rule-coverage cases)
- Translator tests (parsed → engine round trips)
- Public-API smoke tests (engine, parser, mods)
- CLI integration tests (probability, simulate, parse, translate)

## License

MIT.

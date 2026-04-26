# Resimbulator

A web-app simulator for Path of Exile 1's patch-3.25 (Settlers of Kalguur) Recombinator. Currently in active build; **this repository contains only the engine layer** as of Plan 1.

## What's here so far

- Pure-TypeScript recombinator math engine implementing the rules from the [community guide](./guide.txt) §5
- Table 1 distribution sampler, eligibility filter (NNN / Fractured / Exclusive), single + batch simulator
- Both Monte Carlo and exact-enumeration probability calculators
- Validated against guide §6 (grasping mail breach scenario) and §7 (wand counterweight ≈ 35%)
- Cross-check property test: `probabilityExact` agrees with `probabilityMonteCarlo(30k trials)` within 1.5% on 30 random scenarios
- Small CLI (`npm run engine`) that takes a JSON scenario on stdin and emits results on stdout

## What's coming (planned)

- **Plan 2:** PoE clipboard parser
- **Plan 3:** RePoE-backed mod database + categorizer
- **Plan 4:** SvelteKit UI, persistence, share-URL, deploy

## Setup

```bash
npm install
npm run typecheck
npm test
```

## CLI

The CLI takes a JSON scenario on stdin and prints results on stdout.

```bash
echo '{
  "command": "probability",
  "seed": 1,
  "trials": 10000,
  "item1": { ... },
  "item2": { ... }
}' | npm run engine
```

`command` is either `"probability"` (returns exact + Monte Carlo) or `"simulate"` (returns N rolled results). Mods are tagged as desired by setting `desired: true` on the mod object. See `tests/cli/main.test.ts` for the full input shape.

## Layout

```
src/lib/recombinator/   pure-TS engine (no UI deps)
src/cli/                stdin/stdout CLI
tests/recombinator/     unit + integration tests
tests/cli/              CLI tests
tests/fixtures/         guide worked-example fixtures
docs/superpowers/       design + implementation plans
```

## Validation

Run `npm test` to execute all 52 tests:

- 5 unit-test suites (types, rng, table1, ilevel, eligibility, pick, special-cases, simulate, probability)
- 1 public-API smoke test (index)
- 1 guide-examples suite (§6, §7)
- 1 cross-check property test (exact ≈ Monte Carlo on random scenarios)
- 1 CLI integration suite

## License

MIT.

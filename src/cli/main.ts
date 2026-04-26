// src/cli/main.ts
import {
  probabilityExact, probabilityMonteCarlo, simulateBatch, SeededRng,
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
  | { command: 'simulate'; results: Array<{ baseFromItem: 1 | 2; prefixes: string[]; suffixes: string[] }> };

export async function runCli(jsonInput: string): Promise<CliOutput> {
  const input = JSON.parse(jsonInput) as CliInput;
  const seed = input.seed ?? Date.now();
  const rng = new SeededRng(seed);

  const allMods: Mod[] = [
    ...input.item1.prefixes, ...input.item1.suffixes,
    ...input.item2.prefixes, ...input.item2.suffixes,
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
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    runCli(input).then((out) => {
      process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    }).catch((err) => {
      process.stderr.write(`error: ${err.message}\n`);
      process.exit(1);
    });
  });
}

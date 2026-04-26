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

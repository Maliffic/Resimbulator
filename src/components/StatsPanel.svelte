<script lang="ts">
  import type { Item, RecombineResult } from '$lib/recombinator/index.js';
  import {
    SeededRng, simulateOnce, simulateBatch, allDesiredHit, expectedDistribution,
  } from '$lib/recombinator/index.js';
  import RecombineResultDialog from './RecombineResultDialog.svelte';
  import BatchSimDialog from './BatchSimDialog.svelte';
  import ExplainDialog from './ExplainDialog.svelte';

  type Props = {
    item1: Item | null;
    item2: Item | null;
    chance: number;
    chanceFromItem1: number;
    chanceFromItem2: number;
    desiredCount: number;
    batchTrials: number;
    costPerTry: number;
    onGenerate: () => void;
    onCostChange: (n: number) => void;
  };

  let { item1, item2, chance, chanceFromItem1, chanceFromItem2, desiredCount, batchTrials, costPerTry, onGenerate, onCostChange }: Props = $props();

  let result = $state<RecombineResult | null>(null);
  let batchData = $state<{
    prefixHistogram: number[];
    suffixHistogram: number[];
    desiredHits: number;
    total: number;
    expectedTries: number;
  } | null>(null);
  let explainOpen = $state(false);

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

  // Item-class compatibility — PoE recombination requires matching item classes (Boots+Boots, Rings+Rings, etc).
  const classMismatch = $derived(
    ready
    && !!item1?.itemClass && !!item2?.itemClass
    && item1.itemClass !== item2.itemClass,
  );
  const canRecombine = $derived(ready && !classMismatch);

  // Total prefix/suffix pool sizes — NNN/exclusive mods count too (per guide §5).
  const totalPrefixes = $derived((item1?.prefixes.length ?? 0) + (item2?.prefixes.length ?? 0));
  const totalSuffixes = $derived((item1?.suffixes.length ?? 0) + (item2?.suffixes.length ?? 0));
  const prefixDist = $derived(canRecombine && totalPrefixes <= 6 ? expectedDistribution(totalPrefixes) : null);
  const suffixDist = $derived(canRecombine && totalSuffixes <= 6 ? expectedDistribution(totalSuffixes) : null);
</script>

<div class="bg-poe-panel border border-poe-border rounded-md p-6 flex flex-col items-center justify-center text-center min-h-[400px] shadow-inner shadow-black/40">
  {#if ready && classMismatch}
    <div class="border border-poe-corrupted/60 bg-poe-corrupted/10 rounded p-4 max-w-xs">
      <div class="text-poe-corrupted text-2xl mb-2">⚠</div>
      <div class="text-[10px] uppercase tracking-[0.2em] text-poe-corrupted/80 mb-1">Incompatible bases</div>
      <div class="text-sm text-poe-text mb-1">
        Cannot recombine across item classes.
      </div>
      <div class="text-xs text-poe-dim">
        <span class="text-poe-text">{item1?.itemClass}</span>
        <span class="mx-2">vs</span>
        <span class="text-poe-text">{item2?.itemClass}</span>
      </div>
    </div>
  {:else if ready}
    <div class="text-[10px] uppercase tracking-[0.2em] text-poe-deepdim mb-1">Chance</div>
    <div class="text-5xl font-bold text-poe-rare drop-shadow-[0_0_4px_rgba(255,255,119,0.25)]">
      {(chance * 100).toFixed(1)}%
    </div>
    <div class="text-xs text-poe-dim mt-2 flex items-center gap-2">
      <span>{desiredCount === 0 ? 'no desired mods marked' : `${desiredCount} desired mod${desiredCount === 1 ? '' : 's'}`}</span>
      {#if canRecombine}
        <button
          class="text-poe-rare hover:text-poe-text underline decoration-dotted text-[11px]"
          onclick={() => (explainOpen = true)}
        >
          show breakdown
        </button>
      {/if}
    </div>

    {#if desiredCount > 0}
      <div class="mt-4 grid grid-cols-2 gap-2 w-full max-w-xs text-xs">
        <div class="bg-poe-bg border border-poe-border rounded p-2">
          <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">base ← item 1</div>
          <div class="text-lg font-semibold text-poe-text">{(chanceFromItem1 * 100).toFixed(1)}%</div>
        </div>
        <div class="bg-poe-bg border border-poe-border rounded p-2">
          <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">base ← item 2</div>
          <div class="text-lg font-semibold text-poe-text">{(chanceFromItem2 * 100).toFixed(1)}%</div>
        </div>
      </div>
    {/if}

    {#if desiredCount > 0 && chance > 0}
      <div class="mt-4 w-full max-w-xs text-xs">
        <div class="flex items-center justify-between gap-2 bg-poe-bg border border-poe-border rounded p-2">
          <label for="cost-input" class="text-[10px] uppercase tracking-wider text-poe-deepdim shrink-0">Cost / try</label>
          <input
            id="cost-input"
            type="number"
            min="0"
            step="0.1"
            value={costPerTry}
            onchange={(e) => onCostChange(Number((e.currentTarget as HTMLInputElement).value) || 0)}
            class="bg-poe-panel border border-poe-divider rounded px-2 py-0.5 text-poe-text w-16 text-right focus:outline-none focus:border-poe-rare/40"
            aria-label="Cost per recombine"
          />
          <span class="text-[10px] text-poe-deepdim">div</span>
          <span class="text-poe-deepdim">·</span>
          <span class="text-[10px] uppercase tracking-wider text-poe-deepdim shrink-0">Total</span>
          <span class="text-poe-rare font-semibold">~{(costPerTry / chance).toFixed(1)} div</span>
        </div>
      </div>
    {/if}

    {#if prefixDist || suffixDist}
      <div class="mt-6 w-full max-w-xs text-xs">
        <div class="text-[10px] uppercase tracking-[0.15em] text-poe-deepdim font-semibold mb-2 text-left">Expected affix counts</div>
        {#if prefixDist}
          <div class="mb-2">
            <div class="flex justify-between text-poe-dim mb-1 text-[11px]">
              <span>Prefixes</span>
              <span class="text-poe-deepdim">{totalPrefixes} in pool</span>
            </div>
            <div class="grid grid-cols-4 gap-1">
              {#each prefixDist as p, i}
                <div class="bg-poe-bg border border-poe-border rounded px-1 py-1 text-center {p > 0 ? 'text-poe-text' : 'text-poe-deepdim/60'}">
                  <div class="text-[10px] text-poe-deepdim">{i}p</div>
                  <div class="text-xs font-semibold">{(p * 100).toFixed(0)}%</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if suffixDist}
          <div>
            <div class="flex justify-between text-poe-dim mb-1 text-[11px]">
              <span>Suffixes</span>
              <span class="text-poe-deepdim">{totalSuffixes} in pool</span>
            </div>
            <div class="grid grid-cols-4 gap-1">
              {#each suffixDist as s, i}
                <div class="bg-poe-bg border border-poe-border rounded px-1 py-1 text-center {s > 0 ? 'text-poe-text' : 'text-poe-deepdim/60'}">
                  <div class="text-[10px] text-poe-deepdim">{i}s</div>
                  <div class="text-xs font-semibold">{(s * 100).toFixed(0)}%</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="mt-6 flex flex-col gap-2 w-full max-w-xs">
      <button
        class="bg-poe-border hover:bg-[#4d4030] disabled:bg-poe-panel disabled:text-poe-deepdim disabled:cursor-not-allowed text-poe-rare rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide transition"
        onclick={recombineOnce}
        disabled={!canRecombine}
      >
        Recombine once
      </button>
      <button
        class="bg-poe-bg border border-poe-border hover:bg-poe-border/50 disabled:bg-poe-panel disabled:text-poe-deepdim disabled:border-poe-divider disabled:cursor-not-allowed text-poe-text rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide transition"
        onclick={recombineBatch}
        disabled={!canRecombine}
      >
        Run {batchTrials.toLocaleString()}×
      </button>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-3">
      <div class="text-poe-dim text-sm">Paste items in both panels to see chance.</div>
      <div class="text-poe-deepdim text-[11px] uppercase tracking-[0.15em]">or</div>
      <button
        class="bg-poe-border hover:bg-[#4d4030] text-poe-rare rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide transition"
        onclick={onGenerate}
      >
        Generate random pair
      </button>
      <div class="text-[11px] text-poe-deepdim max-w-[14rem]">
        Two random items of the same class, with real mods sampled from the database.
      </div>
    </div>
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

{#if explainOpen && item1 && item2}
  <ExplainDialog
    {item1}
    {item2}
    desired={[...item1.prefixes, ...item1.suffixes, ...item2.prefixes, ...item2.suffixes].filter((m) => m.desired === true)}
    onClose={() => (explainOpen = false)}
  />
{/if}

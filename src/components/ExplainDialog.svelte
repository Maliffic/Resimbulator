<script lang="ts">
  import type { Item, Mod, Explanation, PoolMod } from '$lib/recombinator/index.js';
  import { explainScenario } from '$lib/recombinator/index.js';

  type Props = {
    item1: Item;
    item2: Item;
    desired: Mod[];
    onClose: () => void;
  };

  let { item1, item2, desired, onClose }: Props = $props();

  const e: Explanation = $derived(explainScenario(item1, item2, desired));
  const desiredIds = $derived(new Set(desired.map((m) => m.id)));

  function pct(n: number): string {
    return `${(n * 100).toFixed(1)}%`;
  }
  function pctTight(n: number): string {
    return `${Math.round(n * 100)}%`;
  }

  function rowBg(pm: PoolMod): string {
    const desiredHit = desiredIds.has(pm.mod.id);
    if (desiredHit) return 'bg-poe-rare/10 border-poe-rare/30';
    return 'bg-poe-bg border-poe-divider';
  }
</script>

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
  onclick={onClose}
  onkeydown={(ev) => { if (ev.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1">
  <div class="bg-poe-panel border border-poe-border rounded-md p-5 max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-2xl shadow-black/60"
    onclick={(ev) => ev.stopPropagation()}
    role="presentation">
    <div class="flex items-baseline justify-between border-b border-poe-border pb-2 mb-4">
      <div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-poe-deepdim">Breakdown</div>
        <div class="text-base font-semibold text-poe-rare">Why is the chance {pct(e.weighted)}?</div>
      </div>
      <button class="text-poe-deepdim hover:text-poe-text text-xl leading-none" onclick={onClose} aria-label="close">×</button>
    </div>

    <!-- Step 1: base pick -->
    <section class="mb-5">
      <div class="text-poe-rare font-semibold uppercase tracking-wide text-xs mb-2">1 · Pick the base (50/50)</div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-poe-bg border border-poe-border rounded p-2">
          <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">Base ← item 1</div>
          <div class="text-sm text-poe-text">{e.base1.base}</div>
          <div class="text-poe-dim mt-0.5">
            {e.base1.attributeBase}
            {#if e.base1.defenceTags.length > 0} · {e.base1.defenceTags.join('+')}{/if}
            {#if e.base1.influence} · <span class="text-poe-magic/80">{e.base1.influence}</span>{/if}
          </div>
        </div>
        <div class="bg-poe-bg border border-poe-border rounded p-2">
          <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">Base ← item 2</div>
          <div class="text-sm text-poe-text">{e.base2.base}</div>
          <div class="text-poe-dim mt-0.5">
            {e.base2.attributeBase}
            {#if e.base2.defenceTags.length > 0} · {e.base2.defenceTags.join('+')}{/if}
            {#if e.base2.influence} · <span class="text-poe-magic/80">{e.base2.influence}</span>{/if}
          </div>
        </div>
      </div>
    </section>

    <!-- Step 2: mod pool + eligibility -->
    <section class="mb-5">
      <div class="text-poe-rare font-semibold uppercase tracking-wide text-xs mb-2">
        2 · Combine mod pools, filter by eligibility
      </div>

      {#snippet poolSection(label: string, pool: PoolMod[])}
        <div class="mb-3">
          <div class="flex items-baseline justify-between px-1 mb-1">
            <span class="text-[11px] uppercase tracking-wider text-poe-deepdim">{label}</span>
            <span class="text-[11px] text-poe-deepdim">{pool.length} in pool</span>
          </div>
          {#if pool.length === 0}
            <div class="text-xs text-poe-deepdim italic px-2 py-1">— empty —</div>
          {:else}
            <div class="space-y-1">
              {#each pool as pm (pm.mod.id)}
                <div class="border rounded px-2 py-1.5 text-xs flex items-start gap-2 {rowBg(pm)}">
                  <span class="text-[10px] text-poe-deepdim shrink-0 mt-0.5 font-mono">i{pm.sourceItem}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-poe-text leading-tight flex items-center gap-1.5">
                      {pm.mod.name || '(unnamed)'}
                      {#if desiredIds.has(pm.mod.id)}
                        <span class="text-[9px] uppercase tracking-wider text-poe-rare">★ desired</span>
                      {/if}
                    </div>
                    <div class="text-poe-dim text-[11px] leading-snug truncate">{pm.mod.statText}</div>
                  </div>
                  <div class="flex flex-col items-end gap-0.5 shrink-0 text-[10px]">
                    <div class="flex items-center gap-1">
                      <span class="text-poe-deepdim">b1</span>
                      {#if pm.eligibleFromBase1}
                        <span class="text-emerald-500">✓</span>
                      {:else}
                        <span class="text-poe-corrupted" title={pm.reasonBase1 ?? 'not eligible'}>✗</span>
                      {/if}
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-poe-deepdim">b2</span>
                      {#if pm.eligibleFromBase2}
                        <span class="text-emerald-500">✓</span>
                      {:else}
                        <span class="text-poe-corrupted" title={pm.reasonBase2 ?? 'not eligible'}>✗</span>
                      {/if}
                    </div>
                  </div>
                </div>
                {#if (!pm.eligibleFromBase1 && pm.reasonBase1) || (!pm.eligibleFromBase2 && pm.reasonBase2)}
                  <div class="text-[10px] text-poe-corrupted/80 px-2 -mt-0.5">
                    {#if !pm.eligibleFromBase1 && pm.reasonBase1}
                      <span class="text-poe-deepdim">b1:</span> {pm.reasonBase1}
                    {/if}
                    {#if (!pm.eligibleFromBase1 && pm.reasonBase1) && (!pm.eligibleFromBase2 && pm.reasonBase2)}
                      <span class="mx-1 text-poe-deepdim">·</span>
                    {/if}
                    {#if !pm.eligibleFromBase2 && pm.reasonBase2}
                      <span class="text-poe-deepdim">b2:</span> {pm.reasonBase2}
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/snippet}

      {@render poolSection('Prefix pool', e.prefixPool)}
      {@render poolSection('Suffix pool', e.suffixPool)}
    </section>

    <!-- Step 3: Table 1 -->
    <section class="mb-5">
      <div class="text-poe-rare font-semibold uppercase tracking-wide text-xs mb-2">
        3 · Sample final affix counts (Table 1)
      </div>
      <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div class="text-[11px] text-poe-dim mb-1">Prefix pool size = {e.prefixPool.length}</div>
          <div class="grid grid-cols-4 gap-1">
            {#each e.prefixDistribution as p, i}
              <div class="bg-poe-bg border border-poe-border rounded px-1 py-1 text-center {p > 0 ? 'text-poe-text' : 'text-poe-deepdim/60'}">
                <div class="text-[10px] text-poe-deepdim">{i}p</div>
                <div class="text-xs font-semibold">{pctTight(p)}</div>
              </div>
            {/each}
          </div>
        </div>
        <div>
          <div class="text-[11px] text-poe-dim mb-1">Suffix pool size = {e.suffixPool.length}</div>
          <div class="grid grid-cols-4 gap-1">
            {#each e.suffixDistribution as s, i}
              <div class="bg-poe-bg border border-poe-border rounded px-1 py-1 text-center {s > 0 ? 'text-poe-text' : 'text-poe-deepdim/60'}">
                <div class="text-[10px] text-poe-deepdim">{i}s</div>
                <div class="text-xs font-semibold">{pctTight(s)}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- Step 4: per-base contribution -->
    <section>
      <div class="text-poe-rare font-semibold uppercase tracking-wide text-xs mb-2">
        4 · Hit chance, per base
      </div>
      {#if e.desiredCount === 0}
        <div class="text-poe-dim text-xs">
          No desired mods marked, so the chance is 100% by definition.
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-2 text-xs mb-3">
          <div class="bg-poe-bg border border-poe-border rounded p-2">
            <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">Conditional · base ← item 1</div>
            <div class="text-lg font-semibold text-poe-text">{pct(e.fromBase1)}</div>
            <div class="text-[10px] text-poe-deepdim">P(all desired hit | base from item 1)</div>
          </div>
          <div class="bg-poe-bg border border-poe-border rounded p-2">
            <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">Conditional · base ← item 2</div>
            <div class="text-lg font-semibold text-poe-text">{pct(e.fromBase2)}</div>
            <div class="text-[10px] text-poe-deepdim">P(all desired hit | base from item 2)</div>
          </div>
        </div>
        <div class="bg-poe-bg border border-poe-rare/30 rounded p-3 text-xs">
          <div class="text-[10px] uppercase tracking-wider text-poe-deepdim mb-1">Weighted total</div>
          <div class="text-poe-text">
            0.5 × {pct(e.fromBase1)} + 0.5 × {pct(e.fromBase2)} =
            <span class="text-lg font-semibold text-poe-rare ml-1">{pct(e.weighted)}</span>
          </div>
        </div>
      {/if}
    </section>
  </div>
</div>

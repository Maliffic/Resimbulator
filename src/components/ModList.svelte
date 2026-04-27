<script lang="ts">
  import type { Item } from '$lib/recombinator/index.js';
  import ModRow from './ModRow.svelte';

  type Props = {
    item: Item;
    onToggleDesired: (modId: string) => void;
  };

  let { item, onToggleDesired }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  {#if item.implicits.length > 0}
    <div class="flex flex-col gap-0.5">
      {#each item.implicits as mod (mod.id)}
        <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
      {/each}
    </div>
    <div class="border-t border-poe-divider my-1"></div>
  {/if}

  <div class="flex items-baseline justify-between px-1 mb-0.5">
    <span class="text-[10px] uppercase tracking-[0.15em] text-poe-deepdim">Prefixes</span>
    <span class="text-[10px] text-poe-deepdim">{item.prefixes.length}/3</span>
  </div>
  <div class="flex flex-col gap-0.5">
    {#each item.prefixes as mod (mod.id)}
      <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
    {/each}
    {#if item.prefixes.length === 0}
      <div class="text-xs text-poe-deepdim italic px-2 py-1">— no prefixes —</div>
    {/if}
  </div>

  <div class="border-t border-poe-divider my-1"></div>

  <div class="flex items-baseline justify-between px-1 mb-0.5">
    <span class="text-[10px] uppercase tracking-[0.15em] text-poe-deepdim">Suffixes</span>
    <span class="text-[10px] text-poe-deepdim">{item.suffixes.length}/3</span>
  </div>
  <div class="flex flex-col gap-0.5">
    {#each item.suffixes as mod (mod.id)}
      <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
    {/each}
    {#if item.suffixes.length === 0}
      <div class="text-xs text-poe-deepdim italic px-2 py-1">— no suffixes —</div>
    {/if}
  </div>
</div>

<script lang="ts">
  import type { Item } from '$lib/recombinator/index.js';
  import type { ModDb } from '$lib/mods/index.js';
  import { parse as parseClipboard } from '$lib/poe-clipboard/index.js';
  import { translate } from '$lib/mods/index.js';
  import ModList from './ModList.svelte';

  type Props = {
    item: Item | null;
    modDb: ModDb;
    label: string;
    onItemChange: (item: Item | null) => void;
    onToggleDesired: (modId: string) => void;
  };

  let { item, modDb, label, onItemChange, onToggleDesired }: Props = $props();
  let pasteText = $state('');
  let parseError = $state<string | null>(null);

  function handlePaste() {
    parseError = null;
    if (!pasteText.trim()) return;
    try {
      const parsed = parseClipboard(pasteText);
      const translated = translate(parsed, modDb);
      onItemChange(translated);
      pasteText = '';
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Failed to parse';
    }
  }

  function handleRepaste() {
    onItemChange(null);
  }
</script>

<div class="bg-poe-panel border border-poe-border rounded-md p-4 flex flex-col h-full min-h-[400px] shadow-inner shadow-black/40">
  <div class="flex items-center justify-between mb-2">
    <h2 class="text-[11px] font-semibold uppercase tracking-[0.2em] text-poe-deepdim">{label}</h2>
    {#if item}
      <button class="text-xs text-poe-dim hover:text-poe-text transition-colors" onclick={handleRepaste}>
        Repaste
      </button>
    {/if}
  </div>

  {#if item}
    <div class="border-b border-poe-border pb-2 mb-2 text-center">
      <div class="text-base font-semibold text-poe-rare drop-shadow-[0_0_2px_rgba(255,255,119,0.25)]">{item.base}</div>
      <div class="text-[11px] text-poe-deepdim mt-0.5">
        ilvl <span class="text-poe-text/70">{item.itemLevel}</span>
        {#if item.influence}<span class="mx-1">·</span><span class="text-poe-magic/80">{item.influence}</span>{/if}
        {#if item.corrupted}<span class="mx-1">·</span><span class="text-poe-corrupted">corrupted</span>{/if}
        {#if item.synthesised}<span class="mx-1">·</span><span class="text-poe-magic/80">synthesised</span>{/if}
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <ModList {item} {onToggleDesired} />
    </div>
  {:else}
    <div class="flex-1 flex flex-col gap-2">
      <textarea
        bind:value={pasteText}
        placeholder="Paste an item from PoE (Ctrl+C in-game)"
        class="flex-1 bg-poe-bg border border-poe-border rounded p-3 text-sm text-poe-text font-mono resize-none focus:outline-none focus:border-poe-rare/60"
      ></textarea>
      <button
        class="bg-poe-border hover:bg-[#4d4030] disabled:bg-poe-panel disabled:text-poe-deepdim text-poe-rare rounded px-4 py-2 text-sm font-semibold tracking-wide transition uppercase"
        onclick={handlePaste}
        disabled={!pasteText.trim()}
      >
        Parse item
      </button>
      {#if parseError}
        <div class="text-xs text-poe-corrupted">{parseError}</div>
      {/if}
    </div>
  {/if}
</div>

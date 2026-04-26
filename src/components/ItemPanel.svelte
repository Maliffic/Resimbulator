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

<div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col h-full min-h-[400px]">
  <div class="flex items-center justify-between mb-3">
    <h2 class="text-sm font-semibold text-gray-300">{label}</h2>
    {#if item}
      <button class="text-xs text-gray-500 hover:text-gray-300" onclick={handleRepaste}>
        Repaste
      </button>
    {/if}
  </div>

  {#if item}
    <div class="border-b border-gray-800 pb-3 mb-3">
      <div class="text-base font-semibold text-yellow-500">{item.base}</div>
      <div class="text-xs text-gray-500">
        ilvl {item.itemLevel}
        {#if item.influence}· {item.influence}{/if}
        {#if item.corrupted}· corrupted{/if}
        {#if item.synthesised}· synthesised{/if}
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
        class="flex-1 bg-gray-950 border border-gray-800 rounded p-3 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-emerald-700"
      ></textarea>
      <button
        class="bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-500 rounded px-4 py-2 text-sm font-semibold transition"
        onclick={handlePaste}
        disabled={!pasteText.trim()}
      >
        Parse item
      </button>
      {#if parseError}
        <div class="text-xs text-red-400">{parseError}</div>
      {/if}
    </div>
  {/if}
</div>

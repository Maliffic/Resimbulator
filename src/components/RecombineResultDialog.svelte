<script lang="ts">
  import type { RecombineResult } from '$lib/recombinator/index.js';
  import ModRow from './ModRow.svelte';

  type Props = {
    result: RecombineResult;
    onClose: () => void;
    onAgain: () => void;
  };
  let { result, onClose, onAgain }: Props = $props();
</script>

<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1">
  <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full" onclick={(e) => e.stopPropagation()}
    role="presentation">
    <h2 class="text-lg font-semibold mb-3">Recombined item</h2>
    <div class="text-sm text-gray-400 mb-3">
      Base from item {result.baseFromItem} · ilvl {result.itemLevel}
    </div>
    <div class="space-y-1 max-h-72 overflow-y-auto mb-4">
      {#each result.prefixes as mod (mod.id)}
        <ModRow {mod} onToggleDesired={() => {}} />
      {/each}
      {#each result.suffixes as mod (mod.id)}
        <ModRow {mod} onToggleDesired={() => {}} />
      {/each}
      {#if result.prefixes.length === 0 && result.suffixes.length === 0}
        <div class="text-xs text-gray-500 italic">No mods landed (white outcome).</div>
      {/if}
    </div>
    <div class="flex gap-2">
      <button class="flex-1 bg-emerald-700 hover:bg-emerald-600 rounded px-4 py-2 text-sm" onclick={onAgain}>
        Recombine again
      </button>
      <button class="bg-gray-800 hover:bg-gray-700 rounded px-4 py-2 text-sm" onclick={onClose}>
        Close
      </button>
    </div>
  </div>
</div>

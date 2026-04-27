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

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1">
  <div class="bg-poe-panel border border-poe-border rounded-md p-6 max-w-md w-full shadow-2xl shadow-black/60" onclick={(e) => e.stopPropagation()}
    role="presentation">
    <div class="text-[10px] uppercase tracking-[0.2em] text-poe-deepdim mb-1">Recombined item</div>
    <div class="text-center border-b border-poe-border pb-2 mb-3">
      <div class="text-base font-semibold text-poe-rare drop-shadow-[0_0_2px_rgba(255,255,119,0.25)]">{result.baseContext.base}</div>
      <div class="text-[11px] text-poe-deepdim mt-0.5">
        base ← item {result.baseFromItem} · ilvl <span class="text-poe-text/70">{result.itemLevel}</span>
      </div>
    </div>
    <div class="space-y-0.5 max-h-72 overflow-y-auto mb-4">
      {#if result.prefixes.length > 0}
        <div class="text-[10px] uppercase tracking-[0.15em] text-poe-deepdim px-1 mb-0.5">Prefixes</div>
        {#each result.prefixes as mod (mod.id)}
          <ModRow {mod} onToggleDesired={() => {}} />
        {/each}
      {/if}
      {#if result.prefixes.length > 0 && result.suffixes.length > 0}
        <div class="border-t border-poe-divider my-2"></div>
      {/if}
      {#if result.suffixes.length > 0}
        <div class="text-[10px] uppercase tracking-[0.15em] text-poe-deepdim px-1 mb-0.5">Suffixes</div>
        {#each result.suffixes as mod (mod.id)}
          <ModRow {mod} onToggleDesired={() => {}} />
        {/each}
      {/if}
      {#if result.prefixes.length === 0 && result.suffixes.length === 0}
        <div class="text-xs text-poe-dim italic text-center py-4">No mods landed (white outcome).</div>
      {/if}
    </div>
    <div class="flex gap-2">
      <button class="flex-1 bg-poe-border hover:bg-[#4d4030] text-poe-rare rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide transition" onclick={onAgain}>
        Recombine again
      </button>
      <button class="bg-poe-bg border border-poe-border hover:bg-poe-border/50 text-poe-text rounded px-4 py-2 text-sm uppercase tracking-wide transition" onclick={onClose}>
        Close
      </button>
    </div>
  </div>
</div>

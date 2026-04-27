<script lang="ts">
  import BatchSimChart from './BatchSimChart.svelte';

  type Props = {
    prefixHistogram: number[];
    suffixHistogram: number[];
    desiredHits: number;
    total: number;
    expectedTries: number;
    onClose: () => void;
  };
  let { prefixHistogram, suffixHistogram, desiredHits, total, expectedTries, onClose }: Props = $props();

  const hitRate = total > 0 ? (desiredHits / total) * 100 : 0;
</script>

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1">
  <div class="bg-poe-panel border border-poe-border rounded-md p-6 max-w-2xl w-full shadow-2xl shadow-black/60" onclick={(e) => e.stopPropagation()}
    role="presentation">
    <div class="text-[10px] uppercase tracking-[0.2em] text-poe-deepdim mb-1">Batch simulation</div>
    <h2 class="text-base font-semibold text-poe-rare mb-4">{total.toLocaleString()} trials</h2>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-poe-bg border border-poe-border rounded p-3">
        <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">Hit your target</div>
        <div class="text-2xl font-semibold text-poe-text">{desiredHits.toLocaleString()} / {total.toLocaleString()}</div>
        <div class="text-xs text-poe-rare">{hitRate.toFixed(2)}%</div>
      </div>
      <div class="bg-poe-bg border border-poe-border rounded p-3">
        <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">Expected attempts to hit once</div>
        <div class="text-2xl font-semibold text-poe-text">{Number.isFinite(expectedTries) ? `~${expectedTries.toFixed(1)}` : '∞'}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <BatchSimChart counts={prefixHistogram} {total} label="Prefix count distribution" />
      <BatchSimChart counts={suffixHistogram} {total} label="Suffix count distribution" />
    </div>

    <div class="flex justify-end">
      <button class="bg-poe-bg border border-poe-border hover:bg-poe-border/50 text-poe-text rounded px-4 py-2 text-sm uppercase tracking-wide transition" onclick={onClose}>Close</button>
    </div>
  </div>
</div>

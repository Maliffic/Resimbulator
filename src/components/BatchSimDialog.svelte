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

<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1">
  <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full" onclick={(e) => e.stopPropagation()}
    role="presentation">
    <h2 class="text-lg font-semibold mb-3">Batch simulation ({total.toLocaleString()} trials)</h2>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="bg-gray-950 border border-gray-800 rounded p-3">
        <div class="text-xs text-gray-500">Hit your target</div>
        <div class="text-2xl font-semibold">{desiredHits.toLocaleString()} / {total.toLocaleString()}</div>
        <div class="text-xs text-gray-400">{hitRate.toFixed(2)}%</div>
      </div>
      <div class="bg-gray-950 border border-gray-800 rounded p-3">
        <div class="text-xs text-gray-500">Expected attempts to hit once</div>
        <div class="text-2xl font-semibold">{Number.isFinite(expectedTries) ? `~${expectedTries.toFixed(1)}` : '∞'}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <BatchSimChart counts={prefixHistogram} {total} label="Prefix count distribution" />
      <BatchSimChart counts={suffixHistogram} {total} label="Suffix count distribution" />
    </div>

    <div class="flex justify-end">
      <button class="bg-gray-800 hover:bg-gray-700 rounded px-4 py-2 text-sm" onclick={onClose}>Close</button>
    </div>
  </div>
</div>

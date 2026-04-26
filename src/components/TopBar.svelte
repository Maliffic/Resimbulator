<script lang="ts">
  type Props = {
    onShare: () => void;
    onReset: () => void;
  };
  let { onShare, onReset }: Props = $props();

  let copyConfirm = $state(false);

  function handleShare() {
    onShare();
    copyConfirm = true;
    setTimeout(() => { copyConfirm = false; }, 2000);
  }
</script>

<header class="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
  <div class="font-semibold text-lg">
    <span class="text-emerald-400">Resimbulator</span>
    <span class="text-xs text-gray-500 ml-2">PoE 3.25 Recombinator simulator</span>
  </div>
  <div class="flex gap-2">
    <button class="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded" onclick={handleShare}>
      {copyConfirm ? 'Copied!' : 'Share scenario'}
    </button>
    <button class="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded" onclick={onReset}>
      Reset
    </button>
  </div>
</header>

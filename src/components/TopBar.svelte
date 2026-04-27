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

<header class="bg-poe-panel border-b border-poe-border px-6 py-3 flex items-center justify-between">
  <div class="flex items-baseline gap-3">
    <span class="font-semibold text-lg text-poe-fractured drop-shadow-[0_0_3px_rgba(255,255,119,0.25)] uppercase tracking-wide">Resimbinator </span>
    <span class="text-[10px] uppercase tracking-[0.2em] text-poe-deepdim">PoE Recombinator Simulator</span>
  </div>
  <div class="flex gap-2">
    <button class="text-xs text-poe-text hover:text-poe-rare px-3 py-1.5 bg-poe-bg border border-poe-border hover:border-poe-rare/40 rounded uppercase tracking-wide transition-colors" onclick={handleShare}>
      {copyConfirm ? 'Copied!' : 'Share scenario'}
    </button>
    <button class="text-xs text-poe-text hover:text-poe-rare px-3 py-1.5 bg-poe-bg border border-poe-border hover:border-poe-rare/40 rounded uppercase tracking-wide transition-colors" onclick={onReset}>
      Reset
    </button>
  </div>
</header>

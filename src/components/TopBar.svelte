<script lang="ts">
  type Props = {
    onShare: () => void;
    onReset: () => void;
    onHelp: () => void;
  };
  let { onShare, onReset, onHelp }: Props = $props();

  let copyConfirm = $state(false);

  function handleShare() {
    onShare();
    copyConfirm = true;
    setTimeout(() => { copyConfirm = false; }, 2000);
  }
</script>

<header class="bg-poe-panel border-b border-poe-border px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
  <div class="flex items-baseline gap-3 min-w-0 flex-shrink">
    <span class="font-semibold text-base sm:text-lg text-poe-fractured drop-shadow-[0_0_3px_rgba(255,255,119,0.25)] uppercase tracking-wide truncate">Resimbinator </span>
    <span class="hidden md:inline text-[10px] uppercase tracking-[0.2em] text-poe-deepdim whitespace-nowrap">PoE Recombinator Simulator</span>
  </div>
  <div class="flex gap-1.5 sm:gap-2 shrink-0">
    <button class="text-xs text-poe-text hover:text-poe-rare px-2.5 sm:px-3 py-1.5 bg-poe-bg border border-poe-border hover:border-poe-rare/40 rounded uppercase tracking-wide transition-colors whitespace-nowrap" onclick={handleShare}>
      {#if copyConfirm}Copied!{:else}<span class="sm:hidden">Share</span><span class="hidden sm:inline">Share scenario</span>{/if}
    </button>
    <button class="text-xs text-poe-text hover:text-poe-rare px-2.5 sm:px-3 py-1.5 bg-poe-bg border border-poe-border hover:border-poe-rare/40 rounded uppercase tracking-wide transition-colors" onclick={onReset}>
      Reset
    </button>
    <button class="text-xs text-poe-text hover:text-poe-rare w-8 h-[30px] bg-poe-bg border border-poe-border hover:border-poe-rare/40 rounded font-semibold transition-colors shrink-0" onclick={onHelp} title="Mod categories &amp; recombinator rules" aria-label="Help">
      ?
    </button>
  </div>
</header>

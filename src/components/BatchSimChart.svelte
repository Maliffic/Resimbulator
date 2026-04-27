<script lang="ts">
  type Props = { counts: number[]; total: number; label: string };
  let { counts, total, label }: Props = $props();
  const max = Math.max(...counts, 1);
</script>

<div class="space-y-2">
  <div class="text-[10px] uppercase tracking-wider text-poe-deepdim">{label}</div>
  <div class="flex items-end gap-2 h-32 bg-poe-bg border border-poe-border rounded p-2">
    {#each counts as count, i}
      <div class="flex-1 flex flex-col items-center gap-1">
        <div
          class="w-full bg-poe-rare/70 rounded-t"
          style="height: {(count / max) * 100}%"
        ></div>
        <div class="text-[11px] text-poe-text">{count}</div>
        <div class="text-[10px] text-poe-deepdim">{i}</div>
      </div>
    {/each}
  </div>
  <div class="text-[10px] text-poe-deepdim">total: {total}</div>
</div>

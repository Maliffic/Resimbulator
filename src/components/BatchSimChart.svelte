<script lang="ts">
  type Props = { counts: number[]; total: number; label: string };
  let { counts, total, label }: Props = $props();
  const max = Math.max(...counts, 1);
</script>

<div class="space-y-2">
  <div class="text-xs text-gray-400">{label}</div>
  <div class="flex items-end gap-2 h-32">
    {#each counts as count, i}
      <div class="flex-1 flex flex-col items-center gap-1">
        <div
          class="w-full bg-emerald-600 rounded-t"
          style="height: {(count / max) * 100}%"
        ></div>
        <div class="text-xs text-gray-300">{count}</div>
        <div class="text-xs text-gray-500">{i}</div>
      </div>
    {/each}
  </div>
  <div class="text-xs text-gray-500">total: {total}</div>
</div>

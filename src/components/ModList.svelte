<script lang="ts">
  import type { Item } from '$lib/recombinator/index.js';
  import ModRow from './ModRow.svelte';

  type Props = {
    item: Item;
    onToggleDesired: (modId: string) => void;
  };

  let { item, onToggleDesired }: Props = $props();
</script>

<div class="space-y-1">
  {#each item.implicits as mod (mod.id)}
    <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
  {/each}
  {#each item.prefixes as mod (mod.id)}
    <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
  {/each}
  {#each item.suffixes as mod (mod.id)}
    <ModRow {mod} onToggleDesired={() => onToggleDesired(mod.id)} />
  {/each}
</div>

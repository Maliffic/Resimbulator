<script lang="ts">
  import type { Mod } from '$lib/recombinator/index.js';

  type Props = {
    mod: Mod;
    onToggleDesired: () => void;
  };

  let { mod, onToggleDesired }: Props = $props();

  const chipColor = (cat: Mod['category']): string => {
    if (cat === 'Implicit') return 'bg-chip-implicit';
    if (cat === 'Fractured') return 'bg-chip-fractured';
    if (cat.startsWith('NNN_')) return 'bg-chip-nnn';
    if (cat.startsWith('Exclusive')) return 'bg-chip-exclusive';
    return 'bg-chip-regular';
  };

  const chipLabel = (cat: Mod['category']): string => {
    if (cat === 'RegularExplicit') return 'Regular';
    if (cat === 'Implicit') return 'Implicit';
    if (cat === 'Fractured') return 'Fractured';
    if (cat.startsWith('NNN_')) return cat.slice(4);
    if (cat.startsWith('Exclusive')) return cat.slice(9);
    return cat;
  };
</script>

<div class="flex items-start gap-2 p-2 rounded hover:bg-gray-800/50">
  <span class="text-xs px-1.5 py-0.5 rounded {chipColor(mod.category)} text-white shrink-0 mt-1">
    {chipLabel(mod.category)}
  </span>
  <span class="text-xs text-gray-400 shrink-0 mt-1.5">
    {mod.affix === 'prefix' ? 'P' : mod.affix === 'suffix' ? 'S' : 'I'}{mod.tier ? ` T${mod.tier}` : ''}
  </span>
  <div class="flex-1 min-w-0">
    {#if mod.name}
      <div class="text-xs italic text-gray-500">{mod.name}</div>
    {/if}
    <div class="text-sm text-gray-100 break-words">{mod.statText}</div>
  </div>
  {#if mod.affix !== 'implicit'}
    <label class="shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={mod.desired === true}
        onchange={onToggleDesired}
        class="w-4 h-4 accent-emerald-500"
      />
    </label>
  {/if}
</div>

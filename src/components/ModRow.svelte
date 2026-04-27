<script lang="ts">
  import type { Mod } from '$lib/recombinator/index.js';

  type Props = {
    mod: Mod;
    onToggleDesired: () => void;
    onDelete?: () => void;
  };

  let { mod, onToggleDesired, onDelete }: Props = $props();

  const chipColor = (cat: Mod['category']): string => {
    if (cat === 'Implicit') return 'bg-chip-implicit';
    if (cat === 'Fractured') return 'bg-chip-fractured';
    if (cat.startsWith('NNN_')) return 'bg-chip-nnn';
    if (cat.startsWith('Exclusive')) return 'bg-chip-exclusive';
    return 'bg-chip-regular';
  };

  // PoE-accurate stat-text colors per mod category.
  const textColor = (cat: Mod['category']): string => {
    if (cat === 'Implicit') return 'text-poe-implicit';
    if (cat === 'Fractured') return 'text-poe-fractured';
    if (cat === 'ExclusiveCrafted' || cat === 'ExclusiveVeiled') return 'text-poe-crafted';
    return 'text-poe-magic';
  };

  const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

  const chipLabel = (m: Mod): string => {
    const cat = m.category;
    if (cat === 'RegularExplicit') return 'Regular';
    if (cat === 'Implicit') return 'Implicit';
    if (cat === 'Fractured') return 'Fractured';
    if (cat === 'NNN_Influenced' && m.requiresInfluence) {
      return `NNN: ${titleCase(m.requiresInfluence)}`;
    }
    if (cat === 'NNN_Defence' && m.requiresDefenceTag) {
      const map: Record<string, string> = {
        armour: 'Armour', evasion: 'Evasion', energy_shield: 'ES',
      };
      return `NNN: ${map[m.requiresDefenceTag] ?? m.requiresDefenceTag}`;
    }
    if (cat === 'NNN_Attribute' && m.allowedAttributeBases) {
      return `NNN: ${m.allowedAttributeBases.map((a) => a.toUpperCase()).join('/')}`;
    }
    if (cat.startsWith('NNN_')) return cat.slice(4);
    if (cat.startsWith('Exclusive')) return cat.slice(9);
    return cat;
  };

  // Colorize numeric values in stat text PoE-style: augmented numbers get the magic-blue tint.
  // The clipboard format puts current values like "105(100-109)%" — show that whole token in blue.
  const colorizeStatText = (text: string): string =>
    text.replace(
      /(\d+(?:\.\d+)?(?:\([^)]*\))?%?)/g,
      `<span class="text-poe-augmented">$1</span>`,
    );

  // Left-edge accent bar — communicates category at a glance. NNN/exclusive/fractured get colored
  // accents because those are the gameplay-relevant categories that affect transfer eligibility.
  const accentBorder = (cat: Mod['category']): string => {
    if (cat === 'Fractured') return 'border-l-chip-fractured';
    if (cat.startsWith('NNN_')) return 'border-l-amber-600';
    if (cat === 'ExclusiveCrafted' || cat === 'ExclusiveVeiled') return 'border-l-poe-crafted';
    if (cat.startsWith('Exclusive')) return 'border-l-red-700';
    return 'border-l-transparent';
  };

  // Tooltip explaining the NNN constraint, shown on hover.
  const nnnTooltip = (m: Mod): string | undefined => {
    if (m.category === 'NNN_Defence' && m.requiresDefenceTag) {
      return `Locked to bases with ${m.requiresDefenceTag.replace('_', ' ')} — won't transfer otherwise.`;
    }
    if (m.category === 'NNN_Attribute' && m.allowedAttributeBases) {
      return `Locked to ${m.allowedAttributeBases.join('/')} bases — won't transfer to other attributes.`;
    }
    if (m.category === 'NNN_Influenced' && m.requiresInfluence) {
      return `Requires ${m.requiresInfluence} influence — won't transfer to non-influenced base.`;
    }
    return undefined;
  };

  const exclusiveTooltip = (cat: Mod['category']): string | undefined => {
    const labels: Partial<Record<Mod['category'], string>> = {
      ExclusiveCrafted: 'Crafted',
      ExclusiveVeiled: 'Veiled',
      ExclusiveEssence: 'Essence (untiered)',
      ExclusiveBreach: 'Breach (drop-only)',
      ExclusiveIncursion: 'Incursion',
      ExclusiveBeastAspect: 'Beast aspect',
      ExclusiveDelve: 'Delve (drop-only)',
      ExclusiveElevated: 'Elevated influence',
    };
    const label = labels[cat];
    if (!label) return undefined;
    return `${label} — exclusive mod. Only one exclusive can survive recombination across both items combined.`;
  };

  const tooltip = $derived(nnnTooltip(mod) ?? exclusiveTooltip(mod.category) ?? (mod.category === 'Fractured' ? 'Fractured — only travels if its host item is picked as the base.' : undefined));
  const isNNN = $derived(mod.category.startsWith('NNN_'));
  const isDesired = $derived(mod.desired === true);
</script>

<div
  class="group flex items-start gap-2 px-2 py-1.5 rounded border-l-[3px] {accentBorder(mod.category)} transition-colors
    {isDesired
      ? 'bg-poe-rare/10 ring-1 ring-poe-rare/40'
      : isNNN
        ? 'bg-amber-900/10 hover:bg-amber-900/20'
        : 'hover:bg-black/40'}"
  title={tooltip}
>
  <span class="text-[10px] px-1.5 py-0.5 rounded {chipColor(mod.category)} text-poe-text/90 shrink-0 mt-1 font-medium tracking-wide">
    {chipLabel(mod)}
  </span>
  <span class="text-[11px] text-poe-deepdim shrink-0 mt-1.5 font-mono">
    {mod.affix === 'prefix' ? 'P' : mod.affix === 'suffix' ? 'S' : 'I'}{mod.tier ? ` T${mod.tier}` : ''}
  </span>
  <div class="flex-1 min-w-0">
    {#if mod.name}
      <div class="text-[11px] italic text-poe-deepdim leading-tight flex items-center gap-1">
        {mod.name}
        {#if isNNN}<span class="text-amber-500" aria-label="locked to specific base">⚷</span>{/if}
      </div>
    {/if}
    <div class="text-sm {textColor(mod.category)} break-words leading-snug">
      {@html colorizeStatText(mod.statText)}
    </div>
  </div>
  {#if mod.affix !== 'implicit'}
    <label class="shrink-0 cursor-pointer mt-1.5">
      <input
        type="checkbox"
        checked={isDesired}
        onchange={onToggleDesired}
        class="w-4 h-4 accent-yellow-500"
      />
    </label>
    {#if onDelete}
      <button
        class="shrink-0 mt-0.5 text-poe-deepdim hover:text-poe-corrupted text-base leading-none px-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        onclick={onDelete}
        title="Remove this mod"
        aria-label="Remove mod"
      >
        ×
      </button>
    {/if}
  {/if}
</div>

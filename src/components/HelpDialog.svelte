<script lang="ts">
  type Props = { onClose: () => void };
  let { onClose }: Props = $props();
</script>

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
  onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1">
  <div class="bg-poe-panel border border-poe-border rounded-md p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/60"
    onclick={(e) => e.stopPropagation()}
    role="presentation">
    <div class="flex items-baseline justify-between border-b border-poe-border pb-2 mb-4">
      <div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-poe-deepdim">Reference</div>
        <div class="text-base font-semibold text-poe-rare">Mod categories &amp; recombinator rules</div>
      </div>
      <button class="text-poe-deepdim hover:text-poe-text text-xl leading-none" onclick={onClose} aria-label="close">×</button>
    </div>

    <div class="space-y-5 text-sm text-poe-text leading-relaxed">
      <section>
        <div class="text-poe-rare font-semibold uppercase tracking-wide text-xs mb-1">How recombination works</div>
        <p class="text-poe-dim">
          Two items go in. The simulator picks one base 50/50, pools both items' mods, samples a final
          prefix/suffix count from the guide's <span class="text-poe-text">Table 1</span>, then draws mods at
          random — skipping any that aren't eligible for the chosen base.
        </p>
      </section>

      <section>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-chip-nnn text-poe-text/90 font-medium">NNN</span>
          <span class="text-poe-rare font-semibold uppercase tracking-wide text-xs">Non-Native, Natural</span>
        </div>
        <p class="text-poe-dim mb-2">
          Mods that <span class="text-poe-text">only roll naturally on certain bases</span>. They participate in
          the pool, but if the chosen base doesn't satisfy the requirement, the mod is discarded.
        </p>
        <ul class="space-y-1 text-poe-dim list-disc list-inside ml-1">
          <li><span class="text-poe-text">Influenced</span> — Shaper/Elder/Crusader/Hunter/Warlord/Redeemer mods need that influence on the base.</li>
          <li><span class="text-poe-text">Attribute-specific</span> — e.g. spell suppression only rolls on dex bases.</li>
          <li><span class="text-poe-text">Defence-specific</span> — armour/evasion/ES mods locked to matching base defence tag.</li>
          <li><span class="text-poe-text">Base-type-specific</span> — e.g. minion mods on a non-minion wand.</li>
        </ul>
      </section>

      <section>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-chip-fractured text-poe-text/90 font-medium">Fractured</span>
          <span class="text-poe-rare font-semibold uppercase tracking-wide text-xs">Tied to host item</span>
        </div>
        <p class="text-poe-dim">
          A fractured mod only transfers if <span class="text-poe-text">its own item is picked as the base</span>.
          The result item can have at most as many fractured mods as the higher of the two inputs.
        </p>
      </section>

      <section>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-chip-exclusive text-poe-text/90 font-medium">Exclusive</span>
          <span class="text-poe-rare font-semibold uppercase tracking-wide text-xs">At most one survives</span>
        </div>
        <p class="text-poe-dim mb-2">
          The recombined item can hold <span class="text-poe-text">at most one exclusive mod total</span> across both items combined.
          Extra exclusives are dropped, which can leave the result with fewer mods than Table 1 predicted.
        </p>
        <ul class="space-y-1 text-poe-dim list-disc list-inside ml-1">
          <li><span class="text-poe-text">Crafted</span> &amp; metacrafted (named prefixes/suffixes too)</li>
          <li><span class="text-poe-text">Veiled</span></li>
          <li><span class="text-poe-text">Essence</span> — only the untiered ones; tiered essence outputs behave as regular mods</li>
          <li><span class="text-poe-text">Breach</span> (Grasping Mail), <span class="text-poe-text">Incursion</span>, <span class="text-poe-text">Delve</span> — drop-only, can transfer between bases but only one survives</li>
          <li><span class="text-poe-text">Beast aspects</span></li>
          <li><span class="text-poe-text">Elevated</span> influence (non-elevated influenced mods are regular)</li>
        </ul>
      </section>

      <section>
        <div class="text-poe-rare font-semibold uppercase tracking-wide text-xs mb-1">NNN ladder method</div>
        <p class="text-poe-dim">
          When mods are restricted to one specific base, the chance shifts dramatically depending on
          which base is picked. The two per-base tiles under the chance % show this split — a 100%
          combine is reachable when every desired mod is locked to the same base and that base wins the 50/50 pick.
        </p>
      </section>

      <section>
        <div class="text-poe-rare font-semibold uppercase tracking-wide text-xs mb-1">Edge cases not modelled</div>
        <ul class="space-y-1 text-poe-dim list-disc list-inside ml-1">
          <li>Legacy <span class="text-poe-text">Increased Item Quantity</span> mod (permanent leagues only)</li>
          <li>Has Abyssal Socket interaction with bases at max sockets</li>
        </ul>
      </section>

      <section class="pt-2 border-t border-poe-divider text-[11px] text-poe-deepdim">
        Source: <a href="https://www.poewiki.net/wiki/Recombinator" target="_blank" rel="noopener" class="hover:text-poe-text underline decoration-dotted">poewiki.net/wiki/Recombinator</a> and the bundled community guide.
      </section>
    </div>
  </div>
</div>

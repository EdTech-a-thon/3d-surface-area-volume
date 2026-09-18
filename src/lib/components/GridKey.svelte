<script lang="ts">
  /**
   * What one square of the measured grid is worth.
   *
   * The grid is ruled in the shape's own units, but a ruling on its own only
   * says "these are the same size as each other": the step changes as the
   * shape grows, so a square cannot be assumed to be one unit. This is the
   * key that turns the ruling into a measurement — read it once and the
   * squares under the solid, or behind the net, can be counted off.
   */
  import { t, unitLabels } from "$lib/i18n/index.svelte";
  import type { UnitKey } from "$lib/domain/format";

  let {
    step,
    unit,
  }: {
    /** The side of one square, in the shape's length units. */
    step: number;
    unit: UnitKey;
  } = $props();

  // A round step by construction — 0.1, 0.2, 1, 2, 10 — but arrived at through
  // logarithms, so it is trimmed back to the number it is meant to be rather
  // than the 0.30000000000000004 the arithmetic leaves behind.
  const size = $derived(String(Number(step.toPrecision(9))));
  const linear = $derived(unitLabels(unit).linear);
</script>

<p
  class="pointer-events-none flex items-center gap-1.5 rounded-lg border border-rule/50 bg-panel/70 px-2 py-1 text-[11px] font-semibold text-ink-soft shadow-sm backdrop-blur-sm"
  data-testid="grid-key"
  aria-label={t("grid.key", { size, unit: linear })}
>
  <!-- One square of the ruling, drawn the way the views draw it, so the key
       reads as a sample of the grid rather than a note about it. -->
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    aria-hidden="true"
    class="shrink-0"
  >
    <rect
      x="0.5"
      y="0.5"
      width="12"
      height="12"
      fill="none"
      stroke="#46606f"
      stroke-opacity="0.75"
    />
  </svg>
  <span aria-hidden="true">{size} {linear}</span>
</p>

<script lang="ts">
  import Approximation from "$lib/components/Approximation.svelte";
  import MathText from "$lib/components/MathText.svelte";
  import { evalExact, formatExact } from "$lib/domain/exact";
  import type { Calculation } from "$lib/domain/types";
  import { t, unitLabels } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";

  let {
    lab,
    compact = false,
  }: {
    lab: LabState;
    /** Shorten the unit words; a floating window has no room for "square units". */
    compact?: boolean;
  } = $props();

  const areaUnit = $derived(
    compact ? unitLabels(lab.unit).areaShort : unitLabels(lab.unit).area,
  );
  const volumeUnit = $derived(
    compact ? unitLabels(lab.unit).volumeShort : unitLabels(lab.unit).volume,
  );

  const iconButton = $derived(
    "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border transition" +
      // A hand-sized window shrinks its furniture before it shrinks the answer.
      (compact ? " max-[26rem]:h-7 max-[26rem]:w-7" : ""),
  );
  /** The answer itself, which is the last thing to give up any room. */
  const readout = $derived(
    "font-mono text-xl leading-tight font-bold" +
      (compact
        ? " max-[26rem]:text-base [@media(max-height:26rem)]:text-base"
        : ""),
  );
  const unitText = $derived(
    "text-xs font-normal text-ink-soft" +
      (compact ? " max-[26rem]:text-[10px]" : ""),
  );
  /**
   * The rounded reading goes under the exact answer rather than after it in a
   * floating window. "36π sq units ≈ 113.1" on one line is the widest thing the
   * lab ever shows, and it is what makes this panel take half a small window.
   */
  const approxText = $derived(unitText + (compact ? " block" : ""));
</script>

<!--
  The two answers, and nothing else. While answers are hidden this renders no
  more than a dash: no title, aria-label or data attribute carries the value, so
  the result cannot be recovered from the page.
-->
{#snippet total(
  label: string,
  calculation: Calculation,
  unitLabel: string,
  testid: string,
)}
  {@const value = evalExact(calculation.exact)}
  <div class="flex items-baseline gap-2">
    <span
      class="w-6 shrink-0 font-mono text-sm font-bold text-ink-soft {compact
        ? 'max-[26rem]:w-5 max-[26rem]:text-xs'
        : ''}">{label}</span
    >
    {#if lab.answersVisible}
      <span class={readout} data-testid={testid}>
        <MathText text={formatExact(calculation.exact)} />
        <span class={unitText}>{unitLabel}</span>
        <Approximation {value} class={approxText} testid="{testid}-approx" />
      </span>
    {:else}
      <span data-testid="{testid}-hidden" class="{readout} text-ink-soft/50">
        <span aria-hidden="true">—</span><span class="sr-only"
          >{t("totals.hidden")}</span
        >
      </span>
    {/if}
  </div>
  {#if lab.showFormulas}
    <!-- The working wraps rather than running on: the panel is as wide as the
         window lets it be, and a line that cannot fit has to fold inside the
         card instead of pushing the buttons out through its edge. -->
    <p class="mt-0.5 mb-1 ml-8 font-mono text-xs break-words text-ink-soft">
      <span class="block" data-testid="{testid.split('-')[0]}-formula">
        <MathText text={calculation.formula} />
      </span>
      <span class="block" data-testid="{testid.split('-')[0]}-substitution">
        <MathText text={calculation.substitution} />
      </span>
    </p>
  {/if}
{/snippet}

<section
  class="pointer-events-auto flex items-start gap-2 rounded-xl border border-rule/70 bg-panel/90 p-2 shadow-lg shadow-ink/10 backdrop-blur-md {compact
    ? 'max-[26rem]:gap-1.5 max-[26rem]:p-1.5'
    : ''}"
  aria-label={t("totals.label")}
>
  <div class="min-w-0">
    {@render total("SA", lab.model.surfaceArea, areaUnit, "surface-total")}
    {@render total("V", lab.model.volume, volumeUnit, "volume-total")}
  </div>

  <div class="flex shrink-0 flex-col gap-1">
    <button
      type="button"
      data-testid="toggle-answers"
      aria-pressed={!lab.answersVisible}
      aria-label={lab.answersVisible
        ? t("totals.hideAnswers")
        : t("totals.showAnswers")}
      title={lab.answersVisible
        ? t("totals.hideAnswers")
        : t("totals.showAnswers")}
      class="{iconButton} {lab.answersVisible
        ? 'border-rule bg-panel text-ink-soft hover:border-accent hover:text-accent'
        : 'border-flag bg-flag text-white'}"
      onclick={() => lab.toggleAnswers()}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
        {#if !lab.answersVisible}
          <path d="M3 3l18 18" />
        {/if}
      </svg>
    </button>

    <button
      type="button"
      data-testid="toggle-formulas"
      aria-pressed={lab.showFormulas}
      aria-label={lab.showFormulas
        ? t("totals.hideFormulas")
        : t("totals.showFormulas")}
      title={lab.showFormulas
        ? t("totals.hideFormulas")
        : t("totals.showFormulas")}
      class="{iconButton} font-mono text-sm font-bold italic {lab.showFormulas
        ? 'border-accent bg-accent text-white'
        : 'border-rule bg-panel text-ink-soft hover:border-accent hover:text-accent'}"
      onclick={() => (lab.showFormulas = !lab.showFormulas)}
    >
      fx
    </button>
  </div>
</section>

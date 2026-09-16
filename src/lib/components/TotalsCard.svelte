<script lang="ts">
  import Approximation from "$lib/components/Approximation.svelte";
  import MathText from "$lib/components/MathText.svelte";
  import { evalExact, formatExact } from "$lib/domain/exact";
  import { UNITS } from "$lib/domain/format";
  import type { Calculation } from "$lib/domain/types";
  import type { LabState } from "$lib/state/lab.svelte";

  let { lab }: { lab: LabState } = $props();

  const areaUnit = $derived(UNITS[lab.unit].area);
  const volumeUnit = $derived(UNITS[lab.unit].volume);

  const iconButton =
    "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border transition";
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
    <span class="w-6 shrink-0 font-mono text-sm font-bold text-ink-soft"
      >{label}</span
    >
    {#if lab.answersVisible}
      <span
        class="font-mono text-xl leading-tight font-bold"
        data-testid={testid}
      >
        <MathText text={formatExact(calculation.exact)} />
        <span class="text-xs font-normal text-ink-soft">{unitLabel}</span>
        <Approximation
          {value}
          class="text-xs font-normal text-ink-soft"
          testid="{testid}-approx"
        />
      </span>
    {:else}
      <span
        data-testid="{testid}-hidden"
        class="font-mono text-xl leading-tight font-bold text-ink-soft/50"
      >
        <span aria-hidden="true">—</span><span class="sr-only">hidden</span>
      </span>
    {/if}
  </div>
  {#if lab.showFormulas}
    <p class="mt-0.5 mb-1 ml-8 font-mono text-xs text-ink-soft">
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
  class="pointer-events-auto flex items-start gap-2 rounded-xl border border-rule/70 bg-panel/90 p-2 shadow-lg shadow-ink/10 backdrop-blur-md"
  aria-label="Totals"
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
      aria-label={lab.answersVisible ? "Hide the answers" : "Show the answers"}
      title={lab.answersVisible ? "Hide the answers" : "Show the answers"}
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
      aria-label={lab.showFormulas ? "Hide the formulas" : "Show the formulas"}
      title={lab.showFormulas ? "Hide the formulas" : "Show the formulas"}
      class="{iconButton} font-mono text-sm font-bold italic {lab.showFormulas
        ? 'border-accent bg-accent text-white'
        : 'border-rule bg-panel text-ink-soft hover:border-accent hover:text-accent'}"
      onclick={() => (lab.showFormulas = !lab.showFormulas)}
    >
      fx
    </button>
  </div>
</section>

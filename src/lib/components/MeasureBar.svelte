<script lang="ts">
  import { evalExact, formatExact } from "$lib/domain/exact";
  import {
    UNITS,
    approximateText,
    formatApproximate,
  } from "$lib/domain/format";
  import {
    DIMENSION_MAX,
    DIMENSION_MIN,
    DIMENSION_STEP,
  } from "$lib/domain/types";
  import { measureTarget, type LabState } from "$lib/state/lab.svelte";

  let { lab }: { lab: LabState } = $props();

  const linear = $derived(UNITS[lab.unit].linear);

  const step =
    "grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md border border-rule bg-panel text-base leading-none font-bold text-ink-soft hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30";
</script>

<!-- The dimensions are always on screen: they are what the whole demonstration
     varies. Pointing at a symbol lights up every edge that carries it. -->
<section
  class="pointer-events-auto rounded-xl border border-rule/70 bg-panel/90 p-2 shadow-lg shadow-ink/10 backdrop-blur-md"
  aria-label="Dimensions, in {linear}"
>
  <div class="flex flex-col gap-1.5">
    {#each lab.definition.dimensions as spec (spec.key)}
      {@const error = lab.errors[spec.key]}
      {@const target = measureTarget(spec.key)}
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="measure-{spec.key}"
          aria-pressed={lab.isPinned(target)}
          aria-label="{spec.label}. {spec.hint}. Show it on the shape."
          title="{spec.label} — {spec.hint}"
          class="h-7 w-7 shrink-0 cursor-pointer rounded-md border font-mono text-sm font-bold transition {lab.isActive(
            target,
          )
            ? 'border-flag bg-flag-soft text-flag'
            : 'border-transparent text-ink-soft hover:border-accent hover:text-accent'}"
          onpointerenter={() => lab.hover(target)}
          onpointerleave={() => lab.unhover(target)}
          onfocus={() => lab.hover(target)}
          onblur={() => lab.unhover(target)}
          onclick={() => lab.togglePin(target)}>{spec.key}</button
        >

        <button
          type="button"
          class={step}
          aria-label="Decrease {spec.label} by {DIMENSION_STEP}"
          data-testid="decrease-{spec.key}"
          disabled={lab.dimensions[spec.key] <= DIMENSION_MIN}
          onclick={() => lab.nudgeDimension(spec.key, -DIMENSION_STEP)}
          >−</button
        >
        <label class="sr-only" for="dimension-{spec.key}"
          >{spec.label} in {linear}</label
        >
        <input
          id="dimension-{spec.key}"
          data-testid="input-{spec.key}"
          class="w-14 shrink-0 rounded-md border bg-panel px-1 py-0.5 text-center font-mono text-base {error
            ? 'border-flag'
            : 'border-rule'}"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `error-${spec.key}` : undefined}
          value={lab.drafts[spec.key]}
          oninput={(event) => lab.setDraft(spec.key, event.currentTarget.value)}
        />
        <button
          type="button"
          class={step}
          aria-label="Increase {spec.label} by {DIMENSION_STEP}"
          data-testid="increase-{spec.key}"
          disabled={lab.dimensions[spec.key] >= DIMENSION_MAX}
          onclick={() => lab.nudgeDimension(spec.key, DIMENSION_STEP)}>+</button
        >
        <input
          class="hidden w-28 accent-accent sm:block"
          type="range"
          min={DIMENSION_MIN}
          max={DIMENSION_MAX}
          step={DIMENSION_STEP}
          data-testid="range-{spec.key}"
          aria-label="{spec.label} slider, in {linear}"
          value={lab.dimensions[spec.key]}
          oninput={(event) => lab.setDraft(spec.key, event.currentTarget.value)}
        />
      </div>

      {#if error}
        <p
          id="error-{spec.key}"
          data-testid="error-{spec.key}"
          role="alert"
          class="max-w-[17rem] rounded bg-flag-soft px-2 py-1 text-xs font-semibold text-flag"
        >
          {error}. Still {lab.dimensions[spec.key]}
          {linear}.
        </p>
      {/if}
    {/each}
  </div>

  <!-- Derived lengths follow from the dimensions above, so there is no input
       for them. -->
  {#each lab.model.derived as derived (derived.key)}
    {@const value = evalExact(derived.exact)}
    {@const exact = formatExact(derived.exact)}
    <p
      class="mt-1.5 border-t border-rule/60 pt-1.5 font-mono text-xs text-ink-soft"
      data-testid="derived-{derived.key}"
    >
      <!-- "l = w = h = 2" already ends in its own value; "s = √(3² + 4²)" does not. -->
      {derived.substitution.endsWith(`= ${exact}`)
        ? derived.substitution
        : `${derived.substitution} = ${exact}`}
      {#if formatApproximate(value).rounded}
        <span>({approximateText(value)})</span>
      {/if}
    </p>
  {/each}
</section>

<script lang="ts">
  import {
    DETAIL_DECIMAL_PLACES,
    approximateText,
    formatApproximate,
  } from "$lib/domain/format";
  import { t } from "$lib/i18n/index.svelte";

  let {
    value,
    class: className = "",
    testid,
  }: { value: number; class?: string; testid?: string } = $props();

  const short = $derived(approximateText(value));
  const detailed = $derived(approximateText(value, DETAIL_DECIMAL_PLACES));

  /** Clicked open, for touch and for leaving the long form on screen. */
  let expanded = $state(false);
</script>

<!-- A rounded decimal beside an exact answer is a sanity check, not the answer,
     so it stays as short as it can be: one decimal place. Hovering, focusing or
     tapping it shows the longer form for anyone who wants the detail. -->
{#if formatApproximate(value).rounded}
  <button
    type="button"
    class="group/approx cursor-help rounded align-baseline whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-accent {className}"
    data-testid={testid}
    aria-pressed={expanded}
    aria-label={expanded ? detailed : t("approx.more", { short, detailed })}
    onclick={() => (expanded = !expanded)}
  >
    {#if expanded}
      <span aria-hidden="true">{detailed}</span>
    {:else}
      <span
        class="group-hover/approx:hidden group-focus-visible/approx:hidden"
        aria-hidden="true">{short}</span
      ><span
        class="hidden group-hover/approx:inline group-focus-visible/approx:inline"
        aria-hidden="true">{detailed}</span
      >
    {/if}
  </button>
{/if}

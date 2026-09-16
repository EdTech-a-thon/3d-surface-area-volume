<script lang="ts">
  import type { SolidKind } from "$lib/domain/types";

  let { kind, size = 40 }: { kind: SolidKind; size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 48 48"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {#if kind === "rectangularPrism"}
    <path d="M8 18h22v22H8z" />
    <path d="M8 18l10-10h22v22l-10 10" />
    <path d="M30 18l10-10" />
  {:else if kind === "cube"}
    <path d="M8 20h20v20H8z" />
    <path d="M8 20l12-12h20v20L28 40" />
    <path d="M28 20l12-12" />
  {:else if kind === "triangularPrism"}
    <path d="M6 38h22L17 16z" />
    <path d="M17 16l10-8 11 22M28 38l10-8" />
  {:else if kind === "cylinder"}
    <ellipse cx="24" cy="13" rx="14" ry="5" />
    <path d="M10 13v22M38 13v22" />
    <path d="M10 35a14 5 0 0 0 28 0" />
  {:else if kind === "cone"}
    <path d="M24 7l14 26M24 7L10 33" />
    <ellipse cx="24" cy="33" rx="14" ry="5" />
  {:else if kind === "sphere"}
    <circle cx="24" cy="24" r="16" />
    <ellipse cx="24" cy="24" rx="16" ry="6" />
  {:else}
    <!-- The hidden logo key: a smaller top over a wider footprint. -->
    <path d="M24 8l17 13-17 13L7 21z" />
    <path d="M7 21v7l17 13 17-13v-7" />
  {/if}
</svg>

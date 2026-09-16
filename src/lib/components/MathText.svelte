<script lang="ts">
  import { splitMath } from "$lib/ui/mathText";

  let { text }: { text: string } = $props();

  const segments = $derived(splitMath(text));
  const drawn = $derived(
    segments.some((segment) => segment.kind === "radical"),
  );
</script>

<!--
  Maths text with real square-root signs: the radicand sits under a bar rather
  than behind a lonely √, so √(3² + 4²) reads the way it does on paper. The
  original string stays in the page for screen readers, which would otherwise
  hear the bar's grouping as nothing at all.
-->
{#if drawn}<span class="sr-only">{text}</span><span aria-hidden="true"
    >{#each segments as segment, index (index)}{#if segment.kind === "radical"}<span
          class="radical"
          ><span class="radical-sign">√</span><span class="radical-over"
            >{segment.radicand}</span
          ></span
        >{:else}{segment.text}{/if}{/each}</span
  >{:else}{text}{/if}

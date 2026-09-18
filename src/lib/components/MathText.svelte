<script lang="ts">
  import { splitMath } from "$lib/ui/mathText";
  import {
    RADICAL_RULE_OVERLAP,
    RADICAL_RULE_WEIGHT,
    RADICAL_STEM_WEIGHT,
    RADICAL_TICK_WEIGHT,
    RADICAL_WIDTH,
    radicalStemPath,
    radicalTickPath,
  } from "$lib/ui/radical";

  let { text }: { text: string } = $props();

  const segments = $derived(splitMath(text));
  const drawn = $derived(
    segments.some((segment) => segment.kind === "radical"),
  );

  // The sign is drawn in its own square box and stretched over the radicand's,
  // so the outline never needs to know how tall the radicand turned out. Every
  // other length is in em, which keeps the sign in step with the text around it.
  const BOX = 100;
  const tick = radicalTickPath(0, 0, BOX, BOX);
  const stem = radicalStemPath(0, 0, BOX, BOX);
  const ruleStart = RADICAL_WIDTH * (1 - RADICAL_RULE_OVERLAP);
</script>

<!--
  Maths text with drawn square-root signs. The original string stays in the page
  for screen readers, which would otherwise hear the rule's grouping as nothing
  at all; see `$lib/ui/radical` for why the sign is drawn rather than typed.
-->
{#if drawn}<span class="sr-only">{text}</span><span aria-hidden="true"
    >{#each segments as segment, index (index)}{#if segment.kind === "radical"}<span
          class="radical"
          ><svg class="radical-mark" preserveAspectRatio="none"
            ><svg
              width="{RADICAL_WIDTH}em"
              height="100%"
              viewBox="0 0 {BOX} {BOX}"
              preserveAspectRatio="none"
              ><path
                d={tick}
                fill="none"
                stroke="currentColor"
                stroke-width="{RADICAL_TICK_WEIGHT}em"
                stroke-linecap="round"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
              /><path
                d={stem}
                fill="none"
                stroke="currentColor"
                stroke-width="{RADICAL_STEM_WEIGHT}em"
                vector-effect="non-scaling-stroke"
              /></svg
            ><rect
              x="{ruleStart}em"
              y="0"
              width="100%"
              height="{RADICAL_RULE_WEIGHT}em"
              fill="currentColor"
            /></svg
          ><span class="radical-body">{segment.radicand}</span></span
        >{:else}{segment.text}{/if}{/each}</span
  >{:else}{text}{/if}

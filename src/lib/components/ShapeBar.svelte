<script lang="ts">
  import { SOLIDS } from "$lib/domain/solids";
  import { SOLID_ORDER } from "$lib/domain/types";
  import type { LabState } from "$lib/state/lab.svelte";
  import ShapeIcon from "./ShapeIcon.svelte";

  let { lab }: { lab: LabState } = $props();
</script>

<!-- Icons only: the shape on the stage says which solid this is, so the names
     would only repeat it. Each button still carries its name for assistive
     technology and as a tooltip. -->
<div
  class="pointer-events-auto flex flex-wrap gap-0.5 rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="radiogroup"
  aria-label="Solid"
>
  {#each SOLID_ORDER as kind (kind)}
    {@const definition = SOLIDS[kind]}
    {@const chosen = lab.kind === kind}
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      aria-label={definition.name}
      title={definition.name}
      data-testid="shape-{kind}"
      class="grid h-10 w-10 cursor-pointer place-items-center rounded-lg transition {chosen
        ? 'bg-accent text-white'
        : 'text-ink-soft hover:bg-ink/5 hover:text-accent'}"
      onclick={() => lab.selectKind(kind)}
    >
      <ShapeIcon {kind} size={26} />
    </button>
  {/each}
</div>

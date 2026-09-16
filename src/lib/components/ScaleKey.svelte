<script lang="ts">
  import { gridStepText, type GridScale } from "$lib/ui/grid";

  let { grid, linear }: { grid: GridScale; linear: string } = $props();

  // "1 units apart" would be the only ungrammatical label in the app.
  const unit = $derived(
    grid.step === 1 && linear === "units" ? "unit" : linear,
  );
</script>

<!--
  What one gap in the background grid is worth. Without it the dots would show
  that the shape had changed size, but not by how much.
-->
<div
  class="pointer-events-none absolute top-1/2 left-2 flex -translate-y-1/2 items-center gap-1.5 rounded-lg border border-rule/60 bg-panel/70 px-2 py-1 text-[11px] font-bold text-ink-soft backdrop-blur-sm"
  data-testid="grid-scale"
>
  <svg
    width={grid.gap}
    height="9"
    viewBox="0 0 {grid.gap} 9"
    aria-hidden="true"
    class="shrink-0"
  >
    <line
      x1="1.6"
      y1="4.5"
      x2={grid.gap - 1.6}
      y2="4.5"
      stroke="#46606f"
      stroke-width="1"
      stroke-dasharray="2 3"
    />
    <circle cx="1.6" cy="4.5" r="1.6" fill="#46606f" />
    <circle cx={grid.gap - 1.6} cy="4.5" r="1.6" fill="#46606f" />
  </svg>
  <span>{gridStepText(grid.step)}&nbsp;{unit} apart</span>
</div>

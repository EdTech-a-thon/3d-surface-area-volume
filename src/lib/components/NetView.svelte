<script lang="ts">
  import { sectorPath, type Net } from "$lib/domain/nets";
  import {
    surfaceTarget,
    type LabState,
    type Target,
  } from "$lib/state/lab.svelte";
  import { HATCH_PATTERN_ID, netFill, netStroke } from "$lib/ui/colors";

  let { lab, net }: { lab: LabState; net: Net } = $props();

  // Every piece is already in the solid's length units, so one viewBox scales
  // the whole net at once and no piece can be resized on its own. Widening the
  // viewBox to the element's aspect ratio just adds empty margin, which keeps
  // that single shared scale while letting the net fill the screen.
  let boxWidth = $state(900);
  let boxHeight = $state(650);

  const layout = $derived.by(() => {
    const width = net.bounds.maxX - net.bounds.minX || 1;
    const height = net.bounds.maxY - net.bounds.minY || 1;
    const pad = Math.max(width, height) * 0.07;
    const wanted = { w: width + pad * 2, h: height + pad * 2 };

    const aspect = Math.max(boxWidth, 1) / Math.max(boxHeight, 1);
    const view =
      wanted.w / wanted.h < aspect
        ? { w: wanted.h * aspect, h: wanted.h }
        : { w: wanted.w, h: wanted.w / aspect };

    const centerX = (net.bounds.minX + net.bounds.maxX) / 2;
    const centerY = (net.bounds.minY + net.bounds.maxY) / 2;
    // Length of one CSS pixel, in the net's own units.
    const pixel = view.w / Math.max(boxWidth, 1);
    return {
      viewBox: `${centerX - view.w / 2} ${centerY - view.h / 2} ${view.w} ${view.h}`,
      pixel,
    };
  });

  const viewBox = $derived(layout.viewBox);
  const codeSize = $derived(layout.pixel * 20);
  const sizeTextSize = $derived(layout.pixel * 13);
  const strokeWidth = $derived(layout.pixel * 1.5);

  function surfaceOf(id: string) {
    return lab.model.surfaces.find((surface) => surface.id === id);
  }

  function pointsOf(points: readonly (readonly [number, number])[]): string {
    return points.map(([x, y]) => `${x},${y}`).join(" ");
  }

  /** The piece under an event, read straight off the markup. */
  function targetOf(event: Event): Target | null {
    const element = event.target as Element | null;
    return (element?.closest?.("[data-target]")?.getAttribute("data-target") ??
      null) as Target | null;
  }
</script>

<!--
  Pointing at a net piece measures it, exactly as pointing at the matching face
  of the solid does. The same measurements are reachable without a pointer from
  the badges on the solid and from the dimension bar.
-->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="h-full w-full"
  bind:clientWidth={boxWidth}
  bind:clientHeight={boxHeight}
>
  <svg
    class="h-full w-full"
    {viewBox}
    role="img"
    aria-label="Flat net of the {lab.model.name}"
    data-testid="net-view"
    onpointerover={(event) => lab.hover(targetOf(event))}
    onpointerleave={() => lab.hover(null)}
    onclick={(event) => {
      const target = targetOf(event);
      if (target) lab.togglePin(target);
    }}
  >
    <defs>
      <pattern
        id="net-{HATCH_PATTERN_ID}"
        width="14"
        height="14"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45) scale({layout.pixel})"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="14"
          stroke="#1f2937"
          stroke-width="5"
          stroke-opacity="0.4"
        />
      </pattern>
    </defs>

    {#each net.pieces as piece (piece.surfaceId)}
      {@const active = lab.isActive(surfaceTarget(piece.surfaceId))}
      {@const hue = lab.hueFor(piece.surfaceId)}
      {@const surface = surfaceOf(piece.surfaceId)}
      <g data-target={surfaceTarget(piece.surfaceId)} class="cursor-pointer">
        {#if piece.shape === "polygon"}
          <polygon
            points={pointsOf(piece.points)}
            fill={netFill(hue)}
            stroke={netStroke(hue)}
            stroke-width={active ? strokeWidth * 3 : strokeWidth}
            stroke-linejoin="round"
          />
          {#if active}
            <polygon
              points={pointsOf(piece.points)}
              fill="url(#net-{HATCH_PATTERN_ID})"
              stroke="none"
            />
          {/if}
        {:else if piece.shape === "circle"}
          <circle
            cx={piece.center[0]}
            cy={piece.center[1]}
            r={piece.radius}
            fill={netFill(hue)}
            stroke={netStroke(hue)}
            stroke-width={active ? strokeWidth * 3 : strokeWidth}
          />
          {#if active}
            <circle
              cx={piece.center[0]}
              cy={piece.center[1]}
              r={piece.radius}
              fill="url(#net-{HATCH_PATTERN_ID})"
            />
          {/if}
        {:else}
          <path
            d={sectorPath(piece)}
            fill={netFill(hue)}
            stroke={netStroke(hue)}
            stroke-width={active ? strokeWidth * 3 : strokeWidth}
            stroke-linejoin="round"
          />
          {#if active}
            <path
              d={sectorPath(piece)}
              fill="url(#net-{HATCH_PATTERN_ID})"
              stroke="none"
            />
          {/if}
        {/if}

        <text
          x={piece.labelAt[0]}
          y={piece.labelAt[1]}
          class="label-halo font-bold"
          font-size={codeSize}
          stroke-width={codeSize * 0.3}
          text-anchor="middle"
          dominant-baseline="central"
          fill="#0b1a22"
          pointer-events="none">{surface?.code ?? ""}</text
        >
        <text
          x={piece.labelAt[0]}
          y={piece.labelAt[1] + codeSize * 0.95}
          class="label-halo"
          font-size={sizeTextSize}
          stroke-width={sizeTextSize * 0.35}
          text-anchor="middle"
          dominant-baseline="central"
          fill="#334155"
          pointer-events="none">{piece.sizeText}</text
        >
      </g>
    {/each}
  </svg>
</div>

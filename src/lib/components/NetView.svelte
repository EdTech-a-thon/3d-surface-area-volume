<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import { formatExact } from "$lib/domain/exact";
  import { annularSectorPath, sectorPath, type Net } from "$lib/domain/nets";
  import { DIMENSION_MAX } from "$lib/domain/types";
  import { domainText, t, unitLabels } from "$lib/i18n/index.svelte";
  import {
    surfaceTarget,
    type LabState,
    type Target,
  } from "$lib/state/lab.svelte";
  import {
    HATCH_PATTERN_ID,
    chipTint,
    netFill,
    netStroke,
  } from "$lib/ui/colors";
  import { fitFraction, gridLayers, gridScale } from "$lib/ui/grid";
  import { splitMath } from "$lib/ui/mathText";
  import { measureBox } from "$lib/ui/measureBox";
  import { stageRise, stageRoom } from "$lib/ui/stage";
  import {
    RADICAL_RULE_OVERLAP,
    RADICAL_RULE_WEIGHT,
    RADICAL_STEM_WEIGHT,
    RADICAL_TICK_WEIGHT,
    RADICAL_WIDTH,
    radicalStemPath,
    radicalTickPath,
  } from "$lib/ui/radical";

  let {
    lab,
    net,
    compact = false,
    lift = 0,
    chrome = 0,
    onGrid,
  }: {
    lab: LabState;
    net: Net;
    /** Shorten the unit words where the window has no room for them. */
    compact?: boolean;
    /** How far above the middle to hold the net, in CSS pixels. */
    lift?: number;
    /** The height the panels over the net have taken, as the solid view sees it. */
    chrome?: number;
    /**
     * Where to report the size of one grid square, in the shape's own units.
     * The step is settled here, out of the fit to this element, but it is read
     * off a key in the corner of the lab: only the lab knows what room the
     * panels have left in that corner.
     */
    onGrid?: (step: number) => void;
  } = $props();

  // Every piece is already in the solid's length units, so one viewBox scales
  // the whole net at once and no piece can be resized on its own. Widening the
  // viewBox to the element's aspect ratio just adds empty margin, which keeps
  // that single shared scale while letting the net fill the screen.
  let boxWidth = $state(900);
  let boxHeight = $state(650);
  /**
   * Whether those are the element's own numbers yet, rather than the guess the
   * component starts with. The drawing survives a wrong guess — the viewBox
   * scales it to fit either way — but the labels over it are placed in CSS
   * pixels, so on a prerendered page they would paint somewhere near the top
   * left and jump into place at hydration. They wait for the measurement.
   */
  let measured = $state(false);

  /**
   * Half the width of the largest net the sliders reach: a cube of edge 20 lays
   * out four faces across, so its net is 80 units wide.
   */
  const FULL_EXTENT = DIMENSION_MAX * 2;

  const layout = $derived.by(() => {
    const width = net.bounds.maxX - net.bounds.minX || 1;
    const height = net.bounds.maxY - net.bounds.minY || 1;
    const pad = Math.max(width, height) * 0.07;
    const wanted = { w: width + pad * 2, h: height + pad * 2 };

    // Panels over the drawing take height from the net exactly as they do from
    // the solid, so the sheet is laid out in the clear band between them and the
    // viewBox is then stretched back over the whole element.
    const band = stageRoom(boxHeight, chrome) * 2;
    const aspect = Math.max(boxWidth, 1) / band;
    const fitted =
      wanted.w / wanted.h < aspect
        ? { w: wanted.h * aspect, h: wanted.h }
        : { w: wanted.w, h: wanted.w / aspect };
    // A small net is drawn small, exactly as a small solid is: widening the
    // viewBox past the net leaves it the same share of the screen its solid had.
    const zoom = fitFraction(Math.max(width, height) / 2, FULL_EXTENT);
    const spread = Math.max(boxHeight, 1) / band;
    const view = { w: fitted.w / zoom, h: (fitted.h / zoom) * spread };

    const centerX = (net.bounds.minX + net.bounds.maxX) / 2;
    const centerY = (net.bounds.minY + net.bounds.maxY) / 2;
    // Length of one CSS pixel, in the net's own units.
    const pixel = view.w / Math.max(boxWidth, 1);
    // The floating window keeps its panels along the bottom edge, so the net
    // steps up out of their way exactly as the solid does. Moving the window
    // down over the net is what lifts the net on screen.
    const rise = stageRise(boxHeight, lift) * (view.h / Math.max(boxHeight, 1));
    return {
      box: {
        x: centerX - view.w / 2,
        y: centerY - view.h / 2 + rise,
        w: view.w,
        h: view.h,
      },
      pixel,
    };
  });

  const box = $derived(layout.box);
  const viewBox = $derived(`${box.x} ${box.y} ${box.w} ${box.h}`);
  /** The net is fitted to the screen too, so it carries the same measured grid. */
  const grid = $derived(gridScale(1 / layout.pixel));
  const GRID_PATTERN_ID = "net-measured-grid";
  const FINE_GRID_PATTERN_ID = "net-measured-grid-fine";
  /** How dark the ruling sits against the backdrop. */
  const GRID_INK = 0.45;
  const gridInk = $derived(gridLayers(GRID_INK, grid.fade));

  // Report the step rather than draw it: the key to the grid lives with the
  // totals, where the other numbers about the shape are.
  $effect(() => {
    onGrid?.(grid.step);
  });

  const codeSize = $derived(layout.pixel * 20);
  const sizeTextSize = $derived(layout.pixel * 13);
  const strokeWidth = $derived(layout.pixel * 1.5);

  /**
   * A piece says its size on one line unless the text asks for more. Only the
   * pyramid does: its four faces are the longest label in any net, and they are
   * read where the net is at its narrowest. Every square root is drawn per
   * line, so a break costs the signs nothing.
   */
  function sizeLines(text: string): string[] {
    return text.split("\n");
  }
  /** Line spacing for a size label that runs to more than one line. */
  const LINE_STEP = 1.2;

  const areaUnit = $derived(
    compact ? unitLabels(lab.unit).areaShort : unitLabels(lab.unit).area,
  );

  /**
   * One area chip per measured piece, laid over the net the way the badges are
   * laid over the solid. The chip is positioned in CSS pixels, so the net's own
   * units are mapped through the viewBox rather than drawn as SVG text.
   */
  const chips = $derived.by(() => {
    return net.pieces.flatMap((piece, index) => {
      const target = surfaceTarget(piece.surfaceId);
      if (!lab.isActive(target)) return [];
      const surface = surfaceOf(piece.surfaceId);
      if (!surface) return [];
      // Below the code and the size lines the piece already carries.
      const below =
        piece.labelAt[1] +
        codeSize * 0.95 +
        sizeTextSize * (2 + (sizeLines(piece.sizeText).length - 1) * LINE_STEP);
      return [
        {
          key: index,
          surface,
          target,
          tint: chipTint(lab.huesBySurfaceId[surface.id] ?? 0),
          pinned: lab.isPinned(target),
          value: formatExact(surface.exact),
          x: ((piece.labelAt[0] - box.x) / box.w) * boxWidth,
          y: ((below - box.y) / box.h) * boxHeight,
        },
      ];
    });
  });

  function surfaceOf(id: string) {
    return lab.model.surfaces.find((surface) => surface.id === id);
  }

  function pointsOf(points: readonly (readonly [number, number])[]): string {
    return points.map(([x, y]) => `${x},${y}`).join(" ");
  }

  /**
   * Square-root signs for the size labels, one box per radicand.
   *
   * The labels are SVG text, so there is no line box to hang a drawn sign on
   * the way `MathText.svelte` does. Instead each radicand is set with a gap in
   * front of it, then measured once it is on screen: the gap is where the sign
   * goes, and the measurement says how tall and how wide to draw it.
   */
  type RadicalBox = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  let svgEl = $state<SVGSVGElement | undefined>();
  let radicals = $state<RadicalBox[]>([]);

  /** The gap left in front of a radicand, in the net's units. */
  const signWidth = $derived(sizeTextSize * RADICAL_WIDTH);
  const signGap = $derived(signWidth * 1.08);

  $effect(() => {
    // Read what moves the labels, so the signs are re-measured alongside them.
    void [net, lab.model, sizeTextSize];
    const svg = svgEl;
    if (!svg) return;

    const measure = () => {
      const size = sizeTextSize;
      radicals = [...svg.querySelectorAll(".net-radicand")].map((span) => {
        const bounds = (span as SVGTSpanElement).getBBox();
        // Digits have no descender, so the measured box stops at the baseline.
        // The sign wants air above the digits for its rule and a little room
        // below the baseline for its valley.
        const top = bounds.y - size * 0.2;
        const bottom = bounds.y + bounds.height + size * 0.06;
        return {
          x: bounds.x,
          y: top,
          width: bounds.width,
          height: bottom - top,
        };
      });
    };

    measure();
    // A late-loading font reflows every label underneath its finished sign.
    let stale = false;
    void document.fonts?.ready.then(() => {
      if (!stale) measure();
    });
    return () => {
      stale = true;
    };
  });

  /**
   * An open chip sits over the very piece it measures, so while it is only
   * following the pointer it stays transparent to it. Once pinned it takes the
   * pointer back, so clicking it can unpin it.
   */
  function reach(pinned: boolean): string {
    return pinned ? "pointer-events-auto" : "pointer-events-none";
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
  class="relative h-full w-full"
  use:measureBox={(width, height) => {
    boxWidth = width;
    boxHeight = height;
    measured = true;
  }}
>
  <svg
    bind:this={svgEl}
    class="h-full w-full"
    {viewBox}
    role="img"
    aria-label={t("net.description", { name: domainText(lab.model.name) })}
    data-testid="net-view"
    onpointerover={(event) => lab.hover(targetOf(event))}
    onpointerleave={() => lab.hover(null)}
    onclick={(event) => {
      const target = targetOf(event);
      if (target) lab.togglePin(target);
    }}
  >
    <defs>
      <!-- Squares a round number of units across, in the net's own units, so
           the pieces cover more of them as the solid grows. The lattice is left
           where the net's own origin puts it — every net is laid out from a
           corner of a piece — so the ruling runs along the pieces' edges and
           the squares along a side can be counted, exactly as they can on the
           floor under the solid. -->
      {#each [{ id: GRID_PATTERN_ID, step: grid.step }, { id: FINE_GRID_PATTERN_ID, step: grid.fineStep }] as lattice (lattice.id)}
        <pattern
          id={lattice.id}
          width={lattice.step}
          height={lattice.step}
          patternUnits="userSpaceOnUse"
        >
          <!-- Two sides of the square only: the other two belong to the
               neighbouring tiles, and drawing all four doubles every line. -->
          <path
            d="M0 {lattice.step} V0 H{lattice.step}"
            fill="none"
            stroke="#46606f"
            stroke-width={layout.pixel}
          />
        </pattern>
      {/each}
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

    <!-- The finer lattice first, so the coarse one fades out over it rather
         than over the backdrop: see gridLayers. -->
    {#each [{ id: FINE_GRID_PATTERN_ID, ink: gridInk.fine }, { id: GRID_PATTERN_ID, ink: gridInk.coarse }] as layer (layer.id)}
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill="url(#{layer.id})"
        opacity={layer.ink}
        pointer-events="none"
      />
    {/each}

    <!-- Keyed by position rather than surface id so a future cut may lay
         one analytic surface out as several pieces without duplicate keys. -->
    {#each net.pieces as piece, index (index)}
      {@const active = lab.isActive(surfaceTarget(piece.surfaceId))}
      {@const hue = lab.hueFor(piece.surfaceId)}
      {@const surface = surfaceOf(piece.surfaceId)}
      <g data-target={surfaceTarget(piece.surfaceId)} class="cursor-pointer">
        {#if piece.shape === "polygon"}
          <polygon
            points={pointsOf(piece.points)}
            fill={netFill(hue, lab.definition.baseHue ?? null)}
            stroke={netStroke(hue, lab.definition.baseHue ?? null)}
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
            fill={netFill(hue, lab.definition.baseHue ?? null)}
            stroke={netStroke(hue, lab.definition.baseHue ?? null)}
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
        {:else if piece.shape === "sector"}
          <path
            d={sectorPath(piece)}
            fill={netFill(hue, lab.definition.baseHue ?? null)}
            stroke={netStroke(hue, lab.definition.baseHue ?? null)}
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
        {:else}
          <path
            d={annularSectorPath(piece)}
            fill={netFill(hue, lab.definition.baseHue ?? null)}
            stroke={netStroke(hue, lab.definition.baseHue ?? null)}
            stroke-width={active ? strokeWidth * 3 : strokeWidth}
            stroke-linejoin="round"
          />
          {#if active}
            <path
              d={annularSectorPath(piece)}
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
        {#each sizeLines(piece.sizeText) as line, lineIndex (lineIndex)}
          <text
            x={piece.labelAt[0]}
            y={piece.labelAt[1] +
              codeSize * 0.95 +
              lineIndex * sizeTextSize * LINE_STEP}
            class="label-halo"
            font-size={sizeTextSize}
            stroke-width={sizeTextSize * 0.35}
            text-anchor="middle"
            dominant-baseline="central"
            fill="#334155"
            pointer-events="none"
            >{#each splitMath(line) as segment, index (index)}{#if segment.kind === "radical"}<tspan
                  class="net-radicand"
                  dx={signGap}>{segment.radicand}</tspan
                ><tspan dx={sizeTextSize * 0.12}>&#8203;</tspan
                >{:else}{segment.text}{/if}{/each}</text
          >
        {/each}
      </g>
    {/each}

    <!-- The signs sit above every piece, so a label that overhangs its own
         piece keeps its root drawn in one colour rather than two. Each is
         stroked in white first, matching the halo the labels already wear. -->
    {#each radicals as radical, index (index)}
      {@const left = radical.x - signWidth}
      {@const tick = radicalTickPath(
        left,
        radical.y,
        signWidth,
        radical.height,
      )}
      {@const stem = radicalStemPath(
        left,
        radical.y,
        signWidth,
        radical.height,
      )}
      {@const ruleX = radical.x - signWidth * RADICAL_RULE_OVERLAP}
      {@const ruleWidth =
        radical.x + radical.width + sizeTextSize * 0.12 - ruleX}
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g
          class="label-halo"
          stroke="#ffffff"
          stroke-width={sizeTextSize * 0.35}
          pointer-events="none"
        >
          <path d={tick} />
          <path d={stem} />
          <path
            d="M{ruleX} {radical.y +
              (sizeTextSize * RADICAL_RULE_WEIGHT) / 2}h{ruleWidth}"
          />
        </g>
        <g stroke="#334155" pointer-events="none">
          <path d={tick} stroke-width={sizeTextSize * RADICAL_TICK_WEIGHT} />
          <path d={stem} stroke-width={sizeTextSize * RADICAL_STEM_WEIGHT} />
          <rect
            x={ruleX}
            y={radical.y}
            width={ruleWidth}
            height={sizeTextSize * RADICAL_RULE_WEIGHT}
            fill="#334155"
            stroke="none"
          />
        </g>
      </g>
    {/each}
  </svg>

  <!-- The areas live above the drawing as real buttons, matching the badges on
       the solid, so a measured piece reads the same in either view. They are
       placed in CSS pixels, so they stay hidden until the stage has been
       measured: see `measured`. -->
  <div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    class:invisible={!measured}
  >
    {#each chips as chip (chip.key)}
      <button
        type="button"
        data-testid="net-surface-{chip.surface.localId}"
        data-target={chip.target}
        aria-pressed={chip.pinned}
        aria-label="{domainText(chip.surface.name)}{lab.showFormulas
          ? `, ${chip.surface.formula}`
          : ''}{lab.answersVisible ? `, ${chip.value} ${areaUnit}` : ''}"
        class="absolute max-w-[14rem] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-lg border px-2 py-1 text-left font-mono text-xs leading-tight shadow-lg shadow-ink/20 backdrop-blur-sm {reach(
          chip.pinned,
        )}"
        style:left="{chip.x}px"
        style:top="{chip.y}px"
        style:border-color={chip.tint.border}
        style:background={chip.tint.background}
        style:color={chip.tint.text}
        style:outline={chip.pinned
          ? `2px solid ${chip.tint.border}`
          : undefined}
        style:outline-offset="2px"
        onclick={() => lab.togglePin(chip.target)}
      >
        <span class="block font-sans font-bold"
          >{chip.surface.code} · {domainText(
            chip.surface.name,
          )}{#if lab.showFormulas}
            · <MathText text={chip.surface.formula} />
          {/if}</span
        >
        <span class="block" data-testid="net-face-value-{chip.surface.localId}">
          {#if lab.showFormulas}<MathText text={chip.surface.substitution} /> ={:else}={/if}
          {#if lab.answersVisible}
            <strong><MathText text={chip.value} /></strong>
            {areaUnit}
          {:else}
            <span data-testid="net-face-value-{chip.surface.localId}-hidden"
              >?</span
            >
          {/if}
        </span>
      </button>
    {/each}
  </div>
</div>

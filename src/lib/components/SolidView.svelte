<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import ScaleKey from "$lib/components/ScaleKey.svelte";
  import { evalExact, formatExact } from "$lib/domain/exact";
  import {
    UNITS,
    approximateText,
    formatApproximate,
  } from "$lib/domain/format";
  import {
    centroid,
    normalOf,
    projectPoint,
    rotatePoint,
    type MeasuredEdge,
    type Vec3,
  } from "$lib/domain/geometry3d";
  import { DIMENSION_MAX } from "$lib/domain/types";
  import {
    measureTarget,
    surfaceTarget,
    type LabState,
    type Target,
  } from "$lib/state/lab.svelte";
  import { HATCH_PATTERN_ID, chipTint, facetFill } from "$lib/ui/colors";
  import { fitFraction, gridScale } from "$lib/ui/grid";

  let {
    lab,
    reducedMotion = false,
  }: { lab: LabState; reducedMotion?: boolean } = $props();

  const LIGHT: Vec3 = [-0.32, 0.66, 0.68];

  // The viewBox tracks the element's real pixel size, so one user unit is one
  // CSS pixel: the labels overlaid on top can then be positioned in pixels
  // straight from the projected geometry.
  let boxWidth = $state(900);
  let boxHeight = $state(650);
  const halfWidth = $derived(Math.max(boxWidth, 1) / 2);
  const halfHeight = $derived(Math.max(boxHeight, 1) / 2);
  /** The extent of the largest solid the sliders reach: a sphere of radius 20. */
  const FULL_EXTENT = DIMENSION_MAX;
  const scale = $derived(
    (Math.min(halfWidth, halfHeight) *
      0.78 *
      fitFraction(lab.mesh.extent, FULL_EXTENT)) /
      lab.mesh.extent,
  );

  /**
   * The drawing is always fitted to the screen, so growing a cube would change
   * nothing on its own. The measured dot grid behind it is what shows the size:
   * its dots are a fixed number of units apart, so the solid covers more of
   * them as it grows.
   */
  const GRID_PATTERN_ID = "measured-grid";
  const grid = $derived(gridScale(scale));

  const linear = $derived(UNITS[lab.unit].linear);
  const areaUnit = $derived(UNITS[lab.unit].area);

  interface DrawnFacet {
    surfaceId: string;
    points: string;
    fill: string;
    stroke: string;
    depth: number;
    area: number;
    center: [number, number];
  }

  const facets = $derived.by<DrawnFacet[]>(() => {
    const drawn: DrawnFacet[] = [];
    for (const facet of lab.mesh.facets) {
      const rotated = facet.points.map((point) =>
        rotatePoint(point, lab.yaw, lab.pitch),
      );
      const normal = normalOf(rotated);
      const length = Math.hypot(normal[0], normal[1], normal[2]);
      // Back faces of a closed convex solid are never visible.
      if (length === 0 || normal[2] / length <= 1e-6) continue;

      const unit: Vec3 = [
        normal[0] / length,
        normal[1] / length,
        normal[2] / length,
      ];
      const diffuse = Math.max(
        0,
        unit[0] * LIGHT[0] + unit[1] * LIGHT[1] + unit[2] * LIGHT[2],
      );
      const projected = rotated.map((point) => projectPoint(point, scale));
      // Null hue means "not selected": each selected surface keeps its own.
      const hue = lab.hueFor(facet.surfaceId);

      const fill = facetFill(hue, diffuse);
      drawn.push({
        surfaceId: facet.surfaceId,
        points: projected
          .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
          .join(" "),
        fill,
        // Tessellation seams are hidden so a curved surface reads as curved;
        // real edges between flat faces keep their outline.
        stroke: facet.curved ? fill : "#0b1a22",
        depth: centroid(rotated)[2],
        area: projectedArea(projected),
        center: projectedCentroid(projected),
      });
    }
    return drawn.sort((a, b) => a.depth - b.depth);
  });

  // Which drawn edge the pointer is on. The lab only knows which *length* is
  // active; this is purely about where to put the label.
  let hoveredEdgeId = $state<string | null>(null);

  interface DrawnEdge {
    edge: MeasuredEdge;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    mid: [number, number];
    depth: number;
    active: boolean;
  }

  /**
   * An edge of a convex solid is visible exactly when one of the faces meeting
   * along it faces the viewer. Drawn measurement lines carry no normals: they
   * are placed against the current view and always shown.
   */
  const edges = $derived.by<DrawnEdge[]>(() => {
    const drawn: DrawnEdge[] = [];
    for (const edge of lab.edges) {
      const visible =
        edge.normals.length === 0 ||
        edge.normals.some(
          (normal) => rotatePoint(normal, lab.yaw, lab.pitch)[2] > 1e-6,
        );
      if (!visible) continue;

      const a = rotatePoint(edge.a, lab.yaw, lab.pitch);
      const b = rotatePoint(edge.b, lab.yaw, lab.pitch);
      const [x1, y1] = projectPoint(a, scale);
      const [x2, y2] = projectPoint(b, scale);
      drawn.push({
        edge,
        x1,
        y1,
        x2,
        y2,
        mid: [(x1 + x2) / 2, (y1 + y2) / 2],
        depth: (a[2] + b[2]) / 2,
        active: lab.isActive(measureTarget(edge.measure)),
      });
    }
    return drawn;
  });

  /**
   * One badge per visible surface, at the area-weighted centre of everything
   * that surface currently shows. Weighting by area keeps the badge near the
   * middle of a tessellated sphere or cylinder instead of on one stray tile.
   */
  const badges = $derived.by(() => {
    const totals: Record<string, { x: number; y: number; area: number }> = {};
    for (const facet of facets) {
      const running = (totals[facet.surfaceId] ??= { x: 0, y: 0, area: 0 });
      running.x += facet.center[0] * facet.area;
      running.y += facet.center[1] * facet.area;
      running.area += facet.area;
    }
    return lab.model.surfaces
      .filter((surface) => (totals[surface.id]?.area ?? 0) > 0)
      .map((surface) => {
        const running = totals[surface.id];
        const target = surfaceTarget(surface.id);
        const value = formatExact(surface.exact);
        const rounded = formatApproximate(evalExact(surface.exact)).rounded;
        return {
          surface,
          target,
          tint: chipTint(lab.huesBySurfaceId[surface.id] ?? 0),
          active: lab.isActive(target),
          pinned: lab.isPinned(target),
          value,
          approximate: rounded
            ? approximateText(evalExact(surface.exact))
            : null,
          x: halfWidth + running.x / running.area,
          y: halfHeight + running.y / running.area,
        };
      });
  });

  /**
   * One label per active length. Every edge carrying that length lights up, and
   * the label lands on the edge under the pointer, or on the frontmost one when
   * the length was pinned from the keyboard or the dimension bar.
   */
  const edgeLabels = $derived.by(() => {
    const chosen: Record<string, DrawnEdge> = {};
    for (const drawn of edges) {
      if (!drawn.active) continue;
      const key = drawn.edge.measure;
      const current = chosen[key];
      const preferred = drawn.edge.id === hoveredEdgeId;
      if (
        !current ||
        preferred ||
        (current.edge.id !== hoveredEdgeId && drawn.depth > current.depth)
      ) {
        chosen[key] = drawn;
      }
    }

    return Object.values(chosen).flatMap((drawn) => {
      const measure = lab.measures[drawn.edge.measure];
      if (!measure) return [];
      const target = measureTarget(measure.key);
      const value = evalExact(measure.exact);
      // Nudge the label off the edge so the line it measures stays readable.
      const distance = Math.hypot(drawn.mid[0], drawn.mid[1]);
      const push = distance > 1 ? (distance + 26) / distance : 1;
      return [
        {
          target,
          pinned: lab.isPinned(target),
          working: measure.substitution ?? null,
          text: `${measure.key} = ${formatExact(measure.exact)} ${linear}`,
          approximate: formatApproximate(value).rounded
            ? `${approximateText(value)} ${linear}`
            : null,
          x: halfWidth + drawn.mid[0] * push,
          y: halfHeight + drawn.mid[1] * push,
        },
      ];
    });
  });

  function projectedArea(
    points: readonly (readonly [number, number])[],
  ): number {
    let total = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      total += x1 * y2 - x2 * y1;
    }
    return Math.abs(total) / 2;
  }

  function projectedCentroid(
    points: readonly (readonly [number, number])[],
  ): [number, number] {
    const sum = points.reduce<[number, number]>(
      (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
      [0, 0],
    );
    return [sum[0] / points.length, sum[1] / points.length];
  }

  let dragging = $state(false);
  let dragged = $state(false);
  let last: { x: number; y: number } | null = null;
  let pressed: Target | null = null;

  /** The nearest drawable thing under an event, read straight off the markup. */
  function hitOf(event: Event) {
    const element = event.target as Element | null;
    const node = element?.closest?.("[data-target]") ?? null;
    return {
      target: (node?.getAttribute("data-target") as Target | null) ?? null,
      edgeId: node?.getAttribute("data-edge") ?? null,
    };
  }

  function onPointerOver(event: PointerEvent) {
    if (dragging) return;
    const hit = hitOf(event);
    lab.hover(hit.target);
    hoveredEdgeId = hit.edgeId;
  }

  function clearHover() {
    lab.hover(null);
    hoveredEdgeId = null;
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    dragging = true;
    dragged = false;
    // Capturing the pointer keeps a drag alive outside the drawing, but it also
    // retargets the click that follows to the <svg> itself, so what was pressed
    // has to be remembered from here.
    pressed = hitOf(event).target;
    last = { x: event.clientX, y: event.clientY };
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || !last) return;
    // A few pixels of jitter still counts as a click on the face underneath.
    if (Math.abs(event.clientX - last.x) + Math.abs(event.clientY - last.y) > 3)
      dragged = true;
    lab.rotateBy(
      (event.clientX - last.x) * 0.008,
      (event.clientY - last.y) * 0.008,
    );
    last = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent) {
    dragging = false;
    last = null;
    const target = event.currentTarget as SVGSVGElement;
    if (target.hasPointerCapture(event.pointerId))
      target.releasePointerCapture(event.pointerId);
  }

  function onClick() {
    // A drag that ends on a face is a rotation, not a choice of face.
    if (dragged) {
      dragged = false;
      return;
    }
    if (pressed) lab.togglePin(pressed);
  }

  const STEP = 0.18;

  function onKeyDown(event: KeyboardEvent) {
    // Only when the drawing itself has focus: labels above it handle their own keys.
    if (event.target !== event.currentTarget) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-STEP, 0],
      ArrowRight: [STEP, 0],
      ArrowUp: [0, -STEP],
      ArrowDown: [0, STEP],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      lab.rotateBy(move[0], move[1]);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      lab.resetView();
    }
  }

  // Auto-rotation runs only while the solid view is showing, and never when the
  // viewer has asked for reduced motion.
  $effect(() => {
    if (!lab.autoRotate || lab.view !== "solid" || reducedMotion) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      lab.rotateBy((elapsed / 1000) * 0.5, 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  const description = $derived(
    `${lab.model.name} with ${lab.definition.dimensions
      .map((spec) => `${spec.label.toLowerCase()} ${lab.dimensions[spec.key]}`)
      .join(
        ", ",
      )} ${linear}. Drag or use the arrow keys to rotate. Point at a face or an edge to measure it.`,
  );

  // The chip's colours are set per surface, so only the shape of it is shared.
  const chip =
    "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-lg border px-2 py-1 text-left font-mono text-xs leading-tight shadow-lg shadow-ink/20 backdrop-blur-sm";
  const measureChip = `${chip} border-flag bg-flag-soft/95`;

  /**
   * An open label sits over the very thing it measures, so while it is only
   * following the pointer it stays transparent to it — otherwise it would take
   * the hover away from the face underneath and shut itself again. Once pinned
   * it takes the pointer back, so clicking it can unpin it.
   */
  function reach(pinned: boolean): string {
    return pinned ? "pointer-events-auto" : "pointer-events-none";
  }
</script>

<!--
  The drawing is a focusable image: screen readers announce `description`, and
  sighted keyboard users can rotate it with the arrow keys. Dragging and arrow
  keys here are conveniences — every rotation action also exists as a labelled
  button, and every measurement can be reached from the badges above the shape
  or from the dimension bar, which is the accessible path.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="relative h-full w-full"
  bind:clientWidth={boxWidth}
  bind:clientHeight={boxHeight}
  onpointerleave={clearHover}
>
  <svg
    class="h-full w-full touch-none select-none"
    class:cursor-grab={!dragging}
    class:cursor-grabbing={dragging}
    viewBox="{-halfWidth} {-halfHeight} {halfWidth * 2} {halfHeight * 2}"
    role="img"
    tabindex="0"
    aria-label={description}
    data-testid="solid-view"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onpointerover={onPointerOver}
    onclick={onClick}
    onkeydown={onKeyDown}
  >
    <defs>
      <!-- Anchored half a tile back so a dot lands on the origin, which is the
           centre of the solid: the shape then grows symmetrically across the
           lattice instead of drifting over it. -->
      <pattern
        id={GRID_PATTERN_ID}
        width={grid.gap}
        height={grid.gap}
        patternUnits="userSpaceOnUse"
        patternTransform="translate({-grid.gap / 2} {-grid.gap / 2})"
      >
        <circle cx={grid.gap / 2} cy={grid.gap / 2} r="1.6" fill="#46606f" />
      </pattern>
      <pattern
        id={HATCH_PATTERN_ID}
        width="14"
        height="14"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="14"
          stroke="#1f2937"
          stroke-width="4"
          stroke-opacity="0.45"
        />
      </pattern>
    </defs>

    <rect
      x={-halfWidth}
      y={-halfHeight}
      width={halfWidth * 2}
      height={halfHeight * 2}
      fill="url(#{GRID_PATTERN_ID})"
      opacity="0.35"
      pointer-events="none"
    />

    {#each facets as facet, index (index)}
      <polygon
        points={facet.points}
        fill={facet.fill}
        stroke={facet.stroke}
        stroke-width={facet.stroke === "#0b1a22" &&
        lab.isActive(surfaceTarget(facet.surfaceId))
          ? 4
          : 1.5}
        stroke-linejoin="round"
        data-target={surfaceTarget(facet.surfaceId)}
      />
      {#if lab.isActive(surfaceTarget(facet.surfaceId))}
        <polygon
          points={facet.points}
          fill="url(#{HATCH_PATTERN_ID})"
          stroke="none"
          pointer-events="none"
        />
      {/if}
    {/each}

    {#each edges as drawn (drawn.edge.id)}
      {#if drawn.active || drawn.edge.style === "measure"}
        <line
          x1={drawn.x1}
          y1={drawn.y1}
          x2={drawn.x2}
          y2={drawn.y2}
          stroke={drawn.active ? "#c2410c" : "#0b1a22"}
          stroke-width={drawn.active ? 5 : 2}
          stroke-linecap="round"
          stroke-dasharray={drawn.edge.dashed ? "7 6" : undefined}
          pointer-events="none"
        />
      {/if}
      <!-- A fat invisible line is what the pointer actually has to hit. -->
      <line
        x1={drawn.x1}
        y1={drawn.y1}
        x2={drawn.x2}
        y2={drawn.y2}
        stroke="transparent"
        stroke-width="16"
        stroke-linecap="round"
        class="cursor-pointer"
        data-target={measureTarget(drawn.edge.measure)}
        data-edge={drawn.edge.id}
      />
    {/each}
  </svg>

  <!-- Measurements live above the drawing as real buttons, so they can be read,
       focused and pinned without a pointer. -->
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <ScaleKey {grid} {linear} />

    {#each badges as badge (badge.surface.id)}
      <button
        type="button"
        data-testid="surface-{badge.surface.localId}"
        aria-pressed={badge.pinned}
        aria-label="{badge.surface.name}{lab.showFormulas
          ? `, ${badge.surface.formula}`
          : ''}{lab.answersVisible ? `, ${badge.value} ${areaUnit}` : ''}"
        class={badge.active
          ? `${chip} max-w-[14rem] ${reach(badge.pinned)}`
          : "pointer-events-auto absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-rule/70 bg-panel/80 text-[11px] font-bold text-ink-soft shadow-sm backdrop-blur-sm hover:border-accent hover:text-accent"}
        style:left="{badge.x}px"
        style:top="{badge.y}px"
        style:border-color={badge.active ? badge.tint.border : undefined}
        style:background={badge.active ? badge.tint.background : undefined}
        style:color={badge.active ? badge.tint.text : undefined}
        style:outline={badge.active && badge.pinned
          ? `2px solid ${badge.tint.border}`
          : undefined}
        style:outline-offset="2px"
        onpointerenter={() => lab.hover(badge.target)}
        onpointerleave={() => lab.unhover(badge.target)}
        onfocus={() => lab.hover(badge.target)}
        onblur={() => lab.unhover(badge.target)}
        onclick={() => lab.togglePin(badge.target)}
      >
        {#if badge.active}
          <span class="block font-sans font-bold"
            >{badge.surface.code} · {badge.surface.name}{#if lab.showFormulas}
              · <MathText text={badge.surface.formula} />
            {/if}</span
          >
          <span class="block" data-testid="face-value-{badge.surface.localId}">
            <!-- The working only appears while the fx toggle is on, exactly as
                 it does for the totals. -->
            {#if lab.showFormulas}<MathText text={badge.surface.substitution} /> ={:else}={/if}
            {#if lab.answersVisible}
              <strong><MathText text={badge.value} /></strong>
              {areaUnit}{#if badge.approximate}
                <span class="text-ink-soft"> {badge.approximate}</span>
              {/if}
            {:else}
              <span data-testid="face-value-{badge.surface.localId}-hidden"
                >?</span
              >
            {/if}
          </span>
        {:else}
          {badge.surface.code}
        {/if}
      </button>
    {/each}

    {#each edgeLabels as label (label.target)}
      <button
        type="button"
        data-testid="measure-label"
        data-target={label.target}
        aria-pressed={label.pinned}
        aria-label={label.text}
        class="{measureChip} whitespace-nowrap {reach(label.pinned)}"
        class:ring-2={label.pinned}
        class:ring-flag={label.pinned}
        style:left="{label.x}px"
        style:top="{label.y}px"
        onclick={() => lab.togglePin(label.target)}
      >
        {#if label.working}
          <span class="block text-ink-soft"
            ><MathText text={label.working} /></span
          >
        {/if}
        <span class="block font-bold"><MathText text={label.text} /></span>
        {#if label.approximate}
          <span class="block text-ink-soft">{label.approximate}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

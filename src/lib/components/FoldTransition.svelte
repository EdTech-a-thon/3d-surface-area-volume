<script lang="ts">
  /**
   * The solid opening out into its net, or closing back up.
   *
   * One motion played either way. The sheet is hinged (see folding.ts), so the
   * faces swing about the creases they share and stay joined the whole way; the
   * camera swings with them, from wherever the solid had been turned to face on
   * to the flat net. Both ends are drawn exactly as the view taking over draws
   * them, so handing back over does not move anything.
   */
  import {
    FACE_ON,
    applyRigid,
    buildFoldModel,
    foldMotions,
    invertRotation,
    multiplyRotation,
    slerp,
    viewRotation,
    type FoldModel,
  } from "$lib/domain/folding";
  import { normalOf, type Vec3 } from "$lib/domain/geometry3d";
  import type { Net } from "$lib/domain/nets";
  import { DIMENSION_MAX } from "$lib/domain/types";
  import type { LabState } from "$lib/state/lab.svelte";
  import { facetFill, netFill, netStroke } from "$lib/ui/colors";
  import { fitFraction } from "$lib/ui/grid";
  import { onMount, untrack } from "svelte";

  let {
    lab,
    net,
    direction,
    onComplete,
  }: {
    lab: LabState;
    net: Net;
    /** "open" folds the solid out flat; "close" folds the net back up. */
    direction: "open" | "close";
    onComplete: () => void;
  } = $props();

  const LIGHT: Vec3 = [-0.32, 0.66, 0.68];
  const INK = "#0b1a22";
  const DURATION = 1000;
  /**
   * How much of the motion is given over to letting the creases lag behind one
   * another. The piece that stays put leads and each crease out from it follows
   * a little later, so the fold travels along the sheet the way it would in a
   * pair of hands, rather than every face turning at once.
   */
  const SPREAD = 0.5;

  let boxWidth = $state(900);
  let boxHeight = $state(650);
  const halfWidth = $derived(Math.max(boxWidth, 1) / 2);
  const halfHeight = $derived(Math.max(boxHeight, 1) / 2);

  const model = $derived.by<FoldModel | null>(() =>
    buildFoldModel(net, lab.mesh),
  );

  /** Exactly the scale the solid view fits the shape to. */
  const solidScale = $derived(
    (Math.min(halfWidth, halfHeight) *
      0.78 *
      fitFraction(lab.mesh.extent, DIMENSION_MAX)) /
      lab.mesh.extent,
  );

  /** Exactly the scale the net view fits the sheet to. */
  const netScale = $derived.by(() => {
    const width = net.bounds.maxX - net.bounds.minX || 1;
    const height = net.bounds.maxY - net.bounds.minY || 1;
    const pad = Math.max(width, height) * 0.07;
    const wanted = { w: width + pad * 2, h: height + pad * 2 };
    const aspect = Math.max(boxWidth, 1) / Math.max(boxHeight, 1);
    const fitted = wanted.w / wanted.h < aspect ? wanted.h * aspect : wanted.w;
    const zoom = fitFraction(Math.max(width, height) / 2, DIMENSION_MAX * 2);
    return Math.max(boxWidth, 1) / (fitted / zoom);
  });

  /**
   * Which way each piece's outline happens to be wound, settled once on the
   * closed solid where "outwards" means something. The net and the mesh were
   * drawn without reference to one another, so a piece's corners may run either
   * way round; deciding per frame instead would make the shading flicker while
   * the sheet is flat.
   */
  const facing = $derived.by<number[]>(() => {
    if (!model) return [];
    const motions = foldMotions(model.pieces, () => 1);
    const closed = model.pieces.map((piece, index) =>
      piece.flat.map((point) => applyRigid(motions[index], point)),
    );
    let middle: Vec3 = [0, 0, 0];
    let corners = 0;
    for (const points of closed) {
      for (const point of points) {
        middle = [
          middle[0] + point[0],
          middle[1] + point[1],
          middle[2] + point[2],
        ];
        corners += 1;
      }
    }
    middle = [middle[0] / corners, middle[1] / corners, middle[2] / corners];

    return closed.map((points) => {
      const normal = normalOf(points);
      const away: Vec3 = [
        points[0][0] - middle[0],
        points[0][1] - middle[1],
        points[0][2] - middle[2],
      ];
      const facingOut =
        normal[0] * away[0] + normal[1] * away[1] + normal[2] * away[2];
      return facingOut >= 0 ? 1 : -1;
    });
  });

  /** The orientation the net view looks at the flat sheet through. */
  const netRotation = $derived(
    model
      ? multiplyRotation(FACE_ON, invertRotation(model.placement.r))
      : FACE_ON,
  );
  const solidRotation = $derived(viewRotation(lab.yaw, lab.pitch));
  /** Where the flat sheet's middle sits once placed, which the net view centres. */
  const netPivot = $derived<Vec3>(
    model
      ? applyRigid(model.placement, [model.netCenter[0], model.netCenter[1], 0])
      : [0, 0, 0],
  );

  function smooth(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  }

  /** How far through its own turn a piece is, given the fold's progress. */
  function foldedBy(depth: number, maxDepth: number, run: number): number {
    const start = maxDepth === 0 ? 0 : (depth / maxDepth) * SPREAD;
    return smooth((run - start) / (1 - SPREAD));
  }

  function mixNumber(from: number, to: number, t: number): number {
    return from + (to - from) * t;
  }

  function channels(color: string): [number, number, number] {
    if (color.startsWith("#")) {
      return [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ];
    }
    const [h, s, l] = color
      .slice(4, -1)
      .split(" ")
      .map((part) => Number.parseFloat(part));
    const saturation = s / 100;
    const lightness = l / 100;
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lightness - c / 2;
    const sector = Math.floor(h / 60) % 6;
    const table: [number, number, number][] = [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ];
    const [r, g, b] = table[sector];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  /** Blend two colours, whatever notation each was written in. */
  function mixColor(from: string, to: string, t: number): string {
    const a = channels(from);
    const b = channels(to);
    return `rgb(${Math.round(mixNumber(a[0], b[0], t))} ${Math.round(
      mixNumber(a[1], b[1], t),
    )} ${Math.round(mixNumber(a[2], b[2], t))})`;
  }

  interface Drawn {
    key: number;
    surfaceId: string;
    points: string;
    fill: string;
    stroke: string;
    depth: number;
  }

  /**
   * The fold's progress: 1 is the closed solid, 0 is the flat net. Where it
   * starts is deliberately a snapshot — one run of this component is one fold,
   * and the direction it set off in does not change under it.
   */
  let closedness = $state(untrack(() => (direction === "open" ? 1 : 0)));

  const drawn = $derived.by<Drawn[]>(() => {
    const sheet = model;
    if (!sheet) return [];

    const shut = closedness;
    const motions = foldMotions(sheet.pieces, (piece) =>
      direction === "open"
        ? 1 - foldedBy(piece.depth, sheet.maxDepth, 1 - shut)
        : foldedBy(piece.depth, sheet.maxDepth, shut),
    );

    // The camera swings round with the sheet: from however the solid had been
    // turned, to looking straight at the flat net.
    const turn = slerp(netRotation, solidRotation, shut);
    const size = Math.exp(
      mixNumber(Math.log(netScale), Math.log(solidScale), shut),
    );
    const pivot: Vec3 = [
      netPivot[0] * (1 - shut),
      netPivot[1] * (1 - shut),
      netPivot[2] * (1 - shut),
    ];

    const seen = (point: Vec3): Vec3 => {
      const placed = applyRigid(sheet.placement, point);
      const x = placed[0] - pivot[0];
      const y = placed[1] - pivot[1];
      const z = placed[2] - pivot[2];
      return [
        turn[0] * x + turn[1] * y + turn[2] * z,
        turn[3] * x + turn[4] * y + turn[5] * z,
        turn[6] * x + turn[7] * y + turn[8] * z,
      ];
    };

    const faces: Drawn[] = [];
    sheet.pieces.forEach((piece, index) => {
      const viewed = piece.flat.map((point) =>
        seen(applyRigid(motions[index], point)),
      );
      const normal = normalOf(viewed);
      const size3 = Math.hypot(normal[0], normal[1], normal[2]) || 1;
      const side = facing[index] ?? 1;
      const lit = Math.max(
        0,
        ((normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2]) *
          side) /
          size3,
      );

      const hue = lab.hueFor(piece.surfaceId);
      const base = lab.definition.baseHue ?? null;
      // Shaded like the solid at one end, flat like the net at the other.
      const fill = mixColor(
        netFill(hue, base),
        facetFill(hue, lit, base),
        shut,
      );
      const stroke = piece.curved
        ? fill
        : mixColor(netStroke(hue, base), INK, shut);

      let depth = 0;
      for (const point of viewed) depth += point[2];
      faces.push({
        key: index,
        surfaceId: piece.surfaceId,
        points: viewed
          .map(
            (point) =>
              `${(halfWidth + point[0] * size).toFixed(2)},${(
                halfHeight -
                point[1] * size
              ).toFixed(2)}`,
          )
          .join(" "),
        fill,
        stroke,
        depth: depth / viewed.length,
      });
    });

    return faces.sort((a, b) => a.depth - b.depth);
  });

  onMount(() => {
    if (!model) {
      onComplete();
      return;
    }
    const from = direction === "open" ? 1 : 0;
    const to = direction === "open" ? 0 : 1;
    const started = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const run = Math.min(1, (now - started) / DURATION);
      closedness = mixNumber(from, to, run);
      // Hand over a frame after the last one, not on it: the view taking over
      // draws exactly what the fold ended on, and giving that final position a
      // frame to be painted is what keeps the swap from showing.
      frame = requestAnimationFrame(run < 1 ? step : () => onComplete());
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

<div
  class="absolute inset-0 h-full w-full"
  bind:clientWidth={boxWidth}
  bind:clientHeight={boxHeight}
  data-testid="fold-view"
  data-closedness={closedness.toFixed(3)}
  aria-hidden="true"
>
  <svg class="h-full w-full" viewBox="0 0 {boxWidth} {boxHeight}">
    {#each drawn as face (face.key)}
      <polygon
        data-surface={face.surfaceId}
        points={face.points}
        fill={face.fill}
        stroke={face.stroke}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    {/each}
  </svg>
</div>

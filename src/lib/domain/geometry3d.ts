/**
 * Polygon meshes for the 3D view.
 *
 * These meshes exist only to draw the solid. Curved surfaces are tessellated
 * here, but the displayed areas and volumes always come from the analytic
 * formulas in solids.ts, never from this geometry.
 */
import type { Dimensions, SolidKind } from "./types";

export type Vec3 = readonly [number, number, number];

export interface Facet {
  /** Namespaced surface id shared with the calculation list and the net. */
  readonly surfaceId: string;
  readonly points: readonly Vec3[];
  /**
   * True when this polygon is one tile of a tessellated curved surface. Those
   * tiles are drawn without seam outlines so a sphere reads as a sphere rather
   * than a wireframe globe.
   */
  readonly curved: boolean;
}

export interface SolidMesh {
  readonly facets: readonly Facet[];
  /** Largest distance from the origin to any vertex, for fitting the viewport. */
  readonly extent: number;
}

/**
 * A line on the solid whose length is one of its measurements. Hovering or
 * pinning one shows that length; every edge sharing a `measure` lights up
 * together, which is how a student sees that all four "length" edges of a
 * prism really are the same edge repeated.
 */
export interface MeasuredEdge {
  readonly id: string;
  /** Dimension key (l, w, r…) or derived key (c, s) this line measures. */
  readonly measure: string;
  readonly a: Vec3;
  readonly b: Vec3;
  /**
   * "edge" lies along a real crease of the solid and is only drawn when the
   * pointer is on it; "measure" is a drawn measurement line on a curved solid,
   * which has no crease to point at and so is always shown.
   */
  readonly style: "edge" | "measure";
  /**
   * Outward normals of the faces meeting at a crease. An edge of a convex
   * solid is visible exactly when one of them faces the viewer. Measurement
   * lines carry none: they are placed on the silhouette and always visible.
   */
  readonly normals: readonly Vec3[];
  /** Dashed, in the usual textbook sense: the line passes through the solid. */
  readonly dashed: boolean;
}

/** Segments used to tessellate a full circle. Higher is smoother but heavier. */
const CIRCLE_SEGMENTS = 48;
const SPHERE_MERIDIANS = 32;
const SPHERE_PARALLELS = 20;

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function centroid(points: readonly Vec3[]): Vec3 {
  const sum = points.reduce<[number, number, number]>(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
    [0, 0, 0],
  );
  return [
    sum[0] / points.length,
    sum[1] / points.length,
    sum[2] / points.length,
  ];
}

/** Newell's method, which tolerates the near-degenerate strips on curved surfaces. */
export function normalOf(points: readonly Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    x += (current[1] - next[1]) * (current[2] + next[2]);
    y += (current[2] - next[2]) * (current[0] + next[0]);
    z += (current[0] - next[0]) * (current[1] + next[1]);
  }
  return [x, y, z];
}

/**
 * Build a facet with outward winding. Every solid here is convex and centred on
 * the origin, so a facet's own centroid is a reliable "outwards" hint.
 */
function facet(
  surfaceId: string,
  points: readonly Vec3[],
  curved = false,
): Facet {
  const unique = points.filter((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    return subtract(point, previous).some(
      (component) => Math.abs(component) > 1e-9,
    );
  });
  const usable = unique.length >= 3 ? unique : points;
  const outward =
    dot(normalOf(usable), centroid(usable)) >= 0
      ? usable
      : [...usable].reverse();
  return { surfaceId, points: outward, curved };
}

function boxFacets(
  kind: SolidKind,
  hx: number,
  hy: number,
  hz: number,
): Facet[] {
  const id = (local: string) => `${kind}:${local}`;
  return [
    facet(id("top"), [
      [-hx, hy, -hz],
      [hx, hy, -hz],
      [hx, hy, hz],
      [-hx, hy, hz],
    ]),
    facet(id("bottom"), [
      [-hx, -hy, -hz],
      [hx, -hy, -hz],
      [hx, -hy, hz],
      [-hx, -hy, hz],
    ]),
    facet(id("front"), [
      [-hx, -hy, hz],
      [hx, -hy, hz],
      [hx, hy, hz],
      [-hx, hy, hz],
    ]),
    facet(id("back"), [
      [-hx, -hy, -hz],
      [hx, -hy, -hz],
      [hx, hy, -hz],
      [-hx, hy, -hz],
    ]),
    facet(id("left"), [
      [-hx, -hy, -hz],
      [-hx, -hy, hz],
      [-hx, hy, hz],
      [-hx, hy, -hz],
    ]),
    facet(id("right"), [
      [hx, -hy, -hz],
      [hx, -hy, hz],
      [hx, hy, hz],
      [hx, hy, -hz],
    ]),
  ];
}

function ring(radius: number, y: number, segments: number): Vec3[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (i / segments) * Math.PI * 2;
    return [radius * Math.cos(angle), y, radius * Math.sin(angle)] as Vec3;
  });
}

function extentOf(facets: readonly Facet[]): number {
  let extent = 0;
  for (const item of facets) {
    for (const point of item.points) {
      extent = Math.max(extent, Math.hypot(point[0], point[1], point[2]));
    }
  }
  return extent || 1;
}

function mesh(facets: Facet[]): SolidMesh {
  return { facets, extent: extentOf(facets) };
}

/**
 * Right angle at the origin corner; legs a along x and b along y, then extruded
 * along z. Shifted so the solid's interior contains the origin, which is what
 * lets {@link facet} orient every polygon outwards from its own centroid.
 */
function prismFrame(d: Dimensions) {
  const [ox, oy, hz] = [d.a / 3, d.b / 3, d.p / 2];
  return {
    hz,
    corner: (x: number, y: number, z: number): Vec3 => [x - ox, y - oy, z],
  };
}

export function buildMesh(kind: SolidKind, d: Dimensions): SolidMesh {
  switch (kind) {
    case "rectangularPrism": {
      const [hx, hy, hz] = [d.l / 2, d.h / 2, d.w / 2];
      return mesh(boxFacets(kind, hx, hy, hz));
    }
    case "cube": {
      const half = d.s / 2;
      return mesh(boxFacets(kind, half, half, half));
    }
    case "triangularPrism": {
      const { a, b } = d;
      const { hz, corner } = prismFrame(d);
      const id = (local: string) => `${kind}:${local}`;
      const facets = [
        facet(id("baseFront"), [
          corner(0, 0, hz),
          corner(a, 0, hz),
          corner(0, b, hz),
        ]),
        facet(id("baseBack"), [
          corner(0, 0, -hz),
          corner(a, 0, -hz),
          corner(0, b, -hz),
        ]),
        facet(id("faceA"), [
          corner(0, 0, -hz),
          corner(a, 0, -hz),
          corner(a, 0, hz),
          corner(0, 0, hz),
        ]),
        facet(id("faceB"), [
          corner(0, 0, -hz),
          corner(0, b, -hz),
          corner(0, b, hz),
          corner(0, 0, hz),
        ]),
        facet(id("faceC"), [
          corner(a, 0, -hz),
          corner(0, b, -hz),
          corner(0, b, hz),
          corner(a, 0, hz),
        ]),
      ];
      return mesh(facets);
    }
    case "cylinder": {
      const { r, h } = d;
      const half = h / 2;
      const id = (local: string) => `${kind}:${local}`;
      const bottom = ring(r, -half, CIRCLE_SEGMENTS);
      const top = ring(r, half, CIRCLE_SEGMENTS);
      const facets: Facet[] = [
        facet(id("bottom"), bottom),
        facet(id("top"), top),
        ...bottom.map((point, i) => {
          const next = (i + 1) % CIRCLE_SEGMENTS;
          return facet(
            id("side"),
            [point, bottom[next], top[next], top[i]],
            true,
          );
        }),
      ];
      return mesh(facets);
    }
    case "cone": {
      const { r, h } = d;
      const half = h / 2;
      const id = (local: string) => `${kind}:${local}`;
      const base = ring(r, -half, CIRCLE_SEGMENTS);
      const apex: Vec3 = [0, half, 0];
      const facets: Facet[] = [
        facet(id("base"), base),
        ...base.map((point, i) =>
          facet(
            id("side"),
            [point, base[(i + 1) % CIRCLE_SEGMENTS], apex],
            true,
          ),
        ),
      ];
      return mesh(facets);
    }
    case "sphere": {
      const { r } = d;
      const id = `${kind}:surface`;
      const facets: Facet[] = [];
      for (let row = 0; row < SPHERE_PARALLELS; row += 1) {
        const phi0 = -Math.PI / 2 + (row / SPHERE_PARALLELS) * Math.PI;
        const phi1 = -Math.PI / 2 + ((row + 1) / SPHERE_PARALLELS) * Math.PI;
        for (let column = 0; column < SPHERE_MERIDIANS; column += 1) {
          const theta0 = (column / SPHERE_MERIDIANS) * Math.PI * 2;
          const theta1 = ((column + 1) / SPHERE_MERIDIANS) * Math.PI * 2;
          const at = (phi: number, theta: number): Vec3 => [
            r * Math.cos(phi) * Math.cos(theta),
            r * Math.sin(phi),
            r * Math.cos(phi) * Math.sin(theta),
          ];
          facets.push(
            facet(
              id,
              [
                at(phi0, theta0),
                at(phi0, theta1),
                at(phi1, theta1),
                at(phi1, theta0),
              ],
              true,
            ),
          );
        }
      }
      return mesh(facets);
    }
  }
}

function boxEdges(
  kind: SolidKind,
  half: readonly [number, number, number],
  keys: readonly [string, string, string],
): MeasuredEdge[] {
  const [hx, hy, hz] = half;
  const edges: MeasuredEdge[] = [];
  const push = (measure: string, a: Vec3, b: Vec3, normals: Vec3[]) =>
    edges.push({
      id: `${kind}:edge:${edges.length}`,
      measure,
      a,
      b,
      style: "edge",
      normals,
      dashed: false,
    });

  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      push(
        keys[0],
        [-hx, sy * hy, sz * hz],
        [hx, sy * hy, sz * hz],
        [
          [0, sy, 0],
          [0, 0, sz],
        ],
      );
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      push(
        keys[1],
        [sx * hx, -hy, sz * hz],
        [sx * hx, hy, sz * hz],
        [
          [sx, 0, 0],
          [0, 0, sz],
        ],
      );
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      push(
        keys[2],
        [sx * hx, sy * hy, -hz],
        [sx * hx, sy * hy, hz],
        [
          [sx, 0, 0],
          [0, sy, 0],
        ],
      );
    }
  }
  return edges;
}

/**
 * The model-space direction that projects to screen right. Rotating it lands on
 * depth zero, so a point of a convex solid taken in this direction is always on
 * the silhouette — which is what keeps a drawn radius or height line in view
 * however the solid has been turned.
 */
function screenRight(yaw: number): Vec3 {
  return [Math.cos(yaw), 0, Math.sin(yaw)];
}

/**
 * Lines whose lengths are the solid's measurements.
 *
 * Flat solids have real creases to point at, so their edges are fixed in model
 * space. A cylinder, cone or sphere has no crease along its radius or height,
 * so those are drawn measurement lines placed against the current view.
 */
export function buildEdges(
  kind: SolidKind,
  d: Dimensions,
  yaw: number,
  pitch: number,
): MeasuredEdge[] {
  const right = screenRight(yaw);
  /** A point on the silhouette, `radius` out from the axis at height `y`. */
  const rim = (radius: number, y: number): Vec3 => [
    right[0] * radius,
    y,
    right[2] * radius,
  ];
  const line = (
    measure: string,
    a: Vec3,
    b: Vec3,
    dashed: boolean,
  ): MeasuredEdge => ({
    id: `${kind}:measure:${measure}`,
    measure,
    a,
    b,
    style: "measure",
    normals: [],
    dashed,
  });

  switch (kind) {
    case "rectangularPrism":
      return boxEdges(kind, [d.l / 2, d.h / 2, d.w / 2], ["l", "h", "w"]);
    case "cube":
      return boxEdges(kind, [d.s / 2, d.s / 2, d.s / 2], ["s", "s", "s"]);
    case "triangularPrism": {
      const { a, b } = d;
      const { hz, corner } = prismFrame(d);
      const legA: Vec3 = [0, -1, 0];
      const legB: Vec3 = [-1, 0, 0];
      // The hypotenuse face contains (a, 0) and (0, b), so (b, a, 0) is normal
      // to it and points away from the right-angled corner.
      const hypotenuse: Vec3 = [b, a, 0];
      const edges: MeasuredEdge[] = [];
      const push = (measure: string, a2: Vec3, b2: Vec3, normals: Vec3[]) =>
        edges.push({
          id: `${kind}:edge:${edges.length}`,
          measure,
          a: a2,
          b: b2,
          style: "edge",
          normals,
          dashed: false,
        });

      for (const sz of [-1, 1]) {
        const z = sz * hz;
        const base: Vec3 = [0, 0, sz];
        push("a", corner(0, 0, z), corner(a, 0, z), [legA, base]);
        push("b", corner(0, 0, z), corner(0, b, z), [legB, base]);
        push("c", corner(a, 0, z), corner(0, b, z), [hypotenuse, base]);
      }
      push("p", corner(0, 0, -hz), corner(0, 0, hz), [legA, legB]);
      push("p", corner(a, 0, -hz), corner(a, 0, hz), [legA, hypotenuse]);
      push("p", corner(0, b, -hz), corner(0, b, hz), [legB, hypotenuse]);
      return edges;
    }
    case "cylinder": {
      const half = d.h / 2;
      // The radius is drawn on whichever disk the viewer can see.
      const disk = pitch >= 0 ? half : -half;
      return [
        line("r", [0, disk, 0], rim(d.r, disk), false),
        line("h", rim(d.r, -half), rim(d.r, half), false),
      ];
    }
    case "cone": {
      const half = d.h / 2;
      return [
        // Radius and height run through the solid, so both are dashed in the
        // usual textbook sense; the slant height is the silhouette itself.
        line("r", [0, -half, 0], rim(d.r, -half), true),
        line("h", [0, -half, 0], [0, half, 0], true),
        line("s", rim(d.r, -half), [0, half, 0], false),
      ];
    }
    case "sphere":
      return [line("r", [0, 0, 0], rim(d.r, 0), true)];
  }
}

/** Rotate by yaw about the vertical axis, then pitch about the horizontal axis. */
export function rotatePoint(point: Vec3, yaw: number, pitch: number): Vec3 {
  const [x, y, z] = point;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  return [x1, y2, z2];
}

/** Orthographic projection into SVG coordinates, where y grows downwards. */
export function projectPoint(point: Vec3, scale: number): [number, number] {
  return [point[0] * scale, -point[1] * scale];
}

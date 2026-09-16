/**
 * Flat nets.
 *
 * Every piece is laid out in the solid's own length units, so one viewBox
 * scales the whole net at once and no piece can be resized independently of
 * its neighbours. Coordinates use SVG conventions: y grows downwards.
 */
import { exactSqrt, formatExact } from "./exact";
import { add, fromTenths, pow, toDecimalString } from "./rational";
import type { Dimensions, SolidKind } from "./types";

export type Vec2 = readonly [number, number];

interface PieceBase {
  readonly surfaceId: string;
  /** Where the surface badge sits. */
  readonly labelAt: Vec2;
  /** Short description of the piece's own measurements. */
  readonly sizeText: string;
}

export type NetPiece =
  | (PieceBase & {
      readonly shape: "polygon";
      readonly points: readonly Vec2[];
    })
  | (PieceBase & {
      readonly shape: "circle";
      readonly center: Vec2;
      readonly radius: number;
    })
  | (PieceBase & {
      readonly shape: "sector";
      readonly apex: Vec2;
      readonly radius: number;
      /** Start angle in radians, measured in SVG coordinates. */
      readonly startAngle: number;
      readonly sweepAngle: number;
    })
  | (PieceBase & {
      readonly shape: "annularSector";
      readonly apex: Vec2;
      readonly innerRadius: number;
      readonly outerRadius: number;
      /** Start angle in radians, measured in SVG coordinates. */
      readonly startAngle: number;
      readonly sweepAngle: number;
    });

export interface NetBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface Net {
  readonly pieces: readonly NetPiece[];
  readonly bounds: NetBounds;
}

function dec(value: number): string {
  return toDecimalString(fromTenths(value)) ?? String(value);
}

function rectangle(
  surfaceId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  sizeText: string,
): NetPiece {
  return {
    shape: "polygon",
    surfaceId,
    sizeText,
    labelAt: [x + width / 2, y + height / 2],
    points: [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ],
  };
}

function polygonCentroid(points: readonly Vec2[]): Vec2 {
  const sum = points.reduce<[number, number]>(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
    [0, 0],
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

function boundsOf(pieces: readonly NetPiece[]): NetBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const piece of pieces) {
    if (piece.shape === "polygon") {
      for (const [x, y] of piece.points) include(x, y);
    } else if (piece.shape === "circle") {
      include(piece.center[0] - piece.radius, piece.center[1] - piece.radius);
      include(piece.center[0] + piece.radius, piece.center[1] + piece.radius);
    } else {
      // Sample the arc rather than guess which cardinal extremes it reaches.
      // A sector also contains its apex; an annular sector does not.
      if (piece.shape === "sector") include(piece.apex[0], piece.apex[1]);
      const radii =
        piece.shape === "sector"
          ? [piece.radius]
          : [piece.innerRadius, piece.outerRadius];
      const steps = 64;
      for (const radius of radii) {
        for (let i = 0; i <= steps; i += 1) {
          const angle = piece.startAngle + (piece.sweepAngle * i) / steps;
          include(
            piece.apex[0] + radius * Math.cos(angle),
            piece.apex[1] + radius * Math.sin(angle),
          );
        }
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function boxNet(kind: SolidKind, l: number, w: number, h: number): Net {
  const id = (local: string) => `${kind}:${local}`;
  // A cross: left, front, right and back in one strip, with top and bottom
  // folded off the front face.
  const pieces: NetPiece[] = [
    rectangle(id("left"), 0, 0, w, h, `${dec(w)} × ${dec(h)}`),
    rectangle(id("front"), w, 0, l, h, `${dec(l)} × ${dec(h)}`),
    rectangle(id("right"), w + l, 0, w, h, `${dec(w)} × ${dec(h)}`),
    rectangle(id("back"), w + l + w, 0, l, h, `${dec(l)} × ${dec(h)}`),
    rectangle(id("top"), w, -w, l, w, `${dec(l)} × ${dec(w)}`),
    rectangle(id("bottom"), w, h, l, w, `${dec(l)} × ${dec(w)}`),
  ];
  return { pieces, bounds: boundsOf(pieces) };
}

/** Segments per rounded corner when the logo tile is drawn flat. */
const TILE_CORNER_SEGMENTS = 8;

/**
 * The logo tile as one polygon: the square of side m grown outwards by the
 * corner radius c. The arcs are tessellated, as curved surfaces are everywhere
 * else here — the drawing approximates, the areas in solids.ts do not.
 */
function tilePolygon(cx: number, cy: number, m: number, c: number): Vec2[] {
  const half = m / 2;
  const centres: readonly (readonly [number, number])[] = [
    [half, half],
    [-half, half],
    [-half, -half],
    [half, -half],
  ];
  return centres.flatMap(([ox, oy], k) =>
    Array.from({ length: TILE_CORNER_SEGMENTS + 1 }, (_, i): Vec2 => {
      const angle = ((k + i / TILE_CORNER_SEGMENTS) * Math.PI) / 2;
      return [cx + ox + c * Math.cos(angle), cy + oy + c * Math.sin(angle)];
    }),
  );
}

export function buildNet(kind: SolidKind, d: Dimensions): Net | null {
  const id = (local: string) => `${kind}:${local}`;

  switch (kind) {
    case "rectangularPrism":
      return boxNet(kind, d.l, d.w, d.h);
    case "cube":
      return boxNet(kind, d.s, d.s, d.s);
    case "triangularPrism": {
      const { a, b, p } = d;
      const c = Math.hypot(a, b);
      // Exact text, so an irrational hypotenuse reads as √2 rather than 1.41.
      const cText = formatExact(
        exactSqrt(add(pow(fromTenths(a), 2), pow(fromTenths(b), 2))),
      );
      const triangleText = `legs ${dec(a)} and ${dec(b)}`;
      const front: readonly Vec2[] = [
        [0, 0],
        [a, 0],
        [0, -b],
      ];
      const back: readonly Vec2[] = [
        [0, p],
        [a, p],
        [0, p + b],
      ];
      const pieces: NetPiece[] = [
        rectangle(id("faceA"), 0, 0, a, p, `${dec(a)} × ${dec(p)}`),
        rectangle(id("faceB"), a, 0, b, p, `${dec(b)} × ${dec(p)}`),
        rectangle(id("faceC"), a + b, 0, c, p, `${cText} × ${dec(p)}`),
        {
          shape: "polygon",
          surfaceId: id("baseFront"),
          sizeText: triangleText,
          labelAt: polygonCentroid(front),
          points: front,
        },
        {
          shape: "polygon",
          surfaceId: id("baseBack"),
          sizeText: triangleText,
          labelAt: polygonCentroid(back),
          points: back,
        },
      ];
      return {
        pieces,
        bounds: boundsOf(pieces),
      };
    }
    case "cylinder": {
      const { r, h } = d;
      const width = 2 * Math.PI * r;
      const pieces: NetPiece[] = [
        rectangle(id("side"), 0, 0, width, h, `2πr × h`),
        {
          shape: "circle",
          surfaceId: id("top"),
          sizeText: `radius ${dec(r)}`,
          center: [width / 2, -r],
          radius: r,
          labelAt: [width / 2, -r],
        },
        {
          shape: "circle",
          surfaceId: id("bottom"),
          sizeText: `radius ${dec(r)}`,
          center: [width / 2, h + r],
          radius: r,
          labelAt: [width / 2, h + r],
        },
      ];
      return {
        pieces,
        bounds: boundsOf(pieces),
      };
    }
    case "cone": {
      const { r, h } = d;
      const slant = Math.hypot(r, h);
      const sweep = (2 * Math.PI * r) / slant;
      // Sector opens downwards from the apex; the base disk sits tangent to the
      // middle of the arc, which keeps it clear of the sector for any sweep.
      const pieces: NetPiece[] = [
        {
          shape: "sector",
          surfaceId: id("side"),
          sizeText: "radius s, arc 2πr",
          apex: [0, 0],
          radius: slant,
          startAngle: Math.PI / 2 - sweep / 2,
          sweepAngle: sweep,
          labelAt: [0, slant * 0.6],
        },
        {
          shape: "circle",
          surfaceId: id("base"),
          sizeText: `radius ${dec(r)}`,
          center: [0, slant + r],
          radius: r,
          labelAt: [0, slant + r],
        },
      ];
      return {
        pieces,
        bounds: boundsOf(pieces),
      };
    }
    case "sphere":
      return null;
    case "logoSlab": {
      const { m, r, b, h } = d;
      const slant = Math.hypot(h, b);
      const pieces: NetPiece[] = [];

      // Each straight bevel face is still a rectangle: both parallel edges are
      // m long, and their perpendicular separation on the face is the slant t.
      for (let k = 0; k < 4; k += 1) {
        pieces.push(
          rectangle(id(`flat${k + 1}`), k * m, 0, m, slant, `${dec(m)} × t`),
        );
      }

      // The four rounded corners together are a complete conical frustum. Cut
      // once and it opens into an annular sector. Similar triangles give the
      // radii from the imaginary cone apex; its sweep makes the outer arc
      // exactly the bottom circumference 2π(r + b).
      const innerRadius = (r * slant) / b;
      const outerRadius = ((r + b) * slant) / b;
      const sweepAngle = (2 * Math.PI * b) / slant;
      const sectorApex: Vec2 = [4 * m + outerRadius + 1, slant / 2];
      const startAngle = Math.PI - sweepAngle / 2;
      const middleAngle = startAngle + sweepAngle / 2;
      const middleRadius = (innerRadius + outerRadius) / 2;
      pieces.push({
        shape: "annularSector",
        surfaceId: id("corners"),
        sizeText: "radii r and r + b, slant t",
        apex: sectorApex,
        innerRadius,
        outerRadius,
        startAngle,
        sweepAngle,
        labelAt: [
          sectorApex[0] + middleRadius * Math.cos(middleAngle),
          sectorApex[1] + middleRadius * Math.sin(middleAngle),
        ],
      });

      // The top and bottom are separate pieces, as a cylinder's disks are. The
      // larger bottom makes the keyboard-key taper explicit even while flat.
      const topReach = m / 2 + r;
      const bottomReach = m / 2 + r + b;
      const topPoints = tilePolygon(m / 2, -topReach, m, r);
      pieces.push({
        shape: "polygon",
        surfaceId: id("top"),
        sizeText: `straight side ${dec(m)}, radius ${dec(r)}`,
        labelAt: [m / 2, -topReach],
        points: topPoints,
      });
      const bottomPoints = tilePolygon(m / 2, slant + bottomReach, m, r + b);
      pieces.push({
        shape: "polygon",
        surfaceId: id("bottom"),
        sizeText: `straight side ${dec(m)}, radius ${dec(r + b)}`,
        labelAt: [m / 2, slant + bottomReach],
        points: bottomPoints,
      });
      return { pieces, bounds: boundsOf(pieces) };
    }
  }
}

/** SVG path data for a sector piece. */
export function sectorPath(
  piece: Extract<NetPiece, { shape: "sector" }>,
): string {
  const { apex, radius, startAngle, sweepAngle } = piece;
  const start: Vec2 = [
    apex[0] + radius * Math.cos(startAngle),
    apex[1] + radius * Math.sin(startAngle),
  ];
  const end: Vec2 = [
    apex[0] + radius * Math.cos(startAngle + sweepAngle),
    apex[1] + radius * Math.sin(startAngle + sweepAngle),
  ];
  const largeArc = sweepAngle > Math.PI ? 1 : 0;
  return `M ${apex[0]} ${apex[1]} L ${start[0]} ${start[1]} A ${radius} ${radius} 0 ${largeArc} 1 ${end[0]} ${end[1]} Z`;
}

/** SVG path data for the unrolled rounded bevel: one annular sector. */
export function annularSectorPath(
  piece: Extract<NetPiece, { shape: "annularSector" }>,
): string {
  const { apex, innerRadius, outerRadius, startAngle, sweepAngle } = piece;
  const point = (radius: number, angle: number): Vec2 => [
    apex[0] + radius * Math.cos(angle),
    apex[1] + radius * Math.sin(angle),
  ];
  const endAngle = startAngle + sweepAngle;
  const outerStart = point(outerRadius, startAngle);
  const outerEnd = point(outerRadius, endAngle);
  const innerEnd = point(innerRadius, endAngle);
  const innerStart = point(innerRadius, startAngle);
  const largeArc = sweepAngle > Math.PI ? 1 : 0;
  return [
    `M ${outerStart[0]} ${outerStart[1]}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd[0]} ${outerEnd[1]}`,
    `L ${innerEnd[0]} ${innerEnd[1]}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart[0]} ${innerStart[1]}`,
    "Z",
  ].join(" ");
}

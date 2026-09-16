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
      include(piece.apex[0], piece.apex[1]);
      // Sample the arc rather than guess which extremes it reaches.
      const steps = 64;
      for (let i = 0; i <= steps; i += 1) {
        const angle = piece.startAngle + (piece.sweepAngle * i) / steps;
        include(
          piece.apex[0] + piece.radius * Math.cos(angle),
          piece.apex[1] + piece.radius * Math.sin(angle),
        );
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

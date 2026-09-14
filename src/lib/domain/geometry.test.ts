import { describe, expect, it } from "vitest";
import { evalExact, formatExact } from "./exact";
import { buildEdges, buildMesh, rotatePoint } from "./geometry3d";
import { buildNet, type NetPiece } from "./nets";
import { SOLIDS, buildSolid } from "./solids";
import { SOLID_ORDER, type Dimensions, type SolidKind } from "./types";

const SAMPLES: Record<SolidKind, Dimensions> = {
  rectangularPrism: { l: 3, w: 4, h: 5 },
  cube: { s: 2 },
  triangularPrism: { a: 3, b: 4, p: 5 },
  cylinder: { r: 2, h: 3 },
  cone: { r: 3, h: 4 },
  sphere: { r: 3 },
};

function exactSurfaceArea(kind: SolidKind, dimensions: Dimensions) {
  return formatExact(buildSolid(kind, dimensions).surfaceArea.exact);
}

function exactVolume(kind: SolidKind, dimensions: Dimensions) {
  return formatExact(buildSolid(kind, dimensions).volume.exact);
}

function doubled(dimensions: Dimensions): Dimensions {
  return Object.fromEntries(
    Object.entries(dimensions).map(([key, value]) => [key, value * 2]),
  );
}

describe("acceptance examples", () => {
  it("computes a 3 × 4 × 5 rectangular prism", () => {
    expect(exactSurfaceArea("rectangularPrism", { l: 3, w: 4, h: 5 })).toBe(
      "94",
    );
    expect(exactVolume("rectangularPrism", { l: 3, w: 4, h: 5 })).toBe("60");
  });

  it("computes a cube with side 2", () => {
    expect(exactSurfaceArea("cube", { s: 2 })).toBe("24");
    expect(exactVolume("cube", { s: 2 })).toBe("8");
  });

  it("computes a right-triangular prism with legs 3 and 4 and length 5", () => {
    const model = buildSolid("triangularPrism", { a: 3, b: 4, p: 5 });
    expect(formatExact(model.derived[0].exact)).toBe("5");
    expect(formatExact(model.surfaceArea.exact)).toBe("72");
    expect(formatExact(model.volume.exact)).toBe("30");
  });

  it("computes a cylinder with radius 2 and height 3", () => {
    expect(exactSurfaceArea("cylinder", { r: 2, h: 3 })).toBe("20π");
    expect(exactVolume("cylinder", { r: 2, h: 3 })).toBe("12π");
  });

  it("computes a cone with radius 3 and height 4", () => {
    const model = buildSolid("cone", { r: 3, h: 4 });
    expect(formatExact(model.derived[0].exact)).toBe("5");
    expect(formatExact(model.surfaceArea.exact)).toBe("24π");
    expect(formatExact(model.volume.exact)).toBe("12π");
  });

  it("computes a sphere with radius 3 and offers no net", () => {
    expect(exactSurfaceArea("sphere", { r: 3 })).toBe("36π");
    expect(exactVolume("sphere", { r: 3 })).toBe("36π");
    expect(SOLIDS.sphere.hasNet).toBe(false);
    expect(buildNet("sphere", { r: 3 })).toBeNull();
  });
});

describe("exact expressions keep radicals", () => {
  it("reports a unit cone surface area as (1 + √2)π rather than a rounded coefficient", () => {
    expect(exactSurfaceArea("cone", { r: 1, h: 1 })).toBe("(1 + √2)π");
  });

  it("keeps an irrational hypotenuse exact in a prism surface area", () => {
    const model = buildSolid("triangularPrism", { a: 1, b: 1, p: 1 });
    expect(formatExact(model.derived[0].exact)).toBe("√2");
    expect(formatExact(model.surfaceArea.exact)).toBe("3 + √2");
  });

  it("keeps non-terminating coefficients as fractions", () => {
    expect(exactVolume("cone", { r: 1, h: 1 })).toBe("π/3");
    expect(exactVolume("sphere", { r: 1 })).toBe("4π/3");
  });

  it("formats tenths exactly", () => {
    expect(exactVolume("cube", { s: 0.1 })).toBe("0.001");
    expect(
      exactSurfaceArea("rectangularPrism", { l: 0.1, w: 0.2, h: 0.3 }),
    ).toBe("0.22");
  });

  it("approximates π with calculator π, not 3.14", () => {
    const value = evalExact(
      buildSolid("cylinder", { r: 2, h: 3 }).surfaceArea.exact,
    );
    expect(value).toBeCloseTo(20 * Math.PI, 12);
    expect(value).not.toBeCloseTo(20 * 3.14, 6);
  });
});

describe("invariants", () => {
  it("produces finite positive areas and volumes across the input range", () => {
    for (const kind of SOLID_ORDER) {
      for (const value of [0.1, 0.5, 1, 7.3, 20]) {
        const dimensions = Object.fromEntries(
          SOLIDS[kind].dimensions.map((spec) => [spec.key, value]),
        );
        const model = buildSolid(kind, dimensions);
        const area = evalExact(model.surfaceArea.exact);
        const volume = evalExact(model.volume.exact);
        expect(Number.isFinite(area) && area > 0).toBe(true);
        expect(Number.isFinite(volume) && volume > 0).toBe(true);
      }
    }
  });

  it("makes total surface area the sum of its surface terms, each counted once", () => {
    for (const kind of SOLID_ORDER) {
      const model = buildSolid(kind, SAMPLES[kind]);
      const sum = model.surfaces.reduce(
        (total, surface) => total + evalExact(surface.exact),
        0,
      );
      expect(sum).toBeCloseTo(evalExact(model.surfaceArea.exact), 10);
      expect(new Set(model.surfaces.map((surface) => surface.id)).size).toBe(
        model.surfaces.length,
      );
    }
  });

  it("namespaces surface ids by solid kind", () => {
    for (const kind of SOLID_ORDER) {
      const model = buildSolid(kind, SAMPLES[kind]);
      for (const surface of model.surfaces)
        expect(surface.id.startsWith(`${kind}:`)).toBe(true);
    }
  });

  it("multiplies surface area by 4 and volume by 8 when every dimension doubles", () => {
    for (const kind of SOLID_ORDER) {
      const base = {
        l: 1.5,
        w: 2,
        h: 2.5,
        s: 1.5,
        a: 1.5,
        b: 2,
        p: 2.5,
        r: 1.5,
      };
      const dimensions = Object.fromEntries(
        SOLIDS[kind].dimensions.map((spec) => [
          spec.key,
          base[spec.key as keyof typeof base],
        ]),
      );
      const small = buildSolid(kind, dimensions);
      const large = buildSolid(kind, doubled(dimensions));
      expect(evalExact(large.surfaceArea.exact)).toBeCloseTo(
        4 * evalExact(small.surfaceArea.exact),
        9,
      );
      expect(evalExact(large.volume.exact)).toBeCloseTo(
        8 * evalExact(small.volume.exact),
        9,
      );
    }
  });

  it("agrees with the cube formulas when a rectangular prism has equal dimensions", () => {
    const prism = buildSolid("rectangularPrism", { l: 2.5, w: 2.5, h: 2.5 });
    const cube = buildSolid("cube", { s: 2.5 });
    expect(formatExact(prism.surfaceArea.exact)).toBe(
      formatExact(cube.surfaceArea.exact),
    );
    expect(formatExact(prism.volume.exact)).toBe(
      formatExact(cube.volume.exact),
    );
  });

  it("gives a cylinder three times the volume of a cone with the same radius and height", () => {
    const cylinder = buildSolid("cylinder", { r: 2.4, h: 5.5 });
    const cone = buildSolid("cone", { r: 2.4, h: 5.5 });
    expect(evalExact(cylinder.volume.exact)).toBeCloseTo(
      3 * evalExact(cone.volume.exact),
      10,
    );
  });

  it("uses the slant height for a cone surface and the perpendicular height for its volume", () => {
    const model = buildSolid("cone", { r: 3, h: 4 });
    const side = model.surfaces.find((surface) => surface.localId === "side");
    expect(evalExact(side!.exact)).toBeCloseTo(Math.PI * 3 * 5, 10);
    expect(evalExact(model.volume.exact)).toBeCloseTo(
      (Math.PI * 9 * 4) / 3,
      10,
    );
  });
});

describe("nets", () => {
  it("matches a cone sector arc to the base circumference and its area to the curved side", () => {
    const dimensions = { r: 3, h: 4 };
    const net = buildNet("cone", dimensions)!;
    const sector = net.pieces.find((piece) => piece.shape === "sector")!;
    expect(sector.shape).toBe("sector");
    if (sector.shape !== "sector") throw new Error("expected a sector");

    expect(sector.radius).toBeCloseTo(5, 12);
    expect(sector.sweepAngle).toBeGreaterThan(0);
    expect(sector.sweepAngle).toBeLessThan(2 * Math.PI);
    expect(sector.radius * sector.sweepAngle).toBeCloseTo(
      2 * Math.PI * dimensions.r,
      10,
    );

    const sectorArea = (sector.radius ** 2 * sector.sweepAngle) / 2;
    const curved = buildSolid("cone", dimensions).surfaces.find(
      (s) => s.localId === "side",
    )!;
    expect(sectorArea).toBeCloseTo(evalExact(curved.exact), 10);
  });

  it("keeps the cone base disk clear of the sector", () => {
    const net = buildNet("cone", { r: 5, h: 0.5 })!;
    const sector = net.pieces.find((piece) => piece.shape === "sector")!;
    const base = net.pieces.find((piece) => piece.shape === "circle")!;
    if (sector.shape !== "sector" || base.shape !== "circle")
      throw new Error("unexpected pieces");
    // Every sector point is within the slant height of the apex; every base
    // point is at least that far away.
    const distanceToApex = Math.hypot(
      base.center[0] - sector.apex[0],
      base.center[1] - sector.apex[1],
    );
    expect(distanceToApex - base.radius).toBeGreaterThanOrEqual(
      sector.radius - 1e-9,
    );
  });

  it("gives the cylinder a 2πr by h rectangle and two radius-r disks", () => {
    const net = buildNet("cylinder", { r: 2, h: 3 })!;
    const rectangle = net.pieces.find(
      (piece) => piece.surfaceId === "cylinder:side",
    )!;
    if (rectangle.shape !== "polygon") throw new Error("expected a polygon");
    const xs = rectangle.points.map(([x]) => x);
    const ys = rectangle.points.map(([, y]) => y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2 * Math.PI * 2, 12);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(3, 12);

    const disks = net.pieces.filter((piece) => piece.shape === "circle");
    expect(disks).toHaveLength(2);
    for (const disk of disks) {
      if (disk.shape !== "circle") throw new Error("expected a circle");
      expect(disk.radius).toBeCloseTo(2, 12);
    }
  });

  it("preserves every surface area in the flat nets of the developable solids", () => {
    for (const kind of [
      "rectangularPrism",
      "cube",
      "triangularPrism",
    ] as const) {
      const net = buildNet(kind, SAMPLES[kind])!;
      const model = buildSolid(kind, SAMPLES[kind]);
      for (const surface of model.surfaces) {
        const piece = net.pieces.find(
          (candidate) => candidate.surfaceId === surface.id,
        )!;
        expect(piece, `${surface.id} has a net piece`).toBeDefined();
        if (piece.shape !== "polygon") throw new Error("expected a polygon");
        expect(polygonArea(piece.points)).toBeCloseTo(
          evalExact(surface.exact),
          9,
        );
      }
      expect(net.pieces).toHaveLength(model.surfaces.length);
    }
  });

  it("lays out net pieces without overlapping", () => {
    for (const kind of [
      "rectangularPrism",
      "cube",
      "triangularPrism",
    ] as const) {
      const net = buildNet(kind, SAMPLES[kind])!;
      const boxes = net.pieces.map((piece) => pieceBox(piece));
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const overlapX =
            Math.min(boxes[i].maxX, boxes[j].maxX) -
            Math.max(boxes[i].minX, boxes[j].minX);
          const overlapY =
            Math.min(boxes[i].maxY, boxes[j].maxY) -
            Math.max(boxes[i].minY, boxes[j].minY);
          const area = Math.max(0, overlapX) * Math.max(0, overlapY);
          // Triangles share a bounding box corner with the strip they fold from,
          // so only a positive-area overlap counts as a genuine collision.
          expect(area, `${kind} pieces ${i} and ${j} overlap`).toBeLessThan(
            1e-9,
          );
        }
      }
    }
  });
});

describe("3D meshes", () => {
  it("covers every surface of every solid with outward-facing polygons", () => {
    for (const kind of SOLID_ORDER) {
      const model = buildSolid(kind, SAMPLES[kind]);
      const mesh = buildMesh(kind, SAMPLES[kind]);
      const covered = new Set(mesh.facets.map((facet) => facet.surfaceId));
      expect([...covered].sort()).toEqual(
        model.surfaces.map((surface) => surface.id).sort(),
      );
      expect(mesh.extent).toBeGreaterThan(0);
      for (const facet of mesh.facets)
        expect(facet.points.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("offers a measurable line for every dimension of every solid", () => {
    for (const kind of SOLID_ORDER) {
      const edges = buildEdges(kind, SAMPLES[kind], 0.4, 0.3);
      const measured = new Set(edges.map((edge) => edge.measure));
      for (const spec of SOLIDS[kind].dimensions) {
        expect(measured, `${kind} can measure ${spec.key}`).toContain(spec.key);
      }
    }
  });

  it("measures each line at the length it claims", () => {
    const expected: Record<string, number> = { c: 5, s: 5 };
    for (const kind of SOLID_ORDER) {
      const dimensions = SAMPLES[kind];
      for (const edge of buildEdges(kind, dimensions, 0.4, 0.3)) {
        const length = Math.hypot(
          edge.b[0] - edge.a[0],
          edge.b[1] - edge.a[1],
          edge.b[2] - edge.a[2],
        );
        const want = dimensions[edge.measure] ?? expected[edge.measure];
        expect(want, `${kind} knows ${edge.measure}`).toBeDefined();
        expect(length, `${kind} ${edge.measure}`).toBeCloseTo(want, 9);
      }
    }
  });

  it("places curved-solid measurement lines where the viewer can see them", () => {
    // Every one of them lies in the plane through the solid's axis that faces
    // the viewer, so no part of it is ever hidden round the back: drop the
    // height of a point and its remaining depth is zero at any yaw.
    for (const kind of ["cylinder", "cone", "sphere"] as const) {
      for (const yaw of [0, 0.7, 2.5, -1.9]) {
        for (const edge of buildEdges(kind, SAMPLES[kind], yaw, 0.3)) {
          expect(edge.style).toBe("measure");
          for (const point of [edge.a, edge.b]) {
            const depth = rotatePoint([point[0], 0, point[2]], yaw, 0.3)[2];
            expect(depth, `${kind} ${edge.measure}`).toBeCloseTo(0, 9);
          }
        }
      }
    }
  });
});

function polygonArea(points: readonly (readonly [number, number])[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    total += x1 * y2 - x2 * y1;
  }
  return Math.abs(total) / 2;
}

function pieceBox(piece: NetPiece) {
  if (piece.shape !== "polygon") throw new Error("expected a polygon");
  const xs = piece.points.map(([x]) => x);
  const ys = piece.points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

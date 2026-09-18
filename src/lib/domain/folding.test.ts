import { describe, expect, it } from "vitest";
import { buildFoldModel, foldMotions, applyRigid } from "./folding";
import type { FoldModel } from "./folding";
import { buildMesh, type Vec3 } from "./geometry3d";
import { buildNet } from "./nets";
import { SOLID_KINDS, type Dimensions, type SolidKind } from "./types";

const SAMPLES: Record<SolidKind, Dimensions> = {
  rectangularPrism: { l: 3, w: 4, h: 5 },
  cube: { s: 2 },
  triangularPrism: { a: 3, b: 4, p: 5 },
  squarePyramid: { b: 6, h: 4 },
  cylinder: { r: 2, h: 3 },
  cone: { r: 3, h: 4 },
  sphere: { r: 3 },
  logoSlab: { m: 4, r: 1, b: 1.5, h: 2 },
};

/** The solids whose nets are laid out as one joined sheet. */
const FOLDABLE = SOLID_KINDS.filter(
  (kind) => kind !== "sphere" && kind !== "logoSlab",
);

function modelFor(kind: SolidKind): FoldModel {
  const net = buildNet(kind, SAMPLES[kind]);
  if (!net) throw new Error(`${kind} has no net`);
  const model = buildFoldModel(net, buildMesh(kind, SAMPLES[kind]));
  if (!model) throw new Error(`${kind} could not be folded`);
  return model;
}

/** How far the solid reaches, so errors can be judged against its size. */
function extentOf(kind: SolidKind): number {
  let extent = 0;
  for (const facet of buildMesh(kind, SAMPLES[kind]).facets) {
    for (const point of facet.points)
      extent = Math.max(extent, Math.hypot(...point));
  }
  return extent;
}

function gap(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe("folding a net into its solid", () => {
  it.each(FOLDABLE)("closes %s onto the mesh the solid view draws", (kind) => {
    const model = modelFor(kind);
    // Curved solids are folded as the many-sided prisms the mesh draws them as,
    // so they close to within that tessellation rather than exactly.
    expect(model.closure).toBeLessThan(extentOf(kind) * 0.005);
  });

  it.each(FOLDABLE)("leaves %s flat exactly as the net lays it out", (kind) => {
    const model = modelFor(kind);
    const motions = foldMotions(model.pieces, () => 0);
    for (const [index, piece] of model.pieces.entries()) {
      for (const corner of piece.flat) {
        expect(gap(applyRigid(motions[index], corner), corner)).toBeLessThan(
          1e-9,
        );
      }
    }
  });

  /**
   * The point of hinging every piece to a neighbour: a face can swing about its
   * crease but can never come away from it. Corners a piece shares with its
   * parent have to stay in one place — including part way through, and
   * including when the two are folding by different amounts, which is what the
   * staggered fold does.
   */
  it.each(FOLDABLE)("keeps %s joined along its creases", (kind) => {
    const model = modelFor(kind);
    const reach = extentOf(kind);

    for (const stagger of [false, true]) {
      for (const fraction of [0.15, 0.4, 0.75, 1]) {
        const motions = foldMotions(model.pieces, (piece) =>
          stagger
            ? // Deeper pieces trailing behind their parents, as they do on screen.
              fraction * (1 - piece.depth / (model.maxDepth + 1))
            : fraction,
        );

        model.pieces.forEach((piece, index) => {
          if (piece.parent === null) return;
          const parent = model.pieces[piece.parent];
          let shared = 0;
          for (const corner of piece.flat) {
            const onParent = parent.flat.some(
              (other) => gap(corner, other) < 1e-9,
            );
            if (!onParent) continue;
            shared += 1;
            expect(
              gap(
                applyRigid(motions[index], corner),
                applyRigid(motions[piece.parent as number], corner),
              ),
            ).toBeLessThan(reach * 1e-9);
          }
          // A creased piece shares the whole crease; a resting one touches at
          // a single corner, which still may never come away from its parent.
          expect(shared).toBeGreaterThanOrEqual(piece.resting ? 1 : 2);
        });
      }
    }
  });

  it("refuses a net that was never laid out as one joined sheet", () => {
    const kind = "logoSlab";
    const net = buildNet(kind, SAMPLES[kind]);
    expect(net).not.toBeNull();
    expect(buildFoldModel(net!, buildMesh(kind, SAMPLES[kind]))).toBeNull();
  });

  it("hangs every piece off exactly one other, with one staying put", () => {
    for (const kind of FOLDABLE) {
      const model = modelFor(kind);
      const roots = model.pieces.filter((piece) => piece.parent === null);
      expect(roots).toHaveLength(1);
      // Parents are listed before their children, so one pass folds the sheet.
      model.pieces.forEach((piece, index) => {
        if (piece.parent !== null) expect(piece.parent).toBeLessThan(index);
      });
    }
  });
});

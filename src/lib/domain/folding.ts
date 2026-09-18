/**
 * Folding a net up into its solid.
 *
 * The move between the two views is one motion played in either direction: the
 * flat net turns about its own creases until it closes into the solid. Every
 * piece is hinged to a neighbour, so a face can only ever swing about the crease
 * it shares — the sheet stays joined however far the fold has gone, and nothing
 * is free to drift off on its own.
 *
 * The pieces here are the drawn facets, not the named surfaces: a cylinder's
 * side is one surface but forty-eight creased strips, which is exactly what
 * lets it roll up. Curved solids are therefore folded like the many-sided
 * prisms the mesh already draws them as, and close to within that tessellation.
 */
import { normalOf, type SolidMesh, type Vec3 } from "./geometry3d";
import type { Net, NetPiece, Vec2 } from "./nets";

/** A rotation about the origin followed by a translation. Row-major 3×3. */
export interface Rigid {
  readonly r: readonly number[];
  readonly t: Vec3;
}

/**
 * The turn that carries a piece from where its parent holds it to where the
 * closed solid wants it: so many radians about a line, and for the few pieces
 * that need it a slide along that same line.
 */
export interface Hinge {
  readonly at: Vec3;
  readonly axis: Vec3;
  readonly angle: number;
  readonly slide: number;
}

/** One flat piece of the sheet, and the crease that joins it to its parent. */
export interface FoldPiece {
  readonly surfaceId: string;
  /** The outline laid flat, in the net's own coordinates, at z = 0. */
  readonly flat: readonly Vec3[];
  /** Tile of a tessellated surface, whose seams are drawn without outlines. */
  readonly curved: boolean;
  /** Index of the piece this one hangs from; null for the piece that stays put. */
  readonly parent: number | null;
  readonly hinge: Hinge | null;
  /**
   * True for a piece that only rests against its parent, as a lid rests on the
   * tube it closes. It touches at a point rather than along a crease, so its
   * turn is worked out from where the solid needs it rather than read off a
   * shared edge, and it seats to within the tessellation instead of exactly.
   */
  readonly resting: boolean;
  /** How many creases lie between this piece and the one that stays put. */
  readonly depth: number;
}

export interface FoldModel {
  /** Parents always come before their children, so one pass folds the sheet. */
  readonly pieces: readonly FoldPiece[];
  readonly maxDepth: number;
  /** Places the closed sheet onto the mesh the solid view draws. */
  readonly placement: Rigid;
  /** The middle of the flat sheet, which is what the net view centres on. */
  readonly netCenter: Vec2;
  /** Worst gap between the closed sheet and the mesh, in the solid's units. */
  readonly closure: number;
}

const EPSILON = 1e-9;

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

function scale(a: Vec3, by: number): Vec3 {
  return [a[0] * by, a[1] * by, a[2] * by];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function normalize(a: Vec3): Vec3 {
  const size = length(a);
  return size < EPSILON ? [0, 0, 0] : [a[0] / size, a[1] / size, a[2] / size];
}

function centroidOf3(points: readonly Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const point of points) {
    x += point[0];
    y += point[1];
    z += point[2];
  }
  return [x / points.length, y / points.length, z / points.length];
}

function centroidOf2(points: readonly Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const [px, py] of points) {
    x += px;
    y += py;
  }
  return [x / points.length, y / points.length];
}

function matrixProduct(a: readonly number[], b: readonly number[]): number[] {
  const r = new Array<number>(9);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      r[row * 3 + column] =
        a[row * 3] * b[column] +
        a[row * 3 + 1] * b[3 + column] +
        a[row * 3 + 2] * b[6 + column];
    }
  }
  return r;
}

function transposed(r: readonly number[]): number[] {
  return [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
}

export function applyRigid(m: Rigid, p: Vec3): Vec3 {
  const r = m.r;
  return [
    r[0] * p[0] + r[1] * p[1] + r[2] * p[2] + m.t[0],
    r[3] * p[0] + r[4] * p[1] + r[5] * p[2] + m.t[1],
    r[6] * p[0] + r[7] * p[1] + r[8] * p[2] + m.t[2],
  ];
}

/** The motion that does `inner` first and then `outer`. */
function composeRigid(outer: Rigid, inner: Rigid): Rigid {
  return {
    r: matrixProduct(outer.r, inner.r),
    t: applyRigid(outer, inner.t),
  };
}

function invertRigid(m: Rigid): Rigid {
  const r = transposed(m.r);
  return { r, t: applyRigid({ r, t: [0, 0, 0] }, scale(m.t, -1)) };
}

const IDENTITY: Rigid = { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };

/** Turning by `angle` about the line through `at` in direction `axis`. */
function rotationAbout(at: Vec3, axis: Vec3, angle: number): Rigid {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = 1 - c;
  // Rodrigues, written out.
  const r = [
    c + x * x * k,
    x * y * k - z * s,
    x * z * k + y * s,
    y * x * k + z * s,
    c + y * y * k,
    y * z * k - x * s,
    z * x * k - y * s,
    z * y * k + x * s,
    c + z * z * k,
  ];
  const spun = applyRigid({ r, t: [0, 0, 0] }, at);
  return { r, t: subtract(at, spun) };
}

/** Part of the way through a hinge's turn, and its slide along the same line. */
function hingeAt(hinge: Hinge, fraction: number): Rigid {
  const turn = rotationAbout(hinge.at, hinge.axis, hinge.angle * fraction);
  if (hinge.slide === 0) return turn;
  const slid = scale(hinge.axis, hinge.slide * fraction);
  return { r: turn.r, t: add(turn.t, slid) };
}

/**
 * Read a rigid motion back as a turn about a line, with a slide along it.
 *
 * Any rigid motion is one of these, so a piece whose place on the solid was
 * worked out rather than creased can still be moved there the same way every
 * other piece moves: by swinging about a line that stays put.
 */
function hingeOf(m: Rigid): Hinge {
  const q = toQuaternion(m.r);
  const w = Math.max(-1, Math.min(1, q[0]));
  const sine = Math.hypot(q[1], q[2], q[3]);
  if (sine < 1e-7) {
    // No turn at all: a straight slide.
    const axis = normalize(m.t);
    return {
      at: [0, 0, 0],
      axis: length(axis) < 0.5 ? [0, 0, 1] : axis,
      angle: 0,
      slide: length(m.t),
    };
  }

  const angle = 2 * Math.acos(w);
  const axis: Vec3 = [q[1] / sine, q[2] / sine, q[3] / sine];
  const slide = dot(axis, m.t);
  // What is left once the slide is taken out is a pure turn, so solve for a
  // point the turn leaves alone. In the plane across the axis that is a 2×2.
  const across = subtract(m.t, scale(axis, slide));
  const u = normalize(
    Math.abs(axis[0]) < 0.9 ? cross(axis, [1, 0, 0]) : cross(axis, [0, 1, 0]),
  );
  const v = cross(axis, u);
  const b1 = dot(across, u);
  const b2 = dot(across, v);
  const a = 1 - Math.cos(angle);
  const s = Math.sin(angle);
  const determinant = a * a + s * s;
  if (determinant < EPSILON) {
    return { at: [0, 0, 0], axis, angle, slide };
  }
  const c1 = (a * b1 - s * b2) / determinant;
  const c2 = (s * b1 + a * b2) / determinant;
  return { at: add(scale(u, c1), scale(v, c2)), axis, angle, slide };
}

/** The unit normal a wound polygon faces. */
function unitNormal(points: readonly Vec3[]): Vec3 {
  return normalize(normalOf(points));
}

/**
 * An orthonormal frame read off three points of a polygon, as a rotation whose
 * columns are its axes. Always right-handed, so the motions built from it are
 * turns rather than reflections.
 */
function frameOf(a: Vec3, b: Vec3, c: Vec3): readonly number[] | null {
  const e1 = normalize(subtract(b, a));
  const e3 = normalize(cross(e1, subtract(c, a)));
  if (length(e1) < 0.5 || length(e3) < 0.5) return null;
  const e2 = cross(e3, e1);
  return [e1[0], e2[0], e3[0], e1[1], e2[1], e3[1], e1[2], e2[2], e3[2]];
}

/** Three spread-out corners of a polygon, which pin a frame down steadily. */
function spread(points: readonly Vec3[]): [number, number, number] | null {
  if (points.length < 3) return null;
  let far = 1;
  let farthest = -1;
  for (let i = 1; i < points.length; i += 1) {
    const d = length(subtract(points[i], points[0]));
    if (d > farthest) {
      farthest = d;
      far = i;
    }
  }
  let off = -1;
  let offmost = -1;
  const axis = normalize(subtract(points[far], points[0]));
  for (let i = 1; i < points.length; i += 1) {
    if (i === far) continue;
    const d = length(cross(axis, subtract(points[i], points[0])));
    if (d > offmost) {
      offmost = d;
      off = i;
    }
  }
  if (off < 0 || offmost < EPSILON) return null;
  return [0, far, off];
}

/**
 * Every turn that carries one polygon onto another congruent one.
 *
 * The two outlines describe the same face but need not start at the same
 * corner, so every way round and every starting corner is tried. Turning a flat
 * piece over is allowed: that is how a face laid out mirrored in the net still
 * folds onto its place on the solid.
 *
 * A square face fits its place eight different ways and a rectangle four, and
 * only one of those also puts the rest of the sheet where it belongs — so this
 * hands back every fit, and the caller settles it on the whole sheet rather
 * than on the one face.
 */
function alignmentsOf(
  from: readonly Vec3[],
  to: readonly Vec3[],
): { motion: Rigid; residual: number }[] {
  if (from.length !== to.length || from.length < 3) return [];
  const picks = spread(from);
  if (!picks) return [];
  const fromFrame = frameOf(from[picks[0]], from[picks[1]], from[picks[2]]);
  if (!fromFrame) return [];
  const inverse = transposed(fromFrame);

  const found: { motion: Rigid; residual: number }[] = [];
  const count = to.length;
  for (const forwards of [true, false]) {
    for (let shift = 0; shift < count; shift += 1) {
      const order = Array.from({ length: count }, (_, index) =>
        forwards
          ? to[(index + shift) % count]
          : to[(count - index + shift) % count],
      );
      const frame = frameOf(order[picks[0]], order[picks[1]], order[picks[2]]);
      if (!frame) continue;
      const r = matrixProduct(frame, inverse);
      const moved = applyRigid({ r, t: [0, 0, 0] }, from[picks[0]]);
      const motion: Rigid = { r, t: subtract(order[picks[0]], moved) };
      let residual = 0;
      for (let index = 0; index < count; index += 1) {
        residual = Math.max(
          residual,
          length(subtract(applyRigid(motion, from[index]), order[index])),
        );
      }
      found.push({ motion, residual });
    }
  }
  return found.sort((a, b) => a.residual - b.residual);
}

function pointOnCircle(center: Vec2, radius: number, angle: number): Vec2 {
  return [
    center[0] + radius * Math.cos(angle),
    center[1] + radius * Math.sin(angle),
  ];
}

/**
 * The flat outline of one drawn facet, cut out of the net piece its surface was
 * laid out as. A surface drawn with a single facet keeps the whole piece; a
 * tessellated one is divided the way the mesh divides it, so every tile has a
 * crease to turn about.
 */
function flatFacet(
  piece: NetPiece,
  index: number,
  count: number,
  corners: number,
): Vec2[] | null {
  if (piece.shape === "polygon") {
    if (count === 1) return [...piece.points];
    // A rectangle cut into upright strips: the cylinder's rolled side.
    const xs = piece.points.map(([x]) => x);
    const ys = piece.points.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const left = minX + ((maxX - minX) * index) / count;
    const right = minX + ((maxX - minX) * (index + 1)) / count;
    return [
      [left, minY],
      [right, minY],
      [right, maxY],
      [left, maxY],
    ];
  }

  if (piece.shape === "circle") {
    if (count !== 1) return null;
    return Array.from({ length: corners }, (_, corner) =>
      pointOnCircle(
        piece.center,
        piece.radius,
        (corner / corners) * Math.PI * 2,
      ),
    );
  }

  if (piece.shape === "sector") {
    const from = piece.startAngle + (piece.sweepAngle * index) / count;
    const to = piece.startAngle + (piece.sweepAngle * (index + 1)) / count;
    return [
      piece.apex,
      pointOnCircle(piece.apex, piece.radius, from),
      pointOnCircle(piece.apex, piece.radius, to),
    ];
  }

  // An annular sector belongs to a sheet that was never laid out joined up.
  return null;
}

function edgeKey(a: Vec2, b: Vec2): string {
  const first = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
  const [p, q] = first ? [a, b] : [b, a];
  return `${p[0].toFixed(5)},${p[1].toFixed(5)}|${q[0].toFixed(5)},${q[1].toFixed(5)}`;
}

/** The middle of the edge of a polygon that faces a given place. */
function facingEdge(
  points: readonly Vec2[],
  to: Vec2,
): { at: Vec2; along: Vec2; d: number } {
  let best = { at: points[0], along: [1, 0] as Vec2, d: Infinity };
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const at: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(at[0] - to[0], at[1] - to[1]);
    if (d < best.d) best = { at, along: [b[0] - a[0], b[1] - a[1]], d };
  }
  return best;
}

interface Draft {
  surfaceId: string;
  shape: NetPiece["shape"];
  flat: Vec2[];
  facet: readonly Vec3[];
  curved: boolean;
  center: Vec2;
}

/**
 * Cut the net into one flat piece per drawn facet, paired with the facet it
 * becomes. Returns null when a piece cannot be cut to match — the logo tile is
 * laid out as loose parts rather than a joined sheet, and there is nothing
 * there to fold.
 */
function draftsFor(net: Net, mesh: SolidMesh): Draft[] | null {
  const pieceBySurface: Record<string, NetPiece> = {};
  for (const piece of net.pieces) pieceBySurface[piece.surfaceId] = piece;

  const groups: Record<string, number> = {};
  for (const facet of mesh.facets) {
    groups[facet.surfaceId] = (groups[facet.surfaceId] ?? 0) + 1;
  }

  const seen: Record<string, number> = {};
  const drafts: Draft[] = [];
  for (const facet of mesh.facets) {
    const piece = pieceBySurface[facet.surfaceId];
    if (!piece) return null;
    const index = seen[facet.surfaceId] ?? 0;
    seen[facet.surfaceId] = index + 1;
    const flat = flatFacet(
      piece,
      index,
      groups[facet.surfaceId],
      facet.points.length,
    );
    if (!flat || flat.length !== facet.points.length) return null;
    drafts.push({
      surfaceId: facet.surfaceId,
      shape: piece.shape,
      flat,
      facet: facet.points,
      curved: facet.curved,
      center: centroidOf2(flat),
    });
  }
  return drafts;
}

interface Joint {
  parent: number;
  hinge: [Vec2, Vec2];
  /** True when the piece only rests against its parent, as a lid does. */
  resting: boolean;
}

/**
 * Who hangs from whom. Two pieces are joined where their outlines share an
 * edge; a disc, which only ever touches its neighbour at a point, rests on the
 * edge it faces and has its exact turn worked out later.
 */
function jointsOf(drafts: readonly Draft[], root: number): (Joint | null)[] {
  const byEdge: Record<string, { index: number; hinge: [Vec2, Vec2] }[]> = {};
  drafts.forEach((draft, index) => {
    for (let i = 0; i < draft.flat.length; i += 1) {
      const a = draft.flat[i];
      const b = draft.flat[(i + 1) % draft.flat.length];
      (byEdge[edgeKey(a, b)] ??= []).push({ index, hinge: [a, b] });
    }
  });

  const neighbours: { to: number; hinge: [Vec2, Vec2] }[][] = drafts.map(
    () => [],
  );
  for (const sharing of Object.values(byEdge)) {
    if (sharing.length !== 2) continue;
    const [a, b] = sharing;
    neighbours[a.index].push({ to: b.index, hinge: a.hinge });
    neighbours[b.index].push({ to: a.index, hinge: a.hinge });
  }

  const joints: (Joint | null)[] = drafts.map(() => null);
  const reached = drafts.map(() => false);
  reached[root] = true;
  const queue = [root];
  while (queue.length) {
    const current = queue.shift() as number;
    for (const link of neighbours[current]) {
      if (reached[link.to]) continue;
      reached[link.to] = true;
      joints[link.to] = { parent: current, hinge: link.hinge, resting: false };
      queue.push(link.to);
    }
  }

  let settled = true;
  while (settled) {
    settled = false;
    for (let index = 0; index < drafts.length; index += 1) {
      if (reached[index] || drafts[index].shape !== "circle") continue;
      const center = drafts[index].center;
      let best: { parent: number; at: Vec2; along: Vec2; d: number } | null =
        null;
      for (let other = 0; other < drafts.length; other += 1) {
        if (!reached[other]) continue;
        const facing = facingEdge(drafts[other].flat, center);
        if (!best || facing.d < best.d) best = { parent: other, ...facing };
      }
      if (!best) continue;
      const radius = Math.hypot(
        drafts[index].flat[0][0] - center[0],
        drafts[index].flat[0][1] - center[1],
      );
      // Only a disc resting against its neighbour, not one parked elsewhere.
      if (Math.abs(best.d - radius) > radius * 0.05) continue;
      const size = Math.hypot(best.along[0], best.along[1]) || 1;
      const along: Vec2 = [best.along[0] / size, best.along[1] / size];
      joints[index] = {
        parent: best.parent,
        hinge: [
          [best.at[0] - along[0] * radius, best.at[1] - along[1] * radius],
          [best.at[0] + along[0] * radius, best.at[1] + along[1] * radius],
        ],
        resting: true,
      };
      reached[index] = true;
      settled = true;
    }
  }

  return reached.every(Boolean) ? joints : drafts.map(() => null);
}

function lift(points: readonly Vec2[]): Vec3[] {
  return points.map(([x, y]) => [x, y, 0] as Vec3);
}

function buildWith(
  drafts: readonly Draft[],
  joints: readonly (Joint | null)[],
  root: number,
  lifted: 1 | -1,
): { pieces: FoldPiece[]; order: number[] } | null {
  const depth = drafts.map(() => 0);
  const children: number[][] = drafts.map(() => []);
  joints.forEach((joint, index) => {
    if (joint) children[joint.parent].push(index);
  });

  // Parents before children, so one pass down the list folds the whole sheet.
  const order: number[] = [];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift() as number;
    order.push(current);
    for (const child of children[current]) {
      depth[child] = depth[current] + 1;
      queue.push(child);
    }
  }
  if (order.length !== drafts.length) return null;

  const place = new Map<number, number>();
  order.forEach((index, at) => place.set(index, at));

  const pieces: FoldPiece[] = order.map((index) => {
    const draft = drafts[index];
    const joint = joints[index];
    if (!joint) {
      return {
        surfaceId: draft.surfaceId,
        flat: lift(draft.flat),
        curved: draft.curved,
        parent: null,
        hinge: null,
        resting: false,
        depth: depth[index],
      };
    }

    const [a, b] = joint.hinge;
    // Point the crease so that a positive turn lifts this piece off the sheet.
    const toCenter: Vec2 = [draft.center[0] - a[0], draft.center[1] - a[1]];
    const along: Vec2 = [b[0] - a[0], b[1] - a[1]];
    const handed = along[0] * toCenter[1] - along[1] * toCenter[0];
    const forwards = handed * lifted > 0;
    const from = forwards ? a : b;
    const to = forwards ? b : a;
    const axis = normalize([to[0] - from[0], to[1] - from[1], 0]);

    // How far to turn: the angle between the two faces' outward normals, which
    // closes the crease to the solid's own dihedral. A resting piece has its
    // turn replaced once the sheet has been placed on the mesh.
    const parent = drafts[joint.parent];
    const angle = Math.acos(
      Math.max(
        -1,
        Math.min(1, dot(unitNormal(draft.facet), unitNormal(parent.facet))),
      ),
    );

    return {
      surfaceId: draft.surfaceId,
      flat: lift(draft.flat),
      curved: draft.curved,
      parent: place.get(joint.parent) ?? null,
      hinge: { at: [from[0], from[1], 0], axis, angle, slide: 0 },
      resting: joint.resting,
      depth: depth[index],
    };
  });

  return { pieces, order };
}

/** Where every piece is held when the sheet is folded by the given amounts. */
export function foldMotions(
  pieces: readonly FoldPiece[],
  fractionOf: (piece: FoldPiece, index: number) => number,
): Rigid[] {
  const motions: Rigid[] = [];
  pieces.forEach((piece, index) => {
    const parent = piece.parent === null ? IDENTITY : motions[piece.parent];
    motions.push(
      piece.hinge === null
        ? parent
        : composeRigid(parent, hingeAt(piece.hinge, fractionOf(piece, index))),
    );
  });
  return motions;
}

/** Where every piece sits when the sheet is folded by the given amounts. */
export function foldPieces(
  pieces: readonly FoldPiece[],
  fractionOf: (piece: FoldPiece, index: number) => number,
): Vec3[][] {
  const motions = foldMotions(pieces, fractionOf);
  return pieces.map((piece, index) =>
    piece.flat.map((point) => applyRigid(motions[index], point)),
  );
}

/** How far out a fit of the root face may be and still count as seating it. */
function rootTolerance(facet: readonly Vec3[]): number {
  let size = 0;
  for (const point of facet) size = Math.max(size, length(point));
  return Math.max(1e-6, size * 0.02);
}

/**
 * Work out the sheet for a solid, or null when its net was never laid out as
 * one joined piece and so cannot be folded.
 */
export function buildFoldModel(net: Net, mesh: SolidMesh): FoldModel | null {
  const drafts = draftsFor(net, mesh);
  if (!drafts || drafts.length === 0) return null;

  // The piece nearest the middle of the sheet stays put, so the fold opens
  // outwards from the centre rather than sweeping across from one edge.
  const middle: Vec2 = [
    (net.bounds.minX + net.bounds.maxX) / 2,
    (net.bounds.minY + net.bounds.maxY) / 2,
  ];
  let root = 0;
  let nearest = Infinity;
  drafts.forEach((draft, index) => {
    const d = Math.hypot(
      draft.center[0] - middle[0],
      draft.center[1] - middle[1],
    );
    if (d < nearest) {
      nearest = d;
      root = index;
    }
  });

  const joints = jointsOf(drafts, root);
  if (drafts.length > 1 && joints.every((joint) => joint === null)) return null;
  const resting = new Set(
    joints.flatMap((joint, index) => (joint?.resting ? [index] : [])),
  );

  // Folding every crease the same way round builds either the solid or its
  // mirror image, so both are closed and the one that lands on the mesh wins.
  let best: FoldModel | null = null;
  /** Which draft each piece of `best` came from, in the piece list's order. */
  let bestOrder: number[] = [];
  for (const lifted of [1, -1] as const) {
    const built = buildWith(drafts, joints, root, lifted);
    if (!built) continue;
    const closed = foldPieces(built.pieces, () => 1);
    const rootAt = built.order.indexOf(root);

    for (const candidate of alignmentsOf(closed[rootAt], drafts[root].facet)) {
      if (candidate.residual > rootTolerance(drafts[root].facet)) break;

      // How far the closed sheet sits from the mesh: every piece should end up
      // over the facet it became. Where it sits is the whole test — which way
      // its outline happens to be wound says nothing, since the net and the
      // mesh were drawn without reference to one another.
      //
      // Lids count here too, even though their turn is only roughly right so
      // far. A tube closed by a lid fits its mesh equally well end for end, and
      // it is the lids that say which end is which: leave them out and the net's
      // top can end up seated on the solid's bottom.
      let closure = 0;
      for (let at = 0; at < built.order.length; at += 1) {
        const index = built.order[at];
        const here = centroidOf3(
          closed[at].map((corner) => applyRigid(candidate.motion, corner)),
        );
        closure = Math.max(
          closure,
          length(subtract(here, centroidOf3(drafts[index].facet))),
        );
        if (best && closure >= best.closure) break;
      }

      if (best && closure >= best.closure) continue;
      best = {
        pieces: built.pieces,
        maxDepth: built.pieces.reduce(
          (most, piece) => Math.max(most, piece.depth),
          0,
        ),
        placement: candidate.motion,
        netCenter: middle,
        closure,
      };
      bestOrder = built.order;
    }
  }

  return best ? seatResting(best, bestOrder, drafts, resting) : null;
}

/**
 * Give each resting piece the exact turn that seats it.
 *
 * A lid is not creased to the tube it closes: it only touches it, so there is
 * no crease to read an angle off. Once the rest of the sheet has been placed on
 * the mesh, though, the lid's own place is known, and the turn that carries it
 * there from its parent can simply be read back — as a swing about a line,
 * which is how it goes on in the first place.
 */
function seatResting(
  model: FoldModel,
  order: readonly number[],
  drafts: readonly Draft[],
  resting: ReadonlySet<number>,
): FoldModel {
  const closedMotions = foldMotions(model.pieces, () => 1);
  const inverse = invertRigid(model.placement);

  const pieces = model.pieces.map((piece, at) => {
    const index = order[at];
    if (!resting.has(index) || piece.parent === null || !piece.hinge) {
      return piece;
    }

    // The corner this piece touches its parent on. It is the one place the two
    // are joined, so whatever turn is chosen has to leave it exactly alone.
    const parent = model.pieces[piece.parent];
    let touch = piece.flat[0];
    let closest = Infinity;
    for (const corner of piece.flat) {
      for (const other of parent.flat) {
        const apart = length(subtract(corner, other));
        if (apart < closest) {
          closest = apart;
          touch = corner;
        }
      }
    }

    // A disc fits its place any way round, so take the way round that also
    // leaves the touching corner where the parent is holding it.
    const held = invertRigid(closedMotions[piece.parent]);
    let best: Rigid | null = null;
    let strayed = Infinity;
    for (const fit of alignmentsOf(piece.flat, drafts[index].facet)) {
      const relative = composeRigid(held, composeRigid(inverse, fit.motion));
      const stray = length(subtract(applyRigid(relative, touch), touch));
      if (stray < strayed) {
        strayed = stray;
        best = relative;
      }
    }
    if (!best) return piece;

    // Pin that corner: keep the turn, and set the shift so the corner is fixed.
    // The piece then swings about a line through where it is held, and only the
    // tessellation keeps it from seating perfectly.
    const pinned: Rigid = {
      r: best.r,
      t: subtract(touch, applyRigid({ r: best.r, t: [0, 0, 0] }, touch)),
    };
    return { ...piece, hinge: hingeOf(pinned) };
  });

  const closed = foldPieces(pieces, () => 1);
  let closure = 0;
  closed.forEach((points, at) => {
    const here = centroidOf3(
      points.map((corner) => applyRigid(model.placement, corner)),
    );
    closure = Math.max(
      closure,
      length(subtract(here, centroidOf3(drafts[order[at]].facet))),
    );
  });

  return { ...model, pieces, closure };
}

/** The turn the solid view applies for a given yaw and pitch. */
export function viewRotation(yaw: number, pitch: number): number[] {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [cy, 0, sy, sy * sp, cp, -cy * sp, -sy * cp, sp, cy * cp];
}

/** Half a turn about the x axis: how the net view looks at the flat sheet. */
export const FACE_ON: readonly number[] = [1, 0, 0, 0, -1, 0, 0, 0, -1];

export function invertRotation(r: readonly number[]): number[] {
  return transposed(r);
}

export function multiplyRotation(
  a: readonly number[],
  b: readonly number[],
): number[] {
  return matrixProduct(a, b);
}

type Quaternion = readonly [number, number, number, number];

export function toQuaternion(r: readonly number[]): Quaternion {
  const trace = r[0] + r[4] + r[8];
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return [s / 4, (r[7] - r[5]) / s, (r[2] - r[6]) / s, (r[3] - r[1]) / s];
  }
  if (r[0] > r[4] && r[0] > r[8]) {
    const s = Math.sqrt(1 + r[0] - r[4] - r[8]) * 2;
    return [(r[7] - r[5]) / s, s / 4, (r[1] + r[3]) / s, (r[2] + r[6]) / s];
  }
  if (r[4] > r[8]) {
    const s = Math.sqrt(1 + r[4] - r[0] - r[8]) * 2;
    return [(r[2] - r[6]) / s, (r[1] + r[3]) / s, s / 4, (r[5] + r[7]) / s];
  }
  const s = Math.sqrt(1 + r[8] - r[0] - r[4]) * 2;
  return [(r[3] - r[1]) / s, (r[2] + r[6]) / s, (r[5] + r[7]) / s, s / 4];
}

export function fromQuaternion(q: Quaternion): number[] {
  const [w, x, y, z] = q;
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - w * z),
    2 * (x * z + w * y),
    2 * (x * y + w * z),
    1 - 2 * (x * x + z * z),
    2 * (y * z - w * x),
    2 * (x * z - w * y),
    2 * (y * z + w * x),
    1 - 2 * (x * x + y * y),
  ];
}

/** The shortest turn from one orientation to another, `t` of the way along. */
export function slerp(
  from: readonly number[],
  to: readonly number[],
  t: number,
): number[] {
  const a = toQuaternion(from);
  let b = toQuaternion(to);
  let cosine = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (cosine < 0) {
    b = [-b[0], -b[1], -b[2], -b[3]];
    cosine = -cosine;
  }
  let wa = 1 - t;
  let wb = t;
  if (cosine <= 0.9995) {
    const angle = Math.acos(cosine);
    const sine = Math.sin(angle);
    wa = Math.sin((1 - t) * angle) / sine;
    wb = Math.sin(t * angle) / sine;
  }
  const mixed: Quaternion = [
    a[0] * wa + b[0] * wb,
    a[1] * wa + b[1] * wb,
    a[2] * wa + b[2] * wb,
    a[3] * wa + b[3] * wb,
  ];
  const size = Math.hypot(mixed[0], mixed[1], mixed[2], mixed[3]) || 1;
  return fromQuaternion([
    mixed[0] / size,
    mixed[1] / size,
    mixed[2] / size,
    mixed[3] / size,
  ]);
}

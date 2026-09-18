/**
 * The ground the solid stands on.
 *
 * The solid floats in the middle of an empty box, and nothing about the drawing
 * says how big it is — every shape is fitted to the screen, so a 2 cm cube and a
 * 20 cm cube come out the same size. The floor is what puts the size back: it is
 * a flat plane at the foot of the solid, ruled a round number of units apart, so
 * a growing solid straddles more squares and a shrinking one lets them go. The
 * spacing comes from {@link gridScale}, exactly as the old backdrop of dots did;
 * what is new is that the ruling lies down in the scene with the solid instead of
 * standing behind it, which is what makes it read as ground rather than wallpaper.
 */
import { projectPoint, rotatePoint, type Vec3 } from "$lib/domain/geometry3d";

export interface FloorPlane {
  /**
   * Maps a point on the floor — (x, z) in the shape's own units, the solid's
   * base at the origin — to a point on the screen. An `svg` transform, so the
   * ruling can be drawn in floor coordinates and land in the scene.
   */
  readonly matrix: string;
  /**
   * How open the plane is to the viewer: 1 looking straight down at it, 0 seen
   * exactly edge-on. Edge-on there is nothing left of the floor but a crease —
   * every line in it collapses onto the same few pixels — so it fades out
   * rather than hardening into a smear as the pitch passes through the horizon.
   */
  readonly openness: number;
  /** True when the viewer is under the floor, looking up at it. */
  readonly fromBelow: boolean;
}

/** Below this the plane is too edge-on to draw at all. */
const SHUT = 0.07;
/** Above this it is open enough to draw at full strength. */
const OPEN = 0.24;

/**
 * @param baseY Height of the floor in the solid's own coordinates: the foot of
 *   the solid, so that it stands on the plane rather than hovering over it.
 * @param scale Screen pixels per unit, the same one the solid is drawn at.
 */
export function floorPlane(
  yaw: number,
  pitch: number,
  scale: number,
  baseY: number,
): FloorPlane {
  const screen = (point: Vec3) =>
    projectPoint(rotatePoint(point, yaw, pitch), scale);
  const [ax, ay] = screen([1, 0, 0]);
  const [bx, by] = screen([0, 0, 1]);
  const [ox, oy] = screen([0, baseY, 0]);
  const tilt = Math.abs(Math.sin(pitch));
  return {
    matrix: `matrix(${[ax, ay, bx, by, ox, oy].map(round).join(" ")})`,
    openness: smoothstep((tilt - SHUT) / (OPEN - SHUT)),
    fromBelow: pitch < 0,
  };
}

/**
 * Where to rule the floor, in units from the solid's base: every multiple of
 * `step` out to `radius`, in both directions.
 */
export function floorRules(step: number, radius: number): number[] {
  if (!(step > 0) || !(radius > 0)) return [0];
  const reach = Math.min(Math.ceil(radius / step), MAX_RULES);
  const rules: number[] = [];
  // Relative precision, not absolute: these are the shape's own units, and the
  // shape may be measured in thousands or in thousandths.
  for (let i = -reach; i <= reach; i += 1)
    rules.push(Number((i * step).toPrecision(9)));
  return rules;
}

/**
 * Enough for a floor several times the width of the solid at any sane window
 * size; a guard against a pathological scale, not a real limit.
 */
const MAX_RULES = 64;

function smoothstep(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/** Enough precision for a screen, short enough to keep the markup readable. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

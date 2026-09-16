/**
 * The doodle from the logo, laid onto the solid's top face.
 *
 * Orthographic projection takes a parallelogram to a parallelogram, so the
 * whole chain — artwork to the face's plane, then the current rotation, then
 * the projection — is affine, and one SVG matrix carries the mark onto the face
 * exactly, at any angle, with no sampling and no per-point work.
 *
 * None of this touches a measurement. It is paint on the top face.
 */

/** Paths lifted from the logo: the loop, and the tick beside it. */
export const LOGO_MARK_LOOP =
  "M180.862 99.5465C181.567 102.336 184.379 104.244 187.585 104.108L187.607 104.108C187.651 104.107 187.74 104.105 187.87 104.104C188.13 104.104 188.551 104.107 189.107 104.133C190.222 104.184 191.851 104.319 193.776 104.657C197.661 105.339 202.511 106.804 206.844 109.867C211.43 113.108 213.931 119.58 212.384 129.026C210.861 138.324 205.491 149.367 196.317 159.691C187.143 170.015 176.315 177.2 166.514 180.647C156.555 184.149 148.918 183.457 144.332 180.216C142.154 178.676 140.89 176.495 139.136 173C137.604 169.947 135.414 165.142 130.76 161.852C126.106 158.563 120.36 157.76 116.677 157.127C112.461 156.403 109.791 155.804 107.612 154.265C103.026 151.023 100.525 144.551 102.073 135.104C103.596 125.807 108.966 114.764 118.14 104.44C127.314 94.1159 138.142 86.93 147.943 83.4832C157.901 79.9812 165.538 80.674 170.124 83.9152C174.11 86.7319 176.834 90.59 178.586 93.9552C179.446 95.6083 180.033 97.0643 180.397 98.0874C180.578 98.5964 180.702 98.9921 180.777 99.2437C180.814 99.3693 180.839 99.4589 180.853 99.5076L180.863 99.547L180.862 99.5465Z";
export const LOGO_MARK_TICK =
  "M235.476 94.1834C239.963 92.5593 238.258 84.7851 233.128 82.4812C227.997 80.1772 195.585 91.7952 183.521 97.8351C182.133 100.034 180.806 103.737 186.604 100.956C199.538 95.3302 230.989 95.8074 235.476 94.1834Z";

export const LOGO_MARK_INK = "#49431D";
export const LOGO_MARK_STROKE = 12.8048;

/**
 * The tile's centre in the artwork, and its two half-diagonals, found by
 * intersecting the four straight sides of the logo's own outline. Mapping these
 * onto the solid's tile is what puts the doodle where it sits on the mark,
 * rather than merely somewhere on the face.
 */
const CENTRE = [164.94, 125.99] as const;
const HALF_DIAGONAL_U = [146.85, -16.74] as const;
const HALF_DIAGONAL_V = [15.28, 131.33] as const;

type Point = readonly [number, number];

function cross(a: Point, b: Point): number {
  return a[0] * b[1] - a[1] * b[0];
}

/**
 * An SVG transform taking the artwork onto the face, given where the tile's
 * centre and the ends of its two half-diagonals have landed on screen.
 */
export function logoMarkTransform(
  origin: Point,
  alongU: Point,
  alongV: Point,
): string {
  const [ux, uy] = [alongU[0] - origin[0], alongU[1] - origin[1]];
  const [vx, vy] = [alongV[0] - origin[0], alongV[1] - origin[1]];
  // Where the artwork's own basis lands, divided by that basis: the artwork's
  // diagonals are not axis-aligned, so this cannot be a plain scale.
  const span = cross(HALF_DIAGONAL_U, HALF_DIAGONAL_V);
  const a = (ux * HALF_DIAGONAL_V[1] - vx * HALF_DIAGONAL_U[1]) / span;
  const b = (uy * HALF_DIAGONAL_V[1] - vy * HALF_DIAGONAL_U[1]) / span;
  const c = (vx * HALF_DIAGONAL_U[0] - ux * HALF_DIAGONAL_V[0]) / span;
  const d = (vy * HALF_DIAGONAL_U[0] - uy * HALF_DIAGONAL_V[0]) / span;
  const e = origin[0] - a * CENTRE[0] - c * CENTRE[1];
  const f = origin[1] - b * CENTRE[0] - d * CENTRE[1];
  return `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
}

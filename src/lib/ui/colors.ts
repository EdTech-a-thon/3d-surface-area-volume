/**
 * Surface colours.
 *
 * Colour is only ever a secondary cue: a selected surface also gets a hatch
 * pattern, a thicker outline and a short code badge that matches the
 * calculation row, so the app still works for colour-blind students and on a
 * washed-out projector.
 */
export const HATCH_PATTERN_ID = "selected-surface-hatch";

/** Shaded fill for a 3D facet, given a diffuse light factor in 0…1. */
export function facetFill(selected: boolean, diffuse: number): string {
  const clamped = Math.max(0, Math.min(1, diffuse));
  if (selected) return `hsl(24 88% ${44 + 30 * clamped}%)`;
  return `hsl(203 40% ${30 + 44 * clamped}%)`;
}

/** Flat fill for a net piece, which has no lighting. */
export function netFill(selected: boolean): string {
  return selected ? "hsl(28 92% 80%)" : "hsl(203 38% 88%)";
}

export function netStroke(selected: boolean): string {
  return selected ? "hsl(20 82% 30%)" : "hsl(203 34% 34%)";
}

/**
 * The shape of a square-root sign, in one place.
 *
 * A font's √ is a fixed height, so setting a bar over the radicand — however
 * the bar is drawn — leaves a visible step wherever the glyph's arm stops. The
 * fix is to draw the sign instead: a hairline lead-in, a weighted stem rising
 * to the radicand's top edge, and a rule that carries on from the stem's tip.
 * Because the three pieces are laid out from the radicand's own box they meet
 * exactly, at any size.
 *
 * The outlines below are normalised to a unit box whose top edge is the rule
 * and whose height is the radicand's. `MathText.svelte` stretches that box with
 * CSS; `NetView.svelte` has no line box to stretch, so it measures the drawn
 * radicand and lays the same outlines out in the net's own units.
 */

/** The lead-in: down to a shallow dip, then steeply into the valley. */
const TICK: readonly (readonly [number, number])[] = [
  [0, 0.58],
  [0.25, 0.52],
  [0.46, 0.92],
];

/** The stem: out of the valley to the top-right corner, where the rule starts. */
const STEM: readonly (readonly [number, number])[] = [
  [0.46, 0.92],
  [0.92, 0],
];

/** Width of the sign, and the weight of each stroke, as multiples of font size. */
export const RADICAL_WIDTH = 0.68;
export const RADICAL_TICK_WEIGHT = 0.105;
export const RADICAL_STEM_WEIGHT = 0.105;
export const RADICAL_RULE_WEIGHT = 0.105;

/** How far left of the stem's tip the rule starts, so the join has no seam. */
export const RADICAL_RULE_OVERLAP = 0.15;

function place(
  outline: readonly (readonly [number, number])[],
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  return outline
    .map(([u, v], index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${x + u * width} ${y + v * height}`;
    })
    .join(" ");
}

/** The lead-in stroke for a sign filling the box at (`x`, `y`). */
export function radicalTickPath(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  return place(TICK, x, y, width, height);
}

/** The rising stroke for the same box. */
export function radicalStemPath(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  return place(STEM, x, y, width, height);
}

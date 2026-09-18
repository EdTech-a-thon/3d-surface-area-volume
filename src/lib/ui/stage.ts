/**
 * How much of the window the shape may have, once the panels have had theirs.
 *
 * The panels float over the drawing rather than beside it, and on a full page
 * that is the point: they read as notes laid on a stage the shape still owns.
 * A floating window can be dragged down to the size of a postcard, though, and
 * there the same panels cover the shape instead of annotating it.
 *
 * So the shape gives up room only once the panels are taking more than their
 * share of the height, and then only part of the excess: a shape that grazes a
 * panel edge still reads, while one fitted into the gap between them would be a
 * thumbnail long before the window was actually too small.
 */

/** Beyond this share of the height, the panels are crowding the shape. */
const FAIR_SHARE = 0.35;
/** How much of the excess comes off the shape rather than being lived with. */
const YIELD = 0.66;
/** The shape never drops below this share of the window, whatever is over it. */
const FLOOR = 0.4;

/**
 * Half the height the shape may be fitted to, given the height of the panels
 * over it. With no panels measured this is simply half the window, which is
 * what the full page uses.
 *
 * The shape is allowed to graze a panel rather than being fitted into the gap
 * between them: the labels on it are a fixed size on screen, so a drawing made
 * small enough to clear everything is one whose own labels start to collide.
 */
export function stageRoom(boxHeight: number, chrome: number): number {
  const half = Math.max(boxHeight, 1) / 2;
  const crowding = Math.max(0, chrome - boxHeight * FAIR_SHARE);
  return Math.max(half - (crowding * YIELD) / 2, half * FLOOR);
}

/**
 * How far above the middle to hold the shape, given how much taller the bottom
 * row is than the top one. Evening out the two gaps is what puts the shape in
 * the middle of what the viewer can actually see.
 */
export function stageRise(boxHeight: number, lift: number): number {
  const half = Math.max(boxHeight, 1) / 2;
  return Math.max(0, Math.min(lift, half * 0.3));
}

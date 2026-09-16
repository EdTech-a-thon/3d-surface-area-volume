/**
 * The measured dot grid behind a shape.
 *
 * Both views scale their drawing to fit the screen, so a cube with edge 2 and a
 * cube with edge 20 are drawn exactly the same size. The grid is what puts the
 * size back: its dots are a fixed distance apart *in the shape's own units*, so
 * a growing solid swallows more of them and a shrinking one lets go. The step
 * is a round number — 0.1, 0.2, 0.5, 1, 2, 5 … — and it is written out beside
 * the drawing, because a grid whose spacing is a secret measures nothing.
 */
export interface GridScale {
  /** Distance between neighbouring dots, in the shape's length units. */
  readonly step: number;
  /** The same distance on screen, in CSS pixels. */
  readonly gap: number;
}

/** Dots closer than this read as noise; much further apart and they stop reading as a grid. */
const MIN_GAP = 26;

const MULTIPLES = [1, 2, 5, 10];

/** The roundest step that keeps the dots at least {@link MIN_GAP} px apart. */
export function gridScale(pixelsPerUnit: number): GridScale {
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) {
    return { step: 1, gap: MIN_GAP };
  }
  const wanted = MIN_GAP / pixelsPerUnit;
  const decade = 10 ** Math.floor(Math.log10(wanted));
  const step =
    (MULTIPLES.find((multiple) => multiple * decade >= wanted) ?? 10) * decade;
  return { step, gap: step * pixelsPerUnit };
}

/**
 * How much of the available room a shape of this size should fill.
 *
 * Fitting every shape to the screen is what makes a 2 cm cube and a 20 cm cube
 * look identical. Fitting them to their real size instead is worse: the range
 * the sliders cover is 200 to 1, so the small end would vanish. This is the
 * compromise — on-screen size still grows with the shape, but slowly, and the
 * biggest shape still fits. The grid dots supply the exact amount.
 *
 * @param extent Distance from the centre of the shape to its furthest point.
 * @param reference The extent that earns the whole screen.
 */
export function fitFraction(extent: number, reference: number): number {
  if (!Number.isFinite(extent) || extent <= 0) return MIN_FRACTION;
  const ratio = Math.min(1, extent / reference);
  return Math.min(1, Math.max(MIN_FRACTION, ratio ** GROWTH));
}

/**
 * Well under 1 so growth shows; well over 0 so a small shape stays workable —
 * the measurement chips are a fixed size in pixels, and once a face is drawn
 * smaller than its own chip there is nothing left of it to point at.
 */
const MIN_FRACTION = 0.5;
/** 0 fits everything to the screen; 1 draws true size. */
const GROWTH = 0.15;

/** The step as a label: "0.5" rather than "0.5000000000000001". */
export function gridStepText(step: number): string {
  return Number(step.toPrecision(6)).toString();
}

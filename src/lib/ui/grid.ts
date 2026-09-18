/**
 * How far apart to space a measured grid: the ruling on the floor under the
 * solid, and the squares behind the net.
 *
 * Both views scale their drawing to fit the screen, so a cube with edge 2 and a
 * cube with edge 20 are drawn exactly the same size. The grid is what puts the
 * size back: its marks are a fixed distance apart *in the shape's own units*, so
 * a growing shape covers more of them and a shrinking one lets go. The step is
 * always a round number — 0.1, 0.2, 1, 2, 10 … — so that what the grid measures
 * can be counted off it.
 *
 * Only one of those round steps can be on screen at a time, so dragging a
 * dimension used to make the whole grid spread apart, then snap back to close
 * together the moment the step changed — a sawtooth zoom of the entire
 * background, repeated eight or so times across the range of the sliders, which
 * is about the most reliable way there is to make someone queasy. So each step
 * is paired with the next finer one, which splits every box evenly — into four,
 * or into twenty-five — and fades in underneath it as the marks drift apart,
 * reaching full strength exactly when it takes over. Nothing ever jumps: the
 * grid only ever thins out or fills in, and its lines stay evenly spaced right
 * through a hand-over.
 */
export interface GridScale {
  /** Distance between neighbouring lines, in the shape's length units. */
  readonly step: number;
  /** The same distance on screen, in CSS pixels. */
  readonly gap: number;
  /** The next finer step, waiting to take over. */
  readonly fineStep: number;
  /** How far in that hand-over is, 0 (invisible) to 1 (its turn now). */
  readonly fade: number;
}

/** Marks closer than this read as noise; much further apart and they stop reading as a grid. */
const MIN_GAP = 26;

/**
 * The ladder of steps, within one decade, and the first rung of the next.
 *
 * Every rung has to divide the one above it exactly, or the finer ruling fading
 * in would not line up with the ruling already there: it would land *between*
 * the lines in one place and *on* them in another, and a grid whose lines are
 * unevenly spaced is worse than one that jumps. That rules out the usual 1, 2,
 * 5, 10 — two does not go into five, so five and two share only every tenth
 * line. One, two, ten does go: each box splits into four, then twenty-five.
 */
const RUNGS = [1, 2, 10];

/** The roundest step that keeps the marks at least {@link MIN_GAP} px apart. */
export function gridScale(pixelsPerUnit: number): GridScale {
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) {
    return { step: 1, gap: MIN_GAP, fineStep: 0.2, fade: 0 };
  }
  const wanted = MIN_GAP / pixelsPerUnit;
  // The decade is the rung at or just below what is wanted, so the ladder above
  // always holds a rung that clears it: the search never comes up empty.
  const decade = 10 ** Math.floor(Math.log10(wanted));
  const index = RUNGS.findIndex((rung) => rung * decade >= wanted);
  const step = RUNGS[Math.max(index, 0)] * decade;
  // The rung below: the previous one, or the top of the decade below, since the
  // ladder repeats every power of ten.
  const finer =
    index <= 0
      ? (RUNGS[RUNGS.length - 2] * decade) / 10
      : RUNGS[index - 1] * decade;
  const gap = step * pixelsPerUnit;
  // 0 when this step has only just taken over (its marks are as close as they
  // are allowed to get) and 1 when they have spread far enough that the finer
  // step can hold the grid on its own.
  const fade = (gap - MIN_GAP) / (MIN_GAP * (step / finer - 1));
  return { step, gap, fineStep: finer, fade: Math.min(1, Math.max(0, fade)) };
}

/**
 * The opacity to draw each of the two layers at, so that every mark the coarse
 * step owns stays at exactly {@link base} throughout.
 *
 * The two lattices share their marks — the coarse one is every second or fifth
 * mark of the fine one — so simply drawing both would make the shared marks
 * darker than the rest, and that difference would vanish at each hand-over.
 * Fading the coarse layer out against the fine one underneath it, rather than
 * to nothing, keeps the shared marks at a flat {@link base} instead.
 */
export function gridLayers(
  base: number,
  fade: number,
): { coarse: number; fine: number } {
  const fine = base * fade;
  return { coarse: (base - fine) / (1 - fine), fine };
}

/**
 * How much of the available room a shape of this size should fill.
 *
 * Fitting every shape to the screen is what makes a 2 cm cube and a 20 cm cube
 * look identical. Fitting them to their real size instead is worse: the range
 * the sliders cover is 200 to 1, so the small end would vanish. This is the
 * compromise — on-screen size still grows with the shape, but slowly, and the
 * biggest shape still fits. The grid supplies the exact amount.
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

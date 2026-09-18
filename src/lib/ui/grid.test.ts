import { describe, expect, it } from "vitest";
import { fitFraction, gridLayers, gridScale } from "./grid";

describe("gridScale", () => {
  it("keeps the lines readably apart at any zoom", () => {
    for (const pixelsPerUnit of [0.03, 1, 7.4, 146, 2500]) {
      const { step, gap } = gridScale(pixelsPerUnit);
      expect(gap).toBeGreaterThanOrEqual(26);
      expect(gap).toBeLessThan(26 * 10);
      expect(gap).toBeCloseTo(step * pixelsPerUnit, 6);
    }
  });

  it("uses round steps", () => {
    expect(gridScale(146).step).toBeCloseTo(0.2, 10);
    expect(gridScale(14.6).step).toBeCloseTo(2, 10);
    expect(gridScale(60).step).toBeCloseTo(1, 10);
  });

  it("falls back to a unit step when there is nothing to scale", () => {
    expect(gridScale(0)).toEqual({ step: 1, gap: 26, fineStep: 0.2, fade: 0 });
  });

  it("splits each box evenly, so the grid is never unevenly spaced", () => {
    // The finer ruling fades in over the coarse one. Unless it divides the
    // coarse step exactly, its lines land between the existing ones in some
    // boxes and on top of them in others — a grid with a limp in it.
    for (let i = 0; i <= 600; i += 1) {
      const { step, fineStep } = gridScale(0.05 * 1.02 ** i);
      const split = step / fineStep;
      expect(
        Math.abs(split - Math.round(split)),
        `${step} / ${fineStep}`,
      ).toBeLessThan(1e-9);
      expect(Math.round(split)).toBeGreaterThan(1);
    }
  });

  it("hands over to the finer step without the marks ever jumping", () => {
    // Walk a zoom-in continuously and watch what is actually drawn: the two
    // lattices and their inks. Nothing may move by a visible amount in one
    // small step of the slider.
    let previous: { spacing: number; ink: number }[] | null = null;
    for (let i = 0; i <= 4000; i += 1) {
      const pixelsPerUnit = 2 * 1.002 ** i;
      const grid = gridScale(pixelsPerUnit);
      const ink = gridLayers(0.35, grid.fade);
      // Every dot the coarse lattice owns is drawn twice, so what the eye gets
      // there is the two inks composited — and it must not budge.
      expect(1 - (1 - ink.coarse) * (1 - ink.fine)).toBeCloseTo(0.35, 10);
      const drawn = [
        { spacing: grid.gap, ink: ink.coarse },
        { spacing: grid.fineStep * pixelsPerUnit, ink: ink.fine },
      ];
      const before = previous;
      if (before) {
        // Either lattice may be renamed at a hand-over, and a third one may be
        // born or retired there — but only ever at no ink, and only ever a
        // hair's width of ink away from where it was a moment ago.
        const pairs = [
          ...drawn.map((layer) => [layer, before] as const),
          ...before.map((layer) => [layer, drawn] as const),
        ];
        for (const [layer, others] of pairs) {
          const twin = others.find(
            (other) => Math.abs(other.spacing / layer.spacing - 1) < 0.02,
          );
          expect(
            Math.abs((twin?.ink ?? 0) - layer.ink),
            `lattice ${layer.spacing} jumped at ${pixelsPerUnit}`,
          ).toBeLessThan(0.01);
        }
      }
      previous = drawn;
    }
  });
});

describe("fitFraction", () => {
  it("gives the whole screen to the largest shape", () => {
    expect(fitFraction(20, 20)).toBe(1);
    expect(fitFraction(400, 20)).toBe(1);
  });

  it("grows with the shape", () => {
    const small = fitFraction(1, 20);
    const large = fitFraction(8, 20);
    expect(small).toBeLessThan(large);
    expect(large).toBeLessThan(1);
  });

  it("never shrinks a shape past the point of being usable", () => {
    const floor = fitFraction(0, 20);
    expect(floor).toBeGreaterThan(0);
    expect(floor).toBeLessThan(1);
    expect(fitFraction(0.0001, 20)).toBeGreaterThanOrEqual(floor);
  });
});

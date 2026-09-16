import { describe, expect, it } from "vitest";
import { fitFraction, gridScale, gridStepText } from "./grid";

describe("gridScale", () => {
  it("keeps the dots readably apart at any zoom", () => {
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
    expect(gridScale(60).step).toBeCloseTo(0.5, 10);
  });

  it("falls back to a unit step when there is nothing to scale", () => {
    expect(gridScale(0)).toEqual({ step: 1, gap: 26 });
  });

  it("writes the step without floating-point dust", () => {
    expect(gridStepText(0.30000000000000004)).toBe("0.3");
    expect(gridStepText(2)).toBe("2");
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

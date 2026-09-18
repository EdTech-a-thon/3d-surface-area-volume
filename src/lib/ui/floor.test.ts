import { describe, expect, it } from "vitest";
import { floorPlane, floorRules } from "./floor";

describe("floorPlane", () => {
  it("puts the origin of the floor at the foot of the solid", () => {
    // 10 px per unit, and the solid's foot 3 units below its centre: straight
    // down the screen, where y grows downwards.
    const { matrix } = floorPlane(0, 0.4, 10, -3);
    const [, , , , x, y] = matrix
      .slice("matrix(".length, -1)
      .split(" ")
      .map(Number);
    expect(x).toBeCloseTo(0, 3);
    expect(y).toBeCloseTo(3 * 10 * Math.cos(0.4), 3);
  });

  it("closes as the plane turns edge-on, from either side", () => {
    expect(floorPlane(0, 0, 10, -1).openness).toBe(0);
    expect(floorPlane(0, 0.03, 10, -1).openness).toBe(0);
    expect(floorPlane(0, -0.03, 10, -1).openness).toBe(0);
    expect(floorPlane(0, 0.15, 10, -1).openness).toBeGreaterThan(0);
    expect(floorPlane(0, 0.15, 10, -1).openness).toBeLessThan(1);
    expect(floorPlane(0, Math.PI / 4, 10, -1).openness).toBe(1);
  });

  it("knows when the viewer has gone under the floor", () => {
    expect(floorPlane(0, 0.4, 10, -1).fromBelow).toBe(false);
    expect(floorPlane(0, -0.4, 10, -1).fromBelow).toBe(true);
  });
});

describe("floorRules", () => {
  it("rules both ways out to the edge, through the origin", () => {
    expect(floorRules(0.5, 1.2)).toEqual([
      -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2,
    ]);
  });

  it("puts a line on the anchor, so the squares line up with the solid", () => {
    // A box 3 units wide reaches 1.5 either side of its centre; anchored on
    // that edge, the ruling lands on it and on every unit across the box.
    expect(floorRules(1, 2.5, -1.5)).toContain(-1.5);
    expect(floorRules(1, 2.5, -1.5)).toContain(1.5);
    expect(floorRules(1, 2.5, -1.5)).toContain(0.5);
  });

  it("covers the floor wherever the anchor sits inside a square", () => {
    for (const anchor of [-7.3, -0.4, 0, 0.9, 12.6]) {
      const rules = floorRules(0.5, 2, anchor);
      expect(Math.min(...rules)).toBeLessThanOrEqual(-2);
      expect(Math.max(...rules)).toBeGreaterThanOrEqual(2);
    }
  });

  it("caps a floor that would be ruled into a solid block", () => {
    expect(floorRules(1e-9, 1000).length).toBeLessThan(200);
  });

  it("survives a degenerate floor", () => {
    expect(floorRules(0, 5)).toEqual([0]);
    expect(floorRules(1, 0)).toEqual([0]);
  });
});

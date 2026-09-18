import { describe, expect, it } from "vitest";
import { stageRise, stageRoom } from "./stage";

describe("stageRoom", () => {
  it("gives the shape the whole window when nothing is over it", () => {
    expect(stageRoom(600, 0)).toBe(300);
  });

  it("gives up nothing while the panels keep to their share", () => {
    // 35% of 600 is 210, so panels totalling 180 cost the shape nothing.
    expect(stageRoom(600, 180)).toBe(300);
  });

  it("gives up room once the panels crowd the shape", () => {
    const room = stageRoom(400, 260);
    expect(room).toBeLessThan(200);
    expect(room).toBeGreaterThan(400 * 0.4 * 0.5);
  });

  it("never lets the shape shrink away, however small the window", () => {
    expect(stageRoom(300, 900)).toBeCloseTo(300 * 0.4 * 0.5, 5);
  });

  it("shrinks steadily rather than in steps", () => {
    const sizes = [200, 240, 280, 320, 360].map((chrome) =>
      stageRoom(500, chrome),
    );
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    }
  });
});

describe("stageRise", () => {
  it("lifts the shape by what it is given", () => {
    expect(stageRise(600, 40)).toBe(40);
  });

  it("never lifts the shape off the top of the window", () => {
    expect(stageRise(600, 500)).toBe(90);
  });

  it("does not push the shape down when the top row is the taller one", () => {
    expect(stageRise(600, -40)).toBe(0);
  });
});

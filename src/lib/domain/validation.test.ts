import { describe, expect, it } from "vitest";
import { RANGE_MESSAGE, STEP_MESSAGE, parseDimension } from "./validation";
import { approximateText, formatApproximate } from "./format";

describe("dimension validation", () => {
  it("accepts values in range on a tenth", () => {
    for (const raw of ["0.1", "1", "2.5", "19.9", "20"]) {
      expect(parseDimension(raw)).toEqual({ ok: true, value: Number(raw) });
    }
  });

  it("accepts typed values far beyond the slider's range", () => {
    for (const raw of ["20.1", "250", "100000"]) {
      expect(parseDimension(raw)).toEqual({ ok: true, value: Number(raw) });
    }
  });

  it("trims surrounding whitespace", () => {
    expect(parseDimension("  3.5 ")).toEqual({ ok: true, value: 3.5 });
  });

  it("rejects empty, zero, negative, out-of-range and non-numeric entries", () => {
    expect(parseDimension("")).toEqual({
      ok: false,
      message: "Enter a number",
    });
    expect(parseDimension("   ")).toEqual({
      ok: false,
      message: "Enter a number",
    });
    expect(parseDimension("0")).toEqual({ ok: false, message: RANGE_MESSAGE });
    expect(parseDimension("-2")).toEqual({ ok: false, message: RANGE_MESSAGE });
    expect(parseDimension("100000.1")).toEqual({
      ok: false,
      message: RANGE_MESSAGE,
    });
    expect(parseDimension("abc")).toEqual({
      ok: false,
      message: RANGE_MESSAGE,
    });
    expect(parseDimension("1e3")).toEqual({
      ok: false,
      message: RANGE_MESSAGE,
    });
    expect(parseDimension("Infinity")).toEqual({
      ok: false,
      message: RANGE_MESSAGE,
    });
    expect(parseDimension("NaN")).toEqual({
      ok: false,
      message: RANGE_MESSAGE,
    });
  });

  it("rejects finer precision than a tenth", () => {
    expect(parseDimension("2.25")).toEqual({
      ok: false,
      message: STEP_MESSAGE,
    });
  });

  it("does not trip over binary floating-point error", () => {
    expect(parseDimension("0.3")).toEqual({ ok: true, value: 0.3 });
    expect(parseDimension("7.7")).toEqual({ ok: true, value: 7.7 });
  });
});

describe("approximate formatting", () => {
  it("marks rounded values and leaves exact ones unmarked", () => {
    expect(formatApproximate(12 * Math.PI)).toEqual({
      text: "37.7",
      rounded: true,
    });
    expect(formatApproximate(94)).toEqual({ text: "94.0", rounded: false });
    expect(approximateText(12 * Math.PI)).toBe("≈ 37.7");
    expect(approximateText(60)).toBe("60.0");
  });

  it("can show more places for the detail view", () => {
    expect(approximateText(12 * Math.PI, 5)).toBe("≈ 37.69911");
  });
});

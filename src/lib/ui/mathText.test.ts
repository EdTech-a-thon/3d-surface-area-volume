import { describe, expect, it } from "vitest";
import { hasRadical, splitMath } from "./mathText";

describe("splitMath", () => {
  it("puts a bare number under the bar", () => {
    expect(splitMath("3 + √2")).toEqual([
      { kind: "text", text: "3 + " },
      { kind: "radical", radicand: "2" },
    ]);
  });

  it("keeps π outside the root of 2√3π", () => {
    expect(splitMath("2√3π")).toEqual([
      { kind: "text", text: "2" },
      { kind: "radical", radicand: "3" },
      { kind: "text", text: "π" },
    ]);
  });

  it("drops the brackets that the bar replaces", () => {
    expect(splitMath("s = √(3² + 4²)")).toEqual([
      { kind: "text", text: "s = " },
      { kind: "radical", radicand: "3² + 4²" },
    ]);
  });

  it("keeps text after a bracketed root", () => {
    expect(splitMath("(1 + √2)π")).toEqual([
      { kind: "text", text: "(1 + " },
      { kind: "radical", radicand: "2" },
      { kind: "text", text: ")π" },
    ]);
  });

  it("leaves a root it cannot read alone", () => {
    expect(splitMath("√x")).toEqual([{ kind: "text", text: "√x" }]);
    expect(splitMath("√(3² + 4²")).toEqual([
      { kind: "text", text: "√(3² + 4²" },
    ]);
    expect(hasRadical("√x")).toBe(false);
  });

  it("reports plain text as having no radical", () => {
    expect(hasRadical("3 × 5 = 15")).toBe(false);
    expect(hasRadical("√2")).toBe(true);
  });
});

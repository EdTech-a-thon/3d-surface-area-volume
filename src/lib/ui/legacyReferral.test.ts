import { describe, expect, it } from "vitest";
import { isShapeLabReferral } from "./legacyReferral";

describe("isShapeLabReferral", () => {
  it("recognizes a referrer from the former site", () => {
    expect(
      isShapeLabReferral(
        "https://shapelab.teacher.dev/old/path",
        "https://solids.teacher.dev/",
      ),
    ).toBe(true);
  });

  it("recognizes the fallback marker used by an HTTP redirect", () => {
    expect(
      isShapeLabReferral(
        "",
        "https://solids.teacher.dev/?from=shapelab.teacher.dev",
      ),
    ).toBe(true);
  });

  it("does not accept lookalike hosts or unrelated markers", () => {
    expect(
      isShapeLabReferral(
        "https://shapelab.teacher.dev.example.com/",
        "https://solids.teacher.dev/?from=another-site",
      ),
    ).toBe(false);
  });

  it("handles missing and malformed URLs", () => {
    expect(isShapeLabReferral("", "not a url")).toBe(false);
  });
});

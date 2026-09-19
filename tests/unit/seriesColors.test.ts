import { describe, expect, it } from "vitest";

import { getComparisonColor, getComparisonPalette } from "../../src/app/seriesColors";

describe("PPIC categorical comparison colors", () => {
  it("uses the official orange and navy pairing for two comparisons", () => {
    expect(getComparisonPalette(2)).toEqual(["#ca4f1a", "#293b54"]);
  });

  it("uses the count-specific PPIC order", () => {
    expect(getComparisonPalette(3)).toEqual(["#ca4f1a", "#293b54", "#7b7b77"]);
    expect(getComparisonPalette(5)).toEqual(["#ca4f1a", "#293b54", "#0f4880", "#1a1918", "#494908"]);
  });

  it("cycles the ten-color scheme when more than ten comparisons are present", () => {
    expect(getComparisonColor(11, 10)).toBe("#ca4f1a");
  });
});

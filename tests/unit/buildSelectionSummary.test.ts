import { describe, expect, it } from "vitest";

import { buildSelectionSummary } from "../../src/data/buildSelectionSummary";
import type { PreparedSeries } from "../../src/app/types";

function series(overrides: Partial<PreparedSeries>): PreparedSeries {
  return {
    comparisonId: 1,
    label: "Labor force participation",
    resolvedOutcomeLabel: "Labor force participation",
    outcomeKey: "lfp",
    denominatorMode: "all",
    supportsDenominatorChoice: false,
    valueFormat: "percent",
    color: "#000000",
    matchedRowCount: 1,
    hidden: false,
    suppressionReason: null,
    actual: [],
    projected: [],
    ...overrides,
  };
}

describe("buildSelectionSummary", () => {
  it("lists visible comparison labels and explains the actual/projected split", () => {
    const summary = buildSelectionSummary([series({ label: "Labor force participation" })]);
    expect(summary).toBe(
      "Labor force participation. Each comparison is split into actual data (pred=FALSE, solid) and projections (pred=TRUE, dashed).",
    );
  });

  it("appends a hidden-count note when some comparisons are suppressed", () => {
    const summary = buildSelectionSummary([
      series({ comparisonId: 1, label: "A" }),
      series({ comparisonId: 2, label: "B", hidden: true, suppressionReason: "x" }),
    ]);
    expect(summary).toContain("A. Each comparison");
    expect(summary).toContain("1 comparison hidden because total population falls below 20,000");
  });

  it("pluralizes the hidden count", () => {
    const summary = buildSelectionSummary([
      series({ comparisonId: 1, label: "A" }),
      series({ comparisonId: 2, label: "B", hidden: true, suppressionReason: "x" }),
      series({ comparisonId: 3, label: "C", hidden: true, suppressionReason: "x" }),
    ]);
    expect(summary).toContain("2 comparisons hidden");
  });

  it("explains when every comparison is hidden", () => {
    const summary = buildSelectionSummary([series({ hidden: true, suppressionReason: "x" })]);
    expect(summary).toBe(
      "All selected comparisons are hidden because total population falls below 20,000 in at least one year in the data.",
    );
  });
});

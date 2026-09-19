import { describe, expect, it } from "vitest";

import { exportDisplayedData } from "../../src/data/exportDisplayedData";
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

describe("exportDisplayedData", () => {
  it("returns an empty string when every comparison is suppressed", () => {
    const csv = exportDisplayedData({ series: [series({ hidden: true, suppressionReason: "x" })] });
    expect(csv).toBe("");
  });

  it("never includes a suppressed comparison alongside visible ones", () => {
    const visible = series({
      actual: [{ year: 2006, predictionStatus: "FALSE", rate: 0.5, displayedValue: 0.5, totalPopulation: 30000, validWeight: 30000, status: "valid" }],
      projected: [],
    });
    const hidden = series({ comparisonId: 2, hidden: true, suppressionReason: "x", label: "Hidden comparison" });
    const csv = exportDisplayedData({ series: [visible, hidden] });

    expect(csv).not.toContain("Hidden comparison");
    expect(csv.split("\n")[0]?.includes("comparison_2_")).toBe(false);
  });

  it("sorts years numerically and separates actual/projected columns", () => {
    const csv = exportDisplayedData({
      series: [
        series({
          actual: [
            { year: 2024, predictionStatus: "FALSE", rate: 0.4, displayedValue: 0.4, totalPopulation: 30000, validWeight: 30000, status: "valid" },
            { year: 2006, predictionStatus: "FALSE", rate: 0.3, displayedValue: 0.3, totalPopulation: 30000, validWeight: 30000, status: "valid" },
          ],
          projected: [
            { year: 2020, predictionStatus: "TRUE", rate: 0.6, displayedValue: 0.6, totalPopulation: 40000, validWeight: 40000, status: "valid" },
          ],
        }),
      ],
    });

    const lines = csv.split("\n");
    expect(lines.map((line) => line.split(",")[0])).toEqual(["year", "2006", "2020", "2024"]);
  });

  it("leaves the value blank and marks status for missing and interpolated points, and formats raw vs percent", () => {
    const csv = exportDisplayedData({
      series: [
        series({
          valueFormat: "raw",
          actual: [
            { year: 2006, predictionStatus: "FALSE", rate: null, displayedValue: null, totalPopulation: 0, validWeight: 0, status: "missing" },
            { year: 2020, predictionStatus: "FALSE", rate: 0.25, displayedValue: 2500, totalPopulation: 10000, validWeight: 10000, status: "interpolated" },
          ],
        }),
      ],
    });

    const rows = csv.split("\n");
    const header = rows[0]!.split(",");
    const row2006 = Object.fromEntries(header.map((key, index) => [key, rows[1]!.split(",")[index]]));
    const row2020 = Object.fromEntries(header.map((key, index) => [key, rows[2]!.split(",")[index]]));

    expect(row2006.comparison_1_actual_displayed_value).toBe("");
    expect(row2006.comparison_1_actual_status).toBe("missing");
    expect(row2020.comparison_1_actual_displayed_value).toBe("2500");
    expect(row2020.comparison_1_actual_status).toBe("interpolated");
    expect(row2020.comparison_1_unit).toBe("raw count");
  });

  it("escapes commas, quotes, and line breaks in labels", () => {
    const csv = exportDisplayedData({
      series: [
        series({
          label: 'Race/Ethnicity: "Other", Education: HS\nGraduate',
          actual: [{ year: 2006, predictionStatus: "FALSE", rate: 0.5, displayedValue: 0.5, totalPopulation: 30000, validWeight: 30000, status: "valid" }],
        }),
      ],
    });

    expect(csv).toContain('"Race/Ethnicity: ""Other"", Education: HS\nGraduate"');
  });

  it("emits multiple comparisons with independent columns", () => {
    const csv = exportDisplayedData({
      series: [
        series({ comparisonId: 1, label: "A", actual: [{ year: 2006, predictionStatus: "FALSE", rate: 0.5, displayedValue: 0.5, totalPopulation: 30000, validWeight: 30000, status: "valid" }] }),
        series({ comparisonId: 2, label: "B", actual: [{ year: 2006, predictionStatus: "FALSE", rate: 0.7, displayedValue: 0.7, totalPopulation: 50000, validWeight: 50000, status: "valid" }] }),
      ],
    });

    const header = csv.split("\n")[0]!;
    expect(header).toContain("comparison_1_label");
    expect(header).toContain("comparison_2_label");
  });
});

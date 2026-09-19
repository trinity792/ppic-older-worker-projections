import { describe, expect, it } from "vitest";

import { prepareComparisons } from "../../src/data/prepareComparisons";
import type { ComparisonSelection, ProjectionRow } from "../../src/app/types";

function row(overrides: Partial<ProjectionRow> & Pick<ProjectionRow, "year" | "totalPopulation" | "predictionStatus">): ProjectionRow {
  return {
    values: {},
    categories: { raceEthnicity: "Other/None Listed", gender: "Female", ageCategory: "55-59", education: "No HS Degree" },
    ...overrides,
  };
}

function selection(overrides: Partial<ComparisonSelection> = {}): ComparisonSelection {
  return {
    id: 1,
    outcome: "lfp",
    useLaborForce: false,
    raceEthnicity: "",
    gender: "",
    ageCategory: "",
    education: "",
    ...overrides,
  };
}

describe("prepareComparisons: weighted aggregation", () => {
  it("weights the rate by totpop and keeps total population distinct from valid weight", () => {
    const rows: ProjectionRow[] = [
      row({ year: 2006, totalPopulation: 30000, predictionStatus: "FALSE", values: { lfp: 0.5 } }),
      row({ year: 2006, totalPopulation: 90000, predictionStatus: "FALSE", values: { lfp: 0.9 } }),
      row({ year: 2006, totalPopulation: 25000, predictionStatus: "FALSE", values: { lfp: null } }),
    ];

    const [series] = prepareComparisons({ rows, comparisons: [selection()], valueFormat: "percent" });
    const point = series!.actual.find((entry) => entry.year === 2006)!;

    expect(point.rate).toBeCloseTo(0.8, 10);
    expect(point.validWeight).toBe(120000);
    expect(point.totalPopulation).toBe(145000);
    expect(point.status).toBe("valid");
  });
});

describe("prepareComparisons: filters", () => {
  const rows: ProjectionRow[] = [
    row({
      year: 2006,
      totalPopulation: 30000,
      predictionStatus: "FALSE",
      values: { lfp: 0.4 },
      categories: { raceEthnicity: "Latino", gender: "Female", ageCategory: "55-59", education: "HS Graduate" },
    }),
    row({
      year: 2006,
      totalPopulation: 40000,
      predictionStatus: "FALSE",
      values: { lfp: 0.6 },
      categories: { raceEthnicity: "Latino", gender: "Female", ageCategory: "60-64", education: "HS Graduate" },
    }),
    row({
      year: 2006,
      totalPopulation: 50000,
      predictionStatus: "FALSE",
      values: { lfp: 0.8 },
      categories: { raceEthnicity: "White", gender: "Male", ageCategory: "70-74", education: "College Graduate" },
    }),
  ];

  it("matches every individual filter", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [selection({ raceEthnicity: "White", gender: "Male", ageCategory: "70-74", education: "College Graduate" })],
      valueFormat: "percent",
    });
    expect(series!.matchedRowCount).toBe(1);
    expect(series!.actual[0]?.rate).toBeCloseTo(0.8, 10);
  });

  it("combines the 55-64 age band from the 55-59 and 60-64 five-year categories", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [selection({ ageCategory: "55-64" })],
      valueFormat: "percent",
    });
    expect(series!.matchedRowCount).toBe(2);
    // (30000*0.4 + 40000*0.6) / 70000
    expect(series!.actual[0]?.rate).toBeCloseTo((30000 * 0.4 + 40000 * 0.6) / 70000, 10);
  });

  it("combines the 65-and-older age band from every five-year category outside 55-64", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [selection({ ageCategory: "65 and older" })],
      valueFormat: "percent",
    });
    expect(series!.matchedRowCount).toBe(1);
    expect(series!.actual[0]?.rate).toBeCloseTo(0.8, 10);
  });

  it("returns no rows and no suppression when a filter combination matches nothing", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [selection({ raceEthnicity: "Asian" })],
      valueFormat: "percent",
    });
    expect(series!.matchedRowCount).toBe(0);
    expect(series!.hidden).toBe(false);
    expect(series!.actual).toHaveLength(0);
  });
});

describe("prepareComparisons: denominator modes", () => {
  const rows: ProjectionRow[] = [
    row({
      year: 2006,
      totalPopulation: 30000,
      predictionStatus: "FALSE",
      values: { full_time: 0.3, full_time_lf: 0.7 },
    }),
  ];

  it("uses the all-adults column and label when the denominator is all", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [selection({ outcome: "full_time", useLaborForce: false })],
      valueFormat: "percent",
    });
    expect(series!.denominatorMode).toBe("all");
    expect(series!.actual[0]?.rate).toBeCloseTo(0.3, 10);
    expect(series!.resolvedOutcomeLabel).toBe("Full time workers: share of all adults");
  });

  it("uses the labor-force column and label when the denominator is labor force", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [selection({ outcome: "full_time", useLaborForce: true })],
      valueFormat: "percent",
    });
    expect(series!.denominatorMode).toBe("labor");
    expect(series!.actual[0]?.rate).toBeCloseTo(0.7, 10);
    expect(series!.resolvedOutcomeLabel).toBe("Full time workers: share of labor force");
  });

  it("derives the raw display value as rate times total population", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [selection({ outcome: "full_time", useLaborForce: false })],
      valueFormat: "raw",
    });
    expect(series!.actual[0]?.displayedValue).toBeCloseTo(0.3 * 30000, 6);
  });
});

describe("prepareComparisons: actual/projected separation", () => {
  it("keeps actual and projected buckets independent in an overlap year", () => {
    const rows: ProjectionRow[] = [
      row({ year: 2020, totalPopulation: 30000, predictionStatus: "FALSE", values: { lfp: 0.4 } }),
      row({ year: 2020, totalPopulation: 40000, predictionStatus: "TRUE", values: { lfp: 0.6 } }),
    ];

    const [series] = prepareComparisons({ rows, comparisons: [selection()], valueFormat: "percent" });
    expect(series!.actual.find((point) => point.year === 2020)?.rate).toBeCloseTo(0.4, 10);
    expect(series!.projected.find((point) => point.year === 2020)?.rate).toBeCloseTo(0.6, 10);
  });
});

describe("prepareComparisons: suppression", () => {
  it("does not suppress a population of exactly 19999", () => {
    const rows: ProjectionRow[] = [row({ year: 2006, totalPopulation: 19999, predictionStatus: "FALSE", values: { lfp: 0.5 } })];
    const [series] = prepareComparisons({ rows, comparisons: [selection()], valueFormat: "percent" });
    expect(series!.actual[0]?.status).toBe("suppressed");
    expect(series!.hidden).toBe(true);
  });

  it("does not suppress a population of exactly 20000", () => {
    const rows: ProjectionRow[] = [row({ year: 2006, totalPopulation: 20000, predictionStatus: "FALSE", values: { lfp: 0.5 } })];
    const [series] = prepareComparisons({ rows, comparisons: [selection()], valueFormat: "percent" });
    expect(series!.actual[0]?.status).toBe("valid");
    expect(series!.hidden).toBe(false);
  });

  it("does not suppress a population of 20001", () => {
    const rows: ProjectionRow[] = [row({ year: 2006, totalPopulation: 20001, predictionStatus: "FALSE", values: { lfp: 0.5 } })];
    const [series] = prepareComparisons({ rows, comparisons: [selection()], valueFormat: "percent" });
    expect(series!.actual[0]?.status).toBe("valid");
    expect(series!.hidden).toBe(false);
  });

  it("treats zero population as no data, not suppression", () => {
    const rows: ProjectionRow[] = [row({ year: 2006, totalPopulation: 0, predictionStatus: "FALSE", values: { lfp: null } })];
    const [series] = prepareComparisons({ rows, comparisons: [selection()], valueFormat: "percent" });
    expect(series!.actual[0]?.status).toBe("missing");
    expect(series!.hidden).toBe(false);
  });

  it("hides the whole comparison and nulls every point when only one of several years is low", () => {
    const rows: ProjectionRow[] = [
      row({ year: 2010, totalPopulation: 15000, predictionStatus: "FALSE", values: { lfp: 0.5 } }),
      row({ year: 2011, totalPopulation: 25000, predictionStatus: "FALSE", values: { lfp: 0.6 } }),
    ];
    const [series] = prepareComparisons({ rows, comparisons: [selection()], valueFormat: "percent" });

    expect(series!.hidden).toBe(true);
    expect(series!.suppressionReason).toMatch(/20,000/);
    series!.actual.forEach((point) => {
      expect(point.status).toBe("suppressed");
      expect(point.rate).toBeNull();
      expect(point.displayedValue).toBeNull();
    });
  });
});

describe("prepareComparisons: 2020 poverty interpolation", () => {
  function povertyRows(point2020: { totalPopulation: number; value: number | null }, opts?: { skip2019?: boolean; skip2021?: boolean; suppress2019?: boolean }): ProjectionRow[] {
    const rows: ProjectionRow[] = [];
    if (!opts?.skip2019) {
      rows.push(
        row({
          year: 2019,
          totalPopulation: opts?.suppress2019 ? 15000 : 30000,
          predictionStatus: "FALSE",
          values: { cpmU100: 0.2 },
        }),
      );
    }
    rows.push(
      row({ year: 2020, totalPopulation: point2020.totalPopulation, predictionStatus: "FALSE", values: { cpmU100: point2020.value } }),
    );
    if (!opts?.skip2021) {
      rows.push(row({ year: 2021, totalPopulation: 30000, predictionStatus: "FALSE", values: { cpmU100: 0.3 } }));
    }
    return rows;
  }

  it("interpolates linearly between the adjacent historical points", () => {
    const rows = povertyRows({ totalPopulation: 30000, value: null });
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "cpmU100" })], valueFormat: "percent" });
    const point2020 = series!.actual.find((entry) => entry.year === 2020)!;
    expect(point2020.status).toBe("interpolated");
    expect(point2020.rate).toBeCloseTo(0.2 + (0.3 - 0.2) * 0.5, 10);
  });

  it("does not interpolate when 2020 already has a value", () => {
    const rows = povertyRows({ totalPopulation: 30000, value: 0.25 });
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "cpmU100" })], valueFormat: "percent" });
    expect(series!.actual.find((entry) => entry.year === 2020)?.status).toBe("valid");
  });

  it("does not interpolate when 2020 population is zero", () => {
    const rows = povertyRows({ totalPopulation: 0, value: null });
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "cpmU100" })], valueFormat: "percent" });
    expect(series!.actual.find((entry) => entry.year === 2020)?.status).toBe("missing");
  });

  it("does not interpolate when 2020 is itself suppressed", () => {
    const rows = povertyRows({ totalPopulation: 15000, value: null });
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "cpmU100" })], valueFormat: "percent" });
    // The whole comparison is suppressed (2020 is below threshold), so every point ends up "suppressed".
    expect(series!.hidden).toBe(true);
    expect(series!.actual.find((entry) => entry.year === 2020)?.status).toBe("suppressed");
  });

  it("does not interpolate when the previous neighbor is missing from the series", () => {
    const rows = povertyRows({ totalPopulation: 30000, value: null }, { skip2019: true });
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "cpmU100" })], valueFormat: "percent" });
    expect(series!.actual.find((entry) => entry.year === 2020)?.status).toBe("missing");
  });

  it("does not interpolate when the next neighbor is missing from the series", () => {
    const rows = povertyRows({ totalPopulation: 30000, value: null }, { skip2021: true });
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "cpmU100" })], valueFormat: "percent" });
    expect(series!.actual.find((entry) => entry.year === 2020)?.status).toBe("missing");
  });

  it("does not interpolate when a neighbor is itself suppressed", () => {
    const rows = povertyRows({ totalPopulation: 30000, value: null }, { suppress2019: true });
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "cpmU100" })], valueFormat: "percent" });
    // The whole comparison is suppressed because 2019 is below threshold, so 2020 ends up "suppressed" too.
    expect(series!.hidden).toBe(true);
  });

  it("does not interpolate a non-poverty outcome", () => {
    const rows: ProjectionRow[] = [
      row({ year: 2019, totalPopulation: 30000, predictionStatus: "FALSE", values: { lfp: 0.2 } }),
      row({ year: 2020, totalPopulation: 30000, predictionStatus: "FALSE", values: { lfp: null } }),
      row({ year: 2021, totalPopulation: 30000, predictionStatus: "FALSE", values: { lfp: 0.3 } }),
    ];
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "lfp" })], valueFormat: "percent" });
    expect(series!.actual.find((entry) => entry.year === 2020)?.status).toBe("missing");
  });

  it("does not interpolate a projected (non-historical) 2020 point", () => {
    const rows: ProjectionRow[] = [
      row({ year: 2019, totalPopulation: 30000, predictionStatus: "TRUE", values: { cpmU100: 0.2 } }),
      row({ year: 2020, totalPopulation: 30000, predictionStatus: "TRUE", values: { cpmU100: null } }),
      row({ year: 2021, totalPopulation: 30000, predictionStatus: "TRUE", values: { cpmU100: 0.3 } }),
    ];
    const [series] = prepareComparisons({ rows, comparisons: [selection({ outcome: "cpmU100" })], valueFormat: "percent" });
    expect(series!.projected.find((entry) => entry.year === 2020)?.status).toBe("missing");
  });
});

describe("prepareComparisons: comparison label", () => {
  it("builds a human-readable label from the resolved outcome and active filters", () => {
    const rows: ProjectionRow[] = [row({ year: 2006, totalPopulation: 30000, predictionStatus: "FALSE", values: { lfp: 0.5 } })];
    const [series] = prepareComparisons({
      rows,
      comparisons: [selection({ raceEthnicity: "Latino", gender: "Female" })],
      valueFormat: "percent",
    });
    expect(series!.label).toBe("Labor force participation | Race/Ethnicity: Latino | Gender: Female");
  });
});

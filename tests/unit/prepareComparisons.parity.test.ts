import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseProjectionCsv } from "../../src/data/parseProjectionCsv";
import { prepareComparisons } from "../../src/data/prepareComparisons";
import type { ComparisonSelection } from "../../src/app/types";

// Cross-checks the migrated calculation pipeline against values captured
// live from the real, unmodified v0/ app in tests/fixtures/parity/. See
// tests/fixtures/parity/README.md for how those fixtures were produced.

function baseSelection(overrides: Partial<ComparisonSelection> = {}): ComparisonSelection {
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

const productionCsvPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../public/data/cleaned/projections_age5cat_2006_2040.csv",
);
const { rows } = parseProjectionCsv(readFileSync(productionCsvPath, "utf-8"));

describe("prepareComparisons parity with tests/fixtures/parity", () => {
  it("matches 01-statewide-default.json's 2006 actual value and population", () => {
    const [series] = prepareComparisons({ rows, comparisons: [baseSelection()], valueFormat: "percent" });
    const point2006 = series!.actual.find((entry) => entry.year === 2006)!;

    // Fixture: "36.9% / Total population: 7,332,882"; exact rate confirmed via
    // 10-csv-download-contract.json's comparison_1_actual_value.
    expect(point2006.totalPopulation).toBe(7332882);
    expect(point2006.rate).toBeCloseTo(0.36905735016600566, 10);
  });

  it("matches 02-full-filter-comparison.json's matched rows and 2006 actual value", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [
        baseSelection({ raceEthnicity: "Latino", gender: "Female", ageCategory: "55-64", education: "HS Graduate" }),
      ],
      valueFormat: "percent",
    });

    // Fixture 10's comparison_2 (same selection) 2006 actual value/population.
    const point2006 = series!.actual.find((entry) => entry.year === 2006)!;
    expect(point2006.totalPopulation).toBe(77099);
    expect(point2006.rate).toBeCloseTo(0.508904136240418, 10);
  });

  it("matches 07-suppressed-single-low-year.json: hidden due to the 2021 population of 19,712", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [baseSelection({ raceEthnicity: "White", ageCategory: "85-89", education: "No HS Degree" })],
      valueFormat: "percent",
    });

    expect(series!.hidden).toBe(true);
    const point2021 = series!.actual.find((entry) => entry.year === 2021)!;
    expect(point2021.totalPopulation).toBe(19712);
  });

  it("matches 09-pacific-islander-suppression.json: hidden due to 2006/2007 populations", () => {
    const [series] = prepareComparisons({
      rows,
      comparisons: [baseSelection({ raceEthnicity: "Pacific Islander" })],
      valueFormat: "percent",
    });

    expect(series!.hidden).toBe(true);
    expect(series!.actual.find((entry) => entry.year === 2006)?.totalPopulation).toBe(17557);
    expect(series!.actual.find((entry) => entry.year === 2007)?.totalPopulation).toBe(16393);
  });

  it("matches 08-missing-values-and-interpolation.json: missing 2006-2010 and interpolated 2020", () => {
    const [series] = prepareComparisons({ rows, comparisons: [baseSelection({ outcome: "cpmU100" })], valueFormat: "percent" });

    [2006, 2007, 2008, 2009, 2010].forEach((year) => {
      expect(series!.actual.find((entry) => entry.year === year)?.status).toBe("missing");
    });

    const point2020 = series!.actual.find((entry) => entry.year === 2020)!;
    expect(point2020.status).toBe("interpolated");
    // 0.16452823641805628 (2019) + (0.12948835074459847 - 0.16452823641805628) * 0.5
    expect(point2020.rate).toBeCloseTo(0.147008293581327, 10);
  });

  it("matches 04-denominator-switch.json's full-time-worker values in both denominator modes", () => {
    const [allAdults] = prepareComparisons({
      rows,
      comparisons: [baseSelection({ outcome: "full_time", useLaborForce: false })],
      valueFormat: "percent",
    });
    const [laborForce] = prepareComparisons({
      rows,
      comparisons: [baseSelection({ outcome: "full_time", useLaborForce: true })],
      valueFormat: "percent",
    });

    // Fixture: "22.1%" (all adults) vs "49.1%" (labor force) for 2006.
    expect(allAdults!.actual.find((entry) => entry.year === 2006)?.rate).toBeCloseTo(0.221, 2);
    expect(laborForce!.actual.find((entry) => entry.year === 2006)?.rate).toBeCloseTo(0.491, 2);
  });

  it("matches 06-percent-and-raw-modes.json: raw display equals rate times total population", () => {
    const [series] = prepareComparisons({ rows, comparisons: [baseSelection()], valueFormat: "raw" });
    const point2006 = series!.actual.find((entry) => entry.year === 2006)!;

    // Fixture: raw 2006 value is 2,706,254 (rounded from rate * population).
    expect(point2006.displayedValue).toBeCloseTo(2706253.9, 0);
  });
});

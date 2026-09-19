import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseProjectionCsv, ProjectionCsvError } from "../../src/data/parseProjectionCsv";

const REQUIRED_HEADER =
  "year,totpop,pred,latino,white,black,asian,pacis,female,age_cat,ed_hsgrad,ed_somecoll,ed_collgrad,lfp";

function csv(rows: string[]): string {
  return [REQUIRED_HEADER, ...rows].join("\n");
}

describe("parseProjectionCsv", () => {
  it("parses a well-formed row into a typed ProjectionRow", () => {
    const result = parseProjectionCsv(
      csv(["2006,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5"]),
    );

    expect(result.rows).toHaveLength(1);
    expect(result.diagnostics).toEqual({ totalRecordCount: 1, skippedRowCount: 0 });
    const [row] = result.rows;
    expect(row).toMatchObject({
      year: 2006,
      totalPopulation: 1000,
      predictionStatus: "FALSE",
      values: { lfp: 0.5 },
      categories: {
        raceEthnicity: "Latino",
        gender: "Female",
        ageCategory: "55-59",
        education: "No HS Degree",
      },
    });
  });

  it("applies race/ethnicity precedence, including the Pacific Islander mapping", () => {
    const result = parseProjectionCsv(
      csv([
        "2006,1000,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,FALSE,55-59,FALSE,FALSE,FALSE,0.5",
        "2006,1000,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,55-59,FALSE,FALSE,FALSE,0.5",
      ]),
    );

    expect(result.rows[0]?.categories.raceEthnicity).toBe("Pacific Islander");
    expect(result.rows[1]?.categories.raceEthnicity).toBe("Other/None Listed");
  });

  it("treats blank, NA, and NaN outcomes as missing rather than zero", () => {
    const result = parseProjectionCsv(
      csv([
        "2006,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,",
        "2007,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,NA",
        "2008,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,NaN",
        "2009,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0",
      ]),
    );

    expect(result.rows.map((row) => row.values.lfp)).toEqual([null, null, null, 0]);
  });

  it("skips rows with a non-finite year or totpop and surfaces the skipped count", () => {
    const result = parseProjectionCsv(
      csv([
        "2006,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
        "not-a-year,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
        "2008,not-a-population,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
      ]),
    );

    expect(result.rows).toHaveLength(1);
    expect(result.diagnostics).toEqual({ totalRecordCount: 3, skippedRowCount: 2 });
  });

  it("skips rows with blank required numbers or invalid category booleans", () => {
    const result = parseProjectionCsv(
      csv([
        ",1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
        "2007,,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
        "2008,1000,FALSE,MAYBE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
        "2009,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
      ]),
    );

    expect(result.rows).toHaveLength(1);
    expect(result.diagnostics.skippedRowCount).toBe(3);
  });

  it("ignores a leading unnamed export-index column without shifting fields", () => {
    const withIndexHeader = `,${REQUIRED_HEADER}`;
    const result = parseProjectionCsv(
      [withIndexHeader, "42,2006,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5"].join("\n"),
    );

    expect(result.rows[0]).toMatchObject({ year: 2006, totalPopulation: 1000, predictionStatus: "FALSE" });
  });

  it("rejects malformed record widths and unterminated quoted fields", () => {
    expect(() =>
      parseProjectionCsv(csv(["2006,1000,FALSE,TRUE"])),
    ).toThrow(/fields on row 2/);
    expect(() =>
      parseProjectionCsv(`${REQUIRED_HEADER}\n2006,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,"55-59`),
    ).toThrow(/unterminated quoted field/);
  });

  it("rejects a structurally valid file with no supported outcome columns", () => {
    const header = REQUIRED_HEADER.replace(",lfp", "");
    const record = "2006,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE";
    expect(() => parseProjectionCsv([header, record].join("\n"))).toThrow(/supported outcome columns/);
  });

  it("skips rows with an invalid pred value", () => {
    const result = parseProjectionCsv(
      csv([
        "2006,1000,MAYBE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
        "2007,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5",
      ]),
    );

    expect(result.rows).toHaveLength(1);
    expect(result.diagnostics.skippedRowCount).toBe(1);
  });

  it("throws a named error when required columns are missing", () => {
    expect(() => parseProjectionCsv("year,totpop,pred\n2006,1000,FALSE")).toThrow(ProjectionCsvError);
    try {
      parseProjectionCsv("year,totpop,pred\n2006,1000,FALSE");
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectionCsvError);
      expect((error as ProjectionCsvError).stage).toBe("columns");
    }
  });

  it("throws a named error for an empty file", () => {
    expect(() => parseProjectionCsv("")).toThrow(ProjectionCsvError);
    expect(() => parseProjectionCsv(REQUIRED_HEADER)).toThrow(ProjectionCsvError);
  });

  it("throws a named error when no valid rows remain", () => {
    expect(() =>
      parseProjectionCsv(
        csv(["not-a-year,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5"]),
      ),
    ).toThrow(ProjectionCsvError);
  });

  it("marks an outcome unavailable when its required column is missing from the header", () => {
    const result = parseProjectionCsv(
      csv(["2006,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5"]),
    );

    expect(result.availableOutcomeKeys).toEqual(["lfp"]);
  });

  it("requires both the total and labor columns for a denominator-switching outcome to be available", () => {
    const header = `${REQUIRED_HEADER},full_time`;
    const result = parseProjectionCsv(
      [header, "2006,1000,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,55-59,FALSE,FALSE,FALSE,0.5,0.4"].join("\n"),
    );

    expect(result.availableOutcomeKeys).not.toContain("full_time");
  });

  it("parses the production dataset with the expected shape", () => {
    const productionCsvPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../public/data/cleaned/projections_age5cat_2006_2040.csv",
    );
    const text = readFileSync(productionCsvPath, "utf-8");
    const result = parseProjectionCsv(text);

    expect(result.rows).toHaveLength(15083);
    expect(result.diagnostics.skippedRowCount).toBe(0);

    const years = result.rows.map((row) => row.year);
    expect(Math.min(...years)).toBe(2006);
    expect(Math.max(...years)).toBe(2040);

    const historicalYears = result.rows.filter((row) => row.predictionStatus === "FALSE").map((row) => row.year);
    expect(Math.min(...historicalYears)).toBe(2006);
    expect(Math.max(...historicalYears)).toBe(2024);

    const projectedYears = result.rows.filter((row) => row.predictionStatus === "TRUE").map((row) => row.year);
    expect(Math.min(...projectedYears)).toBe(2020);
    expect(Math.max(...projectedYears)).toBe(2040);
  });
});

import { describe, expect, it } from "vitest";

import { describePoint } from "../../src/data/describePoint";
import type { PreparedPoint } from "../../src/app/types";

function point(overrides: Partial<PreparedPoint>): PreparedPoint {
  return {
    year: 2006,
    predictionStatus: "FALSE",
    rate: null,
    displayedValue: null,
    totalPopulation: 0,
    validWeight: 0,
    status: "missing",
    ...overrides,
  };
}

describe("describePoint", () => {
  it("shows No data with no population line when the point is absent", () => {
    expect(describePoint(undefined, "percent")).toEqual({ primaryText: "No data", populationText: null, interpolated: false });
  });

  it("shows No data with no population line when total population is zero", () => {
    const description = describePoint(point({ totalPopulation: 0 }), "percent");
    expect(description).toEqual({ primaryText: "No data", populationText: null, interpolated: false });
  });

  it("shows No data with a population line when the outcome value is missing but population is positive", () => {
    const description = describePoint(point({ totalPopulation: 30000, status: "missing" }), "percent");
    expect(description.primaryText).toBe("No data");
    expect(description.populationText).toBe("Total population: 30,000");
  });

  it("formats a valid percent value with population and no interpolation note", () => {
    const description = describePoint(
      point({ totalPopulation: 30000, status: "valid", displayedValue: 0.369 }),
      "percent",
    );
    expect(description.primaryText).toBe("36.9%");
    expect(description.interpolated).toBe(false);
  });

  it("formats a valid raw value as a count", () => {
    const description = describePoint(
      point({ totalPopulation: 30000, status: "valid", displayedValue: 2706254 }),
      "raw",
    );
    expect(description.primaryText).toBe("2,706,254");
  });

  it("marks an interpolated point", () => {
    const description = describePoint(
      point({ totalPopulation: 30000, status: "interpolated", displayedValue: 0.147 }),
      "percent",
    );
    expect(description.interpolated).toBe(true);
    expect(description.primaryText).toBe("14.7%");
  });

  it("never exposes a numeric value for a suppressed point", () => {
    const description = describePoint(point({ totalPopulation: 15000, status: "suppressed", displayedValue: null }), "percent");
    expect(description.primaryText).toBe("Suppressed");
    expect(description.populationText).toBeNull();
  });
});

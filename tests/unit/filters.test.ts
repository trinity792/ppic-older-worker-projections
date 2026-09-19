import { describe, expect, it } from "vitest";

import { FILTERS } from "../../src/app/filters";

describe("race and ethnicity filter options", () => {
  it("includes the approved Pacific Islander migration option", () => {
    const raceFilter = FILTERS.find((filter) => filter.key === "raceEthnicity");

    expect(raceFilter?.values).toEqual(["Latino", "White", "Black", "Asian", "Pacific Islander", "Other/None Listed"]);
  });
});

import { describe, expect, it } from "vitest";

import {
  comparisonsReducer,
  createInitialComparisonsState,
  normalizeComparisonsForAvailability,
} from "../../src/app/comparisonsReducer";

describe("createInitialComparisonsState", () => {
  it("starts with one statewide labor-force-participation comparison", () => {
    const state = createInitialComparisonsState();
    expect(state.comparisons).toEqual([
      { id: 1, outcome: "lfp", useLaborForce: false, raceEthnicity: "", gender: "", ageCategory: "", education: "" },
    ]);
    expect(state.resultsView).toBe("chart");
    expect(state.valueFormat).toBe("percent");
  });
});

describe("comparisonsReducer: add", () => {
  it("inherits the previous comparison's outcome and denominator but resets demographic filters", () => {
    let state = createInitialComparisonsState();
    state = comparisonsReducer(state, { type: "setOutcome", id: 1, outcome: "full_time" });
    state = comparisonsReducer(state, { type: "setUseLaborForce", id: 1, useLaborForce: true });
    state = comparisonsReducer(state, { type: "setFilter", id: 1, field: "gender", value: "Female" });

    state = comparisonsReducer(state, { type: "add" });

    expect(state.comparisons).toHaveLength(2);
    expect(state.comparisons[1]).toEqual({
      id: 2,
      outcome: "full_time",
      useLaborForce: true,
      raceEthnicity: "",
      gender: "",
      ageCategory: "",
      education: "",
    });
  });

  it("assigns strictly increasing ids that are never reused after removal", () => {
    let state = createInitialComparisonsState();
    state = comparisonsReducer(state, { type: "add" }); // id 2
    state = comparisonsReducer(state, { type: "remove", id: 2 });
    state = comparisonsReducer(state, { type: "add" }); // should be id 3, not 2 again

    expect(state.comparisons.map((c) => c.id)).toEqual([1, 3]);
  });
});

describe("comparisonsReducer: remove", () => {
  it("enforces a one-comparison minimum", () => {
    const state = createInitialComparisonsState();
    const result = comparisonsReducer(state, { type: "remove", id: 1 });
    expect(result).toBe(state);
    expect(result.comparisons).toHaveLength(1);
  });

  it("removes the targeted comparison when more than one exists", () => {
    let state = createInitialComparisonsState();
    state = comparisonsReducer(state, { type: "add" });
    state = comparisonsReducer(state, { type: "remove", id: 1 });
    expect(state.comparisons.map((c) => c.id)).toEqual([2]);
  });
});

describe("comparisonsReducer: field updates", () => {
  it("updates only the targeted comparison's filter, leaving others untouched", () => {
    let state = createInitialComparisonsState();
    state = comparisonsReducer(state, { type: "add" });
    state = comparisonsReducer(state, { type: "setFilter", id: 2, field: "education", value: "College Graduate" });

    expect(state.comparisons[0]?.education).toBe("");
    expect(state.comparisons[1]?.education).toBe("College Graduate");
  });

  it("preserves valid selections across unrelated control changes", () => {
    let state = createInitialComparisonsState();
    state = comparisonsReducer(state, { type: "setFilter", id: 1, field: "gender", value: "Female" });
    state = comparisonsReducer(state, { type: "setFilter", id: 1, field: "education", value: "HS Graduate" });
    expect(state.comparisons[0]?.gender).toBe("Female");
    expect(state.comparisons[0]?.education).toBe("HS Graduate");
  });
});

describe("comparisonsReducer: global controls", () => {
  it("sets the value format independent of comparisons", () => {
    const state = comparisonsReducer(createInitialComparisonsState(), { type: "setValueFormat", value: "raw" });
    expect(state.valueFormat).toBe("raw");
  });

  it("sets the results view", () => {
    const state = comparisonsReducer(createInitialComparisonsState(), { type: "setResultsView", value: "table" });
    expect(state.resultsView).toBe("table");
  });
});

describe("normalizeComparisonsForAvailability", () => {
  it("leaves comparisons untouched when their outcome is available", () => {
    const state = createInitialComparisonsState();
    const normalized = normalizeComparisonsForAvailability(state.comparisons, ["lfp", "own"]);
    expect(normalized).toEqual(state.comparisons);
  });

  it("falls back to the first available outcome when the selected one is unavailable", () => {
    const state = createInitialComparisonsState();
    const normalized = normalizeComparisonsForAvailability(state.comparisons, ["own", "stress30"]);
    expect(normalized[0]?.outcome).toBe("own");
  });

  it("does not normalize before availability is known (empty list)", () => {
    const state = createInitialComparisonsState();
    const normalized = normalizeComparisonsForAvailability(state.comparisons, []);
    expect(normalized).toEqual(state.comparisons);
  });
});

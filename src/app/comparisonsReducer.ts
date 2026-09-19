import type { ComparisonSelection, ValueFormat } from "./types";

export type ResultsView = "chart" | "table";
export type ComparisonFilterField = "raceEthnicity" | "gender" | "ageCategory" | "education";

export interface ComparisonsState {
  comparisons: readonly ComparisonSelection[];
  resultsView: ResultsView;
  valueFormat: ValueFormat;
  nextComparisonId: number;
}

export type ComparisonsAction =
  | { type: "add" }
  | { type: "remove"; id: number }
  | { type: "setFilter"; id: number; field: ComparisonFilterField; value: string }
  | { type: "setOutcome"; id: number; outcome: string }
  | { type: "setUseLaborForce"; id: number; useLaborForce: boolean }
  | { type: "setValueFormat"; value: ValueFormat }
  | { type: "setResultsView"; value: ResultsView };

const DEFAULT_OUTCOME = "lfp";

function createComparison(id: number, previous: ComparisonSelection | undefined): ComparisonSelection {
  return {
    id,
    outcome: previous ? previous.outcome : DEFAULT_OUTCOME,
    useLaborForce: previous ? previous.useLaborForce : false,
    raceEthnicity: "",
    gender: "",
    ageCategory: "",
    education: "",
  };
}

export function createInitialComparisonsState(): ComparisonsState {
  return {
    comparisons: [createComparison(1, undefined)],
    resultsView: "chart",
    valueFormat: "percent",
    nextComparisonId: 2,
  };
}

export function comparisonsReducer(state: ComparisonsState, action: ComparisonsAction): ComparisonsState {
  switch (action.type) {
    case "add": {
      const previous = state.comparisons[state.comparisons.length - 1];
      return {
        ...state,
        comparisons: [...state.comparisons, createComparison(state.nextComparisonId, previous)],
        nextComparisonId: state.nextComparisonId + 1,
      };
    }
    case "remove": {
      if (state.comparisons.length <= 1) {
        return state;
      }
      return { ...state, comparisons: state.comparisons.filter((comparison) => comparison.id !== action.id) };
    }
    case "setFilter":
      return {
        ...state,
        comparisons: state.comparisons.map((comparison) =>
          comparison.id === action.id ? { ...comparison, [action.field]: action.value } : comparison,
        ),
      };
    case "setOutcome":
      return {
        ...state,
        comparisons: state.comparisons.map((comparison) =>
          comparison.id === action.id ? { ...comparison, outcome: action.outcome } : comparison,
        ),
      };
    case "setUseLaborForce":
      return {
        ...state,
        comparisons: state.comparisons.map((comparison) =>
          comparison.id === action.id ? { ...comparison, useLaborForce: action.useLaborForce } : comparison,
        ),
      };
    case "setValueFormat":
      return { ...state, valueFormat: action.value };
    case "setResultsView":
      return { ...state, resultsView: action.value };
    default:
      return state;
  }
}

/**
 * A comparison's outcome can only fall out of availability if the loaded
 * dataset is missing that outcome's source column(s) (see
 * parseProjectionCsv's availableOutcomeKeys). Applied as a derived view over
 * reducer state rather than as a reducer action, since it depends on data
 * that loads independently of comparison edits.
 */
export function normalizeComparisonsForAvailability(
  comparisons: readonly ComparisonSelection[],
  availableOutcomeKeys: readonly string[],
): readonly ComparisonSelection[] {
  if (availableOutcomeKeys.length === 0) {
    return comparisons;
  }
  const available = new Set(availableOutcomeKeys);
  return comparisons.map((comparison) =>
    available.has(comparison.outcome) ? comparison : { ...comparison, outcome: availableOutcomeKeys[0]! },
  );
}

import { FILTERS } from "../app/filters";
import { OUTCOMES, type OutcomeDefinition } from "../app/outcomes";
import { SERIES_COLORS } from "../app/seriesColors";
import type {
  ComparisonSelection,
  OutcomeDenominatorMode,
  PointStatus,
  PredictionStatus,
  PreparedPoint,
  PreparedSeries,
  ProjectionRow,
  ValueFormat,
} from "../app/types";

export interface PrepareComparisonsInput {
  rows: readonly ProjectionRow[];
  comparisons: readonly ComparisonSelection[];
  valueFormat: ValueFormat;
}

const SUPPRESSION_THRESHOLD = 20000;
const POVERTY_OUTCOME_KEYS = new Set(["cpmU100", "cpmU150"]);
const INTERPOLATED_POVERTY_YEAR = 2020;

const OUTCOMES_BY_KEY: Record<string, OutcomeDefinition> = Object.fromEntries(
  OUTCOMES.map((outcome) => [outcome.key, outcome]),
);

interface Bucket {
  totalPopulation: number;
  weightedSum: number;
  validWeight: number;
}

function emptyBucket(): Bucket {
  return { totalPopulation: 0, weightedSum: 0, validWeight: 0 };
}

/**
 * Ported from v0/app.js's buildSeries/buildComparisonSeries pipeline; see
 * agents/skills/data-integrity.md for the semantics this must preserve and
 * tests/fixtures/parity/ for captured legacy output to check against.
 */
export function prepareComparisons(input: PrepareComparisonsInput): readonly PreparedSeries[] {
  const { rows, comparisons, valueFormat } = input;
  return comparisons.map((comparison, index) =>
    prepareComparison(comparison, rows, valueFormat, SERIES_COLORS[index % SERIES_COLORS.length] ?? "#000000"),
  );
}

function prepareComparison(
  comparison: ComparisonSelection,
  rows: readonly ProjectionRow[],
  valueFormat: ValueFormat,
  color: string,
): PreparedSeries {
  const outcomeDefinition = OUTCOMES_BY_KEY[comparison.outcome] ?? OUTCOMES[0]!;
  const denominatorMode = resolveDenominatorMode(outcomeDefinition, comparison.useLaborForce);
  const columnKey =
    (denominatorMode === "labor" ? outcomeDefinition.laborColumn : outcomeDefinition.totalColumn) ??
    outcomeDefinition.totalColumn;
  const resolvedOutcomeLabel = resolveOutcomeLabel(outcomeDefinition, denominatorMode, valueFormat);
  const label = buildComparisonLabel(comparison, resolvedOutcomeLabel);

  const matchedRows = rows.filter((row) => rowMatchesSelection(row, comparison));
  const grouped = aggregateByYearAndPrediction(matchedRows, columnKey);
  const years = [...grouped.keys()].sort((left, right) => left - right);

  const rawActualPoints = years.map((year) => buildPoint(year, "FALSE", grouped.get(year)!.FALSE));
  const projectedPoints = years.map((year) => buildPoint(year, "TRUE", grouped.get(year)!.TRUE));
  const actualPoints = maybeInterpolatePovertyActualPoints(outcomeDefinition.key, rawActualPoints);

  const positivePopulations = [...actualPoints, ...projectedPoints]
    .map((point) => point.totalPopulation)
    .filter((population) => population > 0);
  const hidden = positivePopulations.some((population) => population < SUPPRESSION_THRESHOLD);
  const suppressionReason = hidden
    ? `Total population falls below ${SUPPRESSION_THRESHOLD.toLocaleString()} in at least one represented year.`
    : null;

  return {
    comparisonId: comparison.id,
    label,
    resolvedOutcomeLabel,
    outcomeKey: outcomeDefinition.key,
    denominatorMode,
    supportsDenominatorChoice: !outcomeDefinition.fixedDenominator,
    valueFormat,
    color,
    matchedRowCount: matchedRows.length,
    hidden,
    suppressionReason,
    actual: finalizePoints(actualPoints, hidden, valueFormat),
    projected: finalizePoints(projectedPoints, hidden, valueFormat),
  };
}

function resolveDenominatorMode(definition: OutcomeDefinition, useLaborForce: boolean): OutcomeDenominatorMode {
  if (definition.fixedDenominator === "labor") return "labor";
  if (definition.fixedDenominator === "all") return "all";
  return useLaborForce ? "labor" : "all";
}

function resolveOutcomeLabel(
  definition: OutcomeDefinition,
  denominatorMode: OutcomeDenominatorMode,
  valueFormat: ValueFormat,
): string {
  if (valueFormat === "raw") {
    return `${definition.label}: raw count`;
  }
  if (definition.fixedDenominator) {
    return definition.label;
  }
  return `${definition.label}: share of ${denominatorMode === "labor" ? "labor force" : "all adults"}`;
}

function buildComparisonLabel(comparison: ComparisonSelection, resolvedOutcomeLabel: string): string {
  const parts = [resolvedOutcomeLabel];
  FILTERS.forEach((filter) => {
    const value = comparison[filter.key];
    if (value) {
      parts.push(`${filter.label}: ${value}`);
    }
  });
  return parts.join(" | ");
}

function rowMatchesSelection(row: ProjectionRow, comparison: ComparisonSelection): boolean {
  if (comparison.raceEthnicity && row.categories.raceEthnicity !== comparison.raceEthnicity) {
    return false;
  }
  if (comparison.gender && row.categories.gender !== comparison.gender) {
    return false;
  }
  if (comparison.ageCategory && !matchesAgeCategory(row.categories.ageCategory ?? "", comparison.ageCategory)) {
    return false;
  }
  if (comparison.education && row.categories.education !== comparison.education) {
    return false;
  }
  return true;
}

function matchesAgeCategory(rowAgeCategory: string, selectedValue: string): boolean {
  if (selectedValue === "55-64") {
    return rowAgeCategory === "55-59" || rowAgeCategory === "60-64";
  }
  if (selectedValue === "65 and older") {
    return !matchesAgeCategory(rowAgeCategory, "55-64");
  }
  return rowAgeCategory === selectedValue;
}

function aggregateByYearAndPrediction(
  rows: readonly ProjectionRow[],
  columnKey: string,
): Map<number, { FALSE: Bucket; TRUE: Bucket }> {
  const grouped = new Map<number, { FALSE: Bucket; TRUE: Bucket }>();

  rows.forEach((row) => {
    const bucket = grouped.get(row.year) ?? { FALSE: emptyBucket(), TRUE: emptyBucket() };
    const target = bucket[row.predictionStatus];
    target.totalPopulation += row.totalPopulation;

    const value = row.values[columnKey];
    if (value !== undefined && value !== null && Number.isFinite(value)) {
      target.weightedSum += value * row.totalPopulation;
      target.validWeight += row.totalPopulation;
    }

    grouped.set(row.year, bucket);
  });

  return grouped;
}

function buildPoint(year: number, predictionStatus: PredictionStatus, bucket: Bucket): PreparedPoint {
  const rate = bucket.validWeight > 0 ? bucket.weightedSum / bucket.validWeight : null;
  const suppressed = bucket.totalPopulation > 0 && bucket.totalPopulation < SUPPRESSION_THRESHOLD;
  const status: PointStatus = suppressed ? "suppressed" : rate === null ? "missing" : "valid";

  return {
    year,
    predictionStatus,
    rate: suppressed ? null : rate,
    totalPopulation: bucket.totalPopulation,
    validWeight: bucket.validWeight,
    status,
    displayedValue: null,
  };
}

/**
 * Only the historical (actual) 2020 point for the two poverty outcomes may be
 * linearly interpolated, and only when it is missing (not suppressed, not
 * zero population) and both array-adjacent neighbors are present, valued, and
 * not suppressed. Neighbors are the adjacent entries in this sorted points
 * array, not strictly "the previous/next calendar year" -- ported exactly
 * from v0/app.js's maybeInterpolatePovertyActualPoints, including that
 * subtlety.
 */
function maybeInterpolatePovertyActualPoints(
  outcomeKey: string,
  points: readonly PreparedPoint[],
): readonly PreparedPoint[] {
  if (!POVERTY_OUTCOME_KEYS.has(outcomeKey)) {
    return points;
  }

  const index = points.findIndex((point) => point.year === INTERPOLATED_POVERTY_YEAR);
  if (index === -1) {
    return points;
  }

  const target = points[index]!;
  if (target.status !== "missing" || target.totalPopulation === 0) {
    return points;
  }

  const previous = points[index - 1];
  const next = points[index + 1];
  if (!previous || !next || previous.rate === null || next.rate === null) {
    return points;
  }
  if (previous.status === "suppressed" || next.status === "suppressed") {
    return points;
  }

  const interpolatedRate =
    previous.rate +
    ((next.rate - previous.rate) * (INTERPOLATED_POVERTY_YEAR - previous.year)) / (next.year - previous.year);

  return points.map((point, pointIndex) =>
    pointIndex === index ? { ...point, status: "interpolated" as const, rate: interpolatedRate } : point,
  );
}

/**
 * Applies whole-comparison suppression (nulling every point's rate and
 * displayed value so no surface can accidentally expose a suppressed number)
 * and computes the format-dependent displayed value for the remaining
 * valid/interpolated points.
 */
function finalizePoints(
  points: readonly PreparedPoint[],
  hidden: boolean,
  valueFormat: ValueFormat,
): readonly PreparedPoint[] {
  return points.map((point) => {
    if (hidden) {
      return { ...point, status: "suppressed" as const, rate: null, displayedValue: null };
    }
    if (point.status !== "valid" && point.status !== "interpolated") {
      return point;
    }
    const rate = point.rate as number;
    const displayedValue = valueFormat === "raw" ? rate * point.totalPopulation : rate;
    return { ...point, displayedValue };
  });
}

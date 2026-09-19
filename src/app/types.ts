export type PredictionStatus = "FALSE" | "TRUE";
export type ValueFormat = "percent" | "raw";
export type PointStatus = "valid" | "missing" | "suppressed" | "interpolated";
export type OutcomeDenominatorMode = "all" | "labor";

export interface ProjectionRow {
  year: number;
  totalPopulation: number;
  predictionStatus: PredictionStatus;
  values: Readonly<Record<string, number | null>>;
  categories: Readonly<Record<string, string>>;
}

export interface ComparisonSelection {
  id: number;
  outcome: string;
  useLaborForce: boolean;
  raceEthnicity: string;
  gender: string;
  ageCategory: string;
  education: string;
}

export interface PreparedPoint {
  year: number;
  rate: number | null;
  displayedValue: number | null;
  totalPopulation: number;
  validWeight: number;
  predictionStatus: PredictionStatus;
  status: PointStatus;
}

export interface PreparedSeries {
  comparisonId: number;
  label: string;
  resolvedOutcomeLabel: string;
  outcomeKey: string;
  denominatorMode: OutcomeDenominatorMode;
  supportsDenominatorChoice: boolean;
  valueFormat: ValueFormat;
  color: string;
  matchedRowCount: number;
  hidden: boolean;
  suppressionReason: string | null;
  actual: readonly PreparedPoint[];
  projected: readonly PreparedPoint[];
}

export interface OutcomeDefinition {
  key: string;
  label: string;
  totalColumn: string;
  laborColumn: string | null;
  fixedDenominator?: "all" | "labor";
}

export const OUTCOMES: readonly OutcomeDefinition[] = [
  { key: "lfp", label: "Labor force participation", totalColumn: "lfp", laborColumn: null, fixedDenominator: "all" },
  { key: "full_time", label: "Full time workers", totalColumn: "full_time", laborColumn: "full_time_lf" },
  { key: "fb", label: "Foreign-born", totalColumn: "fb", laborColumn: "fb_lf" },
  { key: "live_any_fam", label: "Lives with any family member", totalColumn: "live_any_fam", laborColumn: "live_fam_lf" },
  { key: "live_spouse", label: "Lives with spouse", totalColumn: "live_spouse", laborColumn: "live_sp_lf" },
  { key: "cpmU100", label: "Poverty", totalColumn: "cpmU100", laborColumn: "cpmU100_lf" },
  { key: "cpmU150", label: "Near poverty", totalColumn: "cpmU150", laborColumn: "cpmU150_lf" },
  { key: "own", label: "Homeowner", totalColumn: "own", laborColumn: "own_lf" },
  { key: "stress30", label: "Housing > 30% of income", totalColumn: "stress30", laborColumn: "stress30_lf" },
  { key: "stress50", label: "Housing > 50% of income", totalColumn: "stress50", laborColumn: "stress50_lf" },
];

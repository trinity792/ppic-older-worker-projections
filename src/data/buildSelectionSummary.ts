import type { PreparedSeries } from "../app/types";

const SUPPRESSION_THRESHOLD_LABEL = "20,000";

/** Ported from v0/app.js's renderSummary; feeds the polite accessible status region. */
export function buildSelectionSummary(series: readonly PreparedSeries[]): string {
  const visible = series.filter((entry) => !entry.hidden);
  const hidden = series.filter((entry) => entry.hidden);

  if (visible.length === 0 && hidden.length > 0) {
    return `All selected comparisons are hidden because total population falls below ${SUPPRESSION_THRESHOLD_LABEL} in at least one year in the data.`;
  }

  if (visible.length === 0) {
    return "No rows match the current comparison selections.";
  }

  const labels = visible.map((entry) => entry.label).join(" | ");
  const hiddenMessage =
    hidden.length > 0
      ? ` ${hidden.length} comparison${hidden.length === 1 ? "" : "s"} hidden because total population falls below ${SUPPRESSION_THRESHOLD_LABEL} in at least one year in the data.`
      : "";

  return `${labels}. Each comparison is split into actual data (pred=FALSE, solid) and projections (pred=TRUE, dashed).${hiddenMessage}`;
}

import type { PointStatus, PreparedSeries } from "../app/types";

export interface ExportDisplayedDataInput {
  series: readonly PreparedSeries[];
}

interface ExportablePoint {
  displayedValue: number | null;
  totalPopulation: number;
  status: PointStatus;
}

const NO_POINT: ExportablePoint = { displayedValue: null, totalPopulation: 0, status: "missing" };

/**
 * Serializes the currently displayed results to CSV. Per the approved
 * migration contract (agents/memory.md), this exports the value actually
 * shown on screen (not always the underlying rate, unlike v0) plus an
 * explicit status column covering interpolation, and never includes a
 * suppressed comparison at all -- see agents/skills/data-integrity.md.
 */
export function exportDisplayedData({ series }: ExportDisplayedDataInput): string {
  const visible = series.filter((entry) => !entry.hidden);
  if (visible.length === 0) {
    return "";
  }

  const years = [
    ...new Set(visible.flatMap((entry) => [...entry.actual, ...entry.projected].map((point) => point.year))),
  ].sort((left, right) => left - right);
  if (years.length === 0) {
    return "";
  }

  const header = ["year"];
  visible.forEach((_, index) => {
    const n = index + 1;
    header.push(
      `comparison_${n}_label`,
      `comparison_${n}_unit`,
      `comparison_${n}_actual_displayed_value`,
      `comparison_${n}_actual_total_population`,
      `comparison_${n}_actual_status`,
      `comparison_${n}_projected_displayed_value`,
      `comparison_${n}_projected_total_population`,
      `comparison_${n}_projected_status`,
    );
  });

  const lines = [header.map(csvEscape).join(",")];

  years.forEach((year) => {
    const row = [String(year)];
    visible.forEach((entry) => {
      const actual = entry.actual.find((point) => point.year === year) ?? NO_POINT;
      const projected = entry.projected.find((point) => point.year === year) ?? NO_POINT;
      row.push(
        csvEscape(entry.label),
        csvEscape(entry.valueFormat === "raw" ? "raw count" : "percent"),
        csvEscape(formatValue(actual)),
        csvEscape(String(actual.totalPopulation)),
        csvEscape(actual.status),
        csvEscape(formatValue(projected)),
        csvEscape(String(projected.totalPopulation)),
        csvEscape(projected.status),
      );
    });
    lines.push(row.join(","));
  });

  return lines.join("\n");
}

function formatValue(point: ExportablePoint): string {
  return point.displayedValue === null ? "" : String(point.displayedValue);
}

function csvEscape(value: string): string {
  if (!/[",\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

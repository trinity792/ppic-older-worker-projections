import { formatDisplayedValue, formatPopulation } from "./formatValue";
import type { PreparedPoint, ValueFormat } from "../app/types";

export interface PointDescription {
  primaryText: string;
  populationText: string | null;
  interpolated: boolean;
}

/**
 * Describes one table cell / tooltip entry from a prepared point. Shared so
 * the table and chart tooltip never disagree about what a status means.
 * A missing point object (no rows at all for that year in this series) is
 * treated the same as totalPopulation 0: "No data" with no population line.
 */
export function describePoint(point: PreparedPoint | undefined, valueFormat: ValueFormat): PointDescription {
  if (!point || point.totalPopulation === 0) {
    return { primaryText: "No data", populationText: null, interpolated: false };
  }

  if (point.status === "suppressed") {
    return { primaryText: "Suppressed", populationText: null, interpolated: false };
  }

  if (point.status === "missing" || point.displayedValue === null) {
    return { primaryText: "No data", populationText: `Total population: ${formatPopulation(point.totalPopulation)}`, interpolated: false };
  }

  return {
    primaryText: formatDisplayedValue(point.displayedValue, valueFormat),
    populationText: `Total population: ${formatPopulation(point.totalPopulation)}`,
    interpolated: point.status === "interpolated",
  };
}

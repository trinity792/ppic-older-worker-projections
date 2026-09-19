import type { ValueFormat } from "../app/types";

export function formatPercent(rate: number): string {
  return rate.toLocaleString(undefined, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatPopulation(value: number): string {
  return Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Shared by the table, chart tooltip, and direct labels so every surface formats a displayed value identically. */
export function formatDisplayedValue(displayedValue: number, valueFormat: ValueFormat): string {
  return valueFormat === "raw" ? formatCount(displayedValue) : formatPercent(displayedValue);
}

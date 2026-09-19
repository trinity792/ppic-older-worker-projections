import { Fragment } from "react";

import { describePoint } from "../data/describePoint";
import type { PreparedSeries } from "../app/types";

interface ResultsTableProps {
  series: readonly PreparedSeries[];
}

export default function ResultsTable({ series }: ResultsTableProps) {
  const visible = series.filter((entry) => !entry.hidden);
  const years = [
    ...new Set(visible.flatMap((entry) => [...entry.actual, ...entry.projected].map((point) => point.year))),
  ].sort((left, right) => left - right);

  const valueTypeLabel = visible[0]?.valueFormat === "raw" ? "Raw count" : "Percent";

  return (
    <div className="table-scroll" role="region" aria-label="Projection comparison data" tabIndex={0}>
      <table>
        <caption>Projection comparison data</caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            {visible.map((entry) => (
              <Fragment key={entry.comparisonId}>
                <th scope="col">
                  {entry.label}
                  <br />
                  <span className="cell-meta">
                    {valueTypeLabel} | Actual
                  </span>
                </th>
                <th scope="col">
                  {entry.label}
                  <br />
                  <span className="cell-meta">
                    {valueTypeLabel} | Projected
                  </span>
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <td colSpan={1}>
                {series.length > 0
                  ? `All selected comparisons are hidden because total population falls below 20,000 in at least one year in the data.`
                  : "No comparisons are selected."}
              </td>
            </tr>
          )}
          {visible.length > 0 && years.length === 0 && (
            <tr>
              <td colSpan={visible.length * 2 + 1}>No rows match the current comparison selections.</td>
            </tr>
          )}
          {years.map((year) => (
            <tr key={year}>
              <td>{year}</td>
              {visible.map((entry) => {
                const actual = describePoint(
                  entry.actual.find((point) => point.year === year),
                  entry.valueFormat,
                );
                const projected = describePoint(
                  entry.projected.find((point) => point.year === year),
                  entry.valueFormat,
                );
                return (
                  <Fragment key={entry.comparisonId}>
                    <td>
                      {actual.primaryText}
                      {actual.populationText && (
                        <>
                          <br />
                          <span className="cell-meta">{actual.populationText}</span>
                        </>
                      )}
                      {actual.interpolated && (
                        <>
                          <br />
                          <span className="cell-meta">Interpolated</span>
                        </>
                      )}
                    </td>
                    <td>
                      {projected.primaryText}
                      {projected.populationText && (
                        <>
                          <br />
                          <span className="cell-meta">{projected.populationText}</span>
                        </>
                      )}
                      {projected.interpolated && (
                        <>
                          <br />
                          <span className="cell-meta">Interpolated</span>
                        </>
                      )}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

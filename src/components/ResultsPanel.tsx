import ProjectionLineChart from "../charts/ProjectionLineChart";
import ResultsTable from "./ResultsTable";
import ViewToggle from "./ViewToggle";
import { buildSelectionSummary } from "../data/buildSelectionSummary";
import type { ResultsView } from "../app/comparisonsReducer";
import type { PreparedSeries } from "../app/types";

interface ResultsPanelProps {
  series: readonly PreparedSeries[];
  resultsView: ResultsView;
  onChangeView: (view: ResultsView) => void;
  onDownload: () => void;
  downloadDisabled: boolean;
}

export default function ResultsPanel({ series, resultsView, onChangeView, onDownload, downloadDisabled }: ResultsPanelProps) {
  const summary = buildSelectionSummary(series);

  return (
    <section className="section-card chart-container" aria-labelledby="results-heading">
      <header className="chart-publication-header">
        <h2 id="results-heading" className="chart-container-title">
          Historical data and projections
        </h2>
      </header>

      <span className="sr-only" role="status" aria-live="polite">
        {summary}
      </span>

      <div className="chart-container-body" data-view={resultsView}>
        {resultsView === "chart" ? <ProjectionLineChart series={series} /> : <ResultsTable series={series} />}
      </div>

      <div className="chart-source-notes">
        <p>
          <strong>Source:</strong> PPIC projections for <cite>Older Workers in California: Projections to 2040</cite>.
        </p>
        <p>
          <strong>Notes:</strong> Solid lines show historical data; dashed lines show projections. Dotted segments mark
          interpolated 2020 poverty values. Comparisons are hidden when total population falls below 20,000 in any
          represented year. Exact values and populations are available in the Data view.
        </p>
      </div>

      <div className="chart-container-footer">
        <ViewToggle resultsView={resultsView} onChange={onChangeView} />
        <div className="results-actions">
          {downloadDisabled && <span className="cell-meta">No visible comparison can be downloaded right now.</span>}
          <button type="button" className="button secondary" onClick={onDownload} disabled={downloadDisabled}>
            Download CSV
          </button>
        </div>
      </div>
    </section>
  );
}

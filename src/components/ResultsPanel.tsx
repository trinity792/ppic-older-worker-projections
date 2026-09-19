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
    <section className="section-card" aria-labelledby="results-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Figure</p>
          <h2 id="results-heading">Historical data and projections</h2>
        </div>
        <ViewToggle resultsView={resultsView} onChange={onChangeView} />
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {summary}
      </span>

      {resultsView === "chart" ? <ProjectionLineChart series={series} /> : <ResultsTable series={series} />}

      <footer className="chart-notes">
        <p>Comparisons are hidden when total population falls below 20,000 in any represented year.</p>
        <div className="results-actions">
          <button type="button" className="button secondary" onClick={onDownload} disabled={downloadDisabled}>
            Download CSV
          </button>
          {downloadDisabled && <span className="cell-meta">No visible comparison can be downloaded right now.</span>}
        </div>
      </footer>
    </section>
  );
}

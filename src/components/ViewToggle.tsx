import type { ResultsView } from "../app/comparisonsReducer";

interface ViewToggleProps {
  resultsView: ResultsView;
  onChange: (view: ResultsView) => void;
}

export default function ViewToggle({ resultsView, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="Figure or data view">
      <button type="button" aria-pressed={resultsView === "chart"} onClick={() => onChange("chart")}>
        Figure
      </button>
      <button type="button" aria-pressed={resultsView === "table"} onClick={() => onChange("table")}>
        Data
      </button>
    </div>
  );
}

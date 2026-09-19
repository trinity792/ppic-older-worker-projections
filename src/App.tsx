import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import ComparisonEditor from "./components/ComparisonEditor";
import DataStatus from "./components/DataStatus";
import ResultsPanel from "./components/ResultsPanel";
import { comparisonsReducer, createInitialComparisonsState, normalizeComparisonsForAvailability } from "./app/comparisonsReducer";
import { downloadCsv } from "./data/downloadCsv";
import { exportDisplayedData } from "./data/exportDisplayedData";
import { loadProjectionCsv } from "./data/loadProjectionData";
import { parseProjectionCsv } from "./data/parseProjectionCsv";
import { prepareComparisons } from "./data/prepareComparisons";
import type { ProjectionRow } from "./app/types";

type DataState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: readonly ProjectionRow[]; availableOutcomeKeys: readonly string[] };

export default function App() {
  const [dataState, setDataState] = useState<DataState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);
  const [comparisonsState, dispatch] = useReducer(comparisonsReducer, undefined, createInitialComparisonsState);

  useEffect(() => {
    const controller = new AbortController();

    loadProjectionCsv(controller.signal)
      .then((text) => {
        const parsed = parseProjectionCsv(text);
        setDataState({ status: "ready", rows: parsed.rows, availableOutcomeKeys: parsed.availableOutcomeKeys });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setDataState({
          status: "error",
          message: error instanceof Error ? error.message : "Unable to load the projection dataset.",
        });
      });

    return () => controller.abort();
  }, [retryToken]);

  const availableOutcomeKeys = useMemo(
    () => (dataState.status === "ready" ? dataState.availableOutcomeKeys : []),
    [dataState],
  );
  const normalizedComparisons = useMemo(
    () => normalizeComparisonsForAvailability(comparisonsState.comparisons, availableOutcomeKeys),
    [comparisonsState.comparisons, availableOutcomeKeys],
  );

  const series = useMemo(() => {
    if (dataState.status !== "ready") {
      return [];
    }
    return prepareComparisons({
      rows: dataState.rows,
      comparisons: normalizedComparisons,
      valueFormat: comparisonsState.valueFormat,
    });
  }, [dataState, normalizedComparisons, comparisonsState.valueFormat]);

  const downloadDisabled = series.every((entry) => entry.hidden);

  const handleDownload = useCallback(() => {
    const csv = exportDisplayedData({ series });
    if (csv === "") {
      return;
    }
    downloadCsv(csv, "older-worker-projections.csv");
  }, [series]);

  const handleRetry = useCallback(() => {
    setDataState({ status: "loading" });
    setRetryToken((token) => token + 1);
  }, []);

  return (
    <main className="page-shell">
      <header className="report-header">
        <p className="eyebrow">PPIC interactive</p>
        <h1>Older Workers in California: Projections to 2040</h1>
        <p className="report-intro">
          The projections below were developed for the PPIC report "Older Workers in California: Projections to
          2040." Compare historical and projected outcomes for older Californians. Please contact Eric McGhee{" "}
          <a href="mailto:mcghee@ppic.org">mcghee@ppic.org</a> with questions or comments.
        </p>
      </header>

      {dataState.status === "loading" && <DataStatus status="loading" />}
      {dataState.status === "error" && <DataStatus status="error" message={dataState.message} onRetry={handleRetry} />}

      {dataState.status === "ready" && (
        <>
          <ComparisonEditor
            comparisons={normalizedComparisons}
            availableOutcomeKeys={availableOutcomeKeys}
            valueFormat={comparisonsState.valueFormat}
            dispatch={dispatch}
          />
          <ResultsPanel
            series={series}
            resultsView={comparisonsState.resultsView}
            onChangeView={(value) => dispatch({ type: "setResultsView", value })}
            onDownload={handleDownload}
            downloadDisabled={downloadDisabled}
          />
        </>
      )}
    </main>
  );
}

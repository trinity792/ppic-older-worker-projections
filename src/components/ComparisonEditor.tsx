import { useEffect, useRef } from "react";

import ComparisonCard from "./ComparisonCard";
import type { ComparisonsAction } from "../app/comparisonsReducer";
import type { ComparisonSelection, ValueFormat } from "../app/types";

const POVERTY_OUTCOME_KEYS = new Set(["cpmU100", "cpmU150"]);

interface ComparisonEditorProps {
  comparisons: readonly ComparisonSelection[];
  availableOutcomeKeys: readonly string[];
  valueFormat: ValueFormat;
  dispatch: (action: ComparisonsAction) => void;
}

export default function ComparisonEditor({ comparisons, availableOutcomeKeys, valueFormat, dispatch }: ComparisonEditorProps) {
  const headingRefs = useRef(new Map<number, HTMLHeadingElement>());
  const previousIdsRef = useRef<readonly number[]>(comparisons.map((comparison) => comparison.id));
  const addButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousIds = previousIdsRef.current;
    const currentIds = comparisons.map((comparison) => comparison.id);
    const addedId = currentIds.find((id) => !previousIds.includes(id));
    const removedIndex = previousIds.findIndex((id) => !currentIds.includes(id));

    if (addedId !== undefined) {
      headingRefs.current.get(addedId)?.focus();
    } else if (removedIndex !== -1) {
      const precedingId = previousIds[removedIndex - 1];
      const focusTarget = precedingId !== undefined ? headingRefs.current.get(precedingId) : undefined;
      (focusTarget ?? addButtonRef.current)?.focus();
    }

    previousIdsRef.current = currentIds;
  }, [comparisons]);

  const showPovertyNote = comparisons.some((comparison) => POVERTY_OUTCOME_KEYS.has(comparison.outcome));

  return (
    <aside className="editor-sidebar" aria-labelledby="comparisons-heading">
      <div className="editor-sidebar-intro">
        <p className="eyebrow">Choose groups</p>
        <h2 id="comparisons-heading">Comparisons</h2>
        <p>
          Each comparison defines one trend line. Choose an outcome, use the denominator options to switch between
          shares of all adults and shares of the labor force when available, add any demographic filters you want,
          then use "Add a comparison" to add another.
        </p>
      </div>

      <fieldset className="value-format-control">
        <legend>Display values as</legend>
        <label>
          <input
            type="radio"
            name="value-format"
            checked={valueFormat === "percent"}
            onChange={() => dispatch({ type: "setValueFormat", value: "percent" })}
          />
          Percentages
        </label>
        <label>
          <input
            type="radio"
            name="value-format"
            checked={valueFormat === "raw"}
            onChange={() => dispatch({ type: "setValueFormat", value: "raw" })}
          />
          Raw numbers
        </label>
      </fieldset>

      {comparisons.map((comparison, index) => (
        <ComparisonCard
          key={comparison.id}
          index={index}
          comparison={comparison}
          availableOutcomeKeys={availableOutcomeKeys}
          valueFormat={valueFormat}
          canRemove={comparisons.length > 1}
          ref={(node) => {
            if (node) {
              headingRefs.current.set(comparison.id, node);
            } else {
              headingRefs.current.delete(comparison.id);
            }
          }}
          onChangeOutcome={(outcome) => dispatch({ type: "setOutcome", id: comparison.id, outcome })}
          onChangeFilter={(field, value) => dispatch({ type: "setFilter", id: comparison.id, field, value })}
          onChangeUseLaborForce={(useLaborForce) => dispatch({ type: "setUseLaborForce", id: comparison.id, useLaborForce })}
          onRemove={() => dispatch({ type: "remove", id: comparison.id })}
        />
      ))}

      <button
        type="button"
        className="button button-primary editor-sidebar-add"
        ref={addButtonRef}
        onClick={() => dispatch({ type: "add" })}
      >
        Add a comparison
      </button>

      {showPovertyNote && (
        <p className="outcome-note">
          * From the{" "}
          <a href="https://www.ppic.org/publication/poverty-in-california/" target="_blank" rel="noopener noreferrer">
            California Poverty Measure
          </a>
          .
        </p>
      )}
    </aside>
  );
}

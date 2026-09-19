import { forwardRef } from "react";

import { FILTERS } from "../app/filters";
import { OUTCOMES } from "../app/outcomes";
import type { ComparisonFilterField } from "../app/comparisonsReducer";
import type { ComparisonSelection, ValueFormat } from "../app/types";

interface ComparisonCardProps {
  index: number;
  comparison: ComparisonSelection;
  availableOutcomeKeys: readonly string[];
  valueFormat: ValueFormat;
  canRemove: boolean;
  onChangeOutcome: (outcome: string) => void;
  onChangeFilter: (field: ComparisonFilterField, value: string) => void;
  onChangeUseLaborForce: (useLaborForce: boolean) => void;
  onRemove: () => void;
}

const ComparisonCard = forwardRef<HTMLHeadingElement, ComparisonCardProps>(function ComparisonCard(
  { index, comparison, availableOutcomeKeys, valueFormat, canRemove, onChangeOutcome, onChangeFilter, onChangeUseLaborForce, onRemove },
  headingRef,
) {
  const availableOutcomes = OUTCOMES.filter((outcome) => availableOutcomeKeys.includes(outcome.key));
  const activeOutcome = OUTCOMES.find((outcome) => outcome.key === comparison.outcome);
  const supportsDenominator = Boolean(activeOutcome && !activeOutcome.fixedDenominator);
  const showDenominatorControl = supportsDenominator && valueFormat === "percent";
  const headingId = `comparison-${comparison.id}-heading`;

  return (
    <section className="comparison-card" aria-labelledby={headingId}>
      <div className="comparison-card-header">
        <h3 id={headingId} tabIndex={-1} ref={headingRef}>
          Comparison {index + 1}
        </h3>
        {canRemove && (
          <button type="button" className="button ghost" onClick={onRemove} aria-label={`Remove comparison ${index + 1}`}>
            Remove
          </button>
        )}
      </div>

      <div className="control-grid">
        <label className="control control-wide" htmlFor={`comparison-${comparison.id}-outcome`}>
          <span>Outcome</span>
          <select
            id={`comparison-${comparison.id}-outcome`}
            value={comparison.outcome}
            onChange={(event) => onChangeOutcome(event.currentTarget.value)}
          >
            {availableOutcomes.map((outcome) => (
              <option key={outcome.key} value={outcome.key}>
                {outcome.label}
              </option>
            ))}
          </select>
        </label>

        {FILTERS.map((filter) => (
          <label className="control" key={filter.key} htmlFor={`comparison-${comparison.id}-${filter.key}`}>
            <span>{filter.label}</span>
            <select
              id={`comparison-${comparison.id}-${filter.key}`}
              value={comparison[filter.key]}
              onChange={(event) => onChangeFilter(filter.key, event.currentTarget.value)}
            >
              <option value="">All</option>
              {filter.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {showDenominatorControl && (
        <fieldset className="denominator-control">
          <legend>Denominator</legend>
          <label className="denominator-option">
            <input
              type="radio"
              name={`denominator-${comparison.id}`}
              checked={!comparison.useLaborForce}
              onChange={() => onChangeUseLaborForce(false)}
            />
            <span>As a share of all adults</span>
          </label>
          <label className="denominator-option">
            <input
              type="radio"
              name={`denominator-${comparison.id}`}
              checked={comparison.useLaborForce}
              onChange={() => onChangeUseLaborForce(true)}
            />
            <span>As a share of the labor force</span>
          </label>
        </fieldset>
      )}
    </section>
  );
});

export default ComparisonCard;

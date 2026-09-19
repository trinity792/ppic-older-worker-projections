---
title: "Data Integrity Skill"
description: "Project guidance for preserving projection definitions, weighting, suppression, interpolation, and output parity."
---

# Data Integrity Skill

Use this guidance for CSV parsing, filters, aggregations, metric definitions,
suppression, interpolation, table output, tooltips, or downloads.

## Principle

Presentation may change during migration; statistical meaning must not change
accidentally. Characterize the legacy result, isolate the calculation, and test
it with small fixtures before refactoring it.

## Current data contract

The legacy interactive reads
`v0/data/projections_age5cat_2006_2040.csv`. Its implementation currently
requires these fields:

- `year`, `totpop`, and `pred`
- `latino`, `white`, `black`, `asian`, and `pacis`
- `female` and `age_cat`
- `ed_hsgrad`, `ed_somecoll`, and `ed_collgrad`
- The outcome columns selected by the outcome definition, including any
  labor-force-denominator variants

Do not rename fields, alter values, replace the dataset, or change the output
contract without user confirmation and corresponding documentation/tests.

## Required semantics

- Parse missing numeric outcome values as missing, not zero.
- Drop or reject rows with invalid `year` or `totpop` according to an explicit,
  tested policy. Surface a useful error when no valid data remains.
- Group matching rows by year and `pred` status.
- Calculate an aggregated outcome as
  `sum(outcome * totpop) / sum(totpop for rows with a valid outcome)`.
- Keep the displayed total population distinct from the valid outcome weight.
- Derive a raw displayed count from the aggregated rate and total population
  only when that matches the established legacy definition.
- Preserve the legacy mappings for race/ethnicity, gender, age bands, and
  education unless the user approves a definition change.
- Preserve the distinction between historical (`FALSE`) and projected (`TRUE`)
  observations.

## Suppression

The legacy threshold is 20,000 people. A selected comparison is hidden when any
positive population represented in its historical or projected points falls
below that threshold.

- Apply suppression before rendering, tooltips, or export.
- Never reveal a suppressed numeric value through another surface.
- Explain suppression in plain language.
- Treat zero/no rows as missing data, not as a suppressed positive population.
- Any proposal to suppress individual points instead of the whole comparison is
  a product/data-policy change and requires approval.

## Poverty interpolation

The legacy app may interpolate a 2020 historical value for the two poverty
outcomes only when:

- the 2020 point exists but its value is missing;
- its total population is positive and not suppressed; and
- the adjacent points exist, have values, and are not suppressed.

The interpolation is linear between the adjacent years. It does not apply to
projected data or other outcomes. Interpolated values must be labeled and must
not be mistaken for observed values.

## One prepared result

Create one pure, serializable display-data structure and use it for the chart,
legend, accessible summary, table, tooltip, and CSV. This prevents presentation
surfaces from drifting apart.

That structure should retain enough metadata to distinguish:

- actual versus projected;
- percentage versus derived count;
- valid, missing, suppressed, and interpolated points;
- total population and valid calculation weight; and
- the full human-readable comparison label.

## Testing

Use tiny deterministic fixtures with hand-calculable results. Cover at least:

- Weighted aggregation with unequal populations.
- Missing outcomes excluded from the valid denominator.
- Every filter and the combined `55-64` and `65 and older` age groups.
- Both denominator modes for outcomes that support them.
- Actual/projected separation.
- Population totals just below, exactly at, and above 20,000.
- A comparison with one low-population year.
- Missing versus zero values.
- Valid and invalid 2020 poverty interpolation cases.
- Equality of values/statuses across chart preparation, table, and export.
- CSV escaping for commas, quotes, and line breaks in labels.

When possible, capture representative outputs from `v0/` as migration parity
fixtures before changing the implementation.

## Review checklist

- Verify formulas from code, not visual appearance.
- Check units before formatting values as percentages or counts.
- Ensure sorting is numeric by year.
- Ensure unavailable outcome columns do not produce selectable broken options.
- Ensure errors name the missing field or failed stage.
- Document any intentional difference from legacy behavior.

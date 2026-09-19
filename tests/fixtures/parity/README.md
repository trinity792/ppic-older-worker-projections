---
title: "Legacy Parity Fixtures"
description: "How the v0/ characterization fixtures in this directory were captured and what they establish."
---

# Legacy parity fixtures

These fixtures freeze representative output from the read-only `v0/` implementation so the migrated calculation pipeline (workstream 4) can be checked against real `v0/app.js` behavior instead of a reimplementation of it.

## How these were captured

`capture-legacy-fixtures.mjs` drives the actual, unmodified `v0/index.html` / `v0/app.js` in headless Chromium (Playwright) and reads values back from the DOM that `v0`'s own `renderTable`/`renderComparisonControls`/`downloadSeries` functions produced. No values here were typed in by hand, inferred from a screenshot, or computed by a reimplementation of the legacy logic.

To regenerate:

```bash
python3 -m http.server 8000 --directory v0
node tests/fixtures/parity/capture-legacy-fixtures.mjs
```

Each run is deterministic against the current `v0/data/*.csv` (verified by diffing two runs). Do not run this against anything other than a local static server for `v0/`; it never modifies files inside `v0/`.

One technique needs a note: fixtures 05 and 09 select a `race_ethnicity` value of `Pacific Islander`, which has no corresponding `<option>` in `v0`'s rendered `<select>` (`FILTER_CONFIG` in `v0/app.js` omits it, per the approved migration difference recorded in `agents/memory.md`). To characterize that already-implemented-but-unexposed code path (`getRaceEthnicity` already branches on `row.pacis === "TRUE"`) without editing the read-only `v0/` files, the script injects a transient `<option>` into the live DOM and selects it. This runs `v0`'s real, unmodified `comparisonMatchesRow`/`getRaceEthnicity` functions exactly as a real option would; the injected DOM node disappears on reload and nothing on disk is touched.

## Fixtures

| File | Characterizes |
| --- | --- |
| `01-statewide-default.json` | Initial app state: one statewide comparison, labor force participation, percent, all adults. |
| `02-full-filter-comparison.json` | One comparison with race/ethnicity, gender, age, and education all set simultaneously. |
| `03-combined-age-groups.json` | The synthetic `55-64` and `65 and older` age bands, and that a newly added comparison inherits the previous comparison's outcome/denominator but not its filters. |
| `04-denominator-switch.json` | A denominator-switching outcome (`full_time`) captured under both "share of all adults" and "share of labor force". |
| `05-multiple-comparisons.json` | Three comparisons rendered together, one of which is suppressed, and the resulting hidden-count summary message. |
| `06-percent-and-raw-modes.json` | The same comparison in percent format and in raw (derived-count) format. Raw values equal `rate * totalPopulation`. |
| `07-suppressed-single-low-year.json` | A comparison suppressed because exactly one year's population (2021, White/85-89/No HS Degree, 19,712) falls below the 20,000 threshold. |
| `08-missing-values-and-interpolation.json` | Statewide poverty: historical values missing 2006-2010, and the valid linear interpolation of the missing 2020 value from 2019/2021 neighbors. |
| `09-pacific-islander-suppression.json` | The `pacis` mapping exercised via DOM injection (see above); statewide Pacific Islander is fully suppressed (2006 and 2007 populations below 20,000). |
| `10-csv-download-contract.json` | The legacy CSV download contract, captured once with percent display active and once with raw display active. |

## Findings recorded here for the later workstreams

- **CSV raw-mode mismatch is worse than "exports the rate regardless of format."** The two CSVs captured in `10-csv-download-contract.json` are identical except for the comparison label text, which gains a `": raw count"` suffix in raw mode. The `*_value` columns stay byte-identical rate values in both modes — raw mode's own label claims "raw count" while the exported number is still the percentage rate. The CSV-contract approval gate in `IMPLEMENTATION_PLAN.md` should account for this when the user decides between preserving vs. replacing the legacy contract.
- **The download button is never disabled in `v0`,** even when every comparison is suppressed (`07-suppressed-single-low-year.json`, `downloadDisabled: false`). Clicking it in that state silently no-ops (`downloadSeries` returns early). Workstream 8 explicitly requires the migrated UI to disable and explain this state, which is an intentional improvement over `v0`, not a behavior to reproduce.
- **"No rows match the current selection" could not be captured from `v0`.** The four filters (race/ethnicity, gender, age, education) are each single-valued selects over a dataset that is a complete demographic cross-tab: every one of the 6 x 2 x 8 x 4 = 384 possible four-filter combinations matches at least one row (checked directly against `public/data/cleaned/projections_age5cat_2006_2040.csv`). `v0/app.js`'s "No rows match the current comparison selections" branches (`renderSummary`, `renderTable`, `renderChart`) therefore appear to be unreachable through the real UI against the production dataset. This branch still needs a unit test in workstream 4, but it must use a small hand-authored fixture rather than a captured `v0` fixture, since there is no real selection that reaches it.

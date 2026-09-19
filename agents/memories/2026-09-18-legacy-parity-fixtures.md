---
title: "Legacy parity fixtures captured (workstream 1)"
description: "How v0/ behavior was characterized, where the fixtures live, and non-obvious findings from capturing them."
---

# Legacy parity fixtures captured (workstream 1)

Ten committed fixtures now freeze representative `v0/` output for the migration's calculation pipeline to be checked against, in `tests/fixtures/parity/`. See `tests/fixtures/parity/README.md` for the full fixture list and regeneration instructions.

## Method

A Playwright script (`tests/fixtures/parity/capture-legacy-fixtures.mjs`) drives the real, unmodified `v0/index.html`/`v0/app.js` in headless Chromium against a local static server and reads values back from the DOM that `v0`'s own render functions produced (table cells, comparison labels, selection summary, and downloaded CSV content). Nothing was hand-typed, screenshotted, or independently reimplemented. Re-running the script against the unchanged dataset reproduces byte-identical fixtures.

## Non-obvious findings

- The legacy CSV download contract is worse than "exports the rate regardless of display format": in raw mode the comparison label text gains a `": raw count"` suffix, but the `*_value` columns remain the untouched percentage rate. The label actively misdescribes the exported number's units. Relevant to the CSV-contract approval gate in `IMPLEMENTATION_PLAN.md`.
- `v0`'s download button is never disabled, even when every visible comparison is suppressed; clicking it silently no-ops. The migration's workstream 8 requirement to disable/explain that state is an intentional improvement, not a behavior to reproduce.
- "No rows match the current comparison selections" could not be reached through the real `v0` UI: the four demographic filters form a complete cross-tab over the dataset (verified all 384 four-filter combinations match at least one row), so that code path appears unreachable against the production dataset. Workstream 4's test for it should use a small hand-authored CSV fixture rather than a captured `v0` fixture.
- A convenient single fixture (statewide poverty, `08-missing-values-and-interpolation.json`) demonstrates both missing historical values (2006-2010, population present but no CPM value published) and the one valid 2020 poverty interpolation case (interpolated from 2019/2021 neighbors) without needing a separate scenario for each.
- The full-period Pacific Islander comparison (an approved migration-only option; `v0`'s own `<select>` omits it even though `getRaceEthnicity` already branches on `pacis`) is suppressed because 2006 (17,557) and 2007 (16,393) populations are below 20,000. This matches the figures already recorded in `2026-09-18-data-layout.md`, now confirmed by driving `v0`'s real, unmodified code path (a DOM-injected option) rather than a reimplementation.

## Follow-up

Workstream 4 (pure calculation pipeline) should assert against these fixtures at an agreed numeric tolerance per `IMPLEMENTATION_PLAN.md`'s completion checks, and should add its own hand-authored fixture for the unreachable "no matching rows" branch.

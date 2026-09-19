---
title: "PPIC Older Worker Projections"
description: "Vite/React/TypeScript site comparing historical and projected outcomes for older workers in California, migrated from a static v0/ reference."
---

# Older Workers in California: Projections to 2040

A focused, single-page interactive that lets readers compare historical and projected labor-market, family, housing, and poverty outcomes for older Californians, view the results as a chart or an accessible data table, and download the displayed results as CSV. It replaces the static `v0/` reference implementation with a Vite + React + TypeScript site styled after PPIC's design language.

## Setup

Requires Node 22+ and Python 3 (standard library only; no virtual environment needed).

```bash
npm ci
npm run dev
```

## Commands

```bash
npm run dev          # local development server
npm run build         # tsc -b, then vite build to dist/
npm run preview       # serve the production build locally
npm run lint           # eslint
npm run typecheck      # tsc -b across the app, node-tooling, and test project references
npm test                # vitest (unit + component tests)
npm run test:e2e        # playwright, against a built+previewed production bundle
npm run test:python     # unittest over scripts/ and tests/python/
npm run clean:data      # regenerate public/data/cleaned/ from public/data/raw/
npm run check:data      # validate raw/cleaned parity
```

`npm run test:e2e` builds the app and serves it with `vite preview` before running Playwright; it needs ports 4173 free. None of these commands write to `v0/` or the sibling `../web-data-visualization` reference.

## Architecture

- `src/app/` — outcome and filter definitions, the comparisons state reducer, and shared types.
- `src/data/` — pure, framework-free modules: CSV parsing (`parseProjectionCsv.ts`), the calculation pipeline (`prepareComparisons.ts`), formatting, the CSV export serializer, and a thin browser download adapter.
- `src/components/` — the comparison controls, results table, view toggle, and loading/error states.
- `src/charts/` — `ChartFrame` (responsive bounds, axes, legend slot) and `ProjectionLineChart` (the line-mark layer), plus pure, unit-tested layout helpers in `chartLayout.ts`.
- `src/styles/` — centralized design tokens (`tokens.css`) and component styles; no literal colors/spacing/fonts scattered through components.
- `public/data/raw/` — the unmodified source export. `public/data/cleaned/` — the deterministic file the app actually fetches, produced by `scripts/clean_projection_data.py` (standard-library Python; removes only the unnamed export-index column).
- `tests/unit/`, `tests/components/` — Vitest; `tests/e2e/` — Playwright; `tests/python/` — Python `unittest`; `tests/fixtures/parity/` — values captured live from the real `v0/` app (see its own README) that the calculation pipeline is checked against.

The app fetches the cleaned CSV at runtime as a static asset rather than bundling it, so the initial JavaScript payload doesn't carry all ~15,000 rows.

## Data provenance and calculation rules

Source data, category mappings, aggregation, suppression, and interpolation rules are ported from and characterized against `v0/app.js` (read-only reference; never modify it). See `agents/skills/data-integrity.md` for the full rules and `agents/memory.md` for the decisions and discoveries made while porting them. In summary:

- Rates are weighted by `totpop`; a row missing its outcome value is excluded from the weighted denominator but its population still counts toward the displayed total.
- A comparison (all of its years, both actual and projected) is hidden whenever any of its positive populations falls below 20,000; suppressed comparisons never carry a numeric value into the chart, table, tooltip, or CSV.
- Historical (`pred=FALSE`) 2020 poverty/near-poverty values are linearly interpolated only when that point is missing (not suppressed, not zero population) and both adjacent points in the series are present, valued, and not suppressed. Interpolated points are labeled everywhere they appear.
- The migrated race/ethnicity filter adds a Pacific Islander option that `v0/`'s own dropdown omits, even though `v0/app.js`'s matching logic already supports it (`pacis=TRUE`). A full-period, unfiltered Pacific Islander comparison is suppressed (2006/2007 populations below 20,000) — this is expected, not a bug.
- **The CSV download contract intentionally differs from `v0/`.** `v0/` always exports the underlying rate, even in raw-count display mode, and never marks interpolation. This app exports whatever is actually displayed (rate or derived count, depending on the active format) plus explicit `status` and `unit` columns, and never includes a suppressed comparison at all. See `tests/fixtures/parity/README.md` for the parity finding that motivated this.

## Accessibility

Native labeled selects, fieldsets/legends for grouped controls, and a semantic table are used throughout rather than a custom widget kit. Adding a comparison moves focus to its heading; removing one returns focus to the preceding comparison (or the Add button). The chart carries an accessible name/description, and every value shown on the chart or in its tooltip is also present in the data table — the table is a complete non-visual alternative, not a decorative duplicate. Actual vs. projected and interpolated states are distinguished by line style and explicit text, not color alone. Reduced-motion preferences disable non-essential transitions.

## Deployment

Configured for a static Vercel deployment (`vercel.json`): `npm run build` publishes `dist/`, the unhashed cleaned CSV is served with conservative caching, and Vite's hashed assets are served immutable. Promote a verified preview deployment to production rather than rebuilding for it. The site is static and performs no data writes, so rollback is just promoting the previous known-good deployment/alias.

## Legacy reference

`v0/` is the original static implementation and the behavioral baseline for this migration. It is read-only, ignored by npm tooling, and can be run standalone for comparison:

```bash
python3 -m http.server 8000 --directory v0
```

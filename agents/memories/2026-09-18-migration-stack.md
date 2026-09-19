---
title: "Migration Stack Decision"
description: "Confirmed application, charting, package-management, and hosting choices for the older-worker projections migration."
---

# Migration Stack Decision

## Context

The repository root had no selected migration architecture. The legacy implementation is plain JavaScript, while the requested chart architecture is D3 primitives rendered inside React and the sibling visualization project is only a read-only design reference.

## Decision

- Build the migrated site with Vite, React, and TypeScript.
- Use npm and commit the lockfile.
- Render the chart with granular visx/D3 primitives and project-local React SVG components, centered on a shared `ChartFrame`.
- Deploy the static Vite build to Vercel.
- Do not make Python or a virtual environment part of the application stack unless a later approved task introduces Python tooling.

## Rationale

Vite keeps this single-page data product smaller than the sibling Next.js platform. TypeScript strengthens the contracts between parsed CSV rows, comparison selections, calculation statuses, and the shared result consumed by the chart, table, tooltip, and export. visx supplies scale, shape, axis, grid, responsive, and tooltip primitives without imposing Plotly's rendering or visual defaults. Vercel can host the generated static assets without a server runtime.

## Follow-up

The deployable raw/cleaned data layout is now confirmed in [`2026-09-18-data-layout.md`](2026-09-18-data-layout.md). The corrected-versus-legacy CSV download contract still requires product approval before export implementation begins.

---
title: "Typography, UI, and chart alignment to web-data-visualization"
description: "Where the design values were sourced in the read-only reference, and two deliberate accessibility deviations from its own code."
---

# Typography, UI, and chart alignment to web-data-visualization

The user asked to match this app's typography/UI, then separately asked the chart specifically to resemble `../web-data-visualization`'s charts rather than `v0/`'s. Everything below was read from that read-only reference (never modified) and ported into this project's own `src/styles/tokens.css`/`global.css`/`components.css` and `src/app/seriesColors.ts` -- no Tailwind, shadcn, or Next.js dependency was added, per `AGENTS.md`.

## Where each value came from

- **Type scale**: `components/ui-kit/TypographyShowcase.js` is the canonical specimen. Eyebrow: Inter 12px/600/0.22em tracking, uppercase. Section heading (our h2): Source Sans 3 28px/1.2/0.06em tracking, plus a 3px brand-colored underline bar (`h2::after` here; a sibling `<div>` there). Display headline (our h1): serif 34px/1.15. Body/description: Source Sans 3 15px/1.625, muted gray.
- **Pill buttons**: `components/ui-kit/ButtonsShowcase.js`'s `PillButton` (primary: black border + `orange-100` fill; outline/ghost: brand-colored border/text; "Export Data" solid blue for a data action) — mapped to `.button`/`.button-primary`/`.button.outline`/`.button.ghost`/`.button.secondary`. `Download CSV` uses the solid-blue "data action" style since it's the literal analog of their "Export Data" example.
- **Segmented pill toggle** (Figure/Data): `components/charts/GraphTabs.js` — rounded-full chips, active chip filled `blue-300` with white text.
- **Cards**: `components/ui-kit/Section.js`'s `Panel` (`rounded-2xl`, `border-ppic-border`, `shadow-[0_4px_4px_rgba(0,0,0,0.06)]`) — this project's `.section-card` already matched exactly before this pass; nothing changed there.
- **Select/input controls**: `components/ui/select.js` — smaller radius (`rounded-md` → `--radius-control-sm: 0.375rem`), `h-9` (2.25rem), `--input-background: #f3f3f5`, 14px text.
- **Chart colors/font**: `lib/visualization/plotlyDefaults.js` — chart font is Inter (not Source Sans), text color `gray6` (`#383b3d`, → `--color-chart-text`), grid color `gray2` (`#c2c9cc`, kept as `--color-grid` since it already matched `#edeff0`... see the fixed bug below), axis/"graph line" color `#6d7075` (→ `--color-chart-axis`, from `components/ui-kit/ChartAnatomyShowcase.js`'s spec, which also confirms 2px data lines and horizontal-only grid).
- **Chart series palette**: `lib/visualization/palettes.js`'s `PALETTES["brand-categorical"]` — the app's actual default series-color cycle ("Mirrors BASE_PLOTLY_COLORS exactly"), now `src/app/seriesColors.ts`.

## Two deliberate deviations from the reference's own code (accessibility)

`AGENTS.md` treats color contrast as a non-negotiable requirement for this product, and the reference itself doesn't always clear WCAG AA:

1. **Eyebrow/outline/ghost button text** uses `--color-brand-text` (`#c54f1b`, ~4.66:1), not the raw `--color-brand` (`#e36a36`, ~3.3:1) the reference's own `ButtonsShowcase`/`Section` use directly as text color. Borders and backgrounds still use the raw brand hue (graphical, needs only 3:1).
2. **Chart series palette**: swapped the reference's plain `steelBlue` (`#759CBF`, 2.89:1 against white — fails even the 3:1 graphical minimum) for `steelBlue4` (`#4C7AA4`, 4.54:1) from the same ramp family. Direct chart labels (`DirectLabels.tsx`) never use a series color as text fill at all, for the same reason (see `2026-09-18-implementation-workstreams.md`) — several series colors clear 3:1 but not 4.5:1.

## Bug fixed along the way

`.chart-canvas line, .chart-canvas path { stroke: ... }` (a class+element selector) was unintentionally beating `.chart-grid-line { stroke: ... }` (a single class) in CSS specificity, so grid rows were silently rendering in the axis color instead of the lighter grid color regardless of source order. Fixed by making the grid rule `.chart-canvas .chart-grid-line` (two classes), which now reliably outranks it.

## Page layout: the reference's topic-editor workbench

The user then asked for the comparison settings to move into a sidebar with the same layout as a topic editor in the reference, which is `components/chart-builder/workbench/ModuleWorkbench.js` (the `/[module]` route). Ported into `src/App.tsx` (`.workbench` grid), `src/components/ComparisonEditor.tsx` (now an `<aside class="editor-sidebar">`), `src/components/ResultsPanel.tsx` (`.chart-container`), and `src/styles/components.css`/`tokens.css`:

- **Two columns at `lg` (64rem)**: `--sidebar-width` (22.5rem, the reference's `DEFAULT_SIDEBAR_WIDTH`) beside `minmax(0, 1fr)`, 1rem gap; stacked in natural flow below that.
- **Sidebar height clamp** (`ModuleSidebar.js`): on desktop the aside is `position: absolute; inset: 0; overflow-y: auto` inside a `position: relative` grid cell, so it contributes no height, is exactly as tall as the results card, and scrolls internally. This relies on the grid's default `align-items: stretch`; do not set `align-items: start` on `.workbench`.
- **Chart container** (`ChartContainer.js`/`ChartContainerFooter.js`): centered title with an inline-block brand underline (`.chart-container-title span`), a bordered body with a `--chart-body-min-height` floor (32.5rem, their `min-h-130`), then a footer row with the Figure/Data toggle left and Download CSV right. The data view caps `.table-scroll` at the body height with a sticky header row, mirroring the reference's pinned body height so toggling does not resize the card (and the sidebar clamped to it).
- The report header stays above the workbench; the reference's navbar/workspace bar have no analog here.

Deliberately not ported: the drag-to-resize handle with `localStorage` persistence (`resizableSidebar.js`) and the Radix accordion collapse for sidebar sections. Both add dependencies or persistence for little value at this size; revisit only if asked.

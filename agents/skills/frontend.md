---
title: "Frontend Skill"
description: "Project guidance for implementing the interface, charts, interactions, responsive behavior, and accessibility."
---

# Frontend Skill

Use this guidance for interface structure, components, charts, CSS,
interactions, responsive behavior, or accessibility.

## Objective

Build a compact PPIC-style data story around one job: comparing historical and
projected outcomes for older Californians. The interface should feel related to
the web-data-visualization project without inheriting its platform scale.

## Before editing

1. Read `AGENTS.md` and inspect the relevant implementation in the read-only `v0/` directory.
2. Search the target code for an existing component, helper, or token.
3. Consult the reference project only to answer a specific design question.
   Keep all access read-only.
4. Identify the legacy behavior and accessibility state that must survive the
   change.

## Design principles

- Editorial before application-like: lead with the report context and the
  result, not navigation or chrome.
- One clear hierarchy: title and context, comparison controls, visualization,
  notes, then tabular/download access.
- Progressive disclosure: show common controls first and reveal secondary
  detail only when it is useful.
- Compact, not cramped: this site needs fewer surfaces than the reference
  project, but labels, notes, and touch targets still need room.
- Data-first styling: decoration must not compete with series, axes, labels, or
  caveats.

## Tokens and reuse

- Define shared color, typography, spacing, radius, breakpoint, and chart
  values in one token/theme location appropriate to the selected stack.
- Start from PPIC brand and data-visualization colors used by the reference
  project; select only the small subset this site needs.
- Never rely on color alone to distinguish actual and projected data. Retain a
  second cue such as solid versus dashed strokes and explicit text labels.
- Extend an existing local component or variant before creating a near-copy.
- Keep project-specific components local. Do not build a general UI kit unless
  repeated needs demonstrate one is necessary.

## Component boundaries

Separate concerns so each can be understood and tested:

- Page/report context and methodology copy.
- Comparison editor and individual comparison controls.
- Pure projection aggregation and display-data preparation.
- Chart rendering and legend.
- Data table.
- CSV download.
- Loading, empty, suppressed, and error states.

Avoid splitting trivial markup into files solely to increase component count.
Create a component when it owns meaningful behavior, is reused, or makes a
large surface easier to reason about.

## Interaction rules

- Use semantic buttons, labels, fieldsets, legends, tables, and status regions.
- Every input must have a programmatically associated, visible label.
- Keyboard users must be able to add, edit, and remove comparisons; switch
  views; inspect the data table; and trigger downloads.
- Focus indicators must be clearly visible.
- Dynamic summaries and errors should be announced without making every chart
  redraw disruptive.
- Removing a comparison must not leave focus in a lost or surprising place.
- Preserve meaningful selections when changing another control unless the
  combination becomes invalid; explain any automatic reset.

## Chart rules

- Keep actual and projected series visually distinct and identify both in the
  legend and accessible description.
- Use the same prepared values for chart, table, tooltip, and download; do not
  calculate each surface independently.
- Do not connect lines through missing or suppressed observations.
- Mark interpolated values and explain the interpolation in text.
- Format percentages and counts consistently across all surfaces.
- Provide a real data table as the non-visual equivalent of the chart.
- Make hover content available through a keyboard-accessible or tabular path.
- Ensure labels, legends, and hit targets remain usable on narrow screens.

## Responsive behavior

- Design mobile layout intentionally rather than shrinking the desktop layout.
- Stack controls and actions when horizontal space is limited.
- Prevent page-level horizontal scrolling; contain wide tables in a labeled,
  keyboard-accessible scroll region if necessary.
- Test at a narrow mobile viewport and at a representative desktop viewport.

## Verification

For UI changes, verify at minimum:

- Default load and data-load failure.
- Adding, changing, and removing comparisons.
- Percentage/count display and denominator behavior where available.
- Figure/table toggle and CSV download.
- No-data, missing-data, suppressed, and interpolated states.
- Keyboard navigation and visible focus.
- Narrow and wide layouts.

Use screenshots or visual regression tooling when it exists, but also inspect
semantics and computed values. A screenshot cannot validate either one.

---
title: "Agent Instructions"
description: "Project-wide goals, constraints, product invariants, and task routing for agents migrating the older-worker projections website."
---

# AGENTS.md

## Goal

Migrate the single-purpose older-worker projections interactive from `v0/` into
the repository root. The finished site should make California older-worker
historical data and projections easy to compare, inspect, and download while
using a focused version of PPIC's web-data-visualization design language.

This is a small public-facing data product, not a general visualization
platform. Prefer a clear, durable implementation over framework breadth,
configuration surfaces, or abstractions intended for unrelated interactives.

## Current state

- `v0/` is the read-only legacy implementation and behavioral reference for the migration. Inspect and run it as needed, but never modify files inside it.
- `v0/index.html`, `v0/styles.css`, and `v0/app.js` define the current interface
  and client-side behavior.
- `v0/data/projections_age5cat_2006_2040.csv` is the dataset used by the legacy
  interactive.
- The root migration architecture, package commands, and deployment target have
  not been selected yet. Do not invent them; inspect the repository and confirm
  material choices with the user.

## Sources of truth

Use these in priority order:

1. The user's current request.
2. This file and the task-specific guidance in `agents/skills/`.
3. `agents/memory.md` and relevant records in `agents/memories/`.
4. The behavior and explanatory copy in `v0/`.
5. The design language in the sibling repository `../web-data-visualization`.

The web-data-visualization project is a **read-only reference**. Never edit, format, move, delete, install into, or run a command that writes to that project. Bring over only the patterns this interactive needs; do not copy its broad application architecture or tooling by default.

## Project structure

- `v0/` — read-only legacy site and migration baseline; never edit, delete, move, rename, format, or generate files within it.
- `agents/skills/` — task-specific project conventions.
- `agents/memory.md` — concise index of durable project knowledge.
- `agents/memories/` — detailed, dated records for decisions or discoveries
  that will matter in later sessions.
- Repository root — destination for the migrated website.

## Project invariants

Unless the user explicitly changes the product requirements, preserve these
behaviors from `v0/`:

- Users can add and remove comparisons.
- Each comparison can choose an outcome and filter by race/ethnicity, gender,
  age group, and education.
- Supported outcomes can switch between shares of all adults and shares of the
  labor force.
- Historical (`pred=FALSE`) and projected (`pred=TRUE`) values remain visually
  distinguishable.
- Aggregated rates are weighted by `totpop`.
- A comparison is suppressed when a positive population total is below 20,000
  in any year represented by that comparison.
- Missing 2020 historical poverty values may be linearly interpolated only
  under the conditions implemented in `v0/app.js`, and must be labeled as
  interpolated.
- Users can switch between the figure and its data table and can download the
  displayed results as CSV.
- Data notes, denominator meaning, suppression, missing values, and actual vs.
  projected status remain explicit and accessible.

See `agents/skills/data-integrity.md` before changing calculations, filters,
suppression, interpolation, table values, or downloads.

## Design direction

Follow the reference project's design principles at a smaller scale:

- Use PPIC-aligned typography, color, hierarchy, and chart styling.
- Keep design tokens centralized rather than scattering literal colors,
  spacing, fonts, radii, or chart defaults through components.
- Favor a restrained editorial page, direct controls, a prominent chart, and a
  readable data table.
- Reuse patterns inside this project before creating variants.
- Do not import platform features this site does not need, such as a module
  system, chart builder, documentation portal, changelog UI, or general-purpose
  UI kit.
- Treat mobile layout, keyboard use, focus visibility, semantic controls,
  reduced motion, chart alternatives, and color contrast as requirements.

See `agents/skills/frontend.md` before implementing or reviewing the interface.

## Working defaults

- Make the smallest complete change that solves the requested task.
- Search the repository before creating a new utility, component, or token.
- Keep calculation logic separate from rendering so it can be tested directly.
- Preserve explanatory content and domain meaning, not just visual output.
- Validate changed behavior at narrow and wide viewport sizes.
- Run the smallest relevant checks after each change and the full available
  check suite before handoff.
- Report checks actually run; never claim an unrun test or visual review.
- Update project memory only with verified, durable information.
- Do not modify unrelated user changes in the working tree.

## Ask first

Get user confirmation before:

- Selecting or replacing the migration framework, charting library, package
  manager, or deployment target when the choice has not already been made.
- Adding or upgrading dependencies.
- Changing the input schema, source dataset, metric definitions, weighting,
  suppression, interpolation, or download format.
- Removing a user-visible capability from `v0/`.
- Introducing infrastructure meant for multiple sites or visualization modules.

## Never

- Modify the web-data-visualization reference project.
- Modify any file or directory inside `v0/`.
- Treat a visual match as proof of numerical correctness.
- Hide missing, suppressed, or interpolated data without an explanation.
- Duplicate the source CSV or derived results merely to make implementation
  easier.
- Commit generated build output, local caches, secrets, or machine-specific
  configuration.
- Rewrite working calculation logic without first characterizing its behavior.

## Task routing

- Frontend, chart, interaction, accessibility, or styling work:
  `agents/skills/frontend.md`
- Data parsing, calculation, filtering, suppression, interpolation, or export:
  `agents/skills/data-integrity.md`
- A requested implementation plan or multi-stage migration plan:
  `agents/skills/implementation-plans.md`
- Python modules, scripts, tooling, or tests: `agents/skills/python.md`
- Markdown creation or editing: `agents/skills/markdown.md`

## Uncertainty

Flag low-confidence conclusions. When a choice would materially alter the
architecture, data meaning, public presentation, or migration scope, explain
the tradeoff and ask before proceeding.

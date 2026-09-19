---
title: "Workstreams 3-9 implemented"
description: "CSV contract decision, the app's real architecture as built, and non-obvious discoveries from implementing parsing, calculation, controls, chart, and accessibility."
---

# Workstreams 3-9 implemented

The migration went from scaffold-only to a working, data-driven app in this session: the TypeScript CSV parser, the calculation pipeline, comparison state/controls, the design foundation, the visx chart, the table/CSV export, and an accessibility/responsive pass. See `README.md` for the resulting architecture and verified commands, and `IMPLEMENTATION_PLAN.md`'s "Implementation status" for workstream-by-workstream detail.

## CSV download contract: resolved

The user chose the new contract over the exact legacy one (see `IMPLEMENTATION_PLAN.md`'s former approval gate): `exportDisplayedData.ts` exports whatever is actually shown (rate or derived raw count, depending on the active display format) plus explicit `status` (valid/missing/interpolated) and `unit` columns, and omits suppressed comparisons entirely rather than including them with blanked values. This intentionally breaks byte compatibility with `v0/`'s CSV. Do not revert to the legacy contract without asking again.

## Non-obvious discoveries

- **Direct chart labels cannot use the series color as text fill.** Two of the six `SERIES_COLORS` (`#d27c2c`, and the brand orange `#e36a36` used elsewhere for the `.eyebrow` text) only clear ~3.1-3.3:1 contrast against white — enough for a graphical line/dot (3:1) but not for text (4.5:1). Direct labels now always render in `--color-text` via the `.chart-direct-label` CSS class (see `src/charts/DirectLabels.tsx`); color identity comes from the adjacent line and the legend swatch instead. `--color-brand-text` (`#c54f1b`, ~4.66:1) was added to `tokens.css` for small brand-colored text specifically. Check contrast before reusing any `SERIES_COLORS` entry as text.
- **`tsconfig.app.json` no longer covers `tests/`.** Vitest test files need Node ambient types (`readFileSync`, `import.meta.url` path resolution for fixtures) that `src/` (browser-only) should not have. A new `tsconfig.test.json` (extends `tsconfig.app.json`, adds `"node"` to `types`, covers `tests/unit`/`tests/components`/`tests/setup.ts`) is referenced from the root `tsconfig.json` alongside `tsconfig.app.json` and `tsconfig.node.json`.
- **RTL needs an explicit `afterEach(cleanup)` in `tests/setup.ts`.** `@testing-library/react`'s auto-cleanup depends on detecting `afterEach` as a true global; this project's Vitest config doesn't set `test.globals: true` (tests import `afterEach` from `"vitest"` explicitly), so auto-cleanup never fired and component tests bled into each other (duplicate headings, stale DOM) until cleanup was added explicitly.
- **The x-axis needs a responsive tick count**, not a fixed one. A fixed `numTicks` that looked fine at desktop width overlapped illegibly at 375px. `chartLayout.ts`'s `computeXAxisTickCount(innerWidth)` (~1 tick per 70px, capped) fixed it; see its test in `tests/unit/chartLayout.test.ts`.
- Cross-verified end to end: `tests/e2e/smoke.spec.ts` downloads the real CSV against the production dataset and asserts it numerically matches the visible table cell, at both a desktop and a mobile (Pixel 5) viewport.

## Follow-up / not done

- No automated accessibility scan (e.g., axe-core) was run — adding one requires a new devDependency, which needs approval first. Accessibility was checked manually (labels, fieldsets/legends, focus management, contrast, reduced motion, keyboard flow, table-as-alternative).
- Visual review against the sibling `../web-data-visualization` reference was informational only (read-only), not a pixel-diff; PPIC-flavored tokens (fonts, brand color, restrained cards/borders) were already scaffolded and were extended, not redesigned from scratch.
- Actual Vercel deployment was not performed (would need the user's Vercel access); `vercel.json` and the build are verified locally (`npm run build` + `npm run preview`) and via Playwright against the production build.

---
title: "Claude Guidance"
description: "Concise workflow, skill routing, commands, and boundaries for Claude when working in this repository."
---

# CLAUDE.md

## Start here

Read `AGENTS.md` before making changes. It defines the migration goal, boundaries, product invariants, and the read-only status of the design reference.

Then load only the relevant project skill:

- `agents/skills/frontend.md` for UI, chart, CSS, interaction, or accessibility work.
- `agents/skills/data-integrity.md` for data, metrics, filtering, suppression, interpolation, tables, or CSV export.
- `agents/skills/implementation-plans.md` when the requested output is a plan.
- `agents/skills/python.md` when creating or modifying Python code or Python tooling.
- `agents/skills/markdown.md` whenever creating or editing Markdown.

Check `agents/memory.md` for durable context and follow links into `agents/memories/` only when relevant.

## Workflow

1. Inspect the current root and the relevant behavior in `v0/`.
2. Search for an existing pattern before adding a new one.
3. State any material assumption, especially while the target stack is undecided.
4. Make the smallest complete change.
5. Verify calculations independently from presentation where applicable.
6. Run the available checks and report exactly what was verified.
7. Add a memory entry only for a durable decision or non-obvious discovery.

## Commands

Verified root commands (Node 22+, `npm ci` first):

```bash
npm run dev          # local development server
npm run build         # tsc -b, then vite build to dist/
npm run preview       # serve the production build locally
npm run lint           # eslint
npm run typecheck      # tsc -b across app/, node-tooling, and test project references
npm test                # vitest (unit + component tests)
npm run test:e2e        # playwright, against a built+previewed production bundle
npm run test:python     # unittest over scripts/ and tests/python/
npm run clean:data      # regenerate public/data/cleaned/ from public/data/raw/
npm run check:data      # validate raw/cleaned parity
```

None of these write to `v0/` or `../web-data-visualization`.

The legacy site can be inspected locally from the repository root with:

```bash
python3 -m http.server 8000 --directory v0
```

## Boundaries

- Treat `v0/` as a read-only behavioral baseline. Inspect or run it as needed, but never modify anything inside it.
- Treat the sibling repository `../web-data-visualization` as a read-only design reference. Do not modify it for any reason.
- Ask before adding dependencies or making choices that set the project's framework, data contract, or deployment architecture.
- Do not overwrite unrelated working-tree changes.

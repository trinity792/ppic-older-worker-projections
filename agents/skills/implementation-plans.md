---
title: "Implementation Planning Skill"
description: "Project guidance for writing grounded, executable implementation and migration plans."
---

# Implementation Planning Skill

Use this guidance when the requested deliverable is a plan rather than code.

## Principle

A plan is a handoff. It should make implementation mechanical by grounding each
step in the repository's current state, naming the expected outcome, and
defining how that outcome will be verified.

## Required preparation

- Read `AGENTS.md`, `agents/memory.md`, and the relevant task skill.
- Inspect the affected root files and the corresponding behavior in the read-only `v0/` directory.
- Search for existing helpers, tokens, tests, and components.
- Use the web-data-visualization project only as a read-only design reference
  and only where the plan needs a specific pattern.
- Separate confirmed facts from recommendations and open decisions.

## Plan structure

Keep the plan proportional to this small project. Include:

1. **Outcome** — the user-visible result and what is intentionally out of scope.
2. **Current state** — relevant files, behavior, and constraints found during
   inspection.
3. **Decisions** — choices already made, choices recommended with rationale,
   and choices that require the user.
4. **Workstreams** — ordered, independently verifiable slices. For each, name
   files or locations, behavior to implement, edge cases, and completion checks.
5. **Data parity** — fixtures or comparisons that prove calculations and status
   handling match the intended behavior.
6. **UI/accessibility verification** — responsive, keyboard, semantic, and
   visual checks.
7. **Release/rollback** — only when deployment or data changes make it relevant.

## Decomposition rules

- Organize by dependency and observable outcome, not by vague phases such as
  "frontend work" or "cleanup."
- Put data-model and calculation decisions before components that consume them.
- Include tests with the workstream they validate, not as an unbounded final
  task.
- Keep optional polish separate from migration parity.
- Avoid importing platform-scale tasks from the reference project.
- Do not paste finished implementation code into the plan.
- Do not invent file paths for an architecture that has not been selected;
  label proposed paths as proposed.

## Completion standard

Another contributor should be able to implement the plan without rediscovering
the product rules, guessing which legacy behavior matters, or deciding how to
prove the numbers are correct.

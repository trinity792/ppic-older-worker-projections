---
title: "Python Skill"
description: "Project guidance for writing, reviewing, and testing maintainable Python modules, scripts, command-line tools, and data-processing code."
---

# Python Skill

Write maintainable Python that fits the repository as it exists. Python is not currently an established part of the migration stack, so do not introduce it, a package manager, or dependencies solely because this skill is available.

## Before editing

- Inspect the repository for an existing Python version, environment, `pyproject.toml`, dependency manager, formatter, linter, type checker, test runner, and source/test layout. Follow what exists.
- If Python or its tooling is new to the project, confirm material setup and dependency choices with the user before adding them.
- For projection calculations, CSV transformations, or exports, also follow [`data-integrity.md`](./data-integrity.md).
- Keep the web-data-visualization repository read-only. Its Python conventions may inform style, but its pipeline architecture is not automatically needed here.

## Structure

- Prefer small importable functions with a thin CLI or orchestration layer.
- Put execution behind `if __name__ == "__main__":`; importing a module must not perform file writes, network requests, or pipeline work.
- Organize imports as standard library, third-party, then local modules.
- Use `pathlib.Path` for filesystem paths and resolve project-relative paths deliberately rather than depending on the caller's working directory.
- Keep configuration and domain constants centralized. Do not scatter schema names, thresholds, or output paths through the implementation.
- Avoid abstraction until there is a demonstrated second use or a meaningful testing boundary.

Standalone scripts should begin with a concise module docstring that states their purpose, inputs, outputs or side effects, and a real usage example. Library modules need a purpose-focused module docstring when their role is not obvious from the package and filename.

## Interfaces and types

- Use clear names and type hints for public functions and non-obvious return values. Let local inference handle simple internal variables.
- Prefer explicit return values over mutation of module-level state.
- Keep parsing, validation, transformation, and serialization separate when they can fail independently.
- Use `argparse` for a standard-library CLI. Give every option useful help text and return a non-zero exit status for fatal failures.
- Preserve established data contracts. Schema or output-format changes require user confirmation under `AGENTS.md`.

## Errors and observability

- Validate required inputs early and raise specific exceptions with actionable context, such as the path, field, row, or processing stage.
- Catch an exception only when the code can add context, recover, or translate it at a boundary. Do not use bare `except` or silently discard failures.
- Distinguish a recoverable missing item from a corrupt or invalid required input; do not convert either one to zero or an empty result by default.
- Use `logging` for reusable or multi-stage workflows. A small CLI may print a concise result, but diagnostic output should not be mixed into returned data.
- Never suppress warnings globally to make a run appear successful.

## Data work

- Make transformations deterministic for identical inputs.
- Validate expected columns and units before calculating results.
- Represent missing values deliberately and test how they survive parsing, aggregation, and serialization.
- Avoid mutating a caller-owned pandas `DataFrame`; copy at the boundary when a function intentionally transforms it.
- Specify sorting and output column order rather than relying on incidental input order.
- Write outputs atomically when a partial file would be misleading or unsafe.
- Do not overwrite source data or generated outputs without explicit task scope and a verified target path.

## Tests and quality checks

- Use the repository's configured tools. If none exist, prefer standard-library solutions for a one-off script and ask before adding test or quality-tool dependencies.
- Test public behavior and domain edge cases rather than implementation details.
- Keep fixtures small and hand-checkable; use temporary directories for file tests.
- Include regression tests for a bug fix and parity fixtures for migrated calculations.
- Avoid live network calls in unit tests; inject or mock external boundaries.
- Run the narrow relevant tests while iterating, then the available Python suite and configured lint/type checks before handoff.
- Report the exact commands run and any checks that could not be run.

## Security and reproducibility

- Never place secrets or credentials in code, fixtures, logs, or committed configuration.
- Do not load untrusted pickle files or execute input as Python.
- Pin or constrain dependencies through the project's chosen dependency file, not ad hoc installation instructions.
- Record required Python and tool commands in the root guidance once they are established and verified.

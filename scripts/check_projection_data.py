"""Validate raw and cleaned projection CSVs and print compact summaries.

Usage:
    python3 scripts/check_projection_data.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

from data_contract import CLEANED_DATA_PATH, RAW_DATA_PATH, DatasetSummary, summarize_csv


def format_summary(summary: DatasetSummary) -> str:
    """Format a summary for stable human-readable command output."""
    return (
        f"{summary.path}: {summary.row_count:,} rows, {summary.column_count} analytical columns, "
        f"years {summary.minimum_year}-{summary.maximum_year}, "
        f"historical={summary.historical_rows:,}, projected={summary.projected_rows:,}, "
        f"negative_totpop={summary.negative_population_rows:,}, sha256={summary.analytical_digest[:12]}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path, default=[RAW_DATA_PATH, CLEANED_DATA_PATH], help="CSV paths to validate.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summaries = [summarize_csv(path.resolve()) for path in args.paths]
    for summary in summaries:
        print(format_summary(summary))

    row_counts = {summary.row_count for summary in summaries}
    if len(row_counts) > 1:
        raise SystemExit("Validated files do not contain the same number of rows.")
    analytical_digests = {summary.analytical_digest for summary in summaries}
    if len(analytical_digests) > 1:
        raise SystemExit("Validated files do not contain identical analytical fields and values.")


if __name__ == "__main__":
    main()

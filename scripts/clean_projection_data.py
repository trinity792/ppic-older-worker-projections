"""Validate and clean the projection CSV without changing analytical values.

The cleaner removes only unnamed export-index columns, writes deterministic CSV,
and validates required fields. It does not aggregate, suppress, interpolate, or
fill missing values.

Usage:
    python3 scripts/clean_projection_data.py --force
"""

from __future__ import annotations

import argparse
import csv
import os
import tempfile
from pathlib import Path

from data_contract import CLEANED_DATA_PATH, RAW_DATA_PATH, cleaned_fieldnames, iter_clean_rows


def clean_projection_data(source_path: Path, output_path: Path, *, overwrite: bool = False) -> int:
    """Clean source_path into output_path atomically and return the row count."""
    if not source_path.is_file():
        raise FileNotFoundError(f"Raw projection CSV not found: {source_path}")
    if output_path.exists() and not overwrite:
        raise FileExistsError(f"Cleaned projection CSV already exists: {output_path}. Pass --force to replace it.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None

    try:
        with source_path.open("r", encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source)
            fieldnames = cleaned_fieldnames(reader.fieldnames or [])
            with tempfile.NamedTemporaryFile(
                "w",
                encoding="utf-8",
                newline="",
                dir=output_path.parent,
                prefix=f".{output_path.name}.",
                suffix=".tmp",
                delete=False,
            ) as destination:
                temporary_path = Path(destination.name)
                writer = csv.DictWriter(destination, fieldnames=fieldnames, lineterminator="\n")
                writer.writeheader()
                row_count = 0
                for row in iter_clean_rows(reader):
                    writer.writerow(row)
                    row_count += 1
                destination.flush()
                os.fsync(destination.fileno())

        if row_count == 0:
            raise ValueError(f"Raw projection CSV contains no data rows: {source_path}")
        temporary_path.replace(output_path)
        return row_count
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=RAW_DATA_PATH, help="Raw source CSV path.")
    parser.add_argument("--output", type=Path, default=CLEANED_DATA_PATH, help="Cleaned output CSV path.")
    parser.add_argument("--force", action="store_true", help="Replace an existing cleaned output file.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    row_count = clean_projection_data(args.input.resolve(), args.output.resolve(), overwrite=args.force)
    print(f"Wrote {row_count:,} rows to {args.output.resolve()}")


if __name__ == "__main__":
    main()

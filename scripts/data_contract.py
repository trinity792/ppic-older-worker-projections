"""Shared CSV contract for projection-data cleaning and validation."""

from __future__ import annotations

import csv
import hashlib
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Mapping, TextIO

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_PATH = PROJECT_ROOT / "public/data/raw/projections_age5cat_2006_2040.csv"
CLEANED_DATA_PATH = PROJECT_ROOT / "public/data/cleaned/projections_age5cat_2006_2040.csv"

REQUIRED_COLUMNS = (
    "year",
    "totpop",
    "pred",
    "latino",
    "white",
    "black",
    "asian",
    "pacis",
    "female",
    "age_cat",
    "ed_hsgrad",
    "ed_somecoll",
    "ed_collgrad",
)
PREDICTION_VALUES = frozenset({"FALSE", "TRUE"})


class DataContractError(ValueError):
    """Raised when a projection CSV violates the migration data contract."""


@dataclass(frozen=True)
class DatasetSummary:
    path: Path
    row_count: int
    column_count: int
    minimum_year: int
    maximum_year: int
    historical_rows: int
    projected_rows: int
    negative_population_rows: int
    analytical_digest: str


def cleaned_fieldnames(fieldnames: Iterable[str | None]) -> list[str]:
    """Remove only unnamed export-index columns and reject duplicate names."""
    names = [name.removeprefix("\ufeff") for name in fieldnames if name not in (None, "")]
    duplicates = sorted({name for name in names if names.count(name) > 1})
    if duplicates:
        raise DataContractError(f"Duplicate columns: {', '.join(duplicates)}")
    missing = sorted(set(REQUIRED_COLUMNS) - set(names))
    if missing:
        raise DataContractError(f"Missing required columns: {', '.join(missing)}")
    return names


def validate_row(row: Mapping[str | None, str | list[str] | None], row_number: int) -> tuple[int, str]:
    """Validate structural values without changing any analytical field."""
    if None in row:
        raise DataContractError(f"Row {row_number} has more values than headers.")
    missing_cells = [str(name) for name, value in row.items() if name not in (None, "") and value is None]
    if missing_cells:
        raise DataContractError(f"Row {row_number} has missing cells for: {', '.join(missing_cells)}")

    try:
        year = int(str(row["year"]))
    except (KeyError, TypeError, ValueError) as error:
        raise DataContractError(f"Row {row_number} has an invalid year.") from error

    try:
        total_population = float(str(row["totpop"]))
    except (KeyError, TypeError, ValueError) as error:
        raise DataContractError(f"Row {row_number} has an invalid totpop.") from error

    if not math.isfinite(total_population):
        raise DataContractError(f"Row {row_number} has a non-finite totpop.")

    prediction = str(row.get("pred", ""))
    if prediction not in PREDICTION_VALUES:
        raise DataContractError(f"Row {row_number} has invalid pred={prediction!r}.")

    return year, prediction


def iter_clean_rows(reader: csv.DictReader) -> Iterator[dict[str, str]]:
    """Yield rows with unnamed export-index fields removed and values preserved."""
    fieldnames = cleaned_fieldnames(reader.fieldnames or [])
    for row_number, row in enumerate(reader, start=2):
        validate_row(row, row_number)
        yield {name: str(row.get(name, "")) for name in fieldnames}


def summarize_csv(path: Path) -> DatasetSummary:
    """Validate a CSV and return a small deterministic summary."""
    years: list[int] = []
    prediction_counts = {"FALSE": 0, "TRUE": 0}
    negative_population_rows = 0
    digest = hashlib.sha256()

    with path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        fieldnames = cleaned_fieldnames(reader.fieldnames or [])
        for fieldname in fieldnames:
            digest.update(fieldname.encode("utf-8"))
            digest.update(b"\0")
        for row_number, row in enumerate(reader, start=2):
            year, prediction = validate_row(row, row_number)
            years.append(year)
            prediction_counts[prediction] += 1
            if float(str(row["totpop"])) < 0:
                negative_population_rows += 1
            for fieldname in fieldnames:
                digest.update(str(row.get(fieldname, "")).encode("utf-8"))
                digest.update(b"\0")

    if not years:
        raise DataContractError(f"{path} contains no data rows.")

    return DatasetSummary(
        path=path,
        row_count=len(years),
        column_count=len(fieldnames),
        minimum_year=min(years),
        maximum_year=max(years),
        historical_rows=prediction_counts["FALSE"],
        projected_rows=prediction_counts["TRUE"],
        negative_population_rows=negative_population_rows,
        analytical_digest=digest.hexdigest(),
    )


def open_reader(source: TextIO) -> csv.DictReader:
    """Create the shared CSV reader in one place for scripts and tests."""
    return csv.DictReader(source)

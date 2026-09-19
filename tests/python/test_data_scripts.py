"""Tests for the standard-library projection-data cleaning scripts."""

from __future__ import annotations

import csv
import io
import sys
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from clean_projection_data import clean_projection_data  # noqa: E402
from data_contract import DataContractError, cleaned_fieldnames, open_reader, summarize_csv  # noqa: E402


def fixture_csv(prediction: str = "FALSE") -> str:
    headers = [
        "",
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
        "lfp",
    ]
    values = ["1", "2020", "25000", prediction, "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "TRUE", "65-69", "TRUE", "FALSE", "FALSE", "NA"]
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(headers)
    writer.writerow(values)
    return buffer.getvalue()


class DataContractTests(unittest.TestCase):
    def test_cleaned_fieldnames_removes_only_the_unnamed_index(self) -> None:
        reader = open_reader(io.StringIO(fixture_csv()))

        fieldnames = cleaned_fieldnames(reader.fieldnames or [])

        self.assertNotIn("", fieldnames)
        self.assertIn("lfp", fieldnames)

    def test_invalid_prediction_status_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "raw.csv"
            output = root / "clean.csv"
            source.write_text(fixture_csv("MAYBE"), encoding="utf-8")

            with self.assertRaisesRegex(DataContractError, "invalid pred"):
                clean_projection_data(source, output)

    def test_structurally_short_row_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "raw.csv"
            output = root / "clean.csv"
            source.write_text(fixture_csv().rsplit(",", 1)[0] + "\n", encoding="utf-8")

            with self.assertRaisesRegex(DataContractError, "missing cells"):
                clean_projection_data(source, output)

    def test_cleaning_preserves_missing_tokens_and_row_count(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "raw.csv"
            output = root / "clean.csv"
            source.write_text(fixture_csv(), encoding="utf-8")

            row_count = clean_projection_data(source, output)
            summary = summarize_csv(output)

            self.assertEqual(row_count, 1)
            self.assertEqual(summary.row_count, 1)
            self.assertIn(",NA\n", output.read_text(encoding="utf-8"))
            self.assertEqual(summarize_csv(source).analytical_digest, summary.analytical_digest)

    def test_negative_population_is_reported_but_preserved_for_legacy_parity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "raw.csv"
            output = root / "clean.csv"
            source.write_text(fixture_csv().replace("25000", "-10"), encoding="utf-8")

            clean_projection_data(source, output)
            summary = summarize_csv(output)

            self.assertEqual(summary.negative_population_rows, 1)
            self.assertIn(",-10,", output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()

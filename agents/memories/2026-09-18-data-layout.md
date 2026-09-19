---
title: "Projection Data Layout and Cleaning"
description: "Confirmed raw and cleaned data directories, deterministic cleaning boundary, and verified source-data characteristics."
---

# Projection Data Layout and Cleaning

## Decision

- Keep the unchanged legacy export at `public/data/raw/projections_age5cat_2006_2040.csv` as the auditable root source.
- Serve `public/data/cleaned/projections_age5cat_2006_2040.csv` to the application.
- Generate the cleaned file with dependency-free Python scripts under `scripts/`.
- Remove only the unnamed export-index column. Preserve every analytical field, value, missing token, row, and row order.
- Validate raw/cleaned parity with a semantic SHA-256 digest over the 38 analytical columns and all values.

## Verified characteristics

Both root files contain 15,083 rows covering 2006–2040, including 7,019 historical and 8,064 projected rows. The source has 17 finite negative projected `totpop` values. The cleaner reports and preserves them because `v0/app.js` accepts every finite population value; silently dropping them would change aggregation behavior.

The legacy race mapper recognizes `pacis=TRUE` as Pacific Islander, but the legacy race/ethnicity dropdown omits that label. A Pacific Islander-only comparison across the full period is suppressed because its aggregated historical populations are 17,557 in 2006 and 16,393 in 2007, both below the 20,000 threshold. The user approved adding Pacific Islander to the migrated control despite that expected suppression; the dataset and suppression policy remain unchanged.

## Commands

`npm run clean:data` regenerates the cleaned file atomically. `npm run check:data` validates both files and proves analytical equality. The scripts use only the Python standard library, so no virtual environment is required.

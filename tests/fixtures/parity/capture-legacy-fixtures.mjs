// Regenerates the committed JSON fixtures in this directory by driving the
// real, unmodified v0/ interface in a headless browser and reading its
// rendered output. Values here are captured from v0/app.js's own render
// functions, not inferred from screenshots or reimplemented independently.
//
// Usage:
//   python3 -m http.server 8000 --directory v0   (in one terminal)
//   node tests/fixtures/parity/capture-legacy-fixtures.mjs   (in another)
//
// See tests/fixtures/parity/README.md for what each fixture characterizes
// and for findings that came out of capturing them.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.LEGACY_APP_URL ?? "http://localhost:8000/index.html";
const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));

mkdirSync(OUT_DIR, { recursive: true });

function fieldSelector(id, field) {
  return `select[data-comparison-id="${id}"][data-field="${field}"]`;
}

async function setFilter(page, id, field, value) {
  await page.selectOption(fieldSelector(id, field), value === "" ? "" : value);
}

/**
 * v0's rendered <select> for race_ethnicity has no Pacific Islander <option>
 * (FILTER_CONFIG omits it), even though its matching functions
 * (matchesFilter/getRaceEthnicity) already handle pacis=TRUE rows. To
 * characterize that already-implemented-but-unexposed code path without
 * modifying the read-only v0 files, inject a transient <option> into the
 * live DOM (gone on reload) and select it, so the real unmodified
 * comparisonMatchesRow/getRaceEthnicity functions run exactly as they would
 * for any other option.
 */
async function injectOptionAndSelect(page, id, field, value, label) {
  await page.evaluate(
    ({ id, field, value, label }) => {
      const select = document.querySelector(`select[data-comparison-id="${id}"][data-field="${field}"]`);
      if (!Array.from(select.options).some((option) => option.value === value)) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      }
    },
    { id, field, value, label },
  );
  await page.selectOption(fieldSelector(id, field), value);
}

async function setComparison(page, id, selection) {
  if (selection.outcome !== undefined) {
    await setFilter(page, id, "outcome", selection.outcome);
  }
  if (selection.useLaborForce !== undefined) {
    await page.check(
      `input[data-comparison-id="${id}"][data-field="useLaborForce"][value="${selection.useLaborForce}"]`,
    );
  }
  for (const field of ["race_ethnicity", "gender", "age_cat", "education"]) {
    if (selection[field] !== undefined) {
      await setFilter(page, id, field, selection[field]);
    }
  }
}

async function setValueFormat(page, format) {
  await page.check(`input[name="value-format"][value="${format}"]`);
}

async function addComparison(page) {
  await page.click("#add-comparison-button");
}

async function showTable(page) {
  const pressed = await page.getAttribute("#results-toggle-button", "aria-pressed");
  if (pressed !== "true") {
    await page.click("#results-toggle-button");
  }
}

async function scrapeState(page) {
  return page.evaluate(() => {
    const parseCell = (cellText) => {
      const lines = cellText.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length === 0 || lines[0] === "No data") {
        const populationLine = lines.find((line) => line.startsWith("Total population"));
        return {
          status: "no-data",
          rawText: cellText,
          totalPopulation: populationLine ? populationLine.replace("Total population: ", "") : null,
        };
      }
      if (lines[0] === "Suppressed") {
        const populationLine = lines.find((line) => line.startsWith("Total population"));
        return {
          status: "suppressed",
          rawText: cellText,
          totalPopulation: populationLine ? populationLine.replace("Total population: ", "") : null,
        };
      }
      const populationLine = lines.find((line) => line.startsWith("Total population"));
      const interpolated = lines.includes("Interpolated");
      return {
        status: interpolated ? "interpolated" : "valid",
        rawText: cellText,
        displayedValue: lines[0],
        totalPopulation: populationLine ? populationLine.replace("Total population: ", "") : null,
      };
    };

    const headerCells = Array.from(document.querySelectorAll("#results-head th")).map((th) => th.innerText.trim());
    const bodyRows = Array.from(document.querySelectorAll("#results-body tr")).map((tr) =>
      Array.from(tr.children).map((td) => parseCell(td.innerText)),
    );
    const bodyRowsRaw = Array.from(document.querySelectorAll("#results-body tr")).map((tr) => tr.innerText.trim());

    const comparisonLabels = Array.from(document.querySelectorAll(".comparison-card")).map((card) => ({
      comparisonId: card.dataset.comparisonId,
      heading: card.querySelector("h3")?.innerText.trim(),
      label: card.querySelector(".comparison-card-header p")?.innerText.trim(),
    }));

    return {
      selectionSummary: document.querySelector("#selection-summary")?.textContent.trim(),
      outcomeNoteVisible: !document.querySelector("#outcome-note")?.hidden,
      comparisonLabels,
      tableHeaders: headerCells,
      tableRows: bodyRows,
      tableRowsRaw: bodyRowsRaw,
      downloadDisabled: document.querySelector("#download-button")?.disabled ?? false,
    };
  });
}

async function downloadCsv(page) {
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#download-button")]);
  const streamPath = await download.path();
  const content = readFileSync(streamPath, "utf-8");
  return content;
}

function writeFixture(name, data) {
  const filePath = path.join(OUT_DIR, `${name}.json`);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log("wrote", filePath);
}

async function freshPage(browser) {
  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".comparison-card");
  return page;
}

async function main() {
  const browser = await chromium.launch();

  // 1. Statewide default
  {
    const page = await freshPage(browser);
    await showTable(page);
    const captured = await scrapeState(page);
    writeFixture("01-statewide-default", {
      description: "Initial app state: one statewide comparison, labor force participation, percent, share of all adults.",
      selections: [{ comparisonId: 1, outcome: "lfp", race_ethnicity: "", gender: "", age_cat: "", education: "" }],
      valueFormat: "percent",
      captured,
    });
    await page.close();
  }

  // 2. One comparison using every filter (non-suppressed combo)
  {
    const page = await freshPage(browser);
    const selection = {
      outcome: "lfp",
      race_ethnicity: "Latino",
      gender: "Female",
      age_cat: "55-64",
      education: "HS Graduate",
    };
    await setComparison(page, 1, selection);
    await showTable(page);
    const captured = await scrapeState(page);
    writeFixture("02-full-filter-comparison", {
      description: "One comparison using every demographic filter simultaneously (combined 55-64 age band).",
      selections: [{ comparisonId: 1, ...selection }],
      valueFormat: "percent",
      captured,
    });
    await page.close();
  }

  // 3. Combined age groups (55-64 and 65 and older) as two comparisons, verifying add-inheritance
  {
    const page = await freshPage(browser);
    await setComparison(page, 1, { outcome: "lfp", age_cat: "55-64" });
    await addComparison(page);
    const beforeSecondFilter = await scrapeState(page);
    await setComparison(page, 2, { age_cat: "65 and older" });
    await showTable(page);
    const captured = await scrapeState(page);
    writeFixture("03-combined-age-groups", {
      description:
        "Two comparisons using the combined age bands 55-64 and 65 and older, statewide, labor force participation. Also demonstrates that comparison 2 inherits comparison 1's outcome/denominator before its own filters are set.",
      selections: [
        { comparisonId: 1, outcome: "lfp", age_cat: "55-64" },
        { comparisonId: 2, age_cat: "65 and older" },
      ],
      valueFormat: "percent",
      inheritedStateBeforeSecondFilter: beforeSecondFilter.comparisonLabels,
      captured,
    });
    await page.close();
  }

  // 4. Denominator-switching outcome in both modes
  {
    const page = await freshPage(browser);
    await setComparison(page, 1, { outcome: "full_time", useLaborForce: false });
    await showTable(page);
    const allAdults = await scrapeState(page);
    await setComparison(page, 1, { useLaborForce: true });
    await showTable(page);
    const laborForce = await scrapeState(page);
    writeFixture("04-denominator-switch", {
      description: "Statewide full-time-worker outcome captured under both denominator modes (share of all adults vs. share of labor force), percent format.",
      selections: [{ comparisonId: 1, outcome: "full_time" }],
      valueFormat: "percent",
      capturedAllAdults: allAdults,
      capturedLaborForce: laborForce,
    });
    await page.close();
  }

  // 5. Multiple comparisons together, including one suppressed
  {
    const page = await freshPage(browser);
    await setComparison(page, 1, { outcome: "lfp" });
    await addComparison(page);
    await setComparison(page, 2, {
      race_ethnicity: "Latino",
      gender: "Female",
      age_cat: "55-64",
      education: "HS Graduate",
    });
    await addComparison(page);
    await injectOptionAndSelect(page, 3, "race_ethnicity", "Pacific Islander", "Pacific Islander");
    await showTable(page);
    const captured = await scrapeState(page);
    writeFixture("05-multiple-comparisons", {
      description:
        "Three comparisons together: statewide default, a fully-filtered comparison, and a Pacific Islander statewide comparison expected to be suppressed (2006/2007 population below 20,000).",
      selections: [
        { comparisonId: 1, outcome: "lfp" },
        {
          comparisonId: 2,
          race_ethnicity: "Latino",
          gender: "Female",
          age_cat: "55-64",
          education: "HS Graduate",
        },
        { comparisonId: 3, race_ethnicity: "Pacific Islander" },
      ],
      valueFormat: "percent",
      captured,
    });
    await page.close();
  }

  // 6. Percent vs raw display modes
  {
    const page = await freshPage(browser);
    await setComparison(page, 1, { outcome: "lfp" });
    await showTable(page);
    const percentCaptured = await scrapeState(page);
    await setValueFormat(page, "raw");
    await showTable(page);
    const rawCaptured = await scrapeState(page);
    writeFixture("06-percent-and-raw-modes", {
      description: "Statewide labor force participation captured once in percent format and once in raw (derived count) format.",
      selections: [{ comparisonId: 1, outcome: "lfp" }],
      capturedPercent: percentCaptured,
      capturedRaw: rawCaptured,
    });
    await page.close();
  }

  // 7. Comparison suppressed by a single low-population year
  {
    const page = await freshPage(browser);
    const selection = {
      outcome: "lfp",
      race_ethnicity: "White",
      age_cat: "85-89",
      education: "No HS Degree",
    };
    await setComparison(page, 1, selection);
    await showTable(page);
    const captured = await scrapeState(page);
    writeFixture("07-suppressed-single-low-year", {
      description:
        "White, age 85-89, No HS Degree, labor force participation. Historical 2021 population (19,712) is the sole point below the 20,000 suppression threshold; the whole comparison is expected to be hidden.",
      selections: [{ comparisonId: 1, ...selection }],
      valueFormat: "percent",
      captured,
    });
    await page.close();
  }

  // 8. Missing values and valid 2020 poverty interpolation
  {
    const page = await freshPage(browser);
    await setComparison(page, 1, { outcome: "cpmU100" });
    await showTable(page);
    const captured = await scrapeState(page);
    writeFixture("08-missing-values-and-interpolation", {
      description:
        "Statewide poverty (cpmU100), percent format. Historical values are missing 2006-2010 (population positive, no CPM value published). 2020 historical value is missing but interpolated from 2019/2021 neighbors.",
      selections: [{ comparisonId: 1, outcome: "cpmU100" }],
      valueFormat: "percent",
      captured,
    });
    await page.close();
  }

  // 9. Pacific Islander mapping (approved migrated difference), statewide
  {
    const page = await freshPage(browser);
    await setFilter(page, 1, "outcome", "lfp");
    await injectOptionAndSelect(page, 1, "race_ethnicity", "Pacific Islander", "Pacific Islander");
    await showTable(page);
    const captured = await scrapeState(page);
    writeFixture("09-pacific-islander-suppression", {
      description:
        "v0 omits a Pacific Islander dropdown option but its data-matching function still maps pacis=TRUE rows; this fixture drives that mapping directly via the DOM value to characterize the legacy suppression outcome the migrated UI must reproduce when the option is exposed. Statewide, labor force participation. Expected fully suppressed due to 2006 (17,557) and 2007 (16,393) populations below 20,000.",
      selections: [{ comparisonId: 1, outcome: "lfp", race_ethnicity: "Pacific Islander" }],
      valueFormat: "percent",
      captured,
      note: "v0's rendered <select> does not list a Pacific Islander <option>; this value was set directly via page.selectOption against the DOM element's value attribute, exercising the same matchesFilter/getRaceEthnicity code path a real option would use.",
    });
    await page.close();
  }

  // 10. CSV download contract (including known raw-mode mismatch)
  {
    const page = await freshPage(browser);
    await setComparison(page, 1, { outcome: "lfp" });
    await addComparison(page);
    await setComparison(page, 2, {
      race_ethnicity: "Latino",
      gender: "Female",
      age_cat: "55-64",
      education: "HS Graduate",
    });
    const csvPercent = await downloadCsv(page);
    await setValueFormat(page, "raw");
    const csvRaw = await downloadCsv(page);
    writeFixture("10-csv-download-contract", {
      description:
        "CSV download for two comparisons (statewide default + fully-filtered comparison), captured once with percent display active and once with raw display active. Documents the known legacy contract: the CSV always exports the underlying rate in *_value columns regardless of the on-screen value format, and never exports an interpolation flag.",
      finding:
        "The two captured CSVs differ ONLY in the comparison_N_label text (it gains a ': raw count' suffix in raw mode via getResolvedOutcomeLabel). The *_value columns are byte-for-byte identical rate values in both modes -- raw mode's label claims 'raw count' but the exported number is still the percentage rate (e.g. 0.36905735016600566), never value*totalPopulation. This is a stronger version of the known mismatch than 'exports the rate regardless of format': the exported label text is actively misleading about the exported value's units in raw mode.",
      selections: [
        { comparisonId: 1, outcome: "lfp" },
        {
          comparisonId: 2,
          race_ethnicity: "Latino",
          gender: "Female",
          age_cat: "55-64",
          education: "HS Graduate",
        },
      ],
      csvWithPercentDisplayActive: csvPercent,
      csvWithRawDisplayActive: csvRaw,
      csvContentIdenticalAcrossModes: csvPercent === csvRaw,
    });
    await page.close();
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

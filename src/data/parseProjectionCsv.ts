import { OUTCOMES } from "../app/outcomes";
import type { PredictionStatus, ProjectionRow } from "../app/types";

export interface ParsedProjectionData {
  rows: readonly ProjectionRow[];
  availableOutcomeKeys: readonly string[];
  diagnostics: {
    totalRecordCount: number;
    skippedRowCount: number;
  };
}

export type ProjectionCsvErrorStage = "empty" | "columns" | "rows";

export class ProjectionCsvError extends Error {
  readonly stage: ProjectionCsvErrorStage;

  constructor(stage: ProjectionCsvErrorStage, message: string) {
    super(message);
    this.name = "ProjectionCsvError";
    this.stage = stage;
  }
}

const REQUIRED_COLUMNS = [
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
] as const;

const BOOLEAN_CATEGORY_COLUMNS = [
  "latino",
  "white",
  "black",
  "asian",
  "pacis",
  "female",
  "ed_hsgrad",
  "ed_somecoll",
  "ed_collgrad",
] as const;

const OUTCOME_COLUMNS = [...new Set(OUTCOMES.flatMap((outcome) => [outcome.totalColumn, outcome.laborColumn].filter((column): column is string => column !== null)))];

/**
 * Parses the cleaned projection CSV into typed rows plus which outcome
 * definitions have all of their required source columns present. Ported from
 * v0/app.js's parseCsv/getAvailableOutcomeKeys; see agents/skills/data-integrity.md
 * for the semantics this must preserve.
 */
export function parseProjectionCsv(csvText: string): ParsedProjectionData {
  const records = parseCsvRecords(csvText);
  if (records.length < 2) {
    throw new ProjectionCsvError("empty", "The projection dataset is empty.");
  }

  const headerRecord = records[0];
  if (!headerRecord) {
    throw new ProjectionCsvError("empty", "The projection dataset is empty.");
  }
  const headers = headerRecord.map((value, index) => {
    const header = stripQuotes(value);
    return index === 0 ? header.replace(/^\uFEFF/, "") : header;
  });
  const namedHeaders = headers.filter((header) => header !== "");
  const headerSet = new Set(namedHeaders);

  if (headerSet.size !== namedHeaders.length) {
    throw new ProjectionCsvError("columns", "The projection dataset contains duplicate column names.");
  }

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerSet.has(column));
  if (missingColumns.length > 0) {
    throw new ProjectionCsvError("columns", `The projection dataset is missing required columns: ${missingColumns.join(", ")}.`);
  }

  const numericOutcomeColumns = OUTCOME_COLUMNS.filter((column) => headerSet.has(column));
  const numericOutcomeColumnSet = new Set(numericOutcomeColumns);
  const availableOutcomeKeys = OUTCOMES.filter((outcome) => {
    if (!headerSet.has(outcome.totalColumn)) {
      return false;
    }
    if (!outcome.laborColumn || outcome.fixedDenominator === "all") {
      return true;
    }
    return numericOutcomeColumnSet.has(outcome.laborColumn);
  }).map((outcome) => outcome.key);

  if (availableOutcomeKeys.length === 0) {
    throw new ProjectionCsvError("columns", "The projection dataset does not contain any supported outcome columns.");
  }

  const dataRecords = records.slice(1);
  const rows: ProjectionRow[] = [];
  let skippedRowCount = 0;

  for (const [recordIndex, record] of dataRecords.entries()) {
    if (record.length !== headers.length) {
      throw new ProjectionCsvError(
        "rows",
        `The projection dataset has ${record.length} fields on row ${recordIndex + 2}; expected ${headers.length}.`,
      );
    }

    const fields: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header !== "") {
        fields[header] = stripQuotes(record[index] ?? "");
      }
    });

    const year = parseRequiredFiniteNumber(fields.year);
    const totalPopulation = parseRequiredFiniteNumber(fields.totpop);
    const predRaw = fields.pred;
    const predictionStatus: PredictionStatus | null = predRaw === "TRUE" || predRaw === "FALSE" ? predRaw : null;
    const hasValidCategories = BOOLEAN_CATEGORY_COLUMNS.every(
      (column) => fields[column] === "TRUE" || fields[column] === "FALSE",
    );

    if (year === null || totalPopulation === null || predictionStatus === null || !hasValidCategories) {
      skippedRowCount += 1;
      continue;
    }

    const values: Record<string, number | null> = {};
    numericOutcomeColumns.forEach((column) => {
      values[column] = parseNullableNumber(fields[column]);
    });

    const categories: Record<string, string> = {
      raceEthnicity: resolveRaceEthnicity(fields),
      gender: fields.female === "TRUE" ? "Female" : "Male",
      ageCategory: fields.age_cat ?? "",
      education: resolveEducation(fields),
    };

    rows.push({
      year,
      totalPopulation,
      predictionStatus,
      values,
      categories,
    });
  }

  if (rows.length === 0) {
    throw new ProjectionCsvError("rows", "No valid rows remain after parsing the projection dataset.");
  }

  return {
    rows,
    availableOutcomeKeys,
    diagnostics: {
      totalRecordCount: dataRecords.length,
      skippedRowCount,
    },
  };
}

function parseRequiredFiniteNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveRaceEthnicity(fields: Record<string, string>): string {
  if (fields.latino === "TRUE") return "Latino";
  if (fields.white === "TRUE") return "White";
  if (fields.black === "TRUE") return "Black";
  if (fields.asian === "TRUE") return "Asian";
  if (fields.pacis === "TRUE") return "Pacific Islander";
  return "Other/None Listed";
}

function resolveEducation(fields: Record<string, string>): string {
  if (fields.ed_collgrad === "TRUE") return "College Graduate";
  if (fields.ed_somecoll === "TRUE") return "Some College";
  if (fields.ed_hsgrad === "TRUE") return "HS Graduate";
  return "No HS Degree";
}

function parseNullableNumber(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toUpperCase() === "NA" || trimmed.toUpperCase() === "NAN") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function stripQuotes(value: string): string {
  return value.replace(/^"(.*)"$/, "$1");
}

/** RFC4180-style CSV record parser, ported from v0/app.js's parseCsvRecords. */
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let currentField = "";
  let currentRecord: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRecord.push(currentField);
      currentField = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      currentRecord.push(currentField);
      if (currentRecord.some((value) => value !== "")) {
        records.push(currentRecord);
      }
      currentField = "";
      currentRecord = [];
      continue;
    }

    currentField += character;
  }

  if (inQuotes) {
    throw new ProjectionCsvError("rows", "The projection dataset contains an unterminated quoted field.");
  }

  if (currentField !== "" || currentRecord.length > 0) {
    currentRecord.push(currentField);
    if (currentRecord.some((value) => value !== "")) {
      records.push(currentRecord);
    }
  }

  return records;
}

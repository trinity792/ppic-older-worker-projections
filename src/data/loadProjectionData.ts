export const CLEANED_DATA_URL = "/data/cleaned/projections_age5cat_2006_2040.csv";

export async function loadProjectionCsv(signal?: AbortSignal): Promise<string> {
  const response = await fetch(CLEANED_DATA_URL, { cache: "no-store", signal });

  if (!response.ok) {
    throw new Error(`Failed to load the projection dataset (${response.status}).`);
  }

  return response.text();
}

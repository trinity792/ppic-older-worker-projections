import { expect, test } from "@playwright/test";

test("renders the default comparison, figure, and table with no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Older Workers in California");
  await expect(page.getByRole("heading", { name: "Comparisons" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comparison 1" })).toBeVisible();

  await expect(page.getByRole("img", { name: /Line chart comparing/ })).toBeVisible();

  const seriesStroke = await page.locator(".series-line").first().evaluate((element) => getComputedStyle(element).stroke);
  expect(seriesStroke).toBe("rgb(202, 79, 26)");
  const comparisonSwatch = await page
    .locator(".comparison-color-swatch")
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(comparisonSwatch).toBe(seriesStroke);

  await page.locator(".chart-canvas circle").last().hover();
  const tooltipBox = await page.getByRole("tooltip").boundingBox();
  const chartBox = await page.locator(".chart-canvas").boundingBox();
  expect(tooltipBox).not.toBeNull();
  expect(chartBox).not.toBeNull();
  expect(tooltipBox!.x).toBeGreaterThanOrEqual(chartBox!.x);
  expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(chartBox!.x + chartBox!.width);
  expect(tooltipBox!.y).toBeGreaterThanOrEqual(chartBox!.y);
  expect(tooltipBox!.y + tooltipBox!.height).toBeLessThanOrEqual(chartBox!.y + chartBox!.height);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("switches between the figure and the data table", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("table")).toHaveCount(0);

  await page.getByRole("button", { name: "Data" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "2006" })).toBeVisible();

  await page.getByRole("button", { name: "Figure" }).click();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("downloads a CSV that matches the visible table for the default comparison", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Data" }).click();

  const firstRow = page.locator("tbody tr").first();
  const yearCellText = (await firstRow.getByRole("rowheader").textContent())?.trim();
  const actualCellText = (await firstRow.locator("td").first().textContent()) ?? "";

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) {
    chunks.push(chunk as Buffer);
  }
  const csvText = Buffer.concat(chunks).toString("utf-8");

  const [header, ...rows] = csvText.split("\n");
  expect(header).toContain("comparison_1_actual_displayed_value");
  expect(header).toContain("comparison_1_actual_status");

  const firstDataRow = rows.find((line) => line.startsWith(`${yearCellText},`));
  expect(firstDataRow).toBeDefined();

  // The visible cell text embeds a formatted percent like "36.9%"; the CSV
  // exports the same underlying displayed value unformatted (e.g. 0.369...).
  const percentMatch = actualCellText.match(/(\d+\.\d+)%/);
  if (percentMatch) {
    const displayedPercent = Number(percentMatch[1]) / 100;
    const columns = firstDataRow!.split(",");
    const csvValue = Number(columns[3]); // year, label, unit, actual_displayed_value, ...
    expect(csvValue).toBeCloseTo(displayedPercent, 2);
  }
});

test("supports adding a comparison with the keyboard and moves focus to it", async ({ page }) => {
  await page.goto("/");
  const addButton = page.getByRole("button", { name: "Add a comparison" });
  await addButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Comparison 2" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Remove comparison 1" })).toBeVisible();
  const swatchColors = await page.locator(".comparison-color-swatch").evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundColor),
  );
  expect(swatchColors).toEqual(["rgb(202, 79, 26)", "rgb(41, 59, 84)"]);
});

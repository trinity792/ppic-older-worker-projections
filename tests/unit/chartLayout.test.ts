import { describe, expect, it } from "vitest";

import {
  buildLineSegments,
  computeXAxisTickCount,
  computeYAxisScale,
  getRenderableDisplayValues,
  getYearDomain,
  isRenderablePoint,
  resolveLabelCollisions,
} from "../../src/charts/chartLayout";
import type { PreparedPoint, PreparedSeries } from "../../src/app/types";

function point(overrides: Partial<PreparedPoint>): PreparedPoint {
  return {
    year: 2006,
    predictionStatus: "FALSE",
    rate: null,
    displayedValue: null,
    totalPopulation: 0,
    validWeight: 0,
    status: "missing",
    ...overrides,
  };
}

function series(overrides: Partial<PreparedSeries>): PreparedSeries {
  return {
    comparisonId: 1,
    label: "A",
    resolvedOutcomeLabel: "A",
    outcomeKey: "lfp",
    denominatorMode: "all",
    supportsDenominatorChoice: false,
    valueFormat: "percent",
    color: "#000",
    matchedRowCount: 1,
    hidden: false,
    suppressionReason: null,
    actual: [],
    projected: [],
    ...overrides,
  };
}

describe("isRenderablePoint", () => {
  it("requires positive population, a non-suppressed status, and a displayed value", () => {
    expect(isRenderablePoint(point({ totalPopulation: 30000, status: "valid", displayedValue: 0.5 }))).toBe(true);
    expect(isRenderablePoint(point({ totalPopulation: 0, status: "valid", displayedValue: 0.5 }))).toBe(false);
    expect(isRenderablePoint(point({ totalPopulation: 15000, status: "suppressed", displayedValue: null }))).toBe(false);
    expect(isRenderablePoint(point({ totalPopulation: 30000, status: "missing", displayedValue: null }))).toBe(false);
  });
});

describe("getYearDomain", () => {
  it("spans the min and max year across visible series only", () => {
    const domain = getYearDomain([
      series({ actual: [point({ year: 2010 })], projected: [point({ year: 2030 })] }),
      series({ comparisonId: 2, hidden: true, actual: [point({ year: 2006 })] }),
    ]);
    expect(domain).toEqual([2010, 2030]);
  });

  it("returns null when there are no points", () => {
    expect(getYearDomain([series({})])).toBeNull();
  });
});

describe("getRenderableDisplayValues", () => {
  it("excludes missing and suppressed points", () => {
    const values = getRenderableDisplayValues([
      series({
        actual: [
          point({ status: "valid", totalPopulation: 30000, displayedValue: 0.5 }),
          point({ status: "missing", totalPopulation: 0, displayedValue: null }),
        ],
      }),
    ]);
    expect(values).toEqual([0.5]);
  });
});

describe("computeYAxisScale", () => {
  it("never lets the axis minimum go negative", () => {
    const scale = computeYAxisScale(0.3, 0.5);
    expect(scale.min).toBeGreaterThanOrEqual(0);
    expect(scale.ticks[0]).toBe(scale.min);
  });

  it("anchors at exactly zero when the data minimum is close to zero", () => {
    const scale = computeYAxisScale(0.02, 0.5);
    expect(scale.min).toBe(0);
  });

  it("produces ticks that cover the input range", () => {
    const scale = computeYAxisScale(0.3, 0.5);
    expect(scale.max).toBeGreaterThanOrEqual(0.5);
    expect(scale.ticks).toHaveLength(4);
  });

  it("handles an equal min and max without dividing by zero", () => {
    const scale = computeYAxisScale(0.4, 0.4);
    expect(Number.isFinite(scale.max)).toBe(true);
    expect(scale.ticks.every((tick) => Number.isFinite(tick))).toBe(true);
  });
});

describe("buildLineSegments", () => {
  it("connects consecutive renderable points", () => {
    const points = [
      point({ year: 2006, status: "valid", totalPopulation: 30000, displayedValue: 0.4 }),
      point({ year: 2007, status: "valid", totalPopulation: 30000, displayedValue: 0.5 }),
    ];
    expect(buildLineSegments(points)).toHaveLength(1);
  });

  it("breaks the line across a missing point", () => {
    const points = [
      point({ year: 2006, status: "valid", totalPopulation: 30000, displayedValue: 0.4 }),
      point({ year: 2007, status: "missing", totalPopulation: 0, displayedValue: null }),
      point({ year: 2008, status: "valid", totalPopulation: 30000, displayedValue: 0.6 }),
    ];
    expect(buildLineSegments(points)).toHaveLength(0);
  });

  it("marks a segment touching the interpolated point", () => {
    const points = [
      point({ year: 2019, status: "valid", totalPopulation: 30000, displayedValue: 0.2 }),
      point({ year: 2020, status: "interpolated", totalPopulation: 30000, displayedValue: 0.25 }),
      point({ year: 2021, status: "valid", totalPopulation: 30000, displayedValue: 0.3 }),
    ];
    const segments = buildLineSegments(points);
    expect(segments).toHaveLength(2);
    expect(segments.every((segment) => segment.interpolatedEdge)).toBe(true);
  });
});

describe("computeXAxisTickCount", () => {
  it("never returns fewer than 2 ticks even at very narrow widths", () => {
    expect(computeXAxisTickCount(50)).toBe(2);
  });

  it("scales up with available width without colliding", () => {
    expect(computeXAxisTickCount(280)).toBeLessThan(computeXAxisTickCount(1000));
  });

  it("caps at the configured maximum", () => {
    expect(computeXAxisTickCount(5000, 8)).toBe(8);
  });
});

describe("resolveLabelCollisions", () => {
  it("leaves well-separated labels untouched", () => {
    const resolved = resolveLabelCollisions([{ id: "a", y: 0 }, { id: "b", y: 100 }], 20);
    expect(resolved.get("a")).toBe(0);
    expect(resolved.get("b")).toBe(100);
  });

  it("pushes overlapping labels apart while preserving order", () => {
    const resolved = resolveLabelCollisions([{ id: "a", y: 10 }, { id: "b", y: 15 }], 20);
    expect(resolved.get("a")).toBe(10);
    expect(resolved.get("b")).toBe(30);
  });
});

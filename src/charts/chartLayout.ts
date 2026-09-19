import type { PreparedPoint, PreparedSeries } from "../app/types";

export const CHART_MARGIN = Object.freeze({
  top: 24,
  right: 28,
  bottom: 44,
  left: 56,
});

export interface YAxisScale {
  min: number;
  max: number;
  ticks: readonly number[];
}

/**
 * A point is safe to plot (line vertex, marker, or direct label anchor) only
 * when it has positive population and a real value -- ported from v0's
 * isRenderablePoint. A suppressed comparison's points are excluded by the
 * caller before reaching here (see prepareComparisons's whole-comparison
 * suppression), so `status === "suppressed"` should not occur, but the check
 * is kept as a defense-in-depth guard against ever plotting a suppressed
 * value.
 */
export function isRenderablePoint(point: PreparedPoint): boolean {
  return point.totalPopulation > 0 && point.status !== "suppressed" && point.displayedValue !== null;
}

export function getYearDomain(series: readonly PreparedSeries[]): [number, number] | null {
  const years = series
    .filter((entry) => !entry.hidden)
    .flatMap((entry) => [...entry.actual, ...entry.projected].map((point) => point.year));
  if (years.length === 0) {
    return null;
  }
  return [Math.min(...years), Math.max(...years)];
}

export function getRenderableDisplayValues(series: readonly PreparedSeries[]): number[] {
  return series
    .filter((entry) => !entry.hidden)
    .flatMap((entry) => [...entry.actual, ...entry.projected])
    .filter(isRenderablePoint)
    .map((point) => point.displayedValue as number);
}

function getNiceStep(minimumStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(minimumStep));
  const normalizedStep = minimumStep / magnitude;
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => normalizedStep <= candidate) ?? 10;
  return factor * magnitude;
}

/**
 * Ported from v0's buildYAxisScale/getNiceStep. Never lets the axis minimum
 * go negative (per the PPIC chart guide default of a zero baseline, since
 * every outcome rendered here is a non-negative share or count), and picks
 * the axis minimum as a "nice" step multiple at or below the padded data
 * minimum -- so it lands exactly on zero whenever the data is close enough
 * to zero for that to be the nearest nice value, but not always.
 */
export function computeYAxisScale(minValue: number, maxValue: number, tickCount = 4): YAxisScale {
  if (minValue === maxValue) {
    const step = getNiceStep(Math.max(Math.abs(maxValue) * 0.06, 1));
    const axisMin = Math.max(0, Math.floor(minValue / step) * step);
    return { min: axisMin, max: axisMin + step * (tickCount - 1), ticks: tickList(axisMin, step, tickCount) };
  }

  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.06;
  const targetMin = Math.max(0, minValue - padding);
  const targetMax = maxValue + padding;

  let step = getNiceStep((targetMax - targetMin) / (tickCount - 1));
  let axisMin = Math.max(0, Math.floor(targetMin / step) * step);
  let axisMax = axisMin + step * (tickCount - 1);

  while (axisMax < targetMax) {
    step = getNiceStep(step * 1.001);
    axisMin = Math.max(0, Math.floor(targetMin / step) * step);
    axisMax = axisMin + step * (tickCount - 1);
  }

  return { min: axisMin, max: axisMax, ticks: tickList(axisMin, step, tickCount) };
}

/** Roughly one tick per 70px of available width, so year labels never collide at narrow viewports. */
export function computeXAxisTickCount(innerWidth: number, maxTicks = 8): number {
  return Math.max(2, Math.min(maxTicks, Math.floor(innerWidth / 70)));
}

function tickList(axisMin: number, step: number, tickCount: number): number[] {
  return Array.from({ length: tickCount }, (_, index) => Number((axisMin + step * index).toPrecision(12)));
}

export interface LineSegment {
  from: PreparedPoint;
  to: PreparedPoint;
  /** True when either endpoint is the interpolated 2020 poverty point. */
  interpolatedEdge: boolean;
}

/** Consecutive renderable point pairs; a missing/suppressed point between them breaks the line, matching v0. */
export function buildLineSegments(points: readonly PreparedPoint[]): LineSegment[] {
  const segments: LineSegment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    if (isRenderablePoint(from) && isRenderablePoint(to)) {
      segments.push({ from, to, interpolatedEdge: from.status === "interpolated" || to.status === "interpolated" });
    }
  }
  return segments;
}

export interface CollidableLabel {
  id: string;
  y: number;
}

/**
 * Nudges direct end labels apart along y when they would overlap, keeping
 * their relative order. A simple, testable one-pass stacking resolver:
 * sort by y, then push each label down (or the group up) just enough to
 * keep `minGap` between adjacent centers.
 */
export function resolveLabelCollisions(labels: readonly CollidableLabel[], minGap: number): Map<string, number> {
  const sorted = [...labels].sort((a, b) => a.y - b.y);
  const resolvedY = sorted.map((label) => label.y);

  for (let index = 1; index < resolvedY.length; index += 1) {
    const minAllowed = resolvedY[index - 1]! + minGap;
    if (resolvedY[index]! < minAllowed) {
      resolvedY[index] = minAllowed;
    }
  }

  const result = new Map<string, number>();
  sorted.forEach((label, index) => {
    result.set(label.id, resolvedY[index]!);
  });
  return result;
}

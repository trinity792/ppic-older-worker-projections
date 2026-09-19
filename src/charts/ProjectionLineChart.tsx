import { useMemo, useState } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";

import ChartFrame from "./ChartFrame";
import ChartTooltip from "./ChartTooltip";
import {
  CHART_MARGIN,
  buildLineSegments,
  computeChartLeftMargin,
  computeXAxisTickCount,
  computeYAxisScale,
  getRenderableDisplayValues,
  getYearDomain,
  isRenderablePoint,
} from "./chartLayout";
import { describePoint } from "../data/describePoint";
import { formatPercent } from "../data/formatValue";
import type { PreparedPoint, PreparedSeries, ValueFormat } from "../app/types";

interface ProjectionLineChartProps {
  series: readonly PreparedSeries[];
}

interface HoverState {
  comparisonId: number;
  seriesLabel: string;
  valueFormat: ValueFormat;
  point: PreparedPoint;
  left: number;
  top: number;
  placeAbove: boolean;
}

const Y_TICK_COUNT = 4;

export default function ProjectionLineChart({ series }: ProjectionLineChartProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const visible = series.filter((entry) => !entry.hidden);
  const hiddenCount = series.length - visible.length;
  const yearDomain = useMemo(() => getYearDomain(visible), [visible]);
  const displayValues = useMemo(() => getRenderableDisplayValues(visible), [visible]);

  const description = buildChartDescription(visible, hiddenCount);
  const activeHover =
    hover &&
    visible.some(
      (entry) =>
        entry.comparisonId === hover.comparisonId &&
        entry.valueFormat === hover.valueFormat &&
        [...entry.actual, ...entry.projected].includes(hover.point),
    )
      ? hover
      : null;

  if (visible.length === 0 && hiddenCount > 0) {
    return (
      <ChartFrame description={description}>
        {() => (
          <p className="chart-empty-label">
            All selected comparisons are hidden because total population falls below 20,000 in at least one year in
            the data.
          </p>
        )}
      </ChartFrame>
    );
  }

  if (!yearDomain || displayValues.length === 0) {
    return (
      <ChartFrame description={description}>
        {() => <p className="chart-empty-label">No visible chart values are available for the current comparison selections.</p>}
      </ChartFrame>
    );
  }

  const legend = (
    <div className="legend">
      {visible.map((entry) => (
        <span className="legend-item" key={entry.comparisonId}>
          <span className="legend-swatch" style={{ borderTopColor: entry.color }} />
          <span>{entry.label}</span>
        </span>
      ))}
      <span className="legend-item legend-style-note">
        <span className="legend-style solid-style">Actual</span>
        <span className="legend-style dashed-style">Projected</span>
        {visible.some((entry) => entry.actual.some((point) => point.status === "interpolated")) && (
          <span className="legend-style dotted-style">Interpolated 2020</span>
        )}
      </span>
    </div>
  );

  return (
    <ChartFrame description={description} legend={legend}>
      {({ width, height }) => {
        const [minYear, maxYear] = yearDomain;
        const yAxis = computeYAxisScale(Math.min(...displayValues), Math.max(...displayValues), Y_TICK_COUNT);
        const isPercent = visible[0]?.valueFormat !== "raw";
        const formatYAxisTick = (value: number) =>
          isPercent ? formatPercent(value) : Math.round(value).toLocaleString();
        const longestYAxisLabelLength = Math.max(...yAxis.ticks.map((value) => formatYAxisTick(value).length));
        const leftMargin = computeChartLeftMargin(longestYAxisLabelLength);
        const innerWidth = Math.max(0, width - leftMargin - CHART_MARGIN.right);
        const innerHeight = Math.max(0, height - CHART_MARGIN.top - CHART_MARGIN.bottom);
        if (innerWidth === 0 || innerHeight === 0) {
          return null;
        }

        const xScale = scaleLinear({ domain: [minYear, maxYear], range: [0, innerWidth] });
        const yScale = scaleLinear({ domain: [yAxis.min, yAxis.max], range: [innerHeight, 0] });

        const handlePointerLeave = () => setHover(null);

        return (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={description}
              onPointerLeave={handlePointerLeave}
            >
              <Group left={leftMargin} top={CHART_MARGIN.top}>
                <GridRows scale={yScale} width={innerWidth} numTicks={Y_TICK_COUNT} className="chart-grid-line" />
                <AxisLeft
                  scale={yScale}
                  tickValues={[...yAxis.ticks]}
                  tickFormat={(value) => formatYAxisTick(Number(value))}
                />
                <AxisBottom
                  top={innerHeight}
                  scale={xScale}
                  numTicks={computeXAxisTickCount(innerWidth)}
                  tickFormat={(value) => String(Math.round(Number(value)))}
                />

                {visible.map((entry) => (
                  <g key={`${entry.comparisonId}-actual`}>
                    {buildLineSegments(entry.actual).map((segment, index) => (
                      <path
                        key={index}
                        className="series-line"
                        d={`M ${xScale(segment.from.year)} ${yScale(segment.from.displayedValue as number)} L ${xScale(segment.to.year)} ${yScale(segment.to.displayedValue as number)}`}
                        stroke={entry.color}
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray={segment.interpolatedEdge ? "1 6" : undefined}
                      />
                    ))}
                    {entry.actual.filter(isRenderablePoint).map((point) => (
                      <circle
                        key={point.year}
                        className="series-hit-target"
                        cx={xScale(point.year)}
                        cy={yScale(point.displayedValue as number)}
                        r={9}
                        fill="transparent"
                        stroke="transparent"
                        pointerEvents="all"
                        onPointerEnter={() =>
                          setHover({
                            comparisonId: entry.comparisonId,
                            seriesLabel: entry.label,
                            valueFormat: entry.valueFormat,
                            point,
                            left: leftMargin + xScale(point.year),
                            top: CHART_MARGIN.top + yScale(point.displayedValue as number),
                            placeAbove: yScale(point.displayedValue as number) > innerHeight / 2,
                          })
                        }
                      />
                    ))}
                  </g>
                ))}

                {visible.map((entry) => (
                  <g key={`${entry.comparisonId}-projected`}>
                    {buildLineSegments(entry.projected).map((segment, index) => (
                      <path
                        key={index}
                        className="series-line"
                        d={`M ${xScale(segment.from.year)} ${yScale(segment.from.displayedValue as number)} L ${xScale(segment.to.year)} ${yScale(segment.to.displayedValue as number)}`}
                        stroke={entry.color}
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="8 6"
                      />
                    ))}
                    {entry.projected.filter(isRenderablePoint).map((point) => (
                      <circle
                        key={point.year}
                        className="series-hit-target"
                        cx={xScale(point.year)}
                        cy={yScale(point.displayedValue as number)}
                        r={9}
                        fill="transparent"
                        stroke="transparent"
                        pointerEvents="all"
                        onPointerEnter={() =>
                          setHover({
                            comparisonId: entry.comparisonId,
                            seriesLabel: entry.label,
                            valueFormat: entry.valueFormat,
                            point,
                            left: leftMargin + xScale(point.year),
                            top: CHART_MARGIN.top + yScale(point.displayedValue as number),
                            placeAbove: yScale(point.displayedValue as number) > innerHeight / 2,
                          })
                        }
                      />
                    ))}
                  </g>
                ))}

              </Group>
            </svg>
            {activeHover && (
              <ChartTooltip
                text={buildTooltipText(activeHover)}
                left={clampTooltipLeft(activeHover.left, width)}
                top={activeHover.top}
                placeAbove={activeHover.placeAbove}
              />
            )}
          </>
        );
      }}
    </ChartFrame>
  );
}

function clampTooltipLeft(anchor: number, chartWidth: number): number {
  const inset = 12;
  const maximumTooltipWidth = Math.min(288, Math.max(0, chartWidth - inset * 2));
  return Math.max(inset, Math.min(anchor - maximumTooltipWidth / 2, chartWidth - maximumTooltipWidth - inset));
}

function buildTooltipText(hover: HoverState): string {
  const description = describePoint(hover.point, hover.valueFormat);
  const statusLabel = hover.point.predictionStatus === "TRUE" ? "Projected" : "Actual";
  const parts = [hover.seriesLabel, `${hover.point.year} (${statusLabel})`, description.primaryText];
  if (description.populationText) {
    parts.push(description.populationText);
  }
  if (description.interpolated) {
    parts.push("Interpolated");
  }
  return parts.join(" — ");
}

function buildChartDescription(visible: readonly PreparedSeries[], hiddenCount: number): string {
  if (visible.length === 0) {
    return "No comparisons are currently visible in this chart.";
  }
  const labels = visible.map((entry) => entry.label).join("; ");
  const hiddenNote = hiddenCount > 0 ? ` ${hiddenCount} comparison${hiddenCount === 1 ? "" : "s"} hidden due to low population.` : "";
  return `Line chart comparing ${labels}. Solid lines are actual data, dashed lines are projections, and dotted segments are interpolated. Exact values for every point are available in the data table.${hiddenNote}`;
}

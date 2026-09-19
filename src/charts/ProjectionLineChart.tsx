import { useMemo, useState } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";

import ChartFrame from "./ChartFrame";
import ChartTooltip from "./ChartTooltip";
import DirectLabels from "./DirectLabels";
import {
  CHART_MARGIN,
  buildLineSegments,
  computeXAxisTickCount,
  computeYAxisScale,
  getRenderableDisplayValues,
  getYearDomain,
  isRenderablePoint,
  resolveLabelCollisions,
} from "./chartLayout";
import { describePoint } from "../data/describePoint";
import { formatPercent } from "../data/formatValue";
import type { PreparedPoint, PreparedSeries, ValueFormat } from "../app/types";

interface ProjectionLineChartProps {
  series: readonly PreparedSeries[];
}

interface HoverState {
  seriesLabel: string;
  valueFormat: ValueFormat;
  point: PreparedPoint;
  left: number;
  top: number;
}

const Y_TICK_COUNT = 4;
const LABEL_MIN_GAP = 14;

export default function ProjectionLineChart({ series }: ProjectionLineChartProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const visible = series.filter((entry) => !entry.hidden);
  const hiddenCount = series.length - visible.length;
  const yearDomain = useMemo(() => getYearDomain(visible), [visible]);
  const displayValues = useMemo(() => getRenderableDisplayValues(visible), [visible]);

  const description = buildChartDescription(visible, hiddenCount);

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

  // Direct labels carry only the short outcome name; the legend below the
  // chart carries the full comparison label (outcome + denominator +
  // filters), which is usually far too long to fit at a line's end.
  const directLabelTextFor = (entry: PreparedSeries): string => entry.resolvedOutcomeLabel.split(":")[0] ?? entry.resolvedOutcomeLabel;
  const longestLabelLength = Math.max(0, ...visible.map((entry) => directLabelTextFor(entry).length));
  const dynamicRightMargin = Math.min(180, CHART_MARGIN.right + Math.ceil(longestLabelLength * 6.2) + 12);

  const legend = (
    <div className="legend">
      {visible.map((entry) => (
        <span className="legend-item" key={entry.comparisonId}>
          <span className="legend-swatch" style={{ background: entry.color }} />
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
        const innerWidth = Math.max(0, width - CHART_MARGIN.left - dynamicRightMargin);
        const innerHeight = Math.max(0, height - CHART_MARGIN.top - CHART_MARGIN.bottom);
        if (innerWidth === 0 || innerHeight === 0) {
          return null;
        }

        const [minYear, maxYear] = yearDomain;
        const yAxis = computeYAxisScale(Math.min(...displayValues), Math.max(...displayValues), Y_TICK_COUNT);

        const xScale = scaleLinear({ domain: [minYear, maxYear], range: [0, innerWidth] });
        const yScale = scaleLinear({ domain: [yAxis.min, yAxis.max], range: [innerHeight, 0] });
        const isPercent = visible[0]?.valueFormat !== "raw";

        const rawLabels = visible.map((entry) => {
          const lastRenderable = [...entry.actual, ...entry.projected]
            .filter(isRenderablePoint)
            .sort((a, b) => a.year - b.year)
            .at(-1);
          return lastRenderable
            ? { id: String(entry.comparisonId), y: yScale(lastRenderable.displayedValue as number), x: xScale(lastRenderable.year), entry }
            : null;
        }).filter((label): label is { id: string; y: number; x: number; entry: PreparedSeries } => label !== null);

        const resolvedY = resolveLabelCollisions(rawLabels, LABEL_MIN_GAP);
        const directLabels = rawLabels.map((label) => ({
          id: label.id,
          text: directLabelTextFor(label.entry),
          x: label.x + 8,
          y: resolvedY.get(label.id) ?? label.y,
        }));

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
              <Group left={CHART_MARGIN.left} top={CHART_MARGIN.top}>
                <GridRows scale={yScale} width={innerWidth} numTicks={Y_TICK_COUNT} className="chart-grid-line" />
                <AxisLeft
                  scale={yScale}
                  numTicks={Y_TICK_COUNT}
                  tickFormat={(value) => (isPercent ? formatPercent(Number(value)) : String(Number(value).toLocaleString()))}
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
                        cx={xScale(point.year)}
                        cy={yScale(point.displayedValue as number)}
                        r={4}
                        fill="#fff"
                        stroke={entry.color}
                        strokeWidth={2}
                        onPointerEnter={() =>
                          setHover({
                            seriesLabel: entry.label,
                            valueFormat: entry.valueFormat,
                            point,
                            left: CHART_MARGIN.left + xScale(point.year) + 12,
                            top: CHART_MARGIN.top + yScale(point.displayedValue as number) + 12,
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
                        cx={xScale(point.year)}
                        cy={yScale(point.displayedValue as number)}
                        r={4}
                        fill="#fff"
                        stroke={entry.color}
                        strokeWidth={2}
                        onPointerEnter={() =>
                          setHover({
                            seriesLabel: entry.label,
                            valueFormat: entry.valueFormat,
                            point,
                            left: CHART_MARGIN.left + xScale(point.year) + 12,
                            top: CHART_MARGIN.top + yScale(point.displayedValue as number) + 12,
                          })
                        }
                      />
                    ))}
                  </g>
                ))}

                <DirectLabels labels={directLabels} />
              </Group>
            </svg>
            {hover && <ChartTooltip text={buildTooltipText(hover)} left={hover.left} top={hover.top} />}
          </>
        );
      }}
    </ChartFrame>
  );
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

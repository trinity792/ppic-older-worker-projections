export interface ChartTooltipProps {
  text: string;
  left: number;
  top: number;
}

export default function ChartTooltip({ text, left, top }: ChartTooltipProps) {
  return (
    <div className="chart-tooltip" role="tooltip" style={{ left, top }}>
      {text}
    </div>
  );
}

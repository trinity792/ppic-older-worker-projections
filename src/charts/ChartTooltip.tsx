export interface ChartTooltipProps {
  text: string;
  left: number;
  top: number;
  placeAbove: boolean;
}

export default function ChartTooltip({ text, left, top, placeAbove }: ChartTooltipProps) {
  return (
    <div className="chart-tooltip" role="tooltip" data-place-above={placeAbove} style={{ left, top }}>
      {text}
    </div>
  );
}

export interface DirectLabel {
  id: string;
  text: string;
  x: number;
  y: number;
}

/**
 * Label text always uses the CSS text color (see .chart-direct-label), not
 * the series color: several series colors don't clear 4.5:1 against white,
 * which is fine for a line/dot (graphical, 3:1) but not for text. The
 * adjacent line and legend swatch still carry the color identity.
 */
export default function DirectLabels({ labels }: { labels: readonly DirectLabel[] }) {
  return labels.map((label) => (
    <text key={label.id} x={label.x} y={label.y} className="chart-direct-label">
      {label.text}
    </text>
  ));
}

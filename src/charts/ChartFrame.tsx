import type { ReactNode } from "react";
import { ParentSize } from "@visx/responsive";

interface ChartFrameProps {
  children: (bounds: { width: number; height: number }) => ReactNode;
  description: string;
  legend?: ReactNode;
}

export default function ChartFrame({ children, description, legend }: ChartFrameProps) {
  return (
    <figure className="chart-frame" aria-labelledby="chart-caption">
      <div className="chart-canvas">
        <ParentSize>{({ width, height }) => children({ width, height })}</ParentSize>
      </div>
      {legend}
      <figcaption id="chart-caption" className="scaffold-note">
        {description}
      </figcaption>
    </figure>
  );
}

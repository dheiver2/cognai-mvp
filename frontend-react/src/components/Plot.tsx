import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { useMemo } from "react";
import type { Layout, Config } from "plotly.js";

type Data = any;
const PlotlyComponent = createPlotlyComponent(Plotly as any);

export const baseLayout: Partial<Layout> = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "Inter, sans-serif", color: "#cfcfcf", size: 11 },
  margin: { l: 54, r: 20, t: 10, b: 42 },
  xaxis: { gridcolor: "#1c1c1c", zerolinecolor: "#262626", linecolor: "#262626" },
  yaxis: { gridcolor: "#1c1c1c", zerolinecolor: "#262626", linecolor: "#262626" },
  hoverlabel: { bgcolor: "#0c0c0c", bordercolor: "#262626", font: { color: "#f2f2f2", family: "JetBrains Mono, monospace" } },
  legend: { font: { color: "#cfcfcf" }, bgcolor: "rgba(0,0,0,0)" },
};

export const baseConfig: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
  displayModeBar: "hover",
};

interface Props {
  data: Data[];
  layout?: Partial<Layout>;
  className?: string;
  height?: number;
  onClick?: (ev: any) => void;
}

export function Plot({ data, layout = {}, className, height = 260, onClick }: Props) {
  const merged = useMemo<Partial<Layout>>(() => ({
    ...baseLayout,
    ...layout,
    xaxis: { ...baseLayout.xaxis, ...(layout.xaxis ?? {}) },
    yaxis: { ...baseLayout.yaxis, ...(layout.yaxis ?? {}) },
    height,
    autosize: true,
  }), [layout, height]);

  return (
    <PlotlyComponent
      data={data}
      layout={merged}
      config={baseConfig}
      className={className}
      style={{ width: "100%", height }}
      useResizeHandler
      onClick={onClick}
    />
  );
}

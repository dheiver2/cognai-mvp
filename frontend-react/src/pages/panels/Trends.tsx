import { useAnalysis } from "@/hooks/useAnalysis";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Plot } from "@/components/Plot";

export default function Trends() {
  const { data: d } = useAnalysis();
  if (!d) return null;

  const hr = d.hr_trend;
  const xh = hr.t_min.map(t => t / 60);

  const st = d.st_trend;
  const xhst = st.t_min.map(t => t / 60);

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <CardHeader>Trend de Frequência Cardíaca (min / média / máx por minuto)</CardHeader>
        <CardContent>
          <Plot
            height={400}
            data={[
              { x: xh.concat([...xh].reverse()),
                y: (hr.fc_max as any[]).concat([...(hr.fc_min as any[])].reverse()),
                fill: "toself", fillcolor: "rgba(255,59,74,0.10)",
                line: { color: "transparent" }, hoverinfo: "skip", name: "min–max", type: "scatter" },
              { x: xh, y: hr.fc_med, type: "scattergl", mode: "lines",
                line: { color: "#ff3b4a", width: 2 }, name: "FC média",
                hovertemplate: "%{x:.2f} h · %{y:.0f} bpm<extra></extra>" },
            ]}
            layout={{
              xaxis: { title: { text: "tempo (h)" } },
              yaxis: { title: { text: "FC (bpm)" }, range: [30, 180] },
              legend: { orientation: "h", y: 1.1 },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Trend do Segmento ST</CardHeader>
        <CardContent>
          <Plot
            height={300}
            data={[
              { x: xhst, y: st.st_mv, type: "scattergl", mode: "lines",
                line: { color: "#10b981", width: 2 }, name: "ΔST mediano",
                hovertemplate: "%{x:.2f} h · %{y:.3f} mV<extra></extra>" },
              { x: [xhst[0] ?? 0, xhst[xhst.length - 1] ?? 24], y: [0.1, 0.1],
                mode: "lines", line: { color: "#f9a825", dash: "dot", width: 1 },
                name: "+1 mm", hoverinfo: "skip", type: "scatter" },
              { x: [xhst[0] ?? 0, xhst[xhst.length - 1] ?? 24], y: [-0.1, -0.1],
                mode: "lines", line: { color: "#f9a825", dash: "dot", width: 1 },
                name: "−1 mm", hoverinfo: "skip", type: "scatter" },
            ]}
            layout={{
              xaxis: { title: { text: "tempo (h)" } },
              yaxis: { title: { text: "ΔST (mV)" }, range: [-0.4, 0.4] },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

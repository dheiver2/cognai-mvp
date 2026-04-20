import { useAnalysis } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Plot } from "@/components/Plot";

export default function Disclosure() {
  const { data: d } = useAnalysis();
  const navigate = useNavigate();
  const { setEcgStart } = useAppStore();
  if (!d) return null;
  const fd = d.full_disclosure;
  const th = fd.t_s.map(s => s / 3600);

  return (
    <Card className="animate-fade-in">
      <CardHeader>Full Disclosure — envelope min/max do exame</CardHeader>
      <CardContent>
        <Plot
          height={460}
          data={[
            { x: th, y: fd.ymax, mode: "lines", type: "scatter",
              line: { color: "#ff3b4a", width: 0.8 }, name: "máx",
              hovertemplate: "%{x:.2f} h · máx %{y:.2f} mV<extra></extra>" },
            { x: th, y: fd.ymin, mode: "lines", type: "scatter",
              line: { color: "#4db8ff", width: 0.8 }, name: "mín",
              fill: "tonexty", fillcolor: "rgba(255,59,74,0.08)",
              hovertemplate: "%{x:.2f} h · mín %{y:.2f} mV<extra></extra>" },
          ]}
          layout={{
            xaxis: { title: { text: "tempo (h)" } },
            yaxis: { title: { text: "amplitude (mV)" } },
            legend: { orientation: "h", y: 1.12 },
          }}
          onClick={(ev: any) => {
            if (!ev.points?.length) return;
            const t_h = ev.points[0].x as number;
            setEcgStart(Math.max(0, Math.floor(t_h * 3600)));
            navigate("/app/ecg");
          }}
        />
        <p className="text-[11px] text-ink-700 mt-2 italic">Clique no gráfico para abrir o trecho correspondente no ECG.</p>
      </CardContent>
    </Card>
  );
}

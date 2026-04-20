import { useAnalysis } from "@/hooks/useAnalysis";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Plot } from "@/components/Plot";

export default function Histograms() {
  const { data: d } = useAnalysis();
  if (!d) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in">
      <Card>
        <CardHeader>Distribuição de Frequência Cardíaca</CardHeader>
        <CardContent>
          <Plot
            height={380}
            data={[{
              x: d.hr_hist.bin_edges_bpm.slice(0, -1), y: d.hr_hist.counts,
              type: "bar", marker: { color: "#ff3b4a" },
              hovertemplate: "%{x:.0f} bpm · %{y}<extra></extra>",
            }]}
            layout={{
              xaxis: { title: { text: "bpm" } },
              yaxis: { title: { text: "# batimentos" } },
              bargap: 0.02,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>Distribuição de RR</CardHeader>
        <CardContent>
          <Plot
            height={380}
            data={[{
              x: d.rr_hist.bin_edges_ms.slice(0, -1), y: d.rr_hist.counts,
              type: "bar", marker: { color: "#4db8ff" },
              hovertemplate: "%{x:.0f} ms · %{y}<extra></extra>",
            }]}
            layout={{
              xaxis: { title: { text: "RR (ms)" } },
              yaxis: { title: { text: "# intervalos" } },
              bargap: 0.02,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { useAnalysis } from "@/hooks/useAnalysis";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Plot } from "@/components/Plot";
import { Badge } from "@/components/ui/Badge";

export default function Morphology() {
  const { data: d } = useAnalysis();
  if (!d) return null;
  const m = d.morfologia;

  if (!m.disponivel) {
    return (
      <Card>
        <CardHeader>Morfologia / Beat Templates</CardHeader>
        <CardContent>
          <p className="text-sm text-ink-800">
            Análise de morfologia não disponível. {m.motivo}
          </p>
        </CardContent>
      </Card>
    );
  }

  const colors = ["#4db8ff", "#10b981", "#c084fc", "#f9a825", "#ff3b4a", "#ffffff"];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="BATIMENTOS" value={m.n_total.toLocaleString("pt-BR")} unit="total classificados" color="cyan" />
        <StatCard label="NORMAIS" value={m.n_normal.toLocaleString("pt-BR")} unit={`${((m.n_normal/m.n_total)*100).toFixed(1)}%`} color="green" />
        <StatCard label="PVCs" value={m.n_pvc.toLocaleString("pt-BR")} unit={`${m.pct_pvc.toFixed(2)}%`} color="brand" />
        <StatCard label="TEMPLATES" value={m.n_clusters.toString()} unit="clusters de morfologia" color="violet" />
      </div>

      {/* Templates grid */}
      <Card>
        <CardHeader>Templates de morfologia (média de cada cluster)</CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {m.templates.map((tpl, i) => {
              if (!tpl.length) return null;
              const isPvc = i === m.pvc_cluster;
              const t = tpl.map((_, j) => (j - tpl.length / 2) * (1000 / 200 / (tpl.length / 200 * 100)));
              const xs = tpl.map((_, j) => j / tpl.length * 600 - 300);  // approx ms
              return (
                <div key={i} className={`rounded-xl border p-3 ${isPvc ? "border-brand/50 bg-brand/5" : "border-ink-400/60 bg-ink-200/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
                      <span className="text-sm font-semibold text-ink-950">Cluster {i + 1}</span>
                    </div>
                    {isPvc && <Badge variant="brand">PVC</Badge>}
                  </div>
                  <Plot
                    height={140}
                    data={[{
                      x: xs, y: tpl, type: "scatter", mode: "lines",
                      line: { color: colors[i % colors.length], width: 2 },
                      hovertemplate: "%{x:.0f} ms · %{y:.3f} mV<extra></extra>",
                    }]}
                    layout={{
                      margin: { l: 35, r: 10, t: 4, b: 28 },
                      xaxis: { title: { text: "ms", font: { color: "#7a7a7a", size: 9 } }, tickfont: { color: "#7a7a7a", size: 8 } },
                      yaxis: { tickfont: { color: "#7a7a7a", size: 8 }, zeroline: true, zerolinecolor: "#2a2a2a" },
                      showlegend: false,
                    }}
                  />
                  <div className="text-[11px] text-ink-700 mt-2 flex justify-between">
                    <span>{m.counts[i].toLocaleString("pt-BR")} batimentos</span>
                    <span className="text-ink-800">{((m.counts[i] / m.n_total) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PVCs por hora */}
      {m.pvc_hourly.length > 0 && (
        <Card>
          <CardHeader>Distribuição de PVCs por hora</CardHeader>
          <CardContent>
            <Plot
              height={260}
              data={[{
                x: m.pvc_hourly.map((_, i) => i),
                y: m.pvc_hourly,
                type: "bar",
                marker: { color: "#ff3b4a" },
                hovertemplate: "hora %{x} · %{y} PVCs<extra></extra>",
              }]}
              layout={{
                xaxis: { title: { text: "hora da gravação" }, dtick: 1 },
                yaxis: { title: { text: "PVCs" } },
                bargap: 0.15,
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: "cyan"|"green"|"brand"|"violet" }) {
  const barColors: Record<string, string> = {
    cyan: "bg-sig-cyan", green: "bg-sig-green", brand: "bg-brand", violet: "bg-sig-violet",
  };
  return (
    <div className="relative p-4 rounded-xl bg-ink-100 border border-ink-400/60 overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${barColors[color]}`} />
      <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-ink-700">{label}</div>
      <div className="text-3xl font-bold mt-1 leading-none tracking-tight">{value}</div>
      <div className="text-[10.5px] text-ink-700 mt-1">{unit}</div>
    </div>
  );
}

import { useAnalysis } from "@/hooks/useAnalysis";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Plot } from "@/components/Plot";
import { fmtNum } from "@/lib/utils";

export default function Qt() {
  const { data: d } = useAnalysis();
  if (!d) return null;
  const qt = d.qt;

  if (!qt.disponivel) {
    return (
      <Card>
        <CardHeader>Análise QT / QTc</CardHeader>
        <CardContent>
          <p className="text-sm text-ink-800">Indisponível: {qt.motivo ?? "—"}</p>
        </CardContent>
      </Card>
    );
  }

  const cls = qt.classificacao ?? "";
  const clsColor =
    cls.includes("alto risco") ? "bg-brand" :
    cls.includes("prolongado") ? "bg-sig-amber" :
    cls.includes("limítrofe") ? "bg-sig-amber" : "bg-sig-green";

  const trend = (qt.qtc_trend_h ?? []).map((v, i) => ({ h: i, v }));
  const xs = trend.map(p => p.h);
  const ys = trend.map(p => p.v);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Classification banner */}
      <div className="p-5 rounded-xl bg-ink-100 border border-ink-400/60">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-700">Classificação</div>
        <div className="flex items-center gap-3 mt-2">
          <span className={`w-3 h-3 rounded-full ${clsColor}`} />
          <span className="text-2xl font-semibold text-ink-950">{cls}</span>
        </div>
        <p className="text-[11px] text-ink-700 mt-2">
          Baseado na mediana do QTc (Bazett) em {qt.n_valid} batimentos amostrados.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Metric label="QT mediano" value={fmtNum(qt.qt_ms?.mediana, 0)} unit="ms" />
        <Metric label="QTc Bazett" value={fmtNum(qt.qtc_bazett_ms?.mediana, 0)} unit="ms" strong />
        <Metric label="QTc Fridericia" value={fmtNum(qt.qtc_fridericia_ms?.mediana, 0)} unit="ms" />
        <Metric label="QTc (p5–p95)" value={`${fmtNum(qt.qtc_bazett_ms?.min, 0)}–${fmtNum(qt.qtc_bazett_ms?.max, 0)}`} unit="ms" />
        <Metric label="Desvio-padrão" value={fmtNum(qt.qtc_bazett_ms?.std, 0)} unit="ms" />
        <Metric label="Batimentos válidos" value={qt.n_valid?.toLocaleString("pt-BR") ?? "—"} unit="medidos" />
      </div>

      {/* Trend */}
      <Card>
        <CardHeader>QTc (Bazett) — tendência por hora</CardHeader>
        <CardContent>
          <Plot
            height={340}
            data={[
              { x: xs, y: ys, type: "scatter", mode: "lines+markers",
                line: { color: "#10b981", width: 2 }, marker: { size: 7 },
                name: "QTc mediano", hovertemplate: "hora %{x} · %{y:.0f} ms<extra></extra>" },
              { x: [0, (xs.at(-1) ?? 24)], y: [440, 440], mode: "lines", type: "scatter",
                line: { color: "#f9a825", dash: "dot", width: 1 }, name: "440 ms (limítrofe)", hoverinfo: "skip" },
              { x: [0, (xs.at(-1) ?? 24)], y: [460, 460], mode: "lines", type: "scatter",
                line: { color: "#ff9079", dash: "dot", width: 1 }, name: "460 ms (prolongado)", hoverinfo: "skip" },
              { x: [0, (xs.at(-1) ?? 24)], y: [500, 500], mode: "lines", type: "scatter",
                line: { color: "#ff3b4a", dash: "dot", width: 1 }, name: "500 ms (alto risco)", hoverinfo: "skip" },
            ]}
            layout={{
              xaxis: { title: { text: "hora da gravação" }, dtick: 1 },
              yaxis: { title: { text: "QTc Bazett (ms)" }, range: [300, 560] },
              legend: { orientation: "h", y: 1.12 },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, unit, strong = false }: { label: string; value: any; unit: string; strong?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${strong ? "bg-ink-200 border-brand/40" : "bg-ink-100 border-ink-400/60"}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-700">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${strong ? "text-brand" : "text-ink-950"}`}>{value}</div>
      <div className="text-[10.5px] text-ink-700">{unit}</div>
    </div>
  );
}

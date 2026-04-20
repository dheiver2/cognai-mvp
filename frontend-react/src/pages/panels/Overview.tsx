import { useAnalysis } from "@/hooks/useAnalysis";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Plot } from "@/components/Plot";
import { fmtInt, fmtNum } from "@/lib/utils";

export default function Overview() {
  const { data: d } = useAnalysis();
  if (!d) return null;

  const fc = d.fc;
  const td = d.hrv.tempo;
  const a = d.arritmias;
  const totalEv = a.pausas.length + a.extrassistoles.length + a.taquicardia.length +
                  a.taquicardia_sustentada.length + a.bradicardia.length + a.suspeita_fa.length;

  const af = a.af_burden;
  const qt = d.qt;
  const morph = d.morfologia;

  const cards = [
    { label: "FC MÉDIA", value: fmtInt(fc.media_bpm), unit: "bpm",
      foot: <><span className="text-ink-950 font-semibold">{fmtInt(fc.min_bpm)}</span> min / <span className="text-ink-950 font-semibold">{fmtInt(fc.max_bpm)}</span> max</>,
      barClass: "bg-brand" },
    { label: "BATIMENTOS", value: d.qrs.n_batimentos.toLocaleString("pt-BR"), unit: "total",
      foot: <><span className="text-ink-950 font-semibold">{morph?.disponivel ? morph.n_pvc.toLocaleString("pt-BR") : "—"}</span> PVCs ({fmtNum(morph?.pct_pvc, 2)}%)</>,
      barClass: "bg-sig-cyan" },
    { label: "SDNN", value: fmtNum(td.sdnn, 0), unit: "ms",
      foot: <>RMSSD <span className="text-ink-950 font-semibold">{fmtNum(td.rmssd, 0)}</span> / pNN50 <span className="text-ink-950 font-semibold">{fmtNum(td.pnn50, 1)}</span>%</>,
      barClass: "bg-sig-violet" },
    { label: "AFib BURDEN", value: fmtNum(af?.burden_pct, 1) + "%", unit: `${af?.episodes_count ?? 0} episódios`,
      foot: <>Total em FA: <span className="text-ink-950 font-semibold">{fmtNum((af?.total_af_s ?? 0)/60, 1)}</span> min · máx <span className="text-ink-950 font-semibold">{fmtNum((af?.longest_s ?? 0)/60, 1)}</span> min</>,
      barClass: "bg-sig-amber" },
    { label: "QTc (BAZETT)", value: qt?.disponivel ? fmtInt(qt.qtc_bazett_ms?.mediana) : "—", unit: "ms (mediano)",
      foot: <>{qt?.disponivel ? qt.classificacao : (qt?.motivo ?? "indisponível")}</>,
      barClass: "bg-sig-green" },
    { label: "SEGMENTO ST", value: d.st.classificacao, unit: "classificação",
      foot: <>Δmáx +<span className="text-ink-950 font-semibold">{fmtNum(d.st.st_max_supra_mv, 2)}</span> / −<span className="text-ink-950 font-semibold">{fmtNum(Math.abs(d.st.st_max_infra_mv ?? 0), 2)}</span> mV</>,
      barClass: "bg-sig-green" },
  ];

  // HR trend
  const hr = d.hr_trend;
  const xh = hr.t_min.map(t => t/60);
  const hrTrendData: any[] = [];
  if (hr.t_min.length) {
    hrTrendData.push({
      x: xh.concat([...xh].reverse()),
      y: (hr.fc_max as any[]).concat([...(hr.fc_min as any[])].reverse()),
      fill: "toself", fillcolor: "rgba(255,59,74,0.12)",
      line: { color: "transparent" }, hoverinfo: "skip", name: "faixa min–max", type: "scatter",
    });
    hrTrendData.push({
      x: xh, y: hr.fc_med, type: "scattergl", mode: "lines",
      line: { color: "#ff3b4a", width: 2 }, name: "FC média",
      hovertemplate: "%{x:.2f} h · %{y:.0f} bpm<extra></extra>",
    });
  }

  // Hourly
  const h = d.resumo_horario;
  const hourlyData: any[] = h.length ? [
    { x: h.map(e => e.hora), y: h.map(e => e.fc_min),
      type: "bar", marker: { color: "#4db8ff" }, opacity: 0.45, name: "FC mín" },
    { x: h.map(e => e.hora), y: h.map(e => e.fc_max),
      type: "bar", marker: { color: "#ff3b4a" }, opacity: 0.45, name: "FC máx" },
    { x: h.map(e => e.hora), y: h.map(e => e.fc_media),
      type: "scatter", mode: "lines+markers", name: "FC média",
      line: { color: "#10b981", width: 3 }, marker: { size: 7 } },
  ] : [];

  // Tachogram
  const tachoData = [{
    x: d.tacograma.t.map(t => t/60), y: d.tacograma.rr_ms, type: "scattergl",
    mode: "markers", marker: { size: 3, color: "#4db8ff", opacity: 0.55 },
    name: "RR", hovertemplate: "t=%{x:.1f} min · RR=%{y:.0f} ms<extra></extra>",
  }];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cards row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="relative p-4 rounded-xl bg-ink-100 border border-ink-400/60 hover:border-ink-600/60 transition-colors overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${c.barClass}`} />
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-ink-700">{c.label}</div>
            <div className="text-3xl font-bold mt-1 leading-none tracking-tight">{c.value}</div>
            <div className="text-[10.5px] text-ink-700 mt-1">{c.unit}</div>
            <div className="text-[11px] text-ink-800 mt-3 pt-2 border-t border-ink-400/50">{c.foot}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>Tendência de Frequência Cardíaca (24 h)</CardHeader>
          <CardContent>
            <Plot
              data={hrTrendData}
              height={260}
              layout={{
                xaxis: { title: { text: "tempo (h)" } },
                yaxis: { title: { text: "FC (bpm)" }, range: [30, 180] },
                showlegend: false,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Tacograma (RR)</CardHeader>
          <CardContent>
            <Plot
              data={tachoData}
              height={260}
              layout={{
                xaxis: { title: { text: "min" } },
                yaxis: { title: { text: "RR (ms)" }, range: [300, 1600] },
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>Resumo horário</CardHeader>
        <CardContent>
          <Plot
            data={hourlyData}
            height={280}
            layout={{
              barmode: "overlay",
              xaxis: { title: { text: "hora" }, dtick: 1 },
              yaxis: { title: { text: "FC (bpm)" } },
              legend: { orientation: "h", y: 1.15 },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

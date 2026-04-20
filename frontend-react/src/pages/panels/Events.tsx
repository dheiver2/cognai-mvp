import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Plot } from "@/components/Plot";
import { api } from "@/lib/api";
import { fmtTime } from "@/lib/utils";
import { ArrowRight, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";

function EventStrip({ event }: { event: any }) {
  const { currentFile, channel } = useAppStore();
  const windowS = Math.max(8, Math.min(20, (event.fim_s - event.inicio_s) + 4));
  const startS = Math.max(0, event.inicio_s - 2);
  const q = useQuery({
    enabled: !!currentFile,
    queryKey: ["signal", currentFile, channel, startS, windowS],
    queryFn: () => api.signal(currentFile!, startS, windowS, channel),
    staleTime: 5 * 60_000,
  });

  if (q.isLoading) return <div className="p-4 text-xs text-ink-700">Carregando ECG do evento...</div>;
  if (!q.data) return <div className="p-4 text-xs text-brand">Falha ao carregar o trecho.</div>;

  const y = q.data.y;
  const sorted = [...y].sort((a, b) => a - b);
  const med = sorted.length ? sorted[sorted.length >> 1] : 0;
  const yy = y.map(v => v - med);
  const absMax = Math.max(1.5, 1.2 * Math.max(...yy.map(Math.abs), 0));

  return (
    <div className="ecg-grid-bg px-2 py-3">
      <div className="flex items-center justify-between px-3 mb-1">
        <span className="text-[11px] text-ink-700 font-mono">
          {fmtTime(event.inicio_s)} — canal {q.data.canal}
        </span>
        <span className="text-[11px] text-ink-800">
          janela {windowS.toFixed(1)} s · 25 mm/s · 10 mm/mV
        </span>
      </div>
      <Plot
        height={180}
        data={[
          { x: q.data.t, y: yy, type: "scattergl", mode: "lines",
            line: { color: "#ff3b4a", width: 1.4 }, hovertemplate: "%{x:.3f}s · %{y:.3f}mV<extra></extra>" },
          // Marcador do início do evento
          { x: [event.inicio_s, event.inicio_s], y: [-absMax, absMax], mode: "lines", type: "scatter",
            line: { color: "#ffb74d", dash: "dash", width: 1.5 }, name: "início", hoverinfo: "skip" },
          { x: [event.fim_s, event.fim_s], y: [-absMax, absMax], mode: "lines", type: "scatter",
            line: { color: "#ffb74d", dash: "dash", width: 1.5 }, name: "fim", hoverinfo: "skip" },
        ]}
        layout={{
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          margin: { l: 40, r: 12, t: 8, b: 32 },
          xaxis: { range: [startS, startS + windowS], dtick: 0.2,
                   gridcolor: "rgba(255,59,74,.18)", linecolor: "#262626",
                   minor: { dtick: 0.04, gridcolor: "rgba(255,59,74,.06)", showgrid: true },
                   tickfont: { color: "#7a7a7a", size: 9 } },
          yaxis: { range: [-absMax, absMax], dtick: 0.5,
                   gridcolor: "rgba(255,59,74,.18)", linecolor: "#262626",
                   minor: { dtick: 0.1, gridcolor: "rgba(255,59,74,.06)", showgrid: true },
                   tickfont: { color: "#7a7a7a", size: 9 },
                   zeroline: true, zerolinecolor: "rgba(255,59,74,.3)" },
          showlegend: false,
        } as any}
      />
    </div>
  );
}

const FILTERS = [
  { key: "pausas",                  label: "Pausas",                variant: "amber"  as const },
  { key: "extrassistoles",          label: "Extrassístoles",        variant: "cyan"   as const },
  { key: "taquicardia",             label: "Taquicardia",           variant: "brand"  as const },
  { key: "taquicardia_sustentada",  label: "Taquicardia sust.",     variant: "brand"  as const },
  { key: "bradicardia",             label: "Bradicardia",           variant: "violet" as const },
  { key: "suspeita_fa",             label: "Suspeita de FA",        variant: "green"  as const },
];

export default function Events() {
  const { data: d } = useAnalysis();
  const [enabled, setEnabled] = useState<Set<string>>(new Set(FILTERS.map(f => f.key)));
  const [expanded, setExpanded] = useState<number | null>(null);
  const navigate = useNavigate();
  const { setEcgStart } = useAppStore();

  const all = useMemo(() => {
    if (!d) return [];
    const a = d.arritmias as any;
    return FILTERS.flatMap(f => (a[f.key] ?? []).map((e: any) => ({ ...e, _cat: f.key })))
      .sort((x, y) => x.inicio_s - y.inicio_s);
  }, [d]);

  const filtered = all.filter(e => enabled.has(e._cat));

  if (!d) return null;

  const toggle = (k: string) => {
    const n = new Set(enabled);
    n.has(k) ? n.delete(k) : n.add(k);
    setEnabled(n);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 rounded-xl bg-ink-100 border border-ink-400/60 flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count = (d.arritmias as any)[f.key]?.length ?? 0;
          const active = enabled.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggle(f.key)}
              className={
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " +
                (active
                  ? "bg-ink-200 border-ink-500 text-ink-950"
                  : "bg-transparent border-ink-500 text-ink-700 opacity-60 hover:opacity-100")
              }
            >
              <span className={
                "w-2 h-2 rounded-full " +
                (f.variant === "brand" ? "bg-brand" :
                 f.variant === "cyan" ? "bg-sig-cyan" :
                 f.variant === "violet" ? "bg-sig-violet" :
                 f.variant === "amber" ? "bg-sig-amber" : "bg-sig-green")
              } />
              {f.label}
              <span className="font-mono text-[10px] text-ink-700">({count})</span>
            </button>
          );
        })}
      </div>

      <Card className="!p-0 overflow-hidden">
        <CardContent className="!p-0">
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50 z-10">
                <tr className="text-ink-700 text-[10.5px] uppercase tracking-wider">
                  <th className="text-left py-3 px-4 border-b border-ink-400/60">Tipo</th>
                  <th className="text-left py-3 px-4 border-b border-ink-400/60">Início</th>
                  <th className="text-left py-3 px-4 border-b border-ink-400/60">Fim</th>
                  <th className="text-left py-3 px-4 border-b border-ink-400/60">Duração</th>
                  <th className="text-left py-3 px-4 border-b border-ink-400/60">Detalhe</th>
                  <th className="text-left py-3 px-4 border-b border-ink-400/60"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-ink-700">Nenhum evento com os filtros atuais.</td></tr>
                )}
                {filtered.slice(0, 500).map((e, i) => {
                  const f = FILTERS.find(x => x.key === e._cat)!;
                  const detail =
                    e.duracao_s ? `dur ${e.duracao_s.toFixed(2)} s` :
                    e.fc_max ? `FC máx ${e.fc_max.toFixed(0)} bpm` :
                    e.fc_min ? `FC mín ${e.fc_min.toFixed(0)} bpm` :
                    e.rr_prematuro_ms ? `RR prem. ${e.rr_prematuro_ms.toFixed(0)} ms` :
                    e.rmssd_ms ? `RMSSD ${e.rmssd_ms.toFixed(0)} ms · CV ${e.cv?.toFixed(2)}` : "—";
                  const isOpen = expanded === i;
                  return (
                    <>
                      <tr
                        key={i}
                        onClick={() => setExpanded(isOpen ? null : i)}
                        className={`border-b border-ink-400/40 last:border-0 cursor-pointer transition-colors ${isOpen ? "bg-ink-200" : "hover:bg-ink-200/50"}`}
                      >
                        <td className="py-2.5 px-4 flex items-center gap-2">
                          {isOpen ? <ChevronDown size={14} className="text-ink-700" /> : <ChevronRightIcon size={14} className="text-ink-700" />}
                          <Badge variant={f.variant}>{f.label}</Badge>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-ink-900">{fmtTime(e.inicio_s)}</td>
                        <td className="py-2.5 px-4 font-mono text-ink-900">{fmtTime(e.fim_s)}</td>
                        <td className="py-2.5 px-4 font-mono text-ink-900">{(e.fim_s - e.inicio_s).toFixed(2)} s</td>
                        <td className="py-2.5 px-4 text-ink-900 text-xs">{detail}</td>
                        <td className="py-2.5 px-4" onClick={(ev) => ev.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEcgStart(Math.max(0, Math.floor(e.inicio_s - 2)));
                            navigate("/app/ecg");
                          }}>
                            ECG <ArrowRight size={12} />
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-ink-50">
                          <td colSpan={6} className="p-0">
                            <EventStrip event={e} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {filtered.length > 500 && (
                  <tr><td colSpan={6} className="py-3 px-4 text-center text-ink-700 text-xs">Mostrando 500 de {filtered.length}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent } from "@/components/ui/Card";
import { Plot } from "@/components/Plot";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ChevronLeft, ChevronRight, Layers as LayersIcon, Activity } from "lucide-react";
import { api } from "@/lib/api";

export default function Ecg() {
  const { currentFile, channel, ecgStart, ecgDuration, setEcgStart, setEcgDuration } = useAppStore();
  const [startInput, setStartInput] = useState(ecgStart);
  const [multiLead, setMultiLead] = useState(true);

  const singleQ = useQuery({
    enabled: !!currentFile && !multiLead,
    queryKey: ["signal", currentFile, channel, ecgStart, ecgDuration],
    queryFn: () => api.signal(currentFile!, ecgStart, ecgDuration, channel),
  });

  const multiQ = useQuery({
    enabled: !!currentFile && multiLead,
    queryKey: ["signalMulti", currentFile, ecgStart, ecgDuration],
    queryFn: () => api.signalMulti(currentFile!, ecgStart, ecgDuration),
  });

  const shift = (dt: number) => {
    const v = Math.max(0, ecgStart + dt);
    setEcgStart(v); setStartInput(v);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 rounded-xl bg-ink-100 border border-ink-400/60 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1 bg-ink-200 rounded-lg p-1 border border-ink-500">
          <button
            onClick={() => setMultiLead(true)}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
              multiLead ? "bg-brand text-white shadow" : "text-ink-800 hover:text-ink-950"
            }`}
          >
            <LayersIcon size={13} /> Multi-derivação
          </button>
          <button
            onClick={() => setMultiLead(false)}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
              !multiLead ? "bg-brand text-white shadow" : "text-ink-800 hover:text-ink-950"
            }`}
          >
            <Activity size={13} /> Canal único
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-ink-800">
          Início (s)
          <input
            type="number" min={0} step={1} value={startInput}
            onChange={(e) => setStartInput(+e.target.value)}
            onBlur={() => setEcgStart(Math.max(0, startInput))}
            className="h-9 w-24 rounded-lg bg-ink-200 border border-ink-500 text-ink-950 text-sm px-2 hover:border-ink-700 focus:border-brand focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-800">
          Duração
          <Select
            value={ecgDuration}
            onChange={(e) => setEcgDuration(+e.target.value)}
            className="w-28"
          >
            {[5, 10, 20, 30, 60].map(s => <option key={s} value={s}>{s} s</option>)}
          </Select>
        </label>
        <Button variant="ghost" onClick={() => shift(-10)}><ChevronLeft size={14} /> 10 s</Button>
        <Button variant="ghost" onClick={() => shift(10)}>10 s <ChevronRight size={14} /></Button>
        <span className="ml-auto text-xs text-ink-700 italic">25 mm/s · 10 mm/mV — padrão clínico</span>
      </div>

      {multiLead ? (
        <MultiLeadView data={multiQ.data} start={ecgStart} duration={ecgDuration} />
      ) : (
        <SingleLeadView data={singleQ.data} start={ecgStart} duration={ecgDuration} />
      )}
    </div>
  );
}

function SingleLeadView({ data, start, duration }: any) {
  const y: number[] = data?.y ?? [];
  const t: number[] = data?.t ?? [];
  const sorted = [...y].sort((a, b) => a - b);
  const med = sorted.length ? sorted[sorted.length >> 1] : 0;
  const yy = y.map(v => v - med);
  const absMax = Math.max(2.0, 1.2 * (yy.length ? Math.max(...yy.map(Math.abs)) : 1));

  return (
    <Card className="ecg-grid-bg p-0 overflow-hidden">
      <CardContent className="!p-0">
        <Plot
          data={[{
            x: t, y: yy, type: "scattergl", mode: "lines",
            line: { color: "#ff3b4a", width: 1.6 },
            hovertemplate: "t=%{x:.3f} s · %{y:.3f} mV<extra></extra>",
          }]}
          height={520}
          layout={gridMedicalLayout(start, duration, absMax, data?.canal ?? "", 48)}
        />
      </CardContent>
    </Card>
  );
}

function MultiLeadView({ data, start, duration }: any) {
  if (!data?.canais) {
    return (
      <Card><CardContent>Carregando derivações…</CardContent></Card>
    );
  }
  const channels = data.canais;
  const t: number[] = data.t;

  // Normaliza cada canal em torno de sua mediana + stack visual
  // Usamos plot separado por canal — fica legível e cada um com eixo independente
  const rowHeight = 170;
  return (
    <Card className="ecg-grid-bg p-0 overflow-hidden">
      <CardContent className="!p-0">
        {channels.map((ch: any, i: number) => {
          const sorted = [...ch.y].sort((a: number, b: number) => a - b);
          const med = sorted[sorted.length >> 1] ?? 0;
          const yy = ch.y.map((v: number) => v - med);
          const absMax = Math.max(1.5, 1.2 * Math.max(...yy.map(Math.abs), 0));
          return (
            <div key={i} className="relative">
              <div className="absolute top-2 left-4 z-10 px-2 py-0.5 rounded bg-black/60 text-brand text-xs font-mono font-bold tracking-widest">
                {ch.canal}
              </div>
              <Plot
                data={[{
                  x: t, y: yy, type: "scattergl", mode: "lines",
                  line: { color: "#ff3b4a", width: 1.4 },
                  hovertemplate: `${ch.canal}: t=%{x:.3f}s · %{y:.3f} mV<extra></extra>`,
                }]}
                height={rowHeight}
                layout={gridMedicalLayout(start, duration, absMax, "", 36, i === channels.length - 1)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function gridMedicalLayout(
  start: number, duration: number, absMax: number, axisLabel: string,
  marginLeft = 48, showXAxis = true,
) {
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: marginLeft, r: 16, t: 10, b: showXAxis ? 38 : 10 },
    xaxis: {
      range: [start, start + duration],
      title: showXAxis ? { text: `tempo (s) ${axisLabel ? "— canal " + axisLabel : ""}`, font: { color: "#7a7a7a", size: 11 } } : undefined,
      tickfont: { color: "#7a7a7a" },
      showticklabels: showXAxis,
      dtick: 0.2,
      gridcolor: "rgba(255,59,74,.18)",
      linecolor: "#262626",
      minor: { dtick: 0.04, gridcolor: "rgba(255,59,74,.06)", showgrid: true },
      zeroline: false,
    },
    yaxis: {
      range: [-absMax, absMax],
      title: { text: axisLabel ? "mV" : "mV", font: { color: "#7a7a7a", size: 10 } },
      tickfont: { color: "#7a7a7a", size: 9 },
      dtick: 0.5,
      gridcolor: "rgba(255,59,74,.18)",
      linecolor: "#262626",
      minor: { dtick: 0.1, gridcolor: "rgba(255,59,74,.06)", showgrid: true },
      zeroline: true, zerolinecolor: "rgba(255,59,74,.3)",
    },
    showlegend: false,
  } as any;
}

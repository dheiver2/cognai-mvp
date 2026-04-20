import { useAnalysis } from "@/hooks/useAnalysis";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Plot } from "@/components/Plot";
import { fmtNum } from "@/lib/utils";

export default function Hrv() {
  const { data: d } = useAnalysis();
  if (!d) return null;
  const p = d.poincare;
  const psd = d.psd;

  // elipse SD1/SD2 rotacionada 45°
  const traces: any[] = [{
    x: p.x, y: p.y, type: "scattergl", mode: "markers",
    marker: { size: 3, color: "#4db8ff", opacity: 0.55 },
    name: "RR", hovertemplate: "RRₙ=%{x:.0f} · RRₙ₊₁=%{y:.0f} ms<extra></extra>",
  }];
  if (p.rr_mean_ms && p.sd1 && p.sd2) {
    const cx = p.rr_mean_ms, cy = p.rr_mean_ms;
    const theta = Array.from({ length: 65 }, (_, i) => 2 * Math.PI * i / 64);
    const elx = theta.map(t => cx + p.sd2! * Math.cos(t) * Math.cos(Math.PI/4) - p.sd1! * Math.sin(t) * Math.sin(Math.PI/4));
    const ely = theta.map(t => cy + p.sd2! * Math.cos(t) * Math.sin(Math.PI/4) + p.sd1! * Math.sin(t) * Math.cos(Math.PI/4));
    traces.push({
      x: elx, y: ely, mode: "lines", type: "scatter",
      line: { color: "#ff3b4a", width: 2 }, name: "SD1 / SD2", hoverinfo: "skip",
    });
  }

  // PSD with band rectangles
  const band = (x0: number, x1: number, c: string) =>
    ({ type: "rect", xref: "x", yref: "paper", x0, x1, y0: 0, y1: 1, fillcolor: c, opacity: 0.1, line: { width: 0 } });

  const td = d.hrv.tempo, fd = d.hrv.frequencia;
  const rows: Array<[string, any, string]> = [
    ["Média RR", fmtNum(td.mean_rr, 1), "ms"],
    ["Mín / Máx RR", `${fmtNum(td.min_rr, 0)} / ${fmtNum(td.max_rr, 0)}`, "ms"],
    ["FC média", fmtNum(td.mean_hr, 1), "bpm"],
    ["SDNN", fmtNum(td.sdnn, 1), "ms"],
    ["RMSSD", fmtNum(td.rmssd, 1), "ms"],
    ["pNN50", fmtNum(td.pnn50, 2), "%"],
    ["VLF", fmtNum(fd.vlf, 1), "ms²"],
    ["LF", fmtNum(fd.lf, 1), "ms²"],
    ["HF", fmtNum(fd.hf, 1), "ms²"],
    ["LF n.u.", fmtNum(fd.lf_nu, 1), "n.u."],
    ["HF n.u.", fmtNum(fd.hf_nu, 1), "n.u."],
    ["LF/HF", fmtNum(fd.lf_hf, 2), ""],
    ["Potência total", fmtNum(fd.total_power, 1), "ms²"],
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>Poincaré (RRₙ vs RRₙ₊₁)</CardHeader>
          <CardContent>
            <Plot
              height={380}
              data={traces}
              layout={{
                xaxis: { title: { text: "RRₙ (ms)" }, range: [300, 1600] },
                yaxis: { title: { text: "RRₙ₊₁ (ms)" }, range: [300, 1600], scaleanchor: "x", scaleratio: 1 },
                title: p.sd1 ? { text: `SD1 = ${p.sd1.toFixed(1)} ms · SD2 = ${p.sd2?.toFixed(1)} ms`, font: { color: "#7a7a7a", size: 11 } } : undefined,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>PSD — VLF / LF / HF</CardHeader>
          <CardContent>
            <Plot
              height={380}
              data={[{
                x: psd.f, y: psd.p, type: "scatter", mode: "lines",
                fill: "tozeroy", line: { color: "#10b981", width: 2 },
                name: "PSD", hovertemplate: "%{x:.3f} Hz · %{y:.1f} ms²/Hz<extra></extra>",
              }]}
              layout={{
                xaxis: { title: { text: "Frequência (Hz)" }, range: [0, 0.5] },
                yaxis: { title: { text: "PSD (ms²/Hz)" } },
                shapes: [
                  band(0.003, 0.04, "#c084fc"),
                  band(0.04, 0.15, "#f9a825"),
                  band(0.15, 0.40, "#4db8ff"),
                ] as any,
                annotations: [
                  { x: 0.02, y: 1, xref: "x", yref: "paper", text: "VLF", showarrow: false, font: { color: "#c084fc", size: 10 }, yshift: -4 },
                  { x: 0.09, y: 1, xref: "x", yref: "paper", text: "LF",  showarrow: false, font: { color: "#f9a825", size: 10 }, yshift: -4 },
                  { x: 0.27, y: 1, xref: "x", yref: "paper", text: "HF",  showarrow: false, font: { color: "#4db8ff", size: 10 }, yshift: -4 },
                ],
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>Resumo HRV</CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-700 text-[10.5px] uppercase tracking-wider border-b border-ink-400/50">
                <th className="text-left py-2 px-3">Métrica</th>
                <th className="text-left py-2 px-3">Valor</th>
                <th className="text-left py-2 px-3">Unidade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, v, u]) => (
                <tr key={k} className="border-b border-ink-400/40 last:border-0">
                  <td className="py-2 px-3 text-ink-900">{k}</td>
                  <td className="py-2 px-3 text-ink-950 font-mono">{v}</td>
                  <td className="py-2 px-3 text-ink-700">{u}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useAnalysis } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function Patient() {
  const { data: d } = useAnalysis();
  const { currentFile } = useAppStore();
  if (!d) return null;
  const m = d.metadata;

  const rows = (items: Array<[string, any]>) => (
    <table className="w-full text-sm">
      <tbody>
        {items.map(([k, v]) => (
          <tr key={k} className="border-b border-ink-400/50 last:border-0">
            <td className="py-2 pr-3 text-ink-700 w-[45%]">{k}</td>
            <td className="py-2 text-ink-950 font-medium">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
      <Card>
        <CardHeader>Identificação</CardHeader>
        <CardContent>
          {rows([
            ["ID paciente", m.patient_id],
            ["Arquivo", <span className="font-mono text-xs">{currentFile}</span>],
          ])}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>Resumo do exame</CardHeader>
        <CardContent>
          {rows([
            ["Duração", `${(m.duration_s/3600).toFixed(2)} h`],
            ["Frequência de amostragem", `${m.fs} Hz`],
            ["Nº de canais", `${m.n_channels} (${m.channel_names.join(", ")})`],
            ["Canal analisado", d.canal_analisado],
            ["Unidade", m.unit],
            ["Amostras", m.samples.toLocaleString("pt-BR")],
            ["Batimentos detectados", d.qrs.n_batimentos.toLocaleString("pt-BR")],
            ["Tempo de processamento", `${d.tempo_processamento_s} s`],
          ])}
        </CardContent>
      </Card>
    </div>
  );
}

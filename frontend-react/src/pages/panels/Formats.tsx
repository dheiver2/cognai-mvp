import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileCheck2, Layers } from "lucide-react";

export default function Formats() {
  const formatsQ = useQuery({ queryKey: ["formats"], queryFn: api.formats });
  const formats = formatsQ.data?.formats ?? [];
  const exts = formatsQ.data?.extensions ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <CardHeader>Formatos suportados</CardHeader>
        <CardContent>
          <p className="text-sm text-ink-800 mb-4">
            A cognai detecta automaticamente o formato do seu arquivo e usa o parser adequado — você não precisa abrir nada em outro software.
          </p>
          <div className="flex flex-wrap gap-2">
            {exts.map((e) => (
              <span key={e} className="font-mono text-xs px-2 py-1 rounded-md bg-ink-200 border border-ink-500 text-ink-950">{e}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formats.map((f) => (
          <div key={f.id} className="rounded-xl bg-ink-100 border border-ink-400/60 p-5 hover:border-brand/40 transition-colors">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand shrink-0">
                <FileCheck2 size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-ink-950">{f.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {f.extensions.map((e) => (
                    <span key={e} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-300 text-ink-900">{e}</span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-ink-800 mb-3">{f.description}</p>
            <div className="flex items-center gap-2 text-[11px] text-ink-700">
              <Layers size={12} />
              <span>{f.vendors.join(" · ")}</span>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>Não está na lista?</CardHeader>
        <CardContent>
          <p className="text-sm text-ink-800">
            Entre em contato — a arquitetura de parsers é plugável e podemos adicionar novos fabricantes
            brasileiros e internacionais sem alterar a plataforma.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/useAppStore";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Loader2, FileWarning, Upload } from "lucide-react";
import { useEffect } from "react";

export default function AppLayout() {
  const loc = useLocation();
  const { currentFile, setCurrentFile } = useAppStore();
  const filesQ = useQuery({ queryKey: ["files"], queryFn: api.listFiles });
  const analysis = useAnalysis();

  // Rotas que não dependem de análise
  const isFormatsRoute = loc.pathname === "/app/formats";

  // Auto-select primeiro arquivo se nada está selecionado
  useEffect(() => {
    if (!currentFile && filesQ.data && filesQ.data.length > 0) {
      setCurrentFile(filesQ.data[0].id);
    }
  }, [currentFile, filesQ.data, setCurrentFile]);

  return (
    <div className="flex bg-ink-0 min-h-screen text-ink-950">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />

        <main className="flex-1 px-6 py-6">
          {isFormatsRoute ? (
            <Outlet />
          ) : !currentFile ? (
            <EmptyState kind="no-file" />
          ) : analysis.isLoading ? (
            <EmptyState kind="loading" />
          ) : analysis.isError ? (
            <EmptyState kind="error" message={(analysis.error as Error)?.message} />
          ) : analysis.data ? (
            <Outlet />
          ) : (
            <EmptyState kind="idle" />
          )}
        </main>

        <footer className="px-6 py-4 border-t border-ink-400/50 text-center text-[11px] text-ink-700">
          <Link to="/" className="hover:text-ink-950 transition-colors">← voltar à página inicial</Link>
          <span className="mx-3">·</span>
          cognai MVP · resultados heurísticos, não substituem avaliação médica
        </footer>
      </div>
    </div>
  );
}

function EmptyState({ kind, message }: { kind: string; message?: string }) {
  const content: Record<string, { icon: any; title: string; desc: string }> = {
    "no-file":   { icon: FileWarning, title: "Nenhum arquivo selecionado", desc: "Selecione um .txt na barra superior ou envie um novo." },
    "loading":   { icon: Loader2,     title: "Analisando exame...",         desc: "Primeira análise leva ~10s para 24h de Holter. Depois fica em cache." },
    "error":     { icon: AlertCircle, title: "Erro na análise",             desc: message ?? "Verifique o arquivo e tente novamente." },
    "idle":      { icon: Upload,      title: "Pronto para analisar",        desc: "Clique em Analisar no topo para processar o exame." },
  };
  const c = content[kind];
  const Icon = c.icon;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-ink-200 border border-ink-400 flex items-center justify-center mb-4 text-ink-800">
        <Icon size={28} className={kind === "loading" ? "animate-spin" : ""} />
      </div>
      <h2 className="text-xl font-semibold text-ink-950 mb-2">{c.title}</h2>
      <p className="text-sm text-ink-800 max-w-md">{c.desc}</p>
    </div>
  );
}

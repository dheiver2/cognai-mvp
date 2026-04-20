import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Upload, RefreshCw, Play } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";

const PANEL_TITLES: Record<string, string> = {
  "/app":            "Dashboard",
  "/app/patient":    "Dados do exame",
  "/app/ecg":        "Revisão do ECG",
  "/app/disclosure": "Full Disclosure",
  "/app/trends":     "Tendências — FC e ST",
  "/app/histograms": "Histogramas",
  "/app/hrv":        "HRV / Poincaré",
  "/app/qt":         "Análise QT / QTc",
  "/app/morphology": "Morfologia e templates",
  "/app/events":     "Arritmias e eventos",
  "/app/report":     "Laudo",
  "/app/formats":    "Formatos suportados",
};

export function TopBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const { currentFile, channel, setCurrentFile, setChannel } = useAppStore();

  const filesQ = useQuery({
    queryKey: ["files"],
    queryFn: api.listFiles,
    refetchOnWindowFocus: false,
  });
  const formatsQ = useQuery({
    queryKey: ["formats"],
    queryFn: api.formats,
    staleTime: Infinity,
  });
  const acceptExt = (formatsQ.data?.extensions ?? [".txt", ".edf", ".csv", ".dat", ".xml", ".dcm"]).join(",");

  const analysisMut = useMutation({
    mutationFn: () => {
      if (!currentFile) throw new Error("Selecione um arquivo");
      return api.analyze(currentFile, channel, false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis", currentFile, channel] });
      if (!loc.pathname.startsWith("/app")) navigate("/app");
    },
  });

  const uploadMut = useMutation({
    mutationFn: (f: File) => api.upload(f),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["files"] });
      setCurrentFile(r.id);
    },
  });

  // auto-select primeiro arquivo se nada selecionado
  const files = filesQ.data ?? [];
  if (!currentFile && files.length > 0) {
    setTimeout(() => setCurrentFile(files[0].id), 0);
  }

  const title = PANEL_TITLES[loc.pathname] ?? "cognai";

  return (
    <header className="sticky top-0 z-50 bg-ink-0/80 backdrop-blur-md border-b border-ink-400/50">
      <div className="px-6 py-3 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-ink-950 tracking-tight">{title}</h1>
          {currentFile && (
            <p className="text-xs text-ink-700 truncate font-mono">{currentFile}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={currentFile ?? ""}
            onChange={(e) => setCurrentFile(e.target.value || null)}
            className="min-w-[240px]"
          >
            {files.length === 0 && <option value="">— nenhum arquivo —</option>}
            {files.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} · {f.formato ?? "—"} · {f.tamanho_mb} MB
              </option>
            ))}
          </Select>
          <Select
            value={channel}
            onChange={(e) => setChannel(+e.target.value)}
            className="w-20"
          >
            <option value={0}>V1</option>
            <option value={1}>V3</option>
            <option value={2}>V5</option>
          </Select>

          <Button
            variant="ghost"
            onClick={() => qc.invalidateQueries({ queryKey: ["files"] })}
            title="Atualizar lista"
          >
            <RefreshCw size={14} />
          </Button>

          <Button
            variant="brand"
            onClick={() => analysisMut.mutate()}
            disabled={!currentFile || analysisMut.isPending}
          >
            {analysisMut.isPending ? (
              <><RefreshCw size={14} className="animate-spin" /> Analisando...</>
            ) : (
              <><Play size={14} /> Analisar</>
            )}
          </Button>

          <input
            ref={fileInput}
            type="file"
            accept={acceptExt}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMut.mutate(f);
            }}
          />
          <Button variant="ghost" onClick={() => fileInput.current?.click()}>
            <Upload size={14} /> Enviar
          </Button>
        </div>
      </div>
    </header>
  );
}

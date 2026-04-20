import type { AnalysisResult, ECGMetadata, FileEntry, FormatInfo, SignalWindow } from "./types";

const BASE = "";  // same-origin (proxied in dev, served in prod)

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => j<{ status: string }>("/api/health"),
  formats: () => j<{ formats: FormatInfo[]; extensions: string[] }>("/api/formats"),
  listFiles: () => j<{ files: FileEntry[] }>("/api/files").then(r => r.files),
  metadata: (fileId: string) => j<ECGMetadata>(`/api/metadata/${encodeURIComponent(fileId)}`),
  analyze: (fileId: string, channel = 1, force = false) =>
    j<AnalysisResult>(`/api/analysis/${encodeURIComponent(fileId)}?channel=${channel}&force=${force}`),
  signal: (fileId: string, start: number, duration: number, channel: number) =>
    j<SignalWindow>(`/api/signal/${encodeURIComponent(fileId)}?start=${start}&duration=${duration}&channel=${channel}&max_points=4000`),
  signalMulti: (fileId: string, start: number, duration: number) =>
    j<{ fs: number; t: number[]; canais: Array<{ canal: string; y: number[] }> }>(`/api/signal_multi/${encodeURIComponent(fileId)}?start=${start}&duration=${duration}&max_points=3000`),
  reportMd: async (fileId: string, channel = 1) => {
    const r = await fetch(`${BASE}/api/report/${encodeURIComponent(fileId)}?channel=${channel}`);
    return r.text();
  },
  upload: async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

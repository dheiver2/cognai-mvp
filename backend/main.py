"""
HolterMVP — Backend FastAPI.

Endpoints:
  GET  /                              — health check
  GET  /api/files                     — lista arquivos disponíveis na pasta de dados
  POST /api/upload                    — faz upload de novo arquivo .txt
  GET  /api/metadata/{file_id}        — metadados do arquivo
  GET  /api/analysis/{file_id}        — resultado da análise (executa se necessário)
  GET  /api/signal/{file_id}          — trecho do sinal (com downsample)
  GET  /api/report/{file_id}          — laudo em texto (markdown)
  GET  /                              — redireciona para frontend
  GET  /ui                            — frontend estático

Executar:
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .core.analyzer import analyze_file
from .core.parser import load_ecg, to_millivolts, get_window, downsample_for_display
from .core.formats import list_formats, supported_extensions, detect_format

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("HOLTER_DATA_DIR", ROOT / "data"))
CACHE_DIR = Path(os.environ.get("HOLTER_CACHE_DIR", ROOT / "cache"))
FRONTEND_DIR = ROOT / "frontend"

DATA_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="HolterMVP", version="0.1.0", description="Plataforma MVP para análise de Holter/ECG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resolve_file(file_id: str) -> Path:
    """Resolve o id do arquivo (nome sem path) para caminho completo em DATA_DIR."""
    candidate = DATA_DIR / file_id
    if candidate.exists():
        return candidate
    # também aceita nome sem extensão
    for p in DATA_DIR.iterdir():
        if p.stem == file_id:
            return p
    raise HTTPException(404, detail=f"Arquivo não encontrado: {file_id}")


@app.get("/api/health")
def health():
    return {"status": "ok", "data_dir": str(DATA_DIR), "n_files": sum(1 for _ in DATA_DIR.iterdir())}


@app.get("/api/formats")
def formats():
    """Lista formatos suportados pelo sistema (multi-vendor)."""
    return {
        "formats": [
            {
                "id": f.id, "name": f.name, "description": f.description,
                "extensions": f.extensions, "vendors": f.vendors,
            }
            for f in list_formats()
        ],
        "extensions": supported_extensions(),
    }


@app.get("/api/files")
def list_files():
    exts = set(supported_extensions())
    items = []
    for p in DATA_DIR.iterdir():
        if p.is_file() and (p.suffix.lower() in exts):
            parser = detect_format(p)
            items.append({
                "id": p.name,
                "nome": p.name,
                "tamanho_bytes": p.stat().st_size,
                "tamanho_mb": round(p.stat().st_size / 1e6, 1),
                "formato": parser.info.name if parser else "Desconhecido",
                "formato_id": parser.info.id if parser else None,
            })
    items.sort(key=lambda x: x["nome"])
    return {"files": items}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    name = (file.filename or "").lower()
    exts = set(supported_extensions())
    ext = Path(name).suffix.lower()
    if ext not in exts:
        raise HTTPException(
            400,
            detail=f"Extensão {ext!r} não suportada. Aceitas: {', '.join(sorted(exts))}",
        )
    dest = DATA_DIR / file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    parser = detect_format(dest)
    return {
        "id": dest.name,
        "tamanho_mb": round(dest.stat().st_size / 1e6, 1),
        "formato": parser.info.name if parser else "Desconhecido",
    }


@app.get("/api/metadata/{file_id}")
def get_metadata(file_id: str):
    path = _resolve_file(file_id)
    _, meta = load_ecg(path, cache_dir=CACHE_DIR)
    return meta.to_dict()


@app.get("/api/analysis/{file_id}")
def get_analysis(file_id: str, channel: int = 1, force: bool = False):
    path = _resolve_file(file_id)
    try:
        result = analyze_file(path, cache_dir=CACHE_DIR, channel=channel, force=force)
    except Exception as e:
        raise HTTPException(500, detail=f"Erro na análise: {e}")
    return JSONResponse(result)


@app.get("/api/signal_multi/{file_id}")
def get_signal_multi(
    file_id: str,
    start: float = Query(0.0),
    duration: float = Query(10.0),
    max_points: int = Query(2000),
):
    """Retorna TODOS os canais (V1/V3/V5) sincronizados no mesmo eixo de tempo."""
    path = _resolve_file(file_id)
    signal, meta = load_ecg(path, cache_dir=CACHE_DIR)
    t, _ = get_window(signal, meta.fs, start, duration, 0)
    all_channels = []
    for ch_idx in range(signal.shape[1]):
        _, seg = get_window(signal, meta.fs, start, duration, ch_idx)
        seg_mv = to_millivolts(seg, meta.unit)
        if seg_mv.size > max_points:
            step = max(1, seg_mv.size // max_points)
            seg_mv = seg_mv[::step]
        all_channels.append({
            "canal": meta.channel_names[ch_idx],
            "y": seg_mv.tolist(),
        })
    # aplica downsample no t igual
    if t.size > max_points:
        step = max(1, t.size // max_points)
        t = t[::step]
    return {
        "file_id": file_id, "fs": meta.fs, "unidade": "mV",
        "t": t.tolist(),
        "canais": all_channels,
    }


@app.get("/api/signal/{file_id}")
def get_signal(
    file_id: str,
    start: float = Query(0.0, description="início em segundos"),
    duration: float = Query(10.0, description="duração em segundos (padrão 10s)"),
    channel: int = Query(1, description="canal 0=V1, 1=V3, 2=V5"),
    max_points: int = Query(2000),
):
    path = _resolve_file(file_id)
    signal, meta = load_ecg(path, cache_dir=CACHE_DIR)
    ch = min(channel, signal.shape[1] - 1)
    t, seg = get_window(signal, meta.fs, start, duration, ch)
    seg_mv = to_millivolts(seg, meta.unit)
    # downsample se necessário
    if seg_mv.size > max_points:
        step = max(1, seg_mv.size // max_points)
        t = t[::step]
        seg_mv = seg_mv[::step]
    return {
        "file_id": file_id,
        "canal": meta.channel_names[ch],
        "fs": meta.fs,
        "unidade": "mV",
        "t": t.tolist(),
        "y": seg_mv.tolist(),
    }


@app.get("/api/report/{file_id}", response_class=PlainTextResponse)
def get_report(file_id: str, channel: int = 1):
    path = _resolve_file(file_id)
    result = analyze_file(path, cache_dir=CACHE_DIR, channel=channel)
    md = _build_report_md(result)
    return md


def _build_report_md(r: dict) -> str:
    m = r["metadata"]
    fc = r["fc"]
    td = r["hrv"]["tempo"]
    fd = r["hrv"]["frequencia"]
    arr = r["arritmias"]
    st = r["st"]

    def fmt(v, nd=1):
        if v is None:
            return "—"
        return f"{v:.{nd}f}"

    lines = []
    lines.append(f"# Laudo MVP — Holter / ECG")
    lines.append("")
    lines.append(f"**Paciente (ID):** {m['patient_id']}  ")
    lines.append(f"**Duração:** {m['duration_s']/3600:.2f} h  ")
    lines.append(f"**Frequência de amostragem:** {m['fs']} Hz  ")
    lines.append(f"**Canal analisado:** {r['canal_analisado']}  ")
    lines.append(f"**Batimentos detectados:** {r['qrs']['n_batimentos']:,} (válidos: {r['qrs']['batimentos_validos']:,})  ")
    lines.append("")
    lines.append("## Frequência cardíaca")
    lines.append(f"- Média: **{fmt(fc['media_bpm'])} bpm**")
    lines.append(f"- Mínima: {fmt(fc['min_bpm'])} bpm")
    lines.append(f"- Máxima: {fmt(fc['max_bpm'])} bpm")
    lines.append("")
    lines.append("## Variabilidade da FC (HRV)")
    lines.append("### Tempo")
    lines.append(f"- SDNN: {fmt(td['sdnn'])} ms")
    lines.append(f"- RMSSD: {fmt(td['rmssd'])} ms")
    lines.append(f"- pNN50: {fmt(td['pnn50'], 2)} %")
    lines.append("### Frequência")
    lines.append(f"- VLF: {fmt(fd['vlf'])} ms²")
    lines.append(f"- LF: {fmt(fd['lf'])} ms² ({fmt(fd['lf_nu'])} n.u.)")
    lines.append(f"- HF: {fmt(fd['hf'])} ms² ({fmt(fd['hf_nu'])} n.u.)")
    lines.append(f"- LF/HF: {fmt(fd['lf_hf'], 2)}")
    lines.append("")
    lines.append("## Arritmias (heurística)")
    lines.append(f"- Pausas (> 2s): **{len(arr['pausas'])}**")
    lines.append(f"- Extrassístoles: **{len(arr['extrassistoles'])}**")
    lines.append(f"- Episódios de taquicardia (>100 bpm): {len(arr['taquicardia'])}")
    lines.append(f"- Taquicardia sustentada (>150 bpm, ≥5 bat.): {len(arr['taquicardia_sustentada'])}")
    lines.append(f"- Episódios de bradicardia (<50 bpm): {len(arr['bradicardia'])}")
    lines.append(f"- Janelas sugestivas de FA: **{len(arr['suspeita_fa'])}**")
    lines.append("")
    lines.append("## Segmento ST")
    lines.append(f"- Batimentos analisados: {st['n_analisados']:,}")
    lines.append(f"- ΔST médio: {fmt(st['st_medio_mv'], 3)} mV")
    lines.append(f"- ΔST máx supra: {fmt(st['st_max_supra_mv'], 3)} mV")
    lines.append(f"- ΔST máx infra: {fmt(st['st_max_infra_mv'], 3)} mV")
    lines.append(f"- Classificação: **{st['classificacao']}**")
    lines.append("")
    lines.append("---")
    lines.append("> ⚠️ Resultado gerado automaticamente por heurísticas (MVP). **Não substitui avaliação médica.**")
    return "\n".join(lines)


# ---- Frontend estático ----
# Prioriza o build React (backend/web-v3, v2, v1); fallback para o front vanilla em /frontend
_candidates = [
    Path(__file__).resolve().parent / "web-v4",
    Path(__file__).resolve().parent / "web-v3",
    Path(__file__).resolve().parent / "web-v2",
    Path(__file__).resolve().parent / "web",
]
WEB_DIR = next((p for p in _candidates if p.exists()), _candidates[-1])

if WEB_DIR.exists() and (WEB_DIR / "index.html").exists():
    # Monta assets do Vite
    app.mount("/assets", StaticFiles(directory=str(WEB_DIR / "assets")), name="assets")

    @app.get("/favicon.svg")
    def favicon():
        return FileResponse(WEB_DIR / "favicon.svg", media_type="image/svg+xml")

    @app.get("/", response_class=HTMLResponse)
    def index():
        return (WEB_DIR / "index.html").read_text(encoding="utf-8")

    # SPA fallback — qualquer rota que não seja /api serve o index.html (para React Router)
    @app.get("/{full_path:path}", response_class=HTMLResponse)
    def spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("assets/") or full_path.startswith("static/") or full_path.endswith(".svg"):
            raise HTTPException(404)
        return (WEB_DIR / "index.html").read_text(encoding="utf-8")

elif FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/", response_class=HTMLResponse)
    def index():
        return (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")

"""
Orquestrador das análises: carrega, pré-processa e executa pipeline completo.
Resultado é salvo em cache JSON para servir rapidamente via API.
"""
from __future__ import annotations

import json
import time
from dataclasses import asdict
from pathlib import Path

import numpy as np

from .parser import load_ecg, to_millivolts, ECGMetadata
from .signal_processing import preprocess
from .qrs import detect_r_peaks, rr_intervals, clean_rr, heart_rate
from .hrv import hrv_all, time_domain, frequency_domain
from .arrhythmia import detect_all
from .st_analysis import analyze_st
from .qt_analysis import analyze_qt
from .beat_morphology import classify_beats


def _hr_trend_per_minute(peak_idx: np.ndarray, rr_s: np.ndarray, fs: int, duration_s: float) -> dict:
    """Trend de FC por minuto (min/média/máx) — como Mortara/Cardioline."""
    if len(peak_idx) < 2:
        return {"t_min": [], "fc_min": [], "fc_med": [], "fc_max": []}
    peak_t_min = peak_idx[:-1] / fs / 60.0   # minutos
    hr = 60.0 / np.where(rr_s > 0, rr_s, np.nan)
    n_bins = max(1, int(np.ceil(duration_s / 60)))
    fc_min = np.full(n_bins, np.nan)
    fc_med = np.full(n_bins, np.nan)
    fc_max = np.full(n_bins, np.nan)
    # Atribui cada batimento a um bin
    bin_idx = peak_t_min.astype(int)
    bin_idx = np.clip(bin_idx, 0, n_bins - 1)
    for b in range(n_bins):
        mask = bin_idx == b
        if mask.sum() < 2:
            continue
        vals = hr[mask]
        vals = vals[np.isfinite(vals)]
        if vals.size == 0:
            continue
        fc_min[b] = np.min(vals)
        fc_med[b] = np.mean(vals)
        fc_max[b] = np.max(vals)
    return {
        "t_min": list(range(n_bins)),
        "fc_min": [None if np.isnan(v) else float(v) for v in fc_min],
        "fc_med": [None if np.isnan(v) else float(v) for v in fc_med],
        "fc_max": [None if np.isnan(v) else float(v) for v in fc_max],
    }


def _poincare(rr_s: np.ndarray, max_points: int = 5000) -> dict:
    """Coordenadas Poincaré (RRn x RRn+1) em ms. SD1, SD2."""
    if len(rr_s) < 2:
        return {"x": [], "y": [], "sd1": None, "sd2": None, "n": 0}
    x = rr_s[:-1] * 1000.0
    y = rr_s[1:] * 1000.0
    # subamostra uniformemente para visualização
    if x.size > max_points:
        idx = np.linspace(0, x.size - 1, max_points).astype(int)
        xs, ys = x[idx], y[idx]
    else:
        xs, ys = x, y
    diff = x - y
    summ = x + y
    sd1 = float(np.std(diff, ddof=1) / np.sqrt(2))
    sd2 = float(np.std(summ, ddof=1) / np.sqrt(2))
    return {
        "x": xs.tolist(),
        "y": ys.tolist(),
        "sd1": sd1,
        "sd2": sd2,
        "n": int(x.size),
        "rr_mean_ms": float(np.mean(x)),
    }


def _rr_histogram(rr_s: np.ndarray, bins: int = 60) -> dict:
    if len(rr_s) == 0:
        return {"bin_edges_ms": [], "counts": []}
    rr_ms = rr_s * 1000.0
    hist, edges = np.histogram(rr_ms, bins=bins, range=(300, 1800))
    return {"bin_edges_ms": edges.tolist(), "counts": hist.tolist()}


def _hr_histogram(rr_s: np.ndarray, bins: int = 60) -> dict:
    if len(rr_s) == 0:
        return {"bin_edges_bpm": [], "counts": []}
    hr = 60.0 / np.where(rr_s > 0, rr_s, np.nan)
    hr = hr[np.isfinite(hr)]
    hist, edges = np.histogram(hr, bins=bins, range=(30, 200))
    return {"bin_edges_bpm": edges.tolist(), "counts": hist.tolist()}


def _psd(rr_s: np.ndarray, fs_interp: float = 4.0) -> dict:
    """Densidade espectral de potência do tacograma (HRV)."""
    from scipy.signal import welch
    if len(rr_s) < 60:
        return {"f": [], "p": []}
    rr = np.asarray(rr_s, dtype=np.float64)
    t = np.cumsum(rr); t = t - t[0]
    n_new = int(t[-1] * fs_interp)
    if n_new < 64:
        return {"f": [], "p": []}
    t_new = np.arange(n_new) / fs_interp
    rr_interp = np.interp(t_new, t, rr)
    rr_interp = rr_interp - np.mean(rr_interp)
    nperseg = min(len(rr_interp), 512)
    f, p = welch(rr_interp, fs=fs_interp, nperseg=nperseg)
    mask = f <= 0.5
    return {"f": f[mask].tolist(), "p": (p[mask] * 1e6).tolist()}


def _st_trend_per_minute(filt: np.ndarray, r_peaks: np.ndarray, fs: int) -> dict:
    """Trend ST minuto-a-minuto."""
    if len(r_peaks) < 10:
        return {"t_min": [], "st_mv": []}
    pre_lo = int(0.080 * fs)
    pre_hi = int(0.020 * fs)
    j_plus_st = int((0.040 + 0.060) * fs)
    dev = []
    t_min = []
    for p in r_peaks:
        if p - pre_lo < 0 or p + j_plus_st >= filt.size:
            continue
        baseline = float(filt[p - pre_lo:p - pre_hi].mean())
        st_val = float(filt[p + j_plus_st - 1:p + j_plus_st + 2].mean())
        dev.append(st_val - baseline)
        t_min.append(p / fs / 60.0)
    if not dev:
        return {"t_min": [], "st_mv": []}
    dev = np.asarray(dev)
    tmin = np.asarray(t_min)
    n_bins = max(1, int(np.ceil(tmin.max()))) + 1
    bin_idx = tmin.astype(int)
    avg = np.full(n_bins, np.nan)
    for b in range(n_bins):
        m = bin_idx == b
        if m.any():
            avg[b] = np.median(dev[m])
    return {
        "t_min": list(range(n_bins)),
        "st_mv": [None if np.isnan(v) else float(v) for v in avg],
    }


def _full_disclosure_envelope(filt: np.ndarray, fs: int, strips_per_hour: int = 60) -> dict:
    """
    Full disclosure: para cada ~minuto, guarda envelope (min,max) para mostrar
    "wall of ECG" como Mortara. Retorna min/max por pequeno bin.
    """
    n = filt.size
    total_min = n / fs / 60
    n_bins = int(total_min * strips_per_hour / 60 * 4)  # 4 bins por 15s
    if n_bins < 2:
        return {"t_s": [], "ymin": [], "ymax": []}
    bin_size = n // n_bins
    usable = bin_size * n_bins
    x = filt[:usable].reshape(n_bins, bin_size)
    ymin = x.min(axis=1)
    ymax = x.max(axis=1)
    t_s = (np.arange(n_bins) * bin_size) / fs
    return {"t_s": t_s.tolist(), "ymin": ymin.astype(float).tolist(), "ymax": ymax.astype(float).tolist()}


def _hourly_summary(peak_idx: np.ndarray, rr_s: np.ndarray, fs: int, duration_s: float) -> list[dict]:
    """Resumo hora a hora: FC média/mín/máx, nº batimentos."""
    if len(peak_idx) < 2:
        return []
    peak_t = peak_idx[:-1] / fs
    rr_hr = 60.0 / np.where(rr_s > 0, rr_s, np.nan)
    n_hours = max(1, int(np.ceil(duration_s / 3600)))
    out = []
    for h in range(n_hours):
        t0 = h * 3600
        t1 = (h + 1) * 3600
        mask = (peak_t >= t0) & (peak_t < t1)
        if mask.sum() == 0:
            continue
        w = rr_hr[mask]
        w = w[np.isfinite(w)]
        if w.size == 0:
            continue
        out.append({
            "hora": h,
            "inicio_s": t0,
            "batimentos": int(mask.sum()),
            "fc_media": float(np.mean(w)),
            "fc_min": float(np.min(w)),
            "fc_max": float(np.max(w)),
        })
    return out


def _tachogram_samples(peak_idx: np.ndarray, rr_s: np.ndarray, fs: int, max_points: int = 4000) -> dict:
    """Subamostra o tacograma para visualização."""
    if len(rr_s) == 0:
        return {"t": [], "rr_ms": []}
    t = peak_idx[:-1] / fs
    rr_ms = rr_s * 1000.0
    if len(rr_s) > max_points:
        step = len(rr_s) // max_points
        t = t[::step]
        rr_ms = rr_ms[::step]
    return {"t": t.tolist(), "rr_ms": rr_ms.tolist()}


def analyze_file(
    path: str | Path,
    cache_dir: str | Path,
    channel: int = 1,            # V3 por padrão (usualmente melhor sinal)
    powerline: float = 60.0,
    force: bool = False,
    progress_cb=None,
) -> dict:
    """
    Executa pipeline completo e retorna dicionário com resultados.
    Salva em cache_dir/<stem>_analysis.json para reutilização.
    """
    path = Path(path)
    cache_dir = Path(cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)
    result_path = cache_dir / f"{path.stem}_analysis.json"

    if result_path.exists() and not force:
        with open(result_path) as f:
            return json.load(f)

    t0 = time.time()
    def step(msg):
        if progress_cb: progress_cb(msg)

    step("Carregando arquivo...")
    signal_raw, meta = load_ecg(path, cache_dir=cache_dir)

    step("Convertendo unidades...")
    sig_mv = to_millivolts(np.asarray(signal_raw), meta.unit)

    # Sanitização: para este formato observamos valores saturados em ±5320 uV (±5.32 mV)
    # que são artefatos ou DC. Substituímos por 0 para a análise de QRS.
    ch = min(channel, sig_mv.shape[1] - 1)
    x_all = sig_mv[:, ch].astype(np.float32, copy=True)
    sat = (np.abs(x_all) >= 5.3)
    if sat.any():
        x_all[sat] = 0.0
    step(f"Pré-processando canal {meta.channel_names[ch]}...")
    # Para arquivos longos, processamos em blocos para economizar memória
    fs = int(meta.fs)
    block = fs * 3600  # 1 hora por bloco
    filt = np.empty_like(x_all)
    for i0 in range(0, x_all.size, block):
        i1 = min(x_all.size, i0 + block)
        # adiciona overlap simétrico para evitar artefatos de borda
        pad = fs * 2
        j0 = max(0, i0 - pad)
        j1 = min(x_all.size, i1 + pad)
        y = preprocess(x_all[j0:j1], fs, powerline=powerline)
        filt[i0:i1] = y[i0 - j0 : (i0 - j0) + (i1 - i0)]

    step("Detectando complexos QRS...")
    r_peaks = detect_r_peaks(filt, fs, method="auto")
    rr = rr_intervals(r_peaks, fs)
    rr_clean = clean_rr(rr)

    step("Calculando FC e HRV...")
    hrv = hrv_all(rr_clean)
    td = hrv["tempo"]

    step("Resumo por hora...")
    hourly = _hourly_summary(r_peaks, rr, fs, meta.duration_s)

    step("Detectando arritmias...")
    peak_times_s = r_peaks / fs
    arr = detect_all(rr, peak_times_s, total_duration_s=meta.duration_s)

    step("Analisando segmento ST...")
    st = analyze_st(filt, r_peaks, fs)

    step("Analisando QT/QTc...")
    qt = analyze_qt(filt, r_peaks, rr, fs)

    step("Classificando morfologia dos batimentos...")
    morph = classify_beats(filt, r_peaks, fs)

    step("Montando tacograma...")
    tacho = _tachogram_samples(r_peaks, rr, fs)

    step("Gerando trends e histogramas...")
    hr_trend = _hr_trend_per_minute(r_peaks, rr, fs, meta.duration_s)
    poincare = _poincare(rr_clean)
    rr_hist = _rr_histogram(rr_clean)
    hr_hist = _hr_histogram(rr_clean)
    psd = _psd(rr_clean)
    st_trend = _st_trend_per_minute(filt, r_peaks, fs)
    full_disclosure = _full_disclosure_envelope(filt, fs)

    elapsed = round(time.time() - t0, 2)

    meta_d = meta.to_dict()
    result = {
        "metadata": meta_d,
        "canal_analisado": meta.channel_names[ch],
        "tempo_processamento_s": elapsed,
        "qrs": {
            "n_batimentos": int(len(r_peaks)),
            "batimentos_validos": int(len(rr_clean)),
        },
        "fc": {
            "media_bpm": td["mean_hr"],
            "min_bpm": float(60000 / td["max_rr"]) if td["max_rr"] else None,
            "max_bpm": float(60000 / td["min_rr"]) if td["min_rr"] else None,
        },
        "hrv": hrv,
        "arritmias": arr,
        "st": st,
        "resumo_horario": hourly,
        "tacograma": tacho,
        "hr_trend": hr_trend,
        "poincare": poincare,
        "rr_hist": rr_hist,
        "hr_hist": hr_hist,
        "psd": psd,
        "st_trend": st_trend,
        "full_disclosure": full_disclosure,
        "qt": qt,
        "morfologia": morph,
    }

    with open(result_path, "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=float)

    step(f"Análise concluída em {elapsed}s")
    return result

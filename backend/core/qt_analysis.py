"""
Análise do intervalo QT e do QT corrigido (QTc).

Implementação **rápida** (sem delineação wavelet lenta em 24h):

Para cada batimento amostrado:
  • Q onset  — mínimo local da derivada ~40 ms antes do R
  • T end    — ponto onde a derivada retorna próximo de zero depois do T peak
               (método "tangent line" simplificado)

QT = T_end − Q_onset                        (ms)
QTc (Bazett)      = QT / √(RR)              (ms, RR em s)
QTc (Fridericia)  = QT / (RR)^(1/3)         (ms, RR em s)

Limiares clínicos:
  QTc normal:   < 440 ms (homens) / < 460 ms (mulheres)
  Prolongado:   ≥ 450–480 ms
  Alto risco:   ≥ 500 ms
"""
from __future__ import annotations

import numpy as np


def _stats(v: np.ndarray) -> dict:
    v = v[np.isfinite(v)]
    if v.size == 0:
        return {"n": 0, "media": None, "min": None, "max": None, "std": None, "mediana": None}
    return {
        "n": int(v.size),
        "media":   float(np.median(v)),  # usamos mediana como robusto
        "mediana": float(np.median(v)),
        "min":     float(np.percentile(v, 5)),
        "max":     float(np.percentile(v, 95)),
        "std":     float(np.std(v, ddof=1)) if v.size > 1 else 0.0,
    }


def _measure_qt_single(segment: np.ndarray, r_local: int, fs: int) -> tuple[int, int] | None:
    """
    Mede Q_onset e T_end em um batimento único (segmento centrado em r_local).
    Retorna (q_onset_idx, t_end_idx) em coordenadas do segmento, ou None se falhar.
    """
    n = segment.size
    # 1. Q_onset: menor valor entre 60 e 20 ms antes do R (onda Q negativa)
    q_start = max(0, r_local - int(0.060 * fs))
    q_stop  = max(q_start + 1, r_local - int(0.020 * fs))
    if q_stop <= q_start:
        return None
    q_onset = q_start + int(np.argmin(segment[q_start:q_stop]))

    # 2. T peak: entre 150 e 400 ms após o R, pegamos o extremo absoluto
    t_start = r_local + int(0.150 * fs)
    t_stop  = min(n - 2, r_local + int(0.400 * fs))
    if t_stop <= t_start + 2:
        return None
    t_region = segment[t_start:t_stop]
    # T peak é o maior |valor| na região
    t_peak_local = int(np.argmax(np.abs(t_region - np.median(t_region))))
    t_peak = t_start + t_peak_local

    # 3. T_end via método da derivada: ponto após T_peak onde |derivada| volta a < 10% do max
    post = segment[t_peak : min(n, t_peak + int(0.200 * fs))]
    if post.size < 5:
        return None
    d = np.abs(np.diff(post))
    if d.size == 0 or d.max() == 0:
        return None
    # primeiro ponto após t_peak onde derivada cai abaixo de 15% do máximo local
    threshold = 0.15 * d.max()
    below = np.where(d < threshold)[0]
    if below.size == 0:
        t_end = t_peak + d.size - 1
    else:
        # pula pequenos ruídos iniciais: escolhe a primeira região contínua
        t_end = t_peak + int(below[0]) + 1

    if t_end <= q_onset:
        return None
    return q_onset, t_end


def analyze_qt(
    signal_mv: np.ndarray,
    r_peaks: np.ndarray,
    rr_s: np.ndarray,
    fs: int,
    max_beats: int = 2000,
) -> dict:
    """
    Mede QT beat-a-beat (amostrado) com medidor manual rápido.
    Retorna métricas agregadas + trend por minuto.
    """
    n_peaks = len(r_peaks)
    if n_peaks < 30:
        return {"disponivel": False, "motivo": "Poucos batimentos para análise QT."}

    # Subamostra picos uniformemente para velocidade
    if n_peaks > max_beats:
        idx = np.linspace(0, n_peaks - 1, max_beats).astype(int)
        peaks_used = r_peaks[idx]
    else:
        peaks_used = r_peaks

    pre = int(0.100 * fs)   # 100 ms antes do R
    pos = int(0.450 * fs)   # 450 ms após
    n_sig = signal_mv.size

    qt_ms_list = []
    rr_list = []
    t_list = []
    for p in peaks_used:
        lo, hi = p - pre, p + pos
        if lo < 0 or hi >= n_sig:
            continue
        seg = signal_mv[lo:hi]
        result = _measure_qt_single(seg, pre, fs)
        if result is None:
            continue
        q, te = result
        qt_samples = te - q
        qt_ms = qt_samples * 1000.0 / fs

        # RR precedente
        j = int(np.searchsorted(r_peaks, p))
        if j < 1 or j - 1 >= len(rr_s):
            continue
        rr = float(rr_s[j - 1])
        if not (0.4 <= rr <= 1.8):
            continue
        if not (250 <= qt_ms <= 600):
            continue
        qt_ms_list.append(qt_ms)
        rr_list.append(rr)
        t_list.append(p / fs / 60.0)  # tempo em minutos

    if len(qt_ms_list) < 30:
        return {"disponivel": False, "motivo": f"QT medido em só {len(qt_ms_list)} batimentos."}

    qt_arr = np.asarray(qt_ms_list)
    rr_arr = np.asarray(rr_list)
    t_arr = np.asarray(t_list)

    qtc_bazett = qt_arr / np.sqrt(rr_arr)
    qtc_frid   = qt_arr / np.cbrt(rr_arr)

    qtc_med = float(np.median(qtc_bazett))
    if qtc_med >= 500:
        cls = "Prolongamento de alto risco (QTc ≥ 500 ms)"
    elif qtc_med >= 460:
        cls = "QTc prolongado"
    elif qtc_med >= 440:
        cls = "QTc limítrofe"
    else:
        cls = "QTc normal"

    # trend por hora
    n_hours = int(t_arr.max() / 60) + 1 if t_arr.size else 0
    trend: list[float | None] = []
    for h in range(n_hours):
        m = (t_arr >= h * 60) & (t_arr < (h + 1) * 60)
        trend.append(float(np.median(qtc_bazett[m])) if m.any() else None)

    return {
        "disponivel": True,
        "n_valid": int(qt_arr.size),
        "qt_ms":             _stats(qt_arr),
        "qtc_bazett_ms":     _stats(qtc_bazett),
        "qtc_fridericia_ms": _stats(qtc_frid),
        "classificacao": cls,
        "qtc_trend_h": trend,
    }

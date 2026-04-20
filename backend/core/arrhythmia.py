"""
Detecção heurística de eventos arritmogênicos a partir dos intervalos RR.

⚠️  MVP - heurísticas simples, não validadas clinicamente.
    NÃO substitui análise médica.

Eventos detectados:
  - Bradicardia (FC < 50 bpm por ≥ 3 batimentos)
  - Taquicardia (FC > 100 bpm sustentada)
  - Taquicardia Supra/Ventricular suspeita (FC > 150 por ≥ 3 batimentos)
  - Pausa sinusal (RR > 2 s)
  - Extrassístole (RR curto seguido de pausa compensatória)
  - Suspeita de Fibrilação Atrial (alta irregularidade RR em janela de 30s)
"""
from __future__ import annotations

import numpy as np


def detect_bradycardia(rr_s: np.ndarray, peak_times: np.ndarray, threshold_bpm: float = 50,
                      min_beats: int = 3) -> list[dict]:
    hr = 60.0 / np.where(rr_s > 0, rr_s, np.nan)
    events = []
    i = 0
    n = len(hr)
    while i < n:
        if hr[i] < threshold_bpm:
            j = i
            while j < n and hr[j] < threshold_bpm:
                j += 1
            if (j - i) >= min_beats:
                events.append({
                    "tipo": "Bradicardia",
                    "inicio_s": float(peak_times[i]),
                    "fim_s": float(peak_times[min(j, len(peak_times) - 1)]),
                    "batimentos": int(j - i),
                    "fc_min": float(np.min(hr[i:j])),
                })
            i = j
        else:
            i += 1
    return events


def detect_tachycardia(rr_s: np.ndarray, peak_times: np.ndarray, threshold_bpm: float = 100,
                     min_beats: int = 3, label: str = "Taquicardia") -> list[dict]:
    hr = 60.0 / np.where(rr_s > 0, rr_s, np.nan)
    events = []
    i = 0
    n = len(hr)
    while i < n:
        if hr[i] > threshold_bpm:
            j = i
            while j < n and hr[j] > threshold_bpm:
                j += 1
            if (j - i) >= min_beats:
                events.append({
                    "tipo": label,
                    "inicio_s": float(peak_times[i]),
                    "fim_s": float(peak_times[min(j, len(peak_times) - 1)]),
                    "batimentos": int(j - i),
                    "fc_max": float(np.max(hr[i:j])),
                })
            i = j
        else:
            i += 1
    return events


def detect_pauses(rr_s: np.ndarray, peak_times: np.ndarray, threshold_s: float = 2.0) -> list[dict]:
    events = []
    for i, rr in enumerate(rr_s):
        if rr > threshold_s:
            events.append({
                "tipo": "Pausa",
                "inicio_s": float(peak_times[i]),
                "fim_s": float(peak_times[i] + rr),
                "duracao_s": float(rr),
            })
    return events


def detect_pvc_candidates(rr_s: np.ndarray, peak_times: np.ndarray) -> list[dict]:
    """
    Heurística simples de extrassístole:
    RR_i < 0.85 * média_local seguido de RR_{i+1} > 1.15 * média_local.
    """
    rr = np.asarray(rr_s, dtype=np.float64)
    if len(rr) < 10:
        return []
    # média móvel local (janela 8 batimentos)
    kernel = np.ones(8) / 8
    local_mean = np.convolve(rr, kernel, mode="same")
    events = []
    for i in range(1, len(rr) - 1):
        if rr[i] < 0.85 * local_mean[i] and rr[i + 1] > 1.15 * local_mean[i]:
            events.append({
                "tipo": "Extrassístole",
                "inicio_s": float(peak_times[i]),
                "fim_s": float(peak_times[i + 1]),
                "rr_prematuro_ms": float(rr[i] * 1000),
                "rr_compensatorio_ms": float(rr[i + 1] * 1000),
            })
    return events


def detect_af_suspect(rr_s: np.ndarray, peak_times: np.ndarray,
                     window_s: float = 30.0,
                     rmssd_threshold_ms: float = 180.0,
                     cv_threshold: float = 0.22,
                     min_shannon_entropy: float = 0.75) -> list[dict]:
    """
    Janela de 30s. Suspeita de FA se alta irregularidade:
      - RMSSD > 180 ms  E  CV(RR) > 0.22  E  alta entropia de Shannon
    Critérios mais estritos para reduzir falsos positivos em ectopia frequente.
    """
    if len(rr_s) < 10:
        return []
    t = np.asarray(peak_times[:-1], dtype=np.float64)  # tempos dos RR
    rr = np.asarray(rr_s, dtype=np.float64)

    events = []
    t_start = t[0]
    t_end = t[-1]
    step = window_s / 2.0
    cursor = t_start
    while cursor + window_s <= t_end:
        mask = (t >= cursor) & (t < cursor + window_s)
        if mask.sum() < 10:
            cursor += step
            continue
        w = rr[mask] * 1000  # ms
        diff = np.diff(w)
        rmssd = np.sqrt(np.mean(diff ** 2)) if len(diff) > 0 else 0.0
        cv = np.std(w) / np.mean(w) if np.mean(w) > 0 else 0.0

        # Shannon entropy sobre histograma normalizado de RR (sensibilidade a irregularidade real)
        hist, _ = np.histogram(w, bins=16, range=(300, 1800))
        p = hist / hist.sum() if hist.sum() > 0 else np.zeros_like(hist, dtype=float)
        nonzero = p[p > 0]
        entropy = -np.sum(nonzero * np.log2(nonzero)) / np.log2(16) if nonzero.size else 0.0

        if rmssd > rmssd_threshold_ms and cv > cv_threshold and entropy > min_shannon_entropy:
            events.append({
                "tipo": "Suspeita de FA",
                "inicio_s": float(cursor),
                "fim_s": float(cursor + window_s),
                "rmssd_ms": float(rmssd),
                "cv": float(cv),
            })
        cursor += step
    # mescla eventos contíguos
    merged: list[dict] = []
    for ev in events:
        if merged and ev["inicio_s"] <= merged[-1]["fim_s"] + 1:
            merged[-1]["fim_s"] = ev["fim_s"]
            merged[-1]["rmssd_ms"] = max(merged[-1]["rmssd_ms"], ev["rmssd_ms"])
            merged[-1]["cv"] = max(merged[-1]["cv"], ev["cv"])
        else:
            merged.append(ev)
    return merged


def af_burden(af_events: list[dict], total_duration_s: float) -> dict:
    """
    Cálculo clínico do Afib burden (fardo de fibrilação atrial):
      • total_af_s     — soma das durações dos episódios
      • burden_pct     — % do tempo do exame em suspeita de FA
      • episodes_count — nº de episódios distintos
      • longest_s      — episódio mais longo
    """
    if not af_events or total_duration_s <= 0:
        return {
            "total_af_s": 0.0, "burden_pct": 0.0,
            "episodes_count": 0, "longest_s": 0.0,
        }
    durations = [ev["fim_s"] - ev["inicio_s"] for ev in af_events]
    total = float(sum(durations))
    return {
        "total_af_s": total,
        "burden_pct": float(100.0 * total / total_duration_s),
        "episodes_count": int(len(af_events)),
        "longest_s": float(max(durations)),
    }


def detect_all(rr_s: np.ndarray, peak_times: np.ndarray, total_duration_s: float = 0.0) -> dict:
    af = detect_af_suspect(rr_s, peak_times)
    return {
        "bradicardia": detect_bradycardia(rr_s, peak_times),
        "taquicardia": detect_tachycardia(rr_s, peak_times, 100, 3, "Taquicardia"),
        "taquicardia_sustentada": detect_tachycardia(rr_s, peak_times, 150, 5, "Taquicardia sustentada"),
        "pausas": detect_pauses(rr_s, peak_times, 2.0),
        "extrassistoles": detect_pvc_candidates(rr_s, peak_times),
        "suspeita_fa": af,
        "af_burden": af_burden(af, total_duration_s),
    }

"""
Análise do segmento ST — desvio em relação à baseline PR.

Para cada batimento:
  - Baseline PR: média da amplitude 80–20 ms antes do pico R
  - Ponto J: ~40 ms após o pico R
  - ST medido em J+60 ms (ou J+80 ms para FC baixa)
  - Desvio ST = amplitude(ST) - baseline

Classificação heurística (MVP):
  - Normal:   |ΔST| < 1 mm   (< 0,1 mV)
  - Limítrofe: 1 – 2 mm
  - Depressão ≥ 2 mm  ou  Supra ≥ 2 mm → "Alteração significativa"

⚠️ Heurística MVP, não substitui análise médica.
"""
from __future__ import annotations

import numpy as np


def analyze_st(
    signal_mv: np.ndarray,
    r_peaks: np.ndarray,
    fs: int,
    pre_ms: tuple = (80, 20),
    j_offset_ms: int = 40,
    st_offset_ms: int = 60,
) -> dict:
    """
    Mede ST e retorna estatísticas + contagem de eventos.
    signal_mv: sinal em milivolts (1D).
    """
    x = np.asarray(signal_mv, dtype=np.float32)
    n = x.size
    pre_lo = int(pre_ms[0] * fs / 1000)
    pre_hi = int(pre_ms[1] * fs / 1000)
    j_off = int(j_offset_ms * fs / 1000)
    st_off = int(st_offset_ms * fs / 1000)

    deviations = []
    for p in r_peaks:
        b0 = p - pre_lo
        b1 = p - pre_hi
        st_idx = p + j_off + st_off
        if b0 < 0 or st_idx >= n:
            continue
        baseline = float(np.mean(x[b0:b1]))
        st_val = float(np.mean(x[st_idx - 1:st_idx + 2]))
        deviations.append(st_val - baseline)

    if not deviations:
        return {
            "n_analisados": 0,
            "st_medio_mv": None,
            "st_max_supra_mv": None,
            "st_max_infra_mv": None,
            "batimentos_limite": 0,
            "batimentos_alterados": 0,
            "classificacao": "sem dados",
        }

    arr = np.asarray(deviations)
    n_alt = int(np.sum(np.abs(arr) >= 0.2))   # >= 2 mm
    n_lim = int(np.sum((np.abs(arr) >= 0.1) & (np.abs(arr) < 0.2)))
    if n_alt / len(arr) > 0.1:
        clsf = "Alteração significativa"
    elif n_lim / len(arr) > 0.2:
        clsf = "Limítrofe"
    else:
        clsf = "Sem alterações significativas"

    return {
        "n_analisados": int(len(arr)),
        "st_medio_mv": float(np.mean(arr)),
        "st_mediana_mv": float(np.median(arr)),
        "st_max_supra_mv": float(np.max(arr)),
        "st_max_infra_mv": float(np.min(arr)),
        "batimentos_limite": n_lim,
        "batimentos_alterados": n_alt,
        "classificacao": clsf,
    }

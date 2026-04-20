"""
Análise de Variabilidade da Frequência Cardíaca (HRV).

Métricas no domínio do tempo:
  - SDNN       : desvio padrão dos intervalos NN (ms)
  - RMSSD      : raiz da média das diferenças sucessivas ao quadrado (ms)
  - pNN50      : % de intervalos NN sucessivos com diferença > 50 ms
  - Mean HR    : frequência cardíaca média (bpm)

Métricas no domínio da frequência (via interpolação + Welch):
  - VLF  : 0.003–0.04 Hz
  - LF   : 0.04–0.15 Hz
  - HF   : 0.15–0.40 Hz
  - LF/HF

Referências: Task Force ESC/NASPE 1996.
"""
from __future__ import annotations

import numpy as np
from scipy.signal import welch


def time_domain(rr_s: np.ndarray) -> dict:
    """Métricas tempo (RR em segundos)."""
    rr_ms = np.asarray(rr_s, dtype=np.float64) * 1000.0
    if rr_ms.size < 2:
        return dict(n=int(rr_ms.size), mean_hr=None, sdnn=None, rmssd=None, pnn50=None,
                    mean_rr=None, min_rr=None, max_rr=None)
    diff = np.diff(rr_ms)
    return dict(
        n=int(rr_ms.size),
        mean_rr=float(np.mean(rr_ms)),
        min_rr=float(np.min(rr_ms)),
        max_rr=float(np.max(rr_ms)),
        mean_hr=float(60000.0 / np.mean(rr_ms)),
        sdnn=float(np.std(rr_ms, ddof=1)),
        rmssd=float(np.sqrt(np.mean(diff**2))),
        pnn50=float(100.0 * np.mean(np.abs(diff) > 50)),
    )


def frequency_domain(rr_s: np.ndarray, fs_interp: float = 4.0) -> dict:
    """
    Interpola o tacograma em grade uniforme (4 Hz) e calcula o PSD (Welch).
    Integra em VLF, LF, HF e calcula LF/HF.
    """
    rr = np.asarray(rr_s, dtype=np.float64)
    if rr.size < 30:
        return dict(vlf=None, lf=None, hf=None, total_power=None, lf_hf=None,
                    lf_nu=None, hf_nu=None)

    t = np.cumsum(rr)
    t = t - t[0]
    n_new = int(t[-1] * fs_interp)
    if n_new < 64:
        return dict(vlf=None, lf=None, hf=None, total_power=None, lf_hf=None,
                    lf_nu=None, hf_nu=None)
    t_new = np.arange(n_new) / fs_interp
    rr_interp = np.interp(t_new, t, rr)
    rr_interp = rr_interp - np.mean(rr_interp)

    nperseg = min(len(rr_interp), 256)
    f, p = welch(rr_interp, fs=fs_interp, nperseg=nperseg)

    def band_power(f, p, lo, hi):
        m = (f >= lo) & (f < hi)
        if not np.any(m):
            return 0.0
        return float(np.trapz(p[m], f[m]) * 1e6)  # para ms²

    vlf = band_power(f, p, 0.003, 0.04)
    lf = band_power(f, p, 0.04, 0.15)
    hf = band_power(f, p, 0.15, 0.40)
    total = vlf + lf + hf
    lf_hf = (lf / hf) if hf > 0 else None
    denom = lf + hf
    lf_nu = (100 * lf / denom) if denom > 0 else None
    hf_nu = (100 * hf / denom) if denom > 0 else None
    return dict(
        vlf=vlf, lf=lf, hf=hf, total_power=total, lf_hf=lf_hf,
        lf_nu=lf_nu, hf_nu=hf_nu,
    )


def hrv_all(rr_s: np.ndarray) -> dict:
    """Combina métricas tempo + frequência."""
    return {
        "tempo": time_domain(rr_s),
        "frequencia": frequency_domain(rr_s),
    }

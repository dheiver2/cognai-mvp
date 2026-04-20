"""
Detecção de complexos QRS — implementação Pan-Tompkins simplificada
+ fallback para neurokit2 se disponível.

Retorna índices de picos R e vetor de intervalos RR (em segundos).
"""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, filtfilt


def _pt_bandpass(x: np.ndarray, fs: int) -> np.ndarray:
    ny = fs * 0.5
    b, a = butter(1, [5 / ny, 15 / ny], btype="band")
    return filtfilt(b, a, x)


def pan_tompkins(signal: np.ndarray, fs: int) -> np.ndarray:
    """
    Detecta picos R via Pan-Tompkins simplificado.
    Retorna índices dos picos em amostras.
    """
    x = np.asarray(signal, dtype=np.float64)

    # 1. Bandpass 5-15 Hz
    y = _pt_bandpass(x, fs)

    # 2. Diferenciador
    dy = np.diff(y, prepend=y[0])

    # 3. Quadrado
    sq = dy * dy

    # 4. Integração em janela móvel (~150 ms)
    win = max(1, int(0.150 * fs))
    kernel = np.ones(win) / win
    ma = np.convolve(sq, kernel, mode="same")

    # 5. Threshold adaptativo com picos
    from scipy.signal import find_peaks

    # Estima amplitude típica em janelas de 5 s
    min_distance = int(0.2 * fs)  # refractário ~200 ms (300 bpm máximo)
    # threshold inicial robusto
    thr = 0.35 * np.quantile(ma, 0.98) + 1e-6
    peaks, _ = find_peaks(ma, height=thr, distance=min_distance)

    # Refinamento: localiza o pico real no sinal filtrado perto de cada candidato
    search = int(0.05 * fs)  # ±50 ms
    refined = []
    for p in peaks:
        lo = max(0, p - search)
        hi = min(len(x), p + search)
        refined.append(lo + int(np.argmax(np.abs(x[lo:hi]))))
    return np.asarray(refined, dtype=np.int64)


def detect_r_peaks(signal: np.ndarray, fs: int, method: str = "auto") -> np.ndarray:
    """
    Detecta picos R. Tenta neurokit2 primeiro (mais robusto), senão usa Pan-Tompkins.
    """
    if method in ("auto", "neurokit"):
        try:
            import neurokit2 as nk

            _, info = nk.ecg_peaks(signal, sampling_rate=fs)
            return np.asarray(info["ECG_R_Peaks"], dtype=np.int64)
        except Exception:
            if method == "neurokit":
                raise
    return pan_tompkins(signal, fs)


def rr_intervals(peaks: np.ndarray, fs: int) -> np.ndarray:
    """Calcula RR em segundos a partir dos índices de pico."""
    if len(peaks) < 2:
        return np.array([], dtype=np.float64)
    return np.diff(peaks).astype(np.float64) / fs


def heart_rate(rr_s: np.ndarray) -> np.ndarray:
    """FC instantânea em bpm."""
    rr = np.asarray(rr_s)
    rr = np.where(rr > 0, rr, np.nan)
    return 60.0 / rr


def clean_rr(rr_s: np.ndarray, min_rr: float = 0.3, max_rr: float = 2.0) -> np.ndarray:
    """Remove artefatos óbvios (RR < 300ms ou > 2000ms)."""
    rr = np.asarray(rr_s, dtype=np.float64)
    mask = (rr >= min_rr) & (rr <= max_rr)
    return rr[mask]

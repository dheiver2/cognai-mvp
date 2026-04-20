"""
Pré-processamento do sinal ECG:
 - remoção de baseline (filtro passa-alta)
 - filtro passa-baixa para ruído muscular / rede elétrica
"""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, filtfilt, iirnotch


def bandpass(signal: np.ndarray, fs: int, low: float = 0.5, high: float = 40.0) -> np.ndarray:
    """Filtro Butterworth de 2ª ordem passa-faixa para ECG."""
    ny = fs * 0.5
    low_n = max(1e-4, low / ny)
    high_n = min(0.99, high / ny)
    b, a = butter(2, [low_n, high_n], btype="band")
    return filtfilt(b, a, signal).astype(np.float32)


def notch_filter(signal: np.ndarray, fs: int, freq: float = 60.0, q: float = 30.0) -> np.ndarray:
    """Notch para rede elétrica (padrão 60 Hz Brasil)."""
    if freq >= fs / 2:
        return signal
    b, a = iirnotch(freq / (fs * 0.5), q)
    return filtfilt(b, a, signal).astype(np.float32)


def preprocess(signal: np.ndarray, fs: int, powerline: float = 60.0) -> np.ndarray:
    """Pipeline: notch + bandpass (0.5–40 Hz)."""
    x = signal.astype(np.float32)
    x = notch_filter(x, fs, powerline)
    x = bandpass(x, fs, 0.5, 40.0)
    return x

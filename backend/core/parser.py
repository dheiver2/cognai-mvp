"""
Parser para arquivos ECG no formato do sistema (TXT com header + colunas V1 V3 V5).

Exemplo de formato:
    ID:0000015
    Samples:17312946
    Export Frequency:200
    Channel:3
    Unit:uV
         V1     V3     V5
      -5318   5320   5318
      ...
"""
from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

import numpy as np


@dataclass
class ECGMetadata:
    patient_id: str
    samples: int
    fs: int           # frequência em Hz
    n_channels: int
    unit: str
    channel_names: list
    duration_s: float

    def to_dict(self):
        return asdict(self)


def _parse_header(path: Path) -> tuple[ECGMetadata, int]:
    """Lê o cabeçalho textual. Retorna metadados e o byte-offset onde começam os dados numéricos."""
    meta = {}
    channel_names: list[str] = []
    header_bytes = 0
    with open(path, "rb") as f:
        for _ in range(20):
            line = f.readline()
            if not line:
                break
            header_bytes += len(line)
            text = line.decode("utf-8", errors="ignore").strip()
            if ":" in text:
                k, v = text.split(":", 1)
                meta[k.strip().lower()] = v.strip()
                continue
            parts = text.split()
            if parts and all(p.replace("-", "").lstrip("+").isalnum() and not p.lstrip("-+").replace(".", "").isdigit() for p in parts):
                channel_names = parts
                break
        # Se não achamos cabeçalho de colunas, assume default
        if not channel_names:
            channel_names = ["V1", "V3", "V5"]

    samples = int(meta.get("samples", 0))
    fs = int(meta.get("export frequency", 200))
    n_channels = int(meta.get("channel", len(channel_names)))
    unit = meta.get("unit", "uV")
    pid = meta.get("id", path.stem)

    metadata = ECGMetadata(
        patient_id=pid,
        samples=samples,
        fs=fs,
        n_channels=n_channels,
        unit=unit,
        channel_names=channel_names,
        duration_s=samples / fs if fs else 0.0,
    )
    return metadata, header_bytes


def _cache_paths(path: Path, cache_dir: Path) -> tuple[Path, Path]:
    """Cria nomes de arquivos de cache baseados no hash de caminho+mtime (rápido)."""
    stat = path.stat()
    key = f"{path.resolve()}|{stat.st_mtime_ns}|{stat.st_size}"
    h = hashlib.md5(key.encode()).hexdigest()[:12]
    base = cache_dir / f"{path.stem}_{h}"
    return base.with_suffix(".npy"), base.with_suffix(".meta.json")


def load_ecg(
    path: str | os.PathLike,
    cache_dir: Optional[str | os.PathLike] = None,
    force_rebuild: bool = False,
) -> tuple[np.ndarray, ECGMetadata]:
    """
    Carrega o ECG e retorna (signal[n_samples, n_channels], metadata).
    Usa cache .npy memmap para leituras subsequentes rápidas.
    """
    import json

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)

    cache_dir = Path(cache_dir or path.parent / "_cache")
    cache_dir.mkdir(parents=True, exist_ok=True)

    npy_path, meta_path = _cache_paths(path, cache_dir)

    if npy_path.exists() and meta_path.exists() and not force_rebuild:
        signal = np.load(npy_path, mmap_mode="r")
        with open(meta_path) as f:
            m = json.load(f)
        meta = ECGMetadata(**m)
        return signal, meta

    # Seleção de formato via registry multi-formato
    from .formats import detect_format

    parser = detect_format(path)
    if parser is None:
        raise ValueError(
            f"Formato não reconhecido: {path.name}. "
            "Suportados: Contec TXT, EDF/EDF+, MIT-BIH (WFDB), CSV/TSV, DICOM, HL7 aECG."
        )
    arr, meta = parser.parse(path)

    # salva cache .npy
    np.save(npy_path, arr)
    with open(meta_path, "w") as f:
        json.dump(meta.to_dict(), f, ensure_ascii=False, indent=2)

    return np.load(npy_path, mmap_mode="r"), meta


def _count_header_lines(path: Path) -> int:
    count = 0
    with open(path, "rb") as f:
        for line in f:
            text = line.decode("utf-8", errors="ignore").strip()
            if not text:
                count += 1
                continue
            parts = text.split()
            # primeira linha totalmente numérica => fim do header
            try:
                [float(p) for p in parts]
                return count
            except ValueError:
                count += 1
    return count


def to_millivolts(signal: np.ndarray, unit: str) -> np.ndarray:
    """Converte para mV (padrão para análise)."""
    unit = (unit or "").lower()
    if unit in ("uv", "µv", "microvolt"):
        return signal.astype(np.float32) / 1000.0
    if unit in ("mv", "millivolt"):
        return signal.astype(np.float32)
    return signal.astype(np.float32)


def get_window(
    signal: np.ndarray, fs: int, start_s: float, dur_s: float, channel: int = 1
) -> tuple[np.ndarray, np.ndarray]:
    """Extrai uma janela de sinal. Retorna (tempos_em_s, amplitude)."""
    i0 = max(0, int(start_s * fs))
    i1 = min(signal.shape[0], int((start_s + dur_s) * fs))
    seg = np.asarray(signal[i0:i1, channel])
    t = np.arange(i0, i1) / fs
    return t, seg


def downsample_for_display(x: np.ndarray, target_points: int = 4000) -> np.ndarray:
    """Downsampling para visualização (min/max por bin preservando morfologia)."""
    n = len(x)
    if n <= target_points:
        return x
    bin_size = n // (target_points // 2)
    usable = (n // bin_size) * bin_size
    xr = x[:usable].reshape(-1, bin_size)
    mins = xr.min(axis=1)
    maxs = xr.max(axis=1)
    out = np.empty(mins.size * 2, dtype=x.dtype)
    out[0::2] = mins
    out[1::2] = maxs
    return out

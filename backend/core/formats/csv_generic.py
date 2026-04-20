"""Parser CSV/TSV genérico com auto-detecção de delimitador, header e fs."""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd

from ..parser import ECGMetadata
from .base import BaseFormatParser, FormatInfo


class CSVParser(BaseFormatParser):
    info = FormatInfo(
        id="csv",
        name="CSV / TSV genérico",
        description="Planilhas de sinais ECG com ou sem cabeçalho. Auto-detecta colunas.",
        extensions=[".csv", ".tsv"],
        vendors=["qualquer", "exportações customizadas"],
    )

    def detect(self, path: Path) -> bool:
        return path.suffix.lower() in (".csv", ".tsv")

    def parse(self, path: Path) -> tuple[np.ndarray, ECGMetadata]:
        sep = "," if path.suffix.lower() == ".csv" else "\t"

        # Tenta ler header (primeiras 200 bytes) para detectar metadata inline.
        with open(path, "rb") as f:
            preview = f.read(2000).decode("utf-8", errors="ignore")
        fs_match = re.search(r"(?:fs|rate|freq(?:uency)?)\s*[:=]\s*(\d+)", preview, re.IGNORECASE)
        fs = int(fs_match.group(1)) if fs_match else 250  # default

        # tenta ler com header; se houver muito texto, usa sem
        try:
            df = pd.read_csv(path, sep=sep, engine="c")
            # se há ID/timestamp/etc, mantém apenas colunas numéricas
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if not num_cols:
                raise ValueError("Nenhuma coluna numérica.")
            # se houver coluna "time"/"t", descarta
            num_cols = [c for c in num_cols if not re.match(r"^(time|t|timestamp|ts)$", str(c), re.IGNORECASE)]
            arr = df[num_cols].to_numpy(dtype=np.float32)
            labels = [str(c) for c in num_cols]
        except Exception:
            arr = pd.read_csv(path, sep=sep, header=None, engine="c", dtype=np.float32).to_numpy(dtype=np.float32)
            labels = [f"ch{i+1}" for i in range(arr.shape[1] if arr.ndim > 1 else 1)]

        if arr.ndim == 1:
            arr = arr.reshape(-1, 1)

        # Heurística de unidade: range típico ECG uV é |x| < 10_000; mV é |x| < 20
        max_abs = float(np.nanmax(np.abs(arr[: min(len(arr), fs * 5)])))
        if max_abs < 20:
            unit = "mV"
            arr = arr * 1000.0
            unit = "uV"
        else:
            unit = "uV"

        meta = ECGMetadata(
            patient_id=path.stem,
            samples=arr.shape[0],
            fs=fs,
            n_channels=arr.shape[1],
            unit=unit,
            channel_names=labels[:arr.shape[1]],
            duration_s=arr.shape[0] / fs,
        )
        return arr, meta

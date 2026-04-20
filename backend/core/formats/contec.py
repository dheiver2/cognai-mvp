"""Parser Contec TXT (formato ECGData.txt)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from ..parser import ECGMetadata, _parse_header, _count_header_lines
from .base import BaseFormatParser, FormatInfo


class ContecTXTParser(BaseFormatParser):
    info = FormatInfo(
        id="contec_txt",
        name="Contec TXT (ECGData)",
        description="Formato texto exportado por equipamentos Contec e OEM compatíveis.",
        extensions=[".txt"],
        vendors=["Contec", "OEM Contec-compatível"],
    )

    def detect(self, path: Path) -> bool:
        if path.suffix.lower() != ".txt":
            return False
        try:
            with open(path, "rb") as f:
                head = f.read(400).decode("utf-8", errors="ignore").lower()
            return "samples" in head and "export frequency" in head
        except Exception:
            return False

    def parse(self, path: Path) -> tuple[np.ndarray, ECGMetadata]:
        meta, _ = _parse_header(path)
        skip = _count_header_lines(path)
        df = pd.read_csv(
            path, skiprows=skip, sep=r"\s+", header=None,
            engine="c", dtype=np.float32, na_filter=False,
        )
        arr = df.to_numpy(dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(-1, max(1, meta.n_channels))
        meta.samples = arr.shape[0]
        meta.n_channels = arr.shape[1]
        meta.duration_s = meta.samples / meta.fs
        return arr, meta

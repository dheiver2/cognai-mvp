"""Parser MIT-BIH / WFDB (PhysioNet)."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from ..parser import ECGMetadata
from .base import BaseFormatParser, FormatInfo


class WFDBParser(BaseFormatParser):
    info = FormatInfo(
        id="wfdb",
        name="MIT-BIH / WFDB",
        description="Padrão PhysioNet — amplamente usado em pesquisa acadêmica.",
        extensions=[".dat", ".hea"],
        vendors=["PhysioNet", "MIT", "pesquisa acadêmica"],
    )

    def detect(self, path: Path) -> bool:
        # Para MIT-BIH, precisamos do .hea (cabeçalho)
        if path.suffix.lower() == ".hea":
            return True
        if path.suffix.lower() == ".dat":
            return path.with_suffix(".hea").exists()
        return False

    def parse(self, path: Path) -> tuple[np.ndarray, ECGMetadata]:
        try:
            import wfdb
        except ImportError as e:
            raise RuntimeError("Instale 'wfdb' para carregar MIT-BIH.") from e

        # wfdb.rdrecord espera o prefixo sem extensão
        record = wfdb.rdrecord(str(path.with_suffix("")))

        arr = np.asarray(record.p_signal, dtype=np.float32)  # em unidade física (mV)
        fs = int(record.fs)
        labels = list(record.sig_name) if record.sig_name else [f"ch{i}" for i in range(arr.shape[1])]

        # unidade normalmente é mV → convertemos para uV para uniformizar
        units = record.units if record.units else []
        if units and units[0].lower() in ("mv", "millivolt"):
            arr = arr * 1000.0
            unit = "uV"
        elif units and units[0].lower() in ("uv", "µv", "microvolt"):
            unit = "uV"
        else:
            unit = "uV"

        meta = ECGMetadata(
            patient_id=getattr(record, "record_name", path.stem),
            samples=arr.shape[0],
            fs=fs,
            n_channels=arr.shape[1],
            unit=unit,
            channel_names=labels,
            duration_s=arr.shape[0] / fs,
        )
        return arr, meta

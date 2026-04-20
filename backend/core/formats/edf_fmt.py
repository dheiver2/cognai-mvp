"""Parser EDF / EDF+ (European Data Format)."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from ..parser import ECGMetadata
from .base import BaseFormatParser, FormatInfo


class EDFParser(BaseFormatParser):
    info = FormatInfo(
        id="edf",
        name="EDF / EDF+",
        description="Padrão europeu para biosignais — amplamente adotado em pesquisa e equipamentos hospitalares.",
        extensions=[".edf", ".edf+", ".rec"],
        vendors=["Compumedics", "Natus", "Nihon Kohden", "MedWare", "pesquisa acadêmica"],
    )

    def detect(self, path: Path) -> bool:
        if path.suffix.lower() not in self.info.extensions:
            return False
        try:
            with open(path, "rb") as f:
                head = f.read(8)
            # EDF/EDF+ começa com "0       " ou com b"\xff" (BDF não suportado aqui)
            return head[:1] in (b"0", b" ")
        except Exception:
            return False

    def parse(self, path: Path) -> tuple[np.ndarray, ECGMetadata]:
        try:
            import pyedflib
        except ImportError as e:
            raise RuntimeError("Instale 'pyedflib' para carregar EDF.") from e

        with pyedflib.EdfReader(str(path)) as f:
            n_ch = f.signals_in_file
            labels = f.getSignalLabels()
            # usa a fs do primeiro canal; se houver diferentes, re-amostra p/ alinhar
            fs_list = [f.getSampleFrequency(i) for i in range(n_ch)]
            fs = int(round(fs_list[0]))

            # prioriza canais ECG (contém "ECG", "Lead", "V", "I", "II", "III")
            ecg_idx = [i for i, lbl in enumerate(labels)
                       if any(k in lbl.upper() for k in ("ECG", "LEAD", "V1", "V2", "V3", "V4", "V5", "V6", " I", " II", "III", "AVR", "AVL", "AVF"))]
            if not ecg_idx:
                ecg_idx = list(range(min(3, n_ch)))  # primeiros 3

            signals = []
            min_len = min(f.getNSamples()[i] for i in ecg_idx)
            for i in ecg_idx:
                sig = f.readSignal(i)[:min_len]
                signals.append(sig.astype(np.float32))
            arr = np.stack(signals, axis=1)
            labels_used = [labels[i] for i in ecg_idx]

        # pyedflib retorna em unidade física (uV/mV conforme header); assumimos uV
        # se os valores estiverem em range de mV (|x| < 20), convertemos para uV
        unit = "uV"
        max_abs = float(np.max(np.abs(arr[: min(len(arr), fs * 5)])))
        if max_abs < 20:
            unit = "mV"
            arr = arr * 1000.0
            unit = "uV"

        meta = ECGMetadata(
            patient_id=path.stem,
            samples=arr.shape[0],
            fs=fs,
            n_channels=arr.shape[1],
            unit=unit,
            channel_names=labels_used,
            duration_s=arr.shape[0] / fs,
        )
        return arr, meta

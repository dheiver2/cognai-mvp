"""Parser DICOM Waveform (ECG armazenado em PACS)."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from ..parser import ECGMetadata
from .base import BaseFormatParser, FormatInfo


class DICOMParser(BaseFormatParser):
    info = FormatInfo(
        id="dicom",
        name="DICOM Waveform",
        description="ECG/Holter armazenado em PACS hospitalar no padrão DICOM.",
        extensions=[".dcm", ".dicom"],
        vendors=["Philips", "GE", "Siemens", "Mindray", "PACS hospitalares"],
    )

    def detect(self, path: Path) -> bool:
        if path.suffix.lower() in (".dcm", ".dicom"):
            return True
        try:
            with open(path, "rb") as f:
                f.seek(128)
                magic = f.read(4)
            return magic == b"DICM"
        except Exception:
            return False

    def parse(self, path: Path) -> tuple[np.ndarray, ECGMetadata]:
        try:
            import pydicom
        except ImportError as e:
            raise RuntimeError("Instale 'pydicom' para carregar DICOM.") from e

        ds = pydicom.dcmread(str(path), stop_before_pixels=False, force=True)
        if not hasattr(ds, "WaveformSequence") or not ds.WaveformSequence:
            raise ValueError("Arquivo DICOM não contém WaveformSequence (não é ECG/Holter).")

        w = ds.WaveformSequence[0]
        fs = int(w.SamplingFrequency)
        n_channels = int(w.NumberOfWaveformChannels)
        bits = int(w.WaveformBitsAllocated)
        samples = int(w.NumberOfWaveformSamples)

        raw = w.WaveformData
        dtype = np.int16 if bits == 16 else (np.int8 if bits == 8 else np.int32)
        data = np.frombuffer(raw, dtype=dtype).astype(np.float32)
        arr = data.reshape(-1, n_channels)[:samples]

        # sensibilidade por canal
        labels: list[str] = []
        sensitivities = []
        for chan_def in w.ChannelDefinitionSequence:
            src = getattr(chan_def, "ChannelSourceSequence", None)
            name = src[0].CodeMeaning if src else "ch"
            labels.append(str(name))
            sens = float(getattr(chan_def, "ChannelSensitivity", 1.0))
            sensitivities.append(sens)
        if sensitivities and len(sensitivities) == arr.shape[1]:
            arr = arr * np.array(sensitivities, dtype=np.float32)

        unit = "uV"
        pid = str(getattr(ds, "PatientID", path.stem))

        meta = ECGMetadata(
            patient_id=pid,
            samples=arr.shape[0],
            fs=fs,
            n_channels=arr.shape[1],
            unit=unit,
            channel_names=labels,
            duration_s=arr.shape[0] / fs,
        )
        return arr, meta

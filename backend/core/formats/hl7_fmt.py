"""Parser HL7 aECG (annotated ECG XML)."""
from __future__ import annotations

import re
from pathlib import Path
from xml.etree import ElementTree as ET

import numpy as np

from ..parser import ECGMetadata
from .base import BaseFormatParser, FormatInfo


class HL7aECGParser(BaseFormatParser):
    info = FormatInfo(
        id="hl7_aecg",
        name="HL7 aECG (XML)",
        description="ECG anotado no padrão HL7 v3 — comum em integrações hospitalares.",
        extensions=[".xml", ".aecg"],
        vendors=["Philips", "Mortara", "GE", "integrações HL7"],
    )

    def detect(self, path: Path) -> bool:
        if path.suffix.lower() not in (".xml", ".aecg"):
            return False
        try:
            with open(path, "rb") as f:
                head = f.read(2000).decode("utf-8", errors="ignore").lower()
            return "aecg" in head or "annotatedecg" in head or "hl7" in head
        except Exception:
            return False

    def parse(self, path: Path) -> tuple[np.ndarray, ECGMetadata]:
        tree = ET.parse(path)
        root = tree.getroot()
        ns = {"hl7": "urn:hl7-org:v3"}

        # Busca digit values — cada sequence é um lead
        series_samples: list[list[float]] = []
        labels: list[str] = []
        fs = 500  # default HL7

        for seq in root.iter():
            tag = seq.tag.split("}")[-1]
            if tag in ("sequence", "digits"):
                text = seq.text or ""
                nums = re.findall(r"-?\d+\.?\d*", text)
                if len(nums) > 100:
                    series_samples.append([float(x) for x in nums])
                    code = seq.get("code") or f"lead{len(series_samples)}"
                    labels.append(code)

        # fs
        for inc in root.iter():
            if inc.tag.split("}")[-1] == "increment":
                val = inc.get("value")
                unit = inc.get("unit", "s")
                if val:
                    inc_val = float(val)
                    if unit.lower() == "ms":
                        inc_val /= 1000
                    fs = int(round(1 / inc_val))
                    break

        if not series_samples:
            raise ValueError("Nenhuma sequence de amostras encontrada no XML aECG.")

        min_len = min(len(s) for s in series_samples)
        arr = np.array([s[:min_len] for s in series_samples], dtype=np.float32).T

        # valores já em uV (padrão aECG)
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

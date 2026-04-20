"""Interface base dos parsers."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from ..parser import ECGMetadata


@dataclass
class FormatInfo:
    id: str                    # identificador único ("edf", "contec_txt", ...)
    name: str                  # rótulo legível ("EDF / EDF+")
    description: str           # descrição curta
    extensions: list[str]      # [".edf", ".edf+"]
    vendors: list[str]         # nomes de fabricantes tipicamente associados


class BaseFormatParser:
    info: FormatInfo

    def detect(self, path: Path) -> bool:
        """Retorna True se este parser consegue ler o arquivo."""
        raise NotImplementedError

    def parse(self, path: Path) -> tuple[np.ndarray, ECGMetadata]:
        """
        Retorna (signal[n_samples, n_channels], metadata).
        Dados em unidade física (uV ou mV).
        """
        raise NotImplementedError

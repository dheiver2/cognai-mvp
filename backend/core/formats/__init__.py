"""
Registry de formatos suportados.

Qualquer novo formato herda `BaseFormatParser`, define seu nome, extensões
e método `detect()` + `parse()`. O registry seleciona automaticamente
o parser certo para um arquivo qualquer.

Formatos suportados no MVP:
  • Contec TXT (ECGData)                     — equipamentos Contec e derivados
  • EDF / EDF+                               — padrão europeu (biosignais)
  • MIT-BIH / WFDB (.dat + .hea)             — PhysioNet / MIT
  • CSV / TSV genérico                       — qualquer planilha com sinais
  • DICOM Waveform                           — PACS / Dicom
  • HL7 aECG (XML)                            — hospitais padrão HL7
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from .base import BaseFormatParser, FormatInfo
from .contec import ContecTXTParser
from .edf_fmt import EDFParser
from .wfdb_fmt import WFDBParser
from .csv_generic import CSVParser
from .dicom_fmt import DICOMParser
from .hl7_fmt import HL7aECGParser


REGISTRY: list[BaseFormatParser] = [
    # ordem importa: parsers mais específicos primeiro
    ContecTXTParser(),
    EDFParser(),
    WFDBParser(),
    DICOMParser(),
    HL7aECGParser(),
    CSVParser(),  # genérico: último
]


def detect_format(path: str | Path) -> Optional[BaseFormatParser]:
    """Retorna o primeiro parser que reconhece o arquivo, ou None."""
    p = Path(path)
    for parser in REGISTRY:
        try:
            if parser.detect(p):
                return parser
        except Exception:
            continue
    return None


def list_formats() -> list[FormatInfo]:
    """Lista todos os formatos suportados (para exibir no frontend)."""
    return [fmt.info for fmt in REGISTRY]


def supported_extensions() -> list[str]:
    """Extensões suportadas (para filtro de upload)."""
    exts: set[str] = set()
    for fmt in REGISTRY:
        exts.update(fmt.info.extensions)
    return sorted(exts)

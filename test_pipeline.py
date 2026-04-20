"""Teste rápido do pipeline com o arquivo real."""
import sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from backend.core.parser import load_ecg, to_millivolts
from backend.core.signal_processing import preprocess
from backend.core.qrs import detect_r_peaks, rr_intervals, clean_rr
from backend.core.hrv import hrv_all
from backend.core.arrhythmia import detect_all
from backend.core.st_analysis import analyze_st
import numpy as np

DATA = Path(__file__).parent / "data" / "0000015_20250806121149_ECGData.txt"
CACHE = Path(__file__).parent / "cache"

print("=== Teste do pipeline ===")
print(f"Arquivo: {DATA} ({DATA.stat().st_size/1e6:.1f} MB)")

t0 = time.time()
print("\n[1] Carregando...")
sig, meta = load_ecg(DATA, cache_dir=CACHE)
print(f"    OK em {time.time()-t0:.1f}s. shape={sig.shape}, fs={meta.fs}, dur={meta.duration_s/3600:.2f}h")
print(f"    canais={meta.channel_names}, unidade={meta.unit}")

print("\n[2] Amostra de 1h para validar (fs={meta.fs} Hz)...")
t1 = time.time()
n = meta.fs * 3600  # 1h
x = np.asarray(sig[:n, 1], dtype=np.float32)   # V3
x_mv = to_millivolts(x, meta.unit)
# cleanup saturations
sat = np.abs(x_mv) >= 5.3
x_mv[sat] = 0
print(f"    Saturações removidas: {sat.sum():,}/{x_mv.size:,} ({100*sat.mean():.1f}%)")

print("\n[3] Pré-processando (filtro notch + bandpass)...")
y = preprocess(x_mv, meta.fs)
print(f"    OK em {time.time()-t1:.1f}s. range=[{y.min():.2f}, {y.max():.2f}] mV")

print("\n[4] Detectando QRS...")
t2 = time.time()
peaks = detect_r_peaks(y, meta.fs)
rr = rr_intervals(peaks, meta.fs)
rr_c = clean_rr(rr)
print(f"    OK em {time.time()-t2:.1f}s. {len(peaks)} picos, {len(rr_c)} RR válidos")
print(f"    FC média: {60/np.mean(rr_c):.1f} bpm")

print("\n[5] HRV...")
h = hrv_all(rr_c)
print(f"    SDNN={h['tempo']['sdnn']:.1f} ms, RMSSD={h['tempo']['rmssd']:.1f} ms, pNN50={h['tempo']['pnn50']:.2f}%")
print(f"    LF/HF={h['frequencia']['lf_hf']:.2f}" if h['frequencia']['lf_hf'] else "    LF/HF=n/a")

print("\n[6] Arritmias...")
arr = detect_all(rr, peaks/meta.fs)
for k, v in arr.items(): print(f"    {k}: {len(v)}")

print("\n[7] ST...")
st = analyze_st(y, peaks, meta.fs)
print(f"    ΔST médio: {st['st_medio_mv']:.3f} mV, classificação: {st['classificacao']}")

print(f"\n=== Total: {time.time()-t0:.1f}s ===")

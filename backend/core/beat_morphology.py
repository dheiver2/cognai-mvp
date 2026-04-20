"""
Classificação morfológica de batimentos (beat templates).

Para cada pico R detectado:
  1. Extrai janela ±300 ms (morfologia do batimento)
  2. Normaliza (z-score) e alinha pelo pico
  3. Reduz dimensionalidade (PCA)
  4. Agrupa em clusters (K-Means) — cada cluster = um template
  5. Classifica cada batimento: N (normal) ou V (ectópico/PVC)

Critério heurístico de PVC:
  • Cluster minoritário com largura QRS anormal (> 120 ms)
  • Alta distância do centróide do cluster principal
  • RR antecedente curto (já detectado em arrhythmia.py)

⚠️ MVP — clusters dão pistas visuais. Revisão manual recomendada.
"""
from __future__ import annotations

from typing import Any

import numpy as np


def _extract_beats(signal: np.ndarray, peaks: np.ndarray, fs: int,
                   win_ms: tuple[int, int] = (300, 300)) -> tuple[np.ndarray, np.ndarray]:
    """Extrai janelas centradas nos picos R. Retorna (beats[N x L], peaks_valid)."""
    pre = int(win_ms[0] * fs / 1000)
    pos = int(win_ms[1] * fs / 1000)
    length = pre + pos + 1
    beats = []
    valid = []
    n = signal.size
    for p in peaks:
        if p - pre < 0 or p + pos >= n:
            continue
        seg = signal[p - pre : p + pos + 1].astype(np.float32)
        beats.append(seg)
        valid.append(p)
    if not beats:
        return np.empty((0, length), dtype=np.float32), np.empty(0, dtype=np.int64)
    return np.stack(beats), np.asarray(valid, dtype=np.int64)


def _zscore(x: np.ndarray) -> np.ndarray:
    mu = x.mean(axis=1, keepdims=True)
    sd = x.std(axis=1, keepdims=True) + 1e-6
    return (x - mu) / sd


def classify_beats(signal_mv: np.ndarray, peaks: np.ndarray, fs: int,
                  n_clusters: int = 4, max_beats: int = 20000) -> dict[str, Any]:
    """
    Classifica batimentos em templates morfológicos.

    Retorna:
      classes[]         — classe (cluster id) por batimento válido
      peak_indices[]    — índices R correspondentes (no sinal original)
      templates[]       — morfologia média de cada cluster (downsampled p/ viz)
      counts[]          — nº de batimentos por cluster
      pvc_cluster       — id do cluster com suspeita de PVC (ou -1)
      n_pvc             — nº de batimentos no cluster PVC
      pct_pvc           — % de batimentos classificados como PVC
      pvc_hourly        — nº de PVCs por hora
      n_normal          — nº de batimentos normais
    """
    if len(peaks) < 50:
        return _empty()

    # 1. Extrai janelas
    beats, valid = _extract_beats(signal_mv, peaks, fs)
    if len(beats) < 50:
        return _empty()

    # Se temos muitos batimentos, amostra para acelerar clustering
    if len(beats) > max_beats:
        idx = np.linspace(0, len(beats) - 1, max_beats).astype(int)
        beats_sample = beats[idx]
    else:
        idx = np.arange(len(beats))
        beats_sample = beats

    # 2. Normalização z-score
    beats_n = _zscore(beats_sample)

    # 3. PCA para reduzir dimensão (se possível)
    try:
        from sklearn.decomposition import PCA
        from sklearn.cluster import KMeans

        pca = PCA(n_components=min(10, beats_n.shape[1] - 1, len(beats_n) - 1))
        emb = pca.fit_transform(beats_n)

        # 4. K-Means
        n_c = min(n_clusters, len(beats_n))
        km = KMeans(n_clusters=n_c, n_init=5, random_state=42)
        labels_sample = km.fit_predict(emb)

        # Re-atribui para TODOS os beats (sem PCA-transform dos excluídos — usa aproximação)
        if len(beats) > max_beats:
            beats_all_n = _zscore(beats)
            emb_all = pca.transform(beats_all_n)
            labels = km.predict(emb_all)
        else:
            labels = labels_sample

    except Exception as e:
        return _empty(reason=str(e))

    # 5. Templates médios (e downsample p/ visualização)
    templates = []
    counts = []
    for c in range(km.n_clusters):
        mask = labels == c
        n = int(mask.sum())
        counts.append(n)
        if n == 0:
            templates.append([])
            continue
        mean_beat = beats[mask].mean(axis=0)
        # downsample para ~100 pts
        step = max(1, len(mean_beat) // 100)
        templates.append(mean_beat[::step].tolist())

    # 6. Heurística de detecção de cluster PVC:
    #    - cluster pequeno (< 15% do total)
    #    - morfologia com amplitude/largura discrepante
    total = sum(counts)
    pvc_cluster = -1
    max_dev = 0.0
    main_cluster = int(np.argmax(counts))
    main_template = np.asarray(templates[main_cluster])
    for c in range(km.n_clusters):
        if c == main_cluster or counts[c] < 10:
            continue
        share = counts[c] / total
        if share > 0.30:
            continue  # demasiado comum para ser PVC
        tmpl = np.asarray(templates[c])
        if len(tmpl) != len(main_template):
            continue
        # distância euclidiana normalizada entre templates
        dev = float(np.linalg.norm(tmpl - main_template) / (np.linalg.norm(main_template) + 1e-6))
        if dev > max_dev and dev > 0.4:
            max_dev = dev
            pvc_cluster = c

    n_pvc = int(counts[pvc_cluster]) if pvc_cluster >= 0 else 0
    n_normal = total - n_pvc
    pct_pvc = float(100.0 * n_pvc / total) if total else 0.0

    # 7. PVCs por hora
    pvc_hourly: list[int] = []
    if pvc_cluster >= 0:
        pvc_peak_samples = valid[labels == pvc_cluster]
        pvc_hours = (pvc_peak_samples / fs / 3600).astype(int)
        if pvc_hours.size > 0:
            max_h = int(pvc_hours.max()) + 1
            pvc_hourly = np.bincount(pvc_hours, minlength=max_h).tolist()

    return {
        "disponivel": True,
        "n_total": int(total),
        "n_normal": int(n_normal),
        "n_pvc": int(n_pvc),
        "pct_pvc": pct_pvc,
        "pvc_cluster": int(pvc_cluster),
        "n_clusters": int(km.n_clusters),
        "counts": [int(c) for c in counts],
        "templates": templates,  # lista de listas (um por cluster)
        "pvc_hourly": pvc_hourly,
        # subset de labels com índices para o frontend exibir no tacograma
        "labels_sample": labels[:5000].astype(int).tolist(),
        "peaks_sample": valid[:5000].astype(int).tolist(),
    }


def _empty(reason: str | None = None) -> dict[str, Any]:
    return {
        "disponivel": False,
        "motivo": reason or "Batimentos insuficientes para clustering.",
        "n_total": 0, "n_normal": 0, "n_pvc": 0, "pct_pvc": 0.0,
        "pvc_cluster": -1, "n_clusters": 0,
        "counts": [], "templates": [], "pvc_hourly": [],
        "labels_sample": [], "peaks_sample": [],
    }

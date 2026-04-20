export interface ECGMetadata {
  patient_id: string;
  samples: number;
  fs: number;
  n_channels: number;
  unit: string;
  channel_names: string[];
  duration_s: number;
}

export interface HRVTime {
  n: number;
  mean_rr: number | null;
  min_rr: number | null;
  max_rr: number | null;
  mean_hr: number | null;
  sdnn: number | null;
  rmssd: number | null;
  pnn50: number | null;
}
export interface HRVFreq {
  vlf: number | null;
  lf: number | null;
  hf: number | null;
  total_power: number | null;
  lf_hf: number | null;
  lf_nu: number | null;
  hf_nu: number | null;
}

export interface ArrhythmiaEvent {
  tipo: string;
  inicio_s: number;
  fim_s: number;
  duracao_s?: number;
  fc_max?: number;
  fc_min?: number;
  batimentos?: number;
  rr_prematuro_ms?: number;
  rr_compensatorio_ms?: number;
  rmssd_ms?: number;
  cv?: number;
}

export interface AnalysisResult {
  metadata: ECGMetadata;
  canal_analisado: string;
  tempo_processamento_s: number;
  qrs: { n_batimentos: number; batimentos_validos: number };
  fc: { media_bpm: number | null; min_bpm: number | null; max_bpm: number | null };
  hrv: { tempo: HRVTime; frequencia: HRVFreq };
  arritmias: {
    bradicardia: ArrhythmiaEvent[];
    taquicardia: ArrhythmiaEvent[];
    taquicardia_sustentada: ArrhythmiaEvent[];
    pausas: ArrhythmiaEvent[];
    extrassistoles: ArrhythmiaEvent[];
    suspeita_fa: ArrhythmiaEvent[];
    af_burden: {
      total_af_s: number;
      burden_pct: number;
      episodes_count: number;
      longest_s: number;
    };
  };
  qt: {
    disponivel: boolean;
    motivo?: string;
    n_valid?: number;
    classificacao?: string;
    qt_ms?: { n: number; media: number; mediana: number; min: number; max: number; std: number };
    qtc_bazett_ms?: { n: number; media: number; mediana: number; min: number; max: number; std: number };
    qtc_fridericia_ms?: { n: number; media: number; mediana: number; min: number; max: number; std: number };
    qtc_trend_h?: (number | null)[];
  };
  morfologia: {
    disponivel: boolean;
    motivo?: string;
    n_total: number;
    n_normal: number;
    n_pvc: number;
    pct_pvc: number;
    pvc_cluster: number;
    n_clusters: number;
    counts: number[];
    templates: number[][];
    pvc_hourly: number[];
  };
  st: {
    n_analisados: number;
    st_medio_mv: number | null;
    st_mediana_mv?: number | null;
    st_max_supra_mv: number | null;
    st_max_infra_mv: number | null;
    batimentos_limite: number;
    batimentos_alterados: number;
    classificacao: string;
  };
  resumo_horario: Array<{
    hora: number; inicio_s: number; batimentos: number;
    fc_media: number; fc_min: number; fc_max: number;
  }>;
  tacograma: { t: number[]; rr_ms: number[] };
  hr_trend: { t_min: number[]; fc_min: (number|null)[]; fc_med: (number|null)[]; fc_max: (number|null)[] };
  poincare: { x: number[]; y: number[]; sd1: number|null; sd2: number|null; n: number; rr_mean_ms?: number };
  rr_hist: { bin_edges_ms: number[]; counts: number[] };
  hr_hist: { bin_edges_bpm: number[]; counts: number[] };
  psd: { f: number[]; p: number[] };
  st_trend: { t_min: number[]; st_mv: (number|null)[] };
  full_disclosure: { t_s: number[]; ymin: number[]; ymax: number[] };
}

export interface FileEntry {
  id: string;
  nome: string;
  tamanho_bytes: number;
  tamanho_mb: number;
  formato?: string;
  formato_id?: string | null;
}

export interface FormatInfo {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  vendors: string[];
}

export interface SignalWindow {
  file_id: string;
  canal: string;
  fs: number;
  unidade: string;
  t: number[];
  y: number[];
}

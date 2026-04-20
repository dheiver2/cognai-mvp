# cognai — Plataforma de Análise de Holter / ECG

Plataforma **agnóstica de fabricante** para cardiologistas e técnicos de ECG/Holter.
Um único software que lê arquivos de todos os principais equipamentos do mercado
brasileiro e internacional, sem precisar abrir o programa proprietário de cada marca.

> ⚠️ MVP — resultados heurísticos. Não substitui avaliação médica.

---

## O problema que resolvemos

Profissionais de Holter/ECG hoje são **obrigados a operar vários softwares**:
um para cada fabricante (Contec, Micromed, Cardios, TEB, Mortara, Philips, GE, etc.).
Cada um tem fluxos diferentes, laudos diferentes, tempo de aprendizado diferente.

**A cognai unifica tudo.** Basta enviar o arquivo — independente do formato —
e a plataforma detecta automaticamente o parser correto, executa a análise
completa e entrega um laudo padronizado em segundos.

---

## Formatos suportados

| Formato | Extensões | Fabricantes típicos |
|---|---|---|
| **Contec TXT (ECGData)** | `.txt` | Contec e OEMs compatíveis |
| **EDF / EDF+** | `.edf`, `.edf+`, `.rec` | Compumedics, Natus, Nihon Kohden, pesquisa |
| **MIT-BIH / WFDB** | `.dat` + `.hea` | PhysioNet, MIT, pesquisa acadêmica |
| **DICOM Waveform** | `.dcm`, `.dicom` | Philips, GE, Siemens, Mindray, PACS |
| **HL7 aECG (XML)** | `.xml`, `.aecg` | Philips, Mortara, GE, integrações HL7 |
| **CSV / TSV genérico** | `.csv`, `.tsv` | Qualquer exportação customizada |

Detecção automática por assinatura de arquivo — o profissional não precisa
configurar nada. Para adicionar novos fabricantes, basta implementar
um parser em `backend/core/formats/` (arquitetura plugável).

---

## Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui style
+ TanStack Query + Zustand + React Router + Framer Motion + Plotly.js + Lucide icons

**Backend:** FastAPI + NumPy + SciPy + pandas + NeuroKit2 + pyedflib + wfdb + pydicom

**Paleta:** preto (#000) com acentos em vermelho coração (#ff3b4a)

---

## Páginas

| Rota | Descrição |
|---|---|
| `/` | **Landing page** — hero, features, stack, CTA |
| `/app` | Dashboard com 5 cards + trends |
| `/app/patient` | Identificação e resumo do exame |
| `/app/ecg` | Traçado com grid médico (25 mm/s · 10 mm/mV) |
| `/app/disclosure` | Full disclosure clicável |
| `/app/trends` | Trends de FC e ST |
| `/app/histograms` | Distribuições FC e RR |
| `/app/hrv` | Poincaré, PSD, tabela HRV |
| `/app/qt` | Análise QT/QTc com Bazett + Fridericia |
| `/app/morphology` | Templates de batimentos (PCA+K-Means) e PVCs por hora |
| `/app/events` | Lista filtrável com **event strips inline** expandíveis |
| `/app/report` | Laudo imprimível |
| `/app/formats` | Formatos suportados |

---

## Como executar (local)

### Linux / macOS
```bash
cd holter-mvp
./run.sh
```

### Windows
```
cd holter-mvp
.\run.bat
```

Acesse **http://127.0.0.1:8765**.

O script:
1. Instala dependências Python (`pip install -r requirements.txt`)
2. Faz build do frontend React se Node.js estiver disponível
3. Inicia o servidor FastAPI

### Desenvolvimento frontend (hot reload)

```bash
cd frontend-react
npm install
npm run dev        # abre http://localhost:5173 (proxy p/ 8000 em /api)
```

Em paralelo, rode o backend:
```bash
python -m uvicorn backend.main:app --reload --port 8765
```

---

## Arquitetura

```
holter-mvp/
├── backend/
│   ├── main.py                       FastAPI + SPA fallback
│   ├── web-v2/                       bundle React compilado (produção)
│   └── core/
│       ├── parser.py                 loader + cache .npy
│       ├── analyzer.py               pipeline completo de análise
│       ├── signal_processing.py      filtros (notch + bandpass)
│       ├── qrs.py                    detecção QRS
│       ├── hrv.py                    variabilidade da FC
│       ├── arrhythmia.py             heurísticas de arritmias
│       ├── st_analysis.py            segmento ST
│       └── formats/                  ★ MULTI-FORMATO
│           ├── __init__.py           registry + detecção
│           ├── base.py               interface BaseFormatParser
│           ├── contec.py             Contec TXT
│           ├── edf_fmt.py            EDF / EDF+
│           ├── wfdb_fmt.py           MIT-BIH / WFDB
│           ├── dicom_fmt.py          DICOM Waveform
│           ├── hl7_fmt.py            HL7 aECG XML
│           └── csv_generic.py        CSV/TSV
├── frontend-react/                   ★ FRONTEND MODERNO
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx           landing page
│   │   │   ├── AppLayout.tsx         layout com sidebar
│   │   │   ├── HeroPreview.tsx       mini-dashboard animado
│   │   │   └── panels/               um arquivo por painel
│   │   ├── components/
│   │   │   ├── Sidebar.tsx           navegação agrupada
│   │   │   ├── TopBar.tsx            seletor de arquivo + canal
│   │   │   ├── Logo.tsx              SVG cognai
│   │   │   ├── Plot.tsx              wrapper Plotly
│   │   │   └── ui/                   Card, Button, Badge, Select
│   │   ├── lib/                      api, types, utils
│   │   ├── store/                    Zustand
│   │   └── hooks/                    TanStack Query
│   └── vite.config.ts                build → backend/web-v2
├── frontend/                         fallback vanilla (HTML/JS)
├── data/                             arquivos .txt/.edf/.dat/...
├── cache/                            .npy + analysis.json
├── requirements.txt
├── run.sh / run.bat
└── test_pipeline.py
```

---

## Endpoints REST

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Status |
| GET | `/api/formats` | **Lista formatos suportados com fabricantes** |
| GET | `/api/files` | Lista arquivos em `data/` com formato detectado |
| POST | `/api/upload` | Upload aceita todas as extensões do registry |
| GET | `/api/metadata/{file}` | Metadados |
| GET | `/api/analysis/{file}?channel=1` | Análise completa (cacheada) |
| GET | `/api/signal/{file}?start=0&duration=10&channel=1` | Trecho de sinal |
| GET | `/api/report/{file}?channel=1` | Laudo em Markdown |

---

## Exemplo: arquivo demo (Contec 24h)

Para `0000015_20250806121149_ECGData.txt` (24h, 398MB):
- 68.291 batimentos detectados (V3)
- FC 48 bpm (min 30, máx 197), SDNN 344 ms
- Pipeline completo em **9.7 s**; resposta < 50ms via cache
- 1.603 pausas, 4.812 extrassístoles, 10 janelas suspeitas de FA

---

## Limitações do MVP

- Heurísticas simplificadas, não validadas clinicamente
- Canal padrão V3 (configurável 0 / 1 / 2)
- Rede elétrica fixa em 60 Hz (alterável em `analyze_file`)
- Arquivos grandes (>500 MB) podem demorar no primeiro load (cache .npy acelera)

**Sempre revise o laudo com um médico antes de decisões clínicas.**

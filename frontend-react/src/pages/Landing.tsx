import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity, Brain, HeartPulse, ShieldCheck, Stethoscope, Zap,
  LineChart, FileText, Layers, ArrowRight, Github, Play,
  Waves, Gauge,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroPreview } from "./HeroPreview";

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-0 text-ink-950">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-ink-0/80 backdrop-blur-xl border-b border-ink-400/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8 text-sm text-ink-900">
            <a href="#features" className="hover:text-ink-950 transition-colors">Recursos</a>
            <a href="#analises" className="hover:text-ink-950 transition-colors">Análises</a>
            <a href="#stack" className="hover:text-ink-950 transition-colors">Tecnologia</a>
            <a href="#como-funciona" className="hover:text-ink-950 transition-colors">Como funciona</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/app">
              <Button variant="brand" size="sm">
                <Play size={14} /> Abrir plataforma
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-brand/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="brand" className="mb-6 py-1 px-3">
              Holter + IA · MVP
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] gradient-heading mb-6"
          >
            Inteligência cardíaca<br />para o clínico moderno.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-ink-800 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A cognai transforma 24 horas de Holter em um relatório interativo em segundos.
            Detecção QRS, HRV, arritmias e ST — tudo em uma experiência de classe mundial.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/app">
              <Button variant="brand" size="lg" className="min-w-[200px]">
                Analisar um exame <ArrowRight size={18} />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                Ver recursos
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs text-ink-700 uppercase tracking-[0.2em]"
          >
            <span>FastAPI</span>
            <span>·</span>
            <span>NeuroKit2</span>
            <span>·</span>
            <span>React + TypeScript</span>
            <span>·</span>
            <span>Plotly</span>
            <span>·</span>
            <span>LGPD compliant</span>
          </motion.div>
        </div>

        {/* Hero preview */}
        <div className="relative max-w-6xl mx-auto px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative rounded-2xl overflow-hidden border border-ink-400/60 shadow-card bg-ink-100"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-ink-50 border-b border-ink-400/60">
              <div className="w-3 h-3 rounded-full bg-ink-600" />
              <div className="w-3 h-3 rounded-full bg-ink-600" />
              <div className="w-3 h-3 rounded-full bg-ink-600" />
              <div className="flex-1 text-center text-xs text-ink-700 font-mono">cognai · Holter Dashboard</div>
            </div>
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      {/* METRICS */}
      <section className="border-y border-ink-400/50 bg-ink-50 py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ["9 s", "para analisar 24 h de ECG"],
            ["< 50 ms", "resposta após cache"],
            ["3 canais", "V1 · V3 · V5"],
            ["7 painéis", "visão clínica completa"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-3xl md:text-4xl font-bold gradient-heading">{k}</div>
              <div className="text-xs text-ink-700 mt-2 uppercase tracking-wider">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="brand" className="mb-4">Recursos</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight gradient-heading mb-4">
              Tudo que um cardiologista precisa ver.
            </h2>
            <p className="text-ink-800">
              Visualizações ao nível dos melhores sistemas comerciais — com a agilidade
              que só uma plataforma nativa em IA oferece.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-xl border border-ink-400/60 bg-ink-100 hover:border-brand/40 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand mb-4 group-hover:scale-110 transition-transform">
                  <f.icon size={20} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-ink-800 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALISES */}
      <section id="analises" className="py-28 bg-ink-50 border-y border-ink-400/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="cyan" className="mb-4">Análises clínicas</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight gradient-heading mb-4">
              Pipeline completo.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {analyses.map((a) => (
              <div key={a.title} className="flex gap-5 p-6 rounded-xl bg-ink-100 border border-ink-400/60">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <a.icon size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-950 mb-1">{a.title}</h3>
                  <p className="text-sm text-ink-800 leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="violet" className="mb-4">Fluxo</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight gradient-heading mb-4">Três passos. Um laudo.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Envie o exame", d: "Upload do arquivo .txt de Holter ou selecione da pasta local." },
              { n: "02", t: "Clique em Analisar", d: "A plataforma processa QRS, HRV, arritmias e ST em segundos." },
              { n: "03", t: "Revise e entregue", d: "Explore 7 painéis interativos e imprima o laudo pronto." },
            ].map((s) => (
              <div key={s.n} className="p-8 rounded-xl border border-ink-400/60 bg-ink-100 relative">
                <div className="text-5xl font-bold text-brand/30 mb-4">{s.n}</div>
                <h3 className="text-xl font-semibold mb-2">{s.t}</h3>
                <p className="text-sm text-ink-800">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STACK */}
      <section id="stack" className="py-28 bg-ink-50 border-y border-ink-400/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="green" className="mb-4">Tecnologia</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight gradient-heading mb-4">Construída com o melhor.</h2>
            <p className="text-ink-800">Stack moderna, performática e open-source.</p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {["React 18", "TypeScript", "Vite", "Tailwind CSS", "TanStack Query", "Zustand",
              "FastAPI", "NumPy", "SciPy", "NeuroKit2", "Plotly", "Framer Motion"].map((t) => (
              <div key={t} className="py-4 px-3 rounded-lg bg-ink-100 border border-ink-400/60 text-center text-xs font-mono text-ink-900">
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight gradient-heading mb-6">
            Pronto para analisar seu primeiro exame?
          </h2>
          <p className="text-ink-800 mb-10 max-w-xl mx-auto">
            Abra a plataforma agora, selecione um Holter da pasta e explore a análise completa em segundos.
          </p>
          <Link to="/app">
            <Button variant="brand" size="lg" className="min-w-[220px]">
              Começar agora <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-ink-400/50 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo showText={true} />
          <p className="text-xs text-ink-700">
            © 2026 cognai. MVP de pesquisa — resultados não substituem avaliação médica.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  { icon: Activity,     title: "ECG com grid médico",  desc: "Traçado calibrado 25 mm/s · 10 mm/mV, como em eletrocardiógrafos profissionais." },
  { icon: Layers,       title: "Multi-derivação",      desc: "V1, V3 e V5 sincronizados no mesmo eixo de tempo — localize isquemia rapidamente." },
  { icon: HeartPulse,   title: "Detecção QRS robusta", desc: "NeuroKit2 com fallback Pan-Tompkins para sinais ruidosos." },
  { icon: Brain,        title: "HRV completo",         desc: "SDNN, RMSSD, pNN50, LF/HF, Poincaré — padrão ESC/NASPE." },
  { icon: Waves,        title: "Morfologia + Templates", desc: "Clustering PCA + K-Means classifica PVCs por forma, hora a hora." },
  { icon: Gauge,        title: "QT / QTc",             desc: "Bazett e Fridericia com classificação clínica (normal → alto risco)." },
  { icon: LineChart,    title: "AFib Burden",          desc: "% tempo em FA, duração dos episódios, episódio mais longo." },
  { icon: FileText,     title: "Laudo automático",     desc: "Relatório clínico pronto para revisão e impressão." },
  { icon: Layers,       title: "Multi-formato",        desc: "Contec, EDF/EDF+, MIT-BIH, DICOM, HL7 aECG, CSV — detecção automática." },
  { icon: ShieldCheck,  title: "Multi-fabricante",     desc: "Um único software para todos os equipamentos de Holter e ECG do mercado." },
  { icon: Zap,          title: "Full Disclosure",      desc: "Envelope de todo o exame em uma tela, com navegação por clique." },
  { icon: Stethoscope,  title: "Event strips inline",  desc: "Cada evento na tabela expande com o trecho exato do ECG para revisão rápida." },
];

const analyses = [
  { icon: Zap,           title: "Detecção de arritmias",   desc: "Extrassístoles, pausas, bradi/taquicardia, suspeita de FA por irregularidade RR." },
  { icon: Stethoscope,   title: "Análise do segmento ST",  desc: "Desvio medido em J+60 ms vs baseline PR, com limiares configuráveis." },
  { icon: ShieldCheck,   title: "Qualidade de sinal",      desc: "Notch 60 Hz + bandpass 0.5–40 Hz, remoção de saturação por canal." },
  { icon: LineChart,     title: "Visualizações interativas", desc: "Plotly + WebGL, milhões de pontos com zoom/pan em tempo real." },
];

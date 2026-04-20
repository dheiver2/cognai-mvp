import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Activity, Layers, TrendingUp, BarChart3,
  Radar, AlertTriangle, FileText, User, Home, Database,
  Waves, LineChart,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Item { to: string; label: string; icon: ReactNode; }
interface Group { label: string; items: Item[]; }

const groups: Group[] = [
  {
    label: "Início",
    items: [
      { to: "/",           label: "Página inicial",    icon: <Home size={16} /> },
    ],
  },
  {
    label: "Paciente",
    items: [
      { to: "/app/patient",  label: "Dados do exame",  icon: <User size={16} /> },
    ],
  },
  {
    label: "Resumo",
    items: [
      { to: "/app",          label: "Dashboard",       icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    label: "Revisão do ECG",
    items: [
      { to: "/app/ecg",          label: "Traçado ECG",     icon: <Activity size={16} /> },
      { to: "/app/disclosure",   label: "Full Disclosure", icon: <Layers size={16} /> },
    ],
  },
  {
    label: "Tendências",
    items: [
      { to: "/app/trends",       label: "FC e ST",         icon: <TrendingUp size={16} /> },
      { to: "/app/histograms",   label: "Histogramas",     icon: <BarChart3 size={16} /> },
    ],
  },
  {
    label: "Análises",
    items: [
      { to: "/app/hrv",          label: "HRV / Poincaré",  icon: <Radar size={16} /> },
      { to: "/app/qt",           label: "QT / QTc",        icon: <LineChart size={16} /> },
      { to: "/app/morphology",   label: "Morfologia / PVCs", icon: <Waves size={16} /> },
      { to: "/app/events",       label: "Arritmias",       icon: <AlertTriangle size={16} /> },
    ],
  },
  {
    label: "Entrega",
    items: [
      { to: "/app/report",       label: "Laudo",           icon: <FileText size={16} /> },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/app/formats",      label: "Formatos suportados", icon: <Database size={16} /> },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 sticky top-0 h-screen overflow-y-auto bg-ink-50 border-r border-ink-400/60 flex flex-col">
      <div className="px-5 py-5 border-b border-ink-400/60">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-3 flex flex-col gap-1">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-3 py-2 text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink-700">
              {g.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === "/" || it.to === "/app"}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all",
                      isActive
                        ? "bg-ink-300 text-ink-950"
                        : "text-ink-900 hover:bg-ink-200 hover:text-ink-950",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute -left-3 top-2 bottom-2 w-0.5 bg-brand rounded-r" />
                      )}
                      <span className={cn("inline-flex w-5 justify-center", isActive ? "text-brand" : "text-ink-800")}>
                        {it.icon}
                      </span>
                      <span>{it.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-ink-400/60">
        <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-ink-500 text-ink-800 bg-ink-200">
          MVP · heurístico
        </div>
        <p className="text-[10.5px] text-ink-700 mt-2 leading-snug">
          Resultados automáticos.<br />Não substitui avaliação médica.
        </p>
      </div>
    </aside>
  );
}

/* Miniatura animada para a landing — ECG + métricas mock */
import { motion } from "framer-motion";

export function HeroPreview() {
  return (
    <div className="grid grid-cols-4 gap-4 p-6 bg-ink-100">
      {/* cards */}
      {[
        { label: "FC MÉDIA", value: "72", unit: "bpm", color: "brand" },
        { label: "BATIMENTOS", value: "104k", unit: "total", color: "cyan" },
        { label: "SDNN", value: "48", unit: "ms", color: "violet" },
        { label: "EVENTOS", value: "23", unit: "episódios", color: "amber" },
      ].map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.08 }}
          className="relative p-4 rounded-lg bg-ink-200 border border-ink-400/60 overflow-hidden"
        >
          <div
            className={
              "absolute left-0 top-0 bottom-0 w-0.5 " +
              (c.color === "brand" ? "bg-brand" :
               c.color === "cyan" ? "bg-sig-cyan" :
               c.color === "violet" ? "bg-sig-violet" : "bg-sig-amber")
            }
          />
          <div className="text-[9px] font-bold tracking-[0.15em] uppercase text-ink-700">{c.label}</div>
          <div className="text-2xl font-bold text-ink-950 mt-1">{c.value}</div>
          <div className="text-[10px] text-ink-700">{c.unit}</div>
        </motion.div>
      ))}

      {/* ECG animado */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="col-span-4 relative h-52 rounded-lg ecg-grid-bg overflow-hidden"
      >
        <svg viewBox="0 0 800 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <motion.path
            d="M0 100 L50 100 L60 95 L70 100 L120 100 L125 85 L130 50 L135 140 L140 90 L145 100 L200 100 L210 100 L220 95 L230 100 L280 100 L285 85 L290 50 L295 140 L300 90 L305 100 L360 100 L370 100 L380 95 L390 100 L440 100 L445 85 L450 50 L455 140 L460 90 L465 100 L520 100 L530 100 L540 95 L550 100 L600 100 L605 85 L610 50 L615 140 L620 90 L625 100 L680 100 L690 100 L700 95 L710 100 L760 100 L765 85 L770 50 L775 140 L780 90 L785 100 L800 100"
            fill="none" stroke="#ff3b4a" strokeWidth="1.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 1 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

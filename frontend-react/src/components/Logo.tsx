import { cn } from "@/lib/utils";

/**
 * cognai mark — coração estilizado com ECG integrado.
 *
 * Design:
 *  • Coração em vermelho batimento (#ff3b4a), forma clássica geometricamente equilibrada
 *  • Complexo QRS preto atravessando o centro em "negative space"
 *  • Funciona em qualquer background (o pulso se funde com fundos escuros e
 *    destaca-se sobre fundos claros)
 *  • Escalável: legível de 16px a 200px
 */
export function LogoMark({
  size = 32,
  className,
  accent = "#ff3b4a",
  pulse = "#0a0a0a",
}: {
  size?: number;
  className?: string;
  accent?: string;
  pulse?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * 44) / 48}
      viewBox="0 0 48 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={{ filter: `drop-shadow(0 0 10px ${accent}55)` }}
    >
      {/* Halo sutil — aumenta presença */}
      <defs>
        <linearGradient id="heartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="1" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Coração — caminho suave e equilibrado */}
      <path
        d="M 24 42
           C 5.5 30, -1 14.5, 10.5 6.5
           C 18.5 1.5, 23 9, 24 15
           C 25 9, 29.5 1.5, 37.5 6.5
           C 49 14.5, 42.5 30, 24 42 Z"
        fill="url(#heartGrad)"
      />

      {/* Pulso QRS — cortando o coração em negative space */}
      <path
        d="M 2 26
           L 13 26
           L 16 28.5
           L 19 14
           L 22 35
           L 25.5 26
           L 28 23
           L 30 26
           L 46 26"
        stroke={pulse}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
  size = 32,
}: { className?: string; showText?: boolean; size?: number }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={size} />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-[20px] tracking-tight text-ink-950">cognai</span>
          <span className="text-[9px] tracking-[0.25em] uppercase text-ink-700 mt-1">Holter · ECG · AI</span>
        </div>
      )}
    </div>
  );
}

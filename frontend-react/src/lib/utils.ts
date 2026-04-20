import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtNum(v: number | null | undefined, nd = 1) {
  if (v == null || isNaN(v)) return "—";
  return v.toFixed(nd);
}
export function fmtInt(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "—";
  return Math.round(v).toLocaleString("pt-BR");
}
export function fmtTime(s: number | null | undefined) {
  if (s == null) return "—";
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
export function fmtDuration(s: number) {
  return `${s.toFixed(2)} s`;
}

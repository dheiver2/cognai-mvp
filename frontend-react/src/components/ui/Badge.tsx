import { cn } from "@/lib/utils";
import { PropsWithChildren } from "react";

type Variant = "default" | "brand" | "cyan" | "violet" | "amber" | "green";

export function Badge({
  variant = "default",
  className,
  children,
}: PropsWithChildren<{ variant?: Variant; className?: string }>) {
  const variants: Record<Variant, string> = {
    default: "bg-ink-300 text-ink-900 border-ink-500",
    brand:   "bg-brand/10 text-brand border-brand/40",
    cyan:    "bg-sig-cyan/10 text-sig-cyan border-sig-cyan/40",
    violet:  "bg-sig-violet/10 text-sig-violet border-sig-violet/40",
    amber:   "bg-sig-amber/10 text-sig-amber border-sig-amber/40",
    green:   "bg-sig-green/10 text-sig-green border-sig-green/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider border",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

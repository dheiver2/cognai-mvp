import { cn } from "@/lib/utils";
import { PropsWithChildren, HTMLAttributes } from "react";

export function Card({ className, children, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-ink-500/60 bg-ink-100/80 backdrop-blur",
        "transition-colors hover:border-ink-600/60",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("px-5 pt-4 pb-2 text-[11px] font-bold tracking-[0.15em] uppercase text-ink-800", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}

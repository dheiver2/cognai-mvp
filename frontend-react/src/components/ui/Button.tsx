import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "brand" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...rest }, ref) => {
    const sizes: Record<Size, string> = {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    };
    const variants: Record<Variant, string> = {
      primary: "bg-ink-950 text-ink-0 hover:bg-ink-900",
      brand: "bg-brand text-white hover:brightness-110 shadow-glow",
      ghost: "bg-ink-200 text-ink-900 border border-ink-500 hover:border-ink-700 hover:text-ink-950",
      outline: "bg-transparent text-ink-950 border border-ink-500 hover:border-brand hover:text-brand",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all",
          "disabled:opacity-50 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700",
          variants[variant],
          sizes[size],
          className,
        )}
        {...rest}
      />
    );
  },
);
Button.displayName = "Button";

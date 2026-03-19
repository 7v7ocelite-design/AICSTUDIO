import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "default" | "success" | "warning" | "danger" | "neutral";

const variants: Record<Variant, string> = {
  default: "bg-accent/20 text-[#9FD0FF] border border-accent/40",
  success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
  warning: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
  danger: "bg-red-500/20 text-red-300 border border-red-500/40",
  neutral: "bg-slate-500/20 text-slate-200 border border-slate-500/40"
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

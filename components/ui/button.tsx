"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantMap: Record<ButtonVariant, string> = {
  default:
    "bg-accent text-white hover:bg-[#3C87CC] focus-visible:ring-accent/40 disabled:bg-accent/50",
  outline:
    "border border-border bg-transparent text-slate-100 hover:bg-muted focus-visible:ring-border",
  ghost: "bg-transparent text-slate-200 hover:bg-muted focus-visible:ring-border",
  danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/40"
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-70",
        variantMap[variant],
        sizeMap[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";

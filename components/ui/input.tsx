import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-slate-900/60 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-accent focus:ring-2 focus:ring-accent/30",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";

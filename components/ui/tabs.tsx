"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: Array<{ label: string; value: string }>;
}

export function Tabs({ value, onValueChange, tabs }: TabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-slate-900/40 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition",
            value === tab.value
              ? "bg-accent text-white"
              : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
          )}
          onClick={() => onValueChange(tab.value)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  value,
  activeValue,
  children
}: {
  value: string;
  activeValue: string;
  children: ReactNode;
}) {
  if (value !== activeValue) {
    return null;
  }

  return <div>{children}</div>;
}

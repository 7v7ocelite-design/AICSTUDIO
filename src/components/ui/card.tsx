"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className, onClick, hover }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-white/5 bg-brand-card p-6",
        hover && "cursor-pointer transition-all hover:border-brand-accent/30 hover:shadow-lg hover:shadow-brand-accent/5",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        {trend && (
          <p className="mt-1 text-xs text-emerald-400">{trend}</p>
        )}
      </div>
      <div className="rounded-lg bg-brand-accent/10 p-3 text-brand-accent">
        {icon}
      </div>
    </Card>
  );
}

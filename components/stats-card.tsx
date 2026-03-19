import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({
  label,
  value,
  icon: Icon,
  hint
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
          <p className="mt-2 text-sm text-slate-400">{hint}</p>
        </div>
        <div className="rounded-lg border border-accent/40 bg-accent/20 p-3 text-[#9FD0FF]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

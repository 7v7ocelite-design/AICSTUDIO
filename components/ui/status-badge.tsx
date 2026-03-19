import { JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusClassMap: Record<JobStatus, string> = {
  queued: "bg-slate-500/20 text-slate-200 border-slate-400/30",
  generating: "bg-blue-500/20 text-blue-200 border-blue-400/30",
  approved: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
  needs_review: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  rejected: "bg-rose-500/20 text-rose-200 border-rose-400/30",
  failed: "bg-red-600/20 text-red-200 border-red-500/30",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize",
        statusClassMap[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

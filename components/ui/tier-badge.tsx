import { ContentTier } from "@/lib/types";
import { cn } from "@/lib/utils";

const tierClassMap: Record<ContentTier, string> = {
  standard: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  premium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  social: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

export function TierBadge({ tier }: { tier: ContentTier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase",
        tierClassMap[tier],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {tier}
    </span>
  );
}

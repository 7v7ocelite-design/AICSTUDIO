export function LoadingSkeleton({ className = "h-5 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-700/70 ${className}`} />;
}

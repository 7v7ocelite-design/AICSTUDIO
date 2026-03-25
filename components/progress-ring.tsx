"use client";

interface ProgressRingProps {
  progress: number;
  elapsedSeconds?: number;
  size?: number;
  strokeWidth?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const ProgressRing = ({
  progress,
  elapsedSeconds,
  size = 44,
  strokeWidth = 3
}: ProgressRingProps) => {
  const pct = clamp(Math.round(progress), 0, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-blue-400 transition-all duration-500"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[9px] font-semibold text-slate-200">{pct}%</span>
        {typeof elapsedSeconds === "number" ? (
          <span className="text-[8px] text-slate-400">{elapsedSeconds}s</span>
        ) : null}
      </div>
    </div>
  );
};

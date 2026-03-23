"use client";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  elapsedSeconds?: number;
}

export const ProgressRing = ({ progress, size = 48, strokeWidth = 4, elapsedSeconds }: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-blue-500 transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute text-center">
        {elapsedSeconds !== undefined ? (
          <span className="text-[9px] font-mono font-bold text-blue-400">
            {formatTime(elapsedSeconds)}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-blue-400">
            {Math.round(progress)}%
          </span>
        )}
      </div>
    </div>
  );
};

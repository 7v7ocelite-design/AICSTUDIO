import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function generateFileName(
  athleteName: string,
  category: string,
  location: string,
  version: number = 1
): string {
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const sanitize = (s: string) =>
    s.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  return `${sanitize(athleteName)}_${sanitize(category)}_${sanitize(location)}_V${String(version).padStart(2, "0")}_${date}.mp4`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    processing: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    needs_review: "bg-orange-500/20 text-orange-400",
    rejected: "bg-red-500/20 text-red-400",
    failed: "bg-red-500/20 text-red-400",
  };
  return colors[status] || "bg-gray-500/20 text-gray-400";
}

export function getTierBadge(tier: string): string {
  const badges: Record<string, string> = {
    premium: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    standard: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    social: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return badges[tier] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

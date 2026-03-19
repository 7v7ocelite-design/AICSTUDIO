import { clsx } from "clsx";

export function cn(...inputs: Array<string | undefined | null | false>) {
  return clsx(inputs);
}

export function slugifyCompact(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "");
}

export function toDateStamp(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function makeVideoFileName(params: {
  athleteName: string;
  category: string;
  location: string;
  version?: number;
  date?: Date;
}) {
  const version = String(params.version ?? 1).padStart(2, "0");
  return `${slugifyCompact(params.athleteName)}_${slugifyCompact(params.category)}_${slugifyCompact(
    params.location,
  )}_V${version}_${toDateStamp(params.date)}.mp4`;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

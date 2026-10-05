import type { Schedule } from "./types";

export function availability(schedule: Schedule, now = Date.now()) {
  if (schedule.status !== "active" && schedule.status !== "scheduled") return "Archived";
  if (schedule.available_from && Date.parse(schedule.available_from) > now) return "Upcoming";
  if (schedule.available_until && Date.parse(schedule.available_until) <= now) return "Closed";
  return "Available";
}
export function normalizeScore(raw: number | null, min: number | null, max: number | null, scaled: number | null) {
  if (scaled !== null) return Math.max(0, Math.min(100, scaled * 100));
  if (raw === null) return null;
  if (max !== null && max > (min ?? 0)) return Math.max(0, Math.min(100, (raw - (min ?? 0)) / (max - (min ?? 0)) * 100));
  return Math.max(0, Math.min(100, raw));
}
export function parseSessionTime(value: string | undefined) {
  if (!value) return 0;
  const clock = /^(\d{2,4}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(value);
  if (clock) { if (+clock[2] > 59 || +clock[3] >= 60) return null; return Math.floor(+clock[1] * 3600 + +clock[2] * 60 + +clock[3]); }
  const iso = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value);
  if (!iso || !iso.slice(1).some(Boolean)) return null;
  return Math.floor(+(iso[1] || 0) * 86400 + +(iso[2] || 0) * 3600 + +(iso[3] || 0) * 60 + +(iso[4] || 0));
}

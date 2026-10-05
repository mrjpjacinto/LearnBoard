import type { StudentLearning } from "./student-data";
import type { Attempt } from "./types";
export function permittedAttempts(attempts: Attempt[], scoreVisible: boolean | undefined) {
  return attempts.map(a => ({ ...a, package_id: null, score: scoreVisible === false ? null : a.score, success_status: scoreVisible === false ? null : a.success_status }));
}
export function completedGames(item: StudentLearning) { return item.games.filter(g => item.attempts.some(a => a.game_id === g.id && a.completion_status === "completed")).length; }
export function learningState(item: StudentLearning, now = Date.now()) {
  if (item.status === "completed" || (item.games.length > 0 && completedGames(item) === item.games.length)) return "Completed";
  if (!["active", "scheduled"].includes(item.status) || (item.available_until && Date.parse(item.available_until) <= now)) return "Expired";
  if (item.available_from && Date.parse(item.available_from) > now) return "Upcoming";
  return "Current";
}
export function gameImage(path: string | null) { if (!path) return null; if (path.startsWith("https://")) return path; return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-images/${path}`; }
export function learningDate(value: string) { return new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }); }

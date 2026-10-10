import { LmsError } from "./auth";
import type { Schedule } from "./types";
export function scheduleInput(body: Record<string, unknown>): Schedule {
  const date = (key: string) => {
    if (body[key] === null || body[key] === "") return null;
    if (typeof body[key] !== "string" || !Number.isFinite(Date.parse(body[key] as string))) throw new LmsError("Choose valid availability dates.");
    return new Date(body[key] as string).toISOString();
  };
  const positive = (key: string, max: number) => {
    if (body[key] === null || body[key] === "") return null;
    if (typeof body[key] !== "number" || !Number.isInteger(body[key]) || (body[key] as number) < 1 || (body[key] as number) > max) throw new LmsError(`Choose a valid ${key.replaceAll("_", " ")}.`);
    return body[key] as number;
  };
  const from = date("available_from"), until = date("available_until");
  if (from && until && Date.parse(until) <= Date.parse(from)) throw new LmsError("The closing date must be after the opening date.");
  if (typeof body.passing_score !== "number" || !Number.isFinite(body.passing_score) || body.passing_score < 0 || body.passing_score > 100) throw new LmsError("Passing score must be between 0 and 100.");
  if (typeof body.allow_resume !== "boolean" || !["scheduled", "active", "expired", "completed", "cancelled"].includes(String(body.status))) throw new LmsError("Choose valid assignment settings.");
  return { available_from: from, available_until: until, max_attempts: positive("max_attempts", 1000), time_limit_minutes: positive("time_limit_minutes", 1440), passing_score: body.passing_score, allow_resume: body.allow_resume, status: body.status as string };
}

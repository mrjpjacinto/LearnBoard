import { normalizeScore, parseSessionTime } from "@/lib/lms/rules";
export function validateRuntime(input: unknown, version: string, passingScore: number) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid runtime data.");
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^cmi\.[a-zA-Z0-9_.]+$/.test(key) || key.length > 160 || typeof value !== "string" || value.length > 65536) throw new Error("Invalid SCORM field.");
    if (Object.keys(raw).length >= 3000) throw new Error("Too many SCORM fields.");
    raw[key] = value;
  }
  const number = (key: string, min = -1000000, max = 1000000) => { if (raw[key] === undefined || raw[key] === "") return null; const v = Number(raw[key]); if (!Number.isFinite(v) || v < min || v > max) throw new Error("Invalid score."); return v; };
  const prefix = version === "1.2" ? "cmi.core" : "cmi";
  const score = normalizeScore(number(`${prefix}.score.raw`), number(`${prefix}.score.min`), number(`${prefix}.score.max`), version === "2004" ? number("cmi.score.scaled", -1, 1) : null);
  const lesson = raw["cmi.core.lesson_status"] || "incomplete";
  if (version === "1.2" && !["passed", "completed", "failed", "incomplete", "browsed", "not attempted"].includes(lesson)) throw new Error("Invalid lesson status.");
  let completion = version === "1.2" ? (["passed", "completed", "failed"].includes(lesson) ? "completed" : "incomplete") : (raw["cmi.completion_status"] || "incomplete");
  if (!["completed", "incomplete", "not attempted", "unknown"].includes(completion)) throw new Error("Invalid completion status.");
  if (completion === "unknown" || completion === "not attempted") completion = "incomplete";
  let success = version === "1.2" ? (lesson === "passed" ? "passed" : lesson === "failed" ? "failed" : "unknown") : (raw["cmi.success_status"] || "unknown");
  if (!["passed", "failed", "unknown"].includes(success)) throw new Error("Invalid success status.");
  if (score !== null && completion === "completed") success = score >= passingScore ? "passed" : "failed";
  const sessionSeconds = parseSessionTime(raw[`${prefix}.session_time`]);
  if (sessionSeconds === null) throw new Error("Invalid session time.");
  if ((raw["cmi.suspend_data"] || "").length > (version === "1.2" ? 4096 : 64000)) throw new Error("Suspend data is too large.");
  return { raw, score, completion, success, sessionSeconds };
}

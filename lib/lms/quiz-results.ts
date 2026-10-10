import { parseSessionTime } from "@/lib/lms/rules";
export type QuizEvent = {
  id: string; attempt_id: string; quiz_id: string; quiz_attempt: number;
  is_correct: boolean; speed: number | null; created_at: string;
};

export function summarizeQuizzes(events: Pick<QuizEvent, "quiz_id" | "is_correct">[]) {
  const correct = events.filter(event => event.is_correct === true).length;
  const incorrect = events.filter(event => event.is_correct === false).length;
  return {
    total_attempts: events.length, correct, incorrect,
    correct_quizzes: new Set(events.filter(event => event.is_correct === true).map(event => event.quiz_id)).size,
  };
}

// Derive display events from persisted SCORM data when no legacy event rows exist.
// These are read-only projections, so retries cannot create duplicate result rows.
export function runtimeQuizEvents(attemptId: string, raw: Record<string,string>, savedAt: string): QuizEvent[] {
  const indices = [...new Set(Object.keys(raw).flatMap(key => { const match = /^cmi\.interactions\.(\d+)\.id$/.exec(key); return match ? [Number(match[1])] : []; }))].sort((a,b)=>a-b);
  const counts = new Map<string,number>(); const events: QuizEvent[] = [];
  for (const index of indices) {
    const prefix = "cmi.interactions." + index + ".", quiz = raw[prefix + "id"], result = raw[prefix + "result"];
    if (!quiz || !["correct","incorrect","wrong"].includes(result)) continue;
    const count = (counts.get(quiz) || 0) + 1; counts.set(quiz,count);
    events.push({id: attemptId + ":interaction:" + index, attempt_id: attemptId, quiz_id: quiz, quiz_attempt: count, is_correct: result === "correct", speed: parseSessionTime(raw[prefix + "latency"]), created_at: savedAt});
  }
  return events;
}

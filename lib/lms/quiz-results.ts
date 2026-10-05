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

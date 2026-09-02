import type { Question } from "./types";

// Mirrors get_triggered_followup() in the migration exactly. Only used
// to decide what to show NEXT in the UI — the server-side function is
// still the source of truth for scoring/completeness.
export function getTriggeredFollowup(
  allQuestions: Question[],
  parentId: string,
  selectedOptionId: string | null,
  answerText: string | null
): Question | null {
  const candidates = allQuestions.filter((q) => q.parent_question_id === parentId);
  for (const f of candidates) {
    const cond = f.trigger_condition;
    if (!cond) continue;
    if (cond.always === true) return f;
    if (selectedOptionId && cond.trigger_option_ids?.includes(selectedOptionId)) return f;
    if (answerText && cond.trigger_values?.includes(answerText.toLowerCase().trim())) return f;
  }
  return null;
}

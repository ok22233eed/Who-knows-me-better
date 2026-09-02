"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard, GradientButton } from "./ui";
import { QUESTION_IDS, editable } from "@/lib/copy";
import { cx } from "@/lib/utils";
import type { QuestionWithOptions } from "@/lib/types";

export interface QuestionAnswer {
  selected_option_id: string | null;
  answer_text: string | null;
}

export function interpolateName(text: string, name: string): string {
  return text.replaceAll("[Name]", name);
}

export function QuestionCard({
  question,
  name,
  onSubmit,
  submitting,
  isFollowup,
}: {
  question: QuestionWithOptions;
  name: string;
  onSubmit: (answer: QuestionAnswer) => void;
  submitting?: boolean;
  isFollowup?: boolean;
}) {
  const prompt = interpolateName(question.question_text, name);
  const isQ1Followup = question.id === QUESTION_IDS.Q1_FOLLOWUP_WHERE;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [classYear, setClassYear] = useState("");

  const canSubmit = isQ1Followup
    ? selectedOption !== null
    : question.answer_type === "multiple_choice"
      ? selectedOption !== null
      : question.answer_type === "yes_no"
        ? textValue.length > 0
        : textValue.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    if (isQ1Followup) {
      const extra = [placeName.trim(), classYear.trim()].filter(Boolean).join(" — ");
      onSubmit({ selected_option_id: selectedOption, answer_text: extra || null });
      return;
    }
    if (question.answer_type === "multiple_choice") {
      onSubmit({ selected_option_id: selectedOption, answer_text: null });
    } else if (question.answer_type === "yes_no") {
      onSubmit({ selected_option_id: null, answer_text: textValue });
    } else {
      onSubmit({ selected_option_id: null, answer_text: textValue.trim() });
    }
  }

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex w-full flex-col gap-5"
    >
      {isFollowup && (
        <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[var(--color-ink-dim)]">
          {editable.createFollowupBadge}
        </span>
      )}

      <h2 className="font-display text-2xl font-semibold leading-snug text-[var(--color-ink)]">{prompt}</h2>

      {question.answer_type === "yes_no" && !isQ1Followup && (
        <div className="grid grid-cols-2 gap-3">
          {["yes", "no"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setTextValue(v)}
              className={cx(
                "glass-panel rounded-2xl py-5 text-center font-display text-lg font-semibold capitalize transition",
                textValue === v ? "gradient-primary text-white" : "text-[var(--color-ink)]"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {(question.answer_type === "multiple_choice" || isQ1Followup) && (
        <div className="flex flex-col gap-3">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedOption(opt.id)}
              className={cx(
                "glass-panel rounded-2xl px-5 py-4 text-left font-medium transition",
                selectedOption === opt.id ? "gradient-primary text-white" : "text-[var(--color-ink)]"
              )}
            >
              {opt.option_text}
            </button>
          ))}
        </div>
      )}

      {isQ1Followup && selectedOption && (
        <div className="flex flex-col gap-3">
          <input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder={editable.followupPlaceholderPlace(
              question.options.find((o) => o.id === selectedOption)?.option_text ?? ""
            )}
            className="glass-panel rounded-2xl px-5 py-4 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none"
          />
          <input
            value={classYear}
            onChange={(e) => setClassYear(e.target.value)}
            placeholder={editable.followupPlaceholderClass}
            className="glass-panel rounded-2xl px-5 py-4 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none"
          />
        </div>
      )}

      {question.answer_type === "text" && !isQ1Followup && (
        <input
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Type your answer…"
          className="glass-panel rounded-2xl px-5 py-4 text-lg text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none"
        />
      )}

      <GradientButton onClick={handleSubmit} disabled={!canSubmit || submitting}>
        {submitting ? "…" : "Next →"}
      </GradientButton>
    </motion.div>
  );
}

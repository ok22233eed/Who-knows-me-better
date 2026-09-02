"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { getTriggeredFollowup } from "@/lib/followups";
import { editable, nameEntry } from "@/lib/copy";
import { QuestionCard, type QuestionAnswer } from "@/components/question-card";
import { GlassCard, GradientButton, Spinner, MiniProgressDots } from "@/components/ui";
import { BottomNav } from "@/components/nav";
import type { Question, QuestionOption, QuestionWithOptions } from "@/lib/types";

type Bank = Record<string, QuestionWithOptions>;

export default function CreatePage() {
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [myName, setMyName] = useState("");
  const [quizId, setQuizId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [bank, setBank] = useState<Bank>({});
  const [coreOrder, setCoreOrder] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<Record<string, QuestionAnswer>>({});
  const [steps, setSteps] = useState<QuestionWithOptions[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // First-run recovery code capture: create_my_profile only ever
  // returns the plaintext once — we hand it to the dashboard via
  // localStorage and clear it after it's shown there.
  const [nameInput, setNameInput] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    await ensureAnonymousSession();
    const supabase = createClient();

    const { data: profileData } = await supabase.rpc("get_my_profile");
    const profile = profileData as any;

    const { data: qRows } = await supabase.from("questions").select("*, question_options(*)").eq("is_active", true);
    const b: Bank = {};
    (qRows ?? []).forEach((q: any) => {
      b[q.id] = {
        ...q,
        options: (q.question_options ?? []).sort((a: QuestionOption, c: QuestionOption) => (a.display_order ?? 0) - (c.display_order ?? 0)),
        followup: null,
      };
    });
    setBank(b);
    const core = Object.values(b)
      .filter((q) => !q.parent_question_id)
      .sort((a, c) => (a.display_order ?? 0) - (c.display_order ?? 0));
    setCoreOrder(core);

    if (profile) {
      setProfileId(profile.id);
      setMyName(profile.name);

      const { data: quizData } = await supabase.from("quizzes").select("*").eq("creator_id", profile.id).maybeSingle();
      if (quizData) {
        setQuizId(quizData.id);
        setIsLive(quizData.is_live);

        const { data: caRows } = await supabase.from("creator_answers").select("*").eq("quiz_id", quizData.id);
        const answeredMap: Record<string, QuestionAnswer> = {};
        (caRows ?? []).forEach((ca: any) => {
          answeredMap[ca.question_id] = { selected_option_id: ca.selected_option_id, answer_text: ca.answer_text };
        });
        setAnswered(answeredMap);
        rebuildSteps(core, b, answeredMap);
      } else {
        setSteps(core);
      }
    } else {
      setSteps(core);
    }
    setLoading(false);
  }

  function rebuildSteps(core: QuestionWithOptions[], b: Bank, answeredMap: Record<string, QuestionAnswer>) {
    const seq: QuestionWithOptions[] = [];
    let firstUnanswered = -1;
    for (const q of core) {
      seq.push(q);
      const a = answeredMap[q.id];
      if (firstUnanswered === -1 && !a) firstUnanswered = seq.length - 1;
      if (a) {
        const followup = getTriggeredFollowup(Object.values(b), q.id, a.selected_option_id, a.answer_text);
        if (followup) {
          const fq = b[followup.id];
          seq.push(fq);
          if (firstUnanswered === -1 && !answeredMap[fq.id]) firstUnanswered = seq.length - 1;
        }
      }
    }
    setSteps(seq);
    setStepIndex(firstUnanswered === -1 ? seq.length : firstUnanswered);
  }

  async function handleCreateProfile() {
    if (!nameInput.trim()) return;
    setCreatingProfile(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_my_profile", { p_name: nameInput.trim() });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.recovery_code) {
        window.localStorage.setItem("fq_new_recovery_code", row.recovery_code);
      }
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingProfile(false);
    }
  }

  async function handleAnswer(question: QuestionWithOptions, answer: QuestionAnswer) {
    if (!quizId) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from("creator_answers").upsert(
        {
          quiz_id: quizId,
          question_id: question.id,
          selected_option_id: answer.selected_option_id,
          answer_text: answer.answer_text,
        },
        { onConflict: "quiz_id,question_id" }
      );

      const nextAnswered = { ...answered, [question.id]: answer };
      setAnswered(nextAnswered);

      // Insert a just-triggered follow-up right after this step, if any.
      const followup = getTriggeredFollowup(Object.values(bank), question.id, answer.selected_option_id, answer.answer_text);
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.id === question.id);
        const already = idx >= 0 && prev[idx + 1]?.id === followup?.id;
        if (followup && !already) {
          const copy = [...prev];
          copy.splice(idx + 1, 0, bank[followup.id]);
          return copy;
        }
        return prev;
      });
      setStepIndex((i) => i + 1);

      // Check publish status after the write settles.
      const { data: quizRow } = await supabase.from("quizzes").select("is_live").eq("id", quizId).maybeSingle();
      if (quizRow?.is_live) setIsLive(true);
    } finally {
      setSubmitting(false);
    }
  }

  const coreProgress = useMemo(() => {
    const current = steps[stepIndex];
    const effectiveCore = current?.parent_question_id ? bank[current.parent_question_id] : current;
    const currentNumber = effectiveCore ? coreOrder.findIndex((q) => q.id === effectiveCore.id) + 1 : coreOrder.length;
    return { answeredCore: Math.max(currentNumber - 1, 0), currentNumber, total: coreOrder.length };
  }, [steps, stepIndex, bank, coreOrder]);

  if (loading) {
    return (
      <main className="flex min-h-dscreen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  if (!profileId) {
    return (
      <main className="min-h-dscreen flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-full max-w-xs">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">{editable.createNameHeading}</h1>
            <p className="mt-2 text-sm text-[var(--color-ink-dim)]">{editable.createNameBody}</p>
          </div>
          <GlassCard className="p-0">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={nameEntry.placeholder}
              className="w-full bg-transparent px-5 py-4 text-lg text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none"
            />
          </GlassCard>
          <div className="mt-3">
            <GradientButton onClick={handleCreateProfile} disabled={!nameInput.trim() || creatingProfile}>
              {creatingProfile ? "…" : nameEntry.continueCta}
            </GradientButton>
          </div>
        </div>
      </main>
    );
  }

  if (isLive) {
    return (
      <main className="min-h-dscreen flex flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-mint)]/15">
          <PartyPopper className="text-[var(--color-mint)]" size={26} />
        </div>
        <p className="font-display text-xl font-semibold text-[var(--color-ink)]">{editable.createAlreadyLive}</p>
        <Link href="/dashboard">
          <GradientButton className="mt-2 w-48">Go to dashboard →</GradientButton>
        </Link>
        <BottomNav />
      </main>
    );
  }

  const currentStep = steps[stepIndex];
  const isFollowupStep = !!currentStep?.parent_question_id;

  return (
    <main className="min-h-dscreen flex flex-col px-6 pb-24 pt-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-[var(--color-ink-dim)]">
            {editable.createBody(coreProgress.currentNumber, coreProgress.total)}
          </p>
          <MiniProgressDots filled={coreProgress.answeredCore} total={coreProgress.total} />
        </div>

        <AnimatePresence mode="wait">
          {currentStep ? (
            <QuestionCard
              key={currentStep.id}
              question={currentStep}
              name={myName || "you"}
              submitting={submitting}
              isFollowup={isFollowupStep}
              onSubmit={(a) => handleAnswer(currentStep, a)}
            />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-10 text-center">
              <Spinner />
              <p className="text-sm text-[var(--color-ink-dim)]">Publishing your quiz…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

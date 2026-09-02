"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { landing, nameEntry, result, editable, friendshipCaption } from "@/lib/copy";
import { getRankInfo } from "@/lib/ranks";
import { quizUrl, sleep } from "@/lib/utils";
import { playSuccess, playLevelUp } from "@/lib/sound";
import { GradientButton, GlassCard, MiniProgressDots, SuspenseReveal, AnimatedNumber, Spinner, InlineError } from "@/components/ui";
import { QuestionCard, type QuestionAnswer } from "@/components/question-card";
import { LeaderboardList, type SimpleLeaderboardEntry } from "@/components/leaderboard";
import { ShareCard } from "@/components/share-card";
import type { QuestionOption, QuestionWithOptions, CompleteParticipationResult } from "@/lib/types";

type Phase = "loading" | "not_found" | "not_live" | "own_quiz" | "landing" | "playing" | "name_entry" | "revealing" | "result";

export function QuizExperience({ slug }: { slug: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [bank, setBank] = useState<Record<string, QuestionWithOptions>>({});
  const [steps, setSteps] = useState<QuestionWithOptions[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [myName, setMyName] = useState("");
  const [myProfile, setMyProfile] = useState<any>(null);
  const [previewTop3, setPreviewTop3] = useState<SimpleLeaderboardEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<CompleteParticipationResult | null>(null);
  const [fullLeaderboard, setFullLeaderboard] = useState<SimpleLeaderboardEntry[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function bootstrap() {
    await ensureAnonymousSession();
    const supabase = createClient();

    const { data: quizRow } = await supabase.from("quizzes").select("*").eq("slug", slug).maybeSingle();
    if (!quizRow) {
      setPhase("not_found");
      return;
    }
    setQuiz(quizRow);

    const { data: creatorRow } = await supabase.from("profiles").select("*").eq("id", quizRow.creator_id).maybeSingle();
    setCreator(creatorRow);

    if (!quizRow.is_live) {
      setPhase("not_live");
      return;
    }

    void supabase.rpc("log_quiz_event", { p_quiz_id: quizRow.id, p_event_type: "open" });

    const { data: myProfileData } = await supabase.rpc("get_my_profile");
    setMyProfile(myProfileData ?? null);
    if (myProfileData) setMyName((myProfileData as any).name);

    if (myProfileData && (myProfileData as any).id === quizRow.creator_id) {
      setPhase("own_quiz");
      return;
    }

    // Load the full question bank (needed to render whichever steps end
    // up active) and the top-3 preview in parallel.
    const [{ data: qRows }, { data: lbRows }] = await Promise.all([
      supabase.from("questions").select("*, question_options(*)").eq("is_active", true),
      supabase.from("quiz_leaderboard").select("*").eq("quiz_id", quizRow.id).order("rank", { ascending: true }).limit(3),
    ]);
    const b: Record<string, QuestionWithOptions> = {};
    (qRows ?? []).forEach((q: any) => {
      b[q.id] = {
        ...q,
        options: (q.question_options ?? []).sort((a: QuestionOption, c: QuestionOption) => (a.display_order ?? 0) - (c.display_order ?? 0)),
        followup: null,
      };
    });
    setBank(b);
    setPreviewTop3(
      (lbRows ?? []).map((r: any) => ({ rank: r.rank, name: r.participant_name, scorePct: pct(r.core_score, r.max_core_score) }))
    );

    // Resume an existing attempt if one exists.
    const { data: existing } = await supabase.rpc("get_my_participation", { p_quiz_id: quizRow.id });
    const existingRow = existing as any;
    if (existingRow?.id) {
      setParticipationId(existingRow.id);
      if (existingRow.status === "completed") {
        await showResult(existingRow.id, quizRow.id, {
          core_score: existingRow.core_score,
          bonus_score: existingRow.bonus_score,
          max_core_score: existingRow.max_core_score,
          percentage: pct(existingRow.core_score, existingRow.max_core_score),
          friendship_tier: existingRow.friendship_tier,
          share_caption_template: null,
        });
        return;
      }
      // in_progress -> rebuild the ordered flow and resume.
      await enterPlayingResumed(quizRow.id, existingRow.id, b);
      return;
    }

    setPhase("landing");
  }

  function pct(core: number | null, max: number | null) {
    if (!core || !max) return 0;
    return Math.round((core / max) * 100 * 10) / 10;
  }

  async function loadActiveSequence(quizId: string, b: Record<string, QuestionWithOptions>) {
    const supabase = createClient();
    const { data: activeRows } = await supabase.rpc("get_active_questions_for_quiz", { p_quiz_id: quizId });
    const ordered = (activeRows ?? []).map((r: any) => b[r.question_id]).filter(Boolean) as QuestionWithOptions[];
    return ordered;
  }

  async function enterPlayingResumed(quizId: string, pId: string, b: Record<string, QuestionWithOptions>) {
    const supabase = createClient();
    const ordered = await loadActiveSequence(quizId, b);
    const { data: answeredRows } = await supabase.from("participant_answers").select("question_id").eq("participation_id", pId);
    const answeredIds = new Set((answeredRows ?? []).map((r: any) => r.question_id));
    const firstUnanswered = ordered.findIndex((q) => !answeredIds.has(q.id));
    setSteps(ordered);
    setStepIndex(firstUnanswered === -1 ? ordered.length : firstUnanswered);
    setPhase("playing");
  }

  async function handleStart() {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const fingerprint = await getDeviceFingerprint();
      const res = await fetch("/api/start-participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quiz.id, device_fingerprint_hash: fingerprint }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start the quiz");
      const pId = json.participation.id as string;
      setParticipationId(pId);

      const ordered = await loadActiveSequence(quiz.id, bank);
      setSteps(ordered);
      setStepIndex(0);
      setPhase("playing");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnswer(question: QuestionWithOptions, answer: QuestionAnswer) {
    if (!participationId) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.rpc("submit_answer", {
        p_participation_id: participationId,
        p_question_id: question.id,
        p_selected_option_id: answer.selected_option_id,
        p_answer_text: answer.answer_text,
      });
      const nextIndex = stepIndex + 1;
      if (nextIndex >= steps.length) {
        // Finished every question in the flow.
        if (myProfile) {
          await finalizeAndReveal();
        } else {
          setPhase("name_entry");
        }
      } else {
        setStepIndex(nextIndex);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNameSubmit() {
    if (!nameInput.trim()) return;
    setPhase("revealing");
    const start = Date.now();
    const supabase = createClient();

    try {
      const { data, error: createError } = await supabase.rpc("create_my_profile", { p_name: nameInput.trim() });
      if (createError) throw createError;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.recovery_code) window.localStorage.setItem("fq_new_recovery_code", row.recovery_code);
      setMyName(nameInput.trim());
      setMyProfile({ id: row?.profile_id, name: nameInput.trim() });
    } catch (err) {
      console.error(err);
    }

    await finalizeAndReveal(start);
  }

  async function finalizeAndReveal(startedAt?: number) {
    const start = startedAt ?? Date.now();
    setPhase("revealing");
    if (!participationId || !quiz) return;
    const supabase = createClient();
    try {
      const { data, error: completeError } = await supabase.rpc("complete_participation", { p_participation_id: participationId });
      if (completeError) throw completeError;
      const minDuration = 3000 + Math.random() * 2000;
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) await sleep(minDuration - elapsed);
      await showResult(participationId, quiz.id, data as CompleteParticipationResult);
    } catch (err) {
      console.error(err);
      const elapsed = Date.now() - start;
      if (elapsed < 3000) await sleep(3000 - elapsed);
      setPhase("landing");
    }
  }

  async function showResult(pId: string, quizId: string, res: CompleteParticipationResult) {
    setScoreResult(res);
    const supabase = createClient();
    const { data: lbRows } = await supabase.from("quiz_leaderboard").select("*").eq("quiz_id", quizId).order("rank", { ascending: true });
    const mapped = (lbRows ?? []).map((r: any) => ({
      rank: r.rank,
      name: r.participant_name,
      scorePct: pct(r.core_score, r.max_core_score),
      isYou: r.participation_id === pId,
    }));
    setFullLeaderboard(mapped);
    const mine = mapped.find((r) => r.isYou);
    setYourRank(mine?.rank ?? null);
    setPhase("result");
    if ((res.percentage ?? 0) >= 80) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#7c5cff", "#e13bff", "#ff7a45", "#f5c453"] });
      playLevelUp();
    } else {
      playSuccess();
    }
  }

  const creatorName = creator?.name ?? "";
  const rankInfo = useMemo(() => getRankInfo(quiz?.unique_participants_count ?? 0), [quiz]);

  if (phase === "loading") {
    return (
      <main className="flex min-h-dscreen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  if (phase === "not_found") {
    return (
      <CenteredMessage title={editable.quizNotFound} />
    );
  }

  if (phase === "not_live") {
    return <CenteredMessage title={editable.quizNotLiveYet(creator?.name ?? "This person")} />;
  }

  if (phase === "own_quiz") {
    return (
      <CenteredMessage title={editable.yourOwnQuizBlocked}>
        <a href="/dashboard">
          <GradientButton className="mt-4 w-48">Go to dashboard →</GradientButton>
        </a>
      </CenteredMessage>
    );
  }

  if (phase === "landing") {
    return (
      <main className="flex min-h-dscreen flex-col justify-between px-6 py-6">
        <div className="flex flex-col items-center gap-1 pt-2 text-center">
          <p className="font-display font-semibold text-[var(--color-ink)]">{creatorName}</p>
          <p className="text-xs text-[var(--color-ink-faint)]">@{creator?.username}</p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-dim)]">{landing.identityLevelLine(rankInfo.tierIndex, rankInfo.name)}</p>
        </div>

        <div className="my-3">
          <LeaderboardList title={landing.leaderboardTitle} entries={previewTop3} showScores limit={3} />
        </div>

        <div className="flex flex-col gap-4 pb-2">
          <h1 className="text-center font-display text-2xl font-bold leading-tight text-[var(--color-ink)]">
            {landing.heading(creatorName)}
          </h1>
          {error && <InlineError>{error}</InlineError>}
          <GradientButton onClick={handleStart} disabled={submitting} pulse>
            {submitting ? "…" : landing.startCta}
          </GradientButton>
          <button type="button" onClick={handleStart} className="glass-panel rounded-2xl px-5 py-4 text-left opacity-80 transition active:opacity-100">
            <p className="text-sm text-[var(--color-ink-dim)]">
              {landing.teaserPrefix} {landing.teaserQuestion(creatorName)}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-faint)]">{landing.teaserPlaceholder}</p>
          </button>
        </div>
      </main>
    );
  }

  if (phase === "playing") {
    const current = steps[stepIndex];
    const coreSteps = steps.filter((s) => !s.parent_question_id);
    const coreTotal = coreSteps.length;
    const effectiveCore = current?.parent_question_id ? bank[current.parent_question_id] : current;
    const currentCoreNumber = effectiveCore ? coreSteps.findIndex((s) => s.id === effectiveCore.id) + 1 : coreTotal;
    return (
      <main className="flex min-h-dscreen flex-col px-6 pb-10 pt-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-[var(--color-ink-faint)]">
              {currentCoreNumber} / {coreTotal}
            </p>
            <MiniProgressDots filled={currentCoreNumber - 1} total={coreTotal} />
          </div>
          <AnimatePresence mode="wait">
            {current && (
              <QuestionCard
                key={current.id}
                question={current}
                name={creatorName}
                submitting={submitting}
                isFollowup={!!current.parent_question_id}
                onSubmit={(a) => handleAnswer(current, a)}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    );
  }

  if (phase === "name_entry") {
    return (
      <main className="min-h-dscreen flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-full max-w-xs">
          <h1 className="text-center font-display text-2xl font-bold text-[var(--color-ink)]">{nameEntry.heading}</h1>
          <p className="mt-2 text-center text-sm text-[var(--color-ink-dim)]">{nameEntry.body(creatorName)}</p>
          <GlassCard className="mt-5 p-0">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={nameEntry.placeholder}
              className="w-full bg-transparent px-5 py-4 text-lg text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none"
            />
          </GlassCard>
          <div className="mt-3">
            <GradientButton onClick={handleNameSubmit} disabled={!nameInput.trim()}>
              {nameEntry.continueCta}
            </GradientButton>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "revealing") {
    return <SuspenseReveal messages={editable.revealMessages} />;
  }

  if (phase === "result" && scoreResult) {
    const shareUrl = quizUrl(slug);
    const caption = friendshipCaption(scoreResult.share_caption_template, creatorName, scoreResult.percentage);
    return (
      <main className="flex min-h-dscreen flex-col px-6 py-8">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-display text-xl font-bold text-[var(--color-ink)]">{result.heading(creatorName)}</h1>
            <AnimatedNumber value={scoreResult.percentage} suffix="%" className="font-display text-6xl font-bold text-[var(--color-ink)]" />
          </div>

          <LeaderboardList title={result.leaderboardTitle} entries={fullLeaderboard} yourRank={yourRank} showScores limit={3} />

          <GlassCard className="flex flex-col items-center gap-2 px-6 py-6 text-center">
            <p className="font-display font-semibold text-[var(--color-ink)]">{result.pitchHeading}</p>
            <p className="text-sm text-[var(--color-ink-dim)]">{result.pitchBody}</p>
            <div className="mt-2 w-full">
              <GradientButton onClick={() => router.push("/create")} pulse>
                {result.createCta}
              </GradientButton>
            </div>
          </GlassCard>

          <ShareCard name={creatorName} percentage={scoreResult.percentage} caption={caption} url={shareUrl} fileNamePrefix={`quiz-result-${slug}`} />
        </div>
      </main>
    );
  }

  return null;
}

function CenteredMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-dscreen flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="font-display text-lg font-semibold text-[var(--color-ink)]">{title}</p>
      {children}
    </main>
  );
}

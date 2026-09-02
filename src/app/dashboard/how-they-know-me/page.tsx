"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { howTheyKnow, editable } from "@/lib/copy";
import { GlassCard, Spinner } from "@/components/ui";
import { cx } from "@/lib/utils";

interface QuestionBreakdown {
  n: number;
  correct: boolean;
}
interface PersonRow {
  participationId: string;
  name: string;
  pct: number;
  correctCount: number;
  totalCount: number;
  questions: QuestionBreakdown[];
}

export default function HowTheyKnowMePage() {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [summary, setSummary] = useState({ opened: 0, answered: 0, avg: 0, high: 0, low: 0 });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    await ensureAnonymousSession();
    const supabase = createClient();
    const { data: profileData } = await supabase.rpc("get_my_profile");
    if (!profileData) {
      setLoading(false);
      return;
    }
    const { data: quizData } = await supabase.from("quizzes").select("*").eq("creator_id", (profileData as any).id).maybeSingle();
    if (!quizData) {
      setLoading(false);
      return;
    }
    const quiz: any = quizData;

    const { data: coreQuestions } = await supabase
      .from("questions")
      .select("id, display_order")
      .is("parent_question_id", null)
      .order("display_order", { ascending: true });
    const orderMap = new Map<string, number>();
    (coreQuestions ?? []).forEach((q: any, i: number) => orderMap.set(q.id, i + 1));

    const { data: participations } = await supabase
      .from("participations")
      .select("id, core_score, max_core_score, profiles!participations_participant_id_fkey(name)")
      .eq("quiz_id", quiz.id)
      .eq("status", "completed");

    const rows: PersonRow[] = [];
    for (const p of (participations ?? []) as any[]) {
      const { data: answers } = await supabase
        .from("participant_answers")
        .select("question_id, is_correct")
        .eq("participation_id", p.id);
      const core = (answers ?? []).filter((a: any) => orderMap.has(a.question_id));
      const questions: QuestionBreakdown[] = core
        .map((a: any) => ({ n: orderMap.get(a.question_id)!, correct: !!a.is_correct }))
        .sort((a, b) => a.n - b.n);
      const correctCount = questions.filter((q) => q.correct).length;
      rows.push({
        participationId: p.id,
        name: p.profiles?.name ?? "Someone",
        pct: p.max_core_score ? Math.round((p.core_score / p.max_core_score) * 1000) / 10 : 0,
        correctCount,
        totalCount: questions.length,
        questions,
      });
    }
    rows.sort((a, b) => b.pct - a.pct);
    setPeople(rows);

    const scores = rows.map((r) => r.pct);
    setSummary({
      opened: quiz.link_opens_count ?? 0,
      answered: rows.length,
      avg: scores.length ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : 0,
      high: scores.length ? Math.max(...scores) : 0,
      low: scores.length ? Math.min(...scores) : 0,
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-dscreen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  return (
    <main className="min-h-dscreen flex flex-col gap-6 px-5 pb-16 pt-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/dashboard" className="mb-4 flex w-fit items-center gap-1 text-sm text-[var(--color-ink-dim)]">
          <ArrowLeft size={15} /> Back
        </Link>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <StatTile label="Opened" value={summary.opened} />
          <StatTile label="Answered" value={summary.answered} />
          <StatTile label="Average" value={`${summary.avg}%`} />
          <StatTile label="Highest" value={`${summary.high}%`} />
        </div>

        {people.length === 0 ? (
          <GlassCard className="px-5 py-8 text-center text-sm text-[var(--color-ink-dim)]">{editable.noAnswersYet}</GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {people.map((p) => {
              const open = openId === p.participationId;
              return (
                <GlassCard key={p.participationId} className="overflow-hidden px-0 py-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : p.participationId)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <div>
                      <p className="font-display font-semibold text-[var(--color-ink)]">{howTheyKnow.personHeading(p.name, p.pct)}</p>
                      <p className="text-xs text-[var(--color-ink-dim)]">{howTheyKnow.correctFraction(p.correctCount, p.totalCount)}</p>
                    </div>
                    <ChevronDown size={16} className={cx("text-[var(--color-ink-faint)] transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <ul className="flex flex-col gap-1.5 border-t border-white/10 px-5 py-4">
                      {p.questions.map((q) => (
                        <li
                          key={q.n}
                          className={cx("text-sm", q.correct ? "text-[var(--color-mint)]" : "text-[var(--color-coral)]")}
                        >
                          {q.correct ? howTheyKnow.questionCorrect(q.n) : howTheyKnow.questionWrong(q.n)}
                        </li>
                      ))}
                    </ul>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <GlassCard className="flex flex-col items-center gap-1 px-4 py-4">
      <span className="font-stat text-xl font-bold text-[var(--color-ink)]">{value}</span>
      <span className="text-xs text-[var(--color-ink-faint)]">{label}</span>
    </GlassCard>
  );
}

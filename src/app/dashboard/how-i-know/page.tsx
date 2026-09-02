"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { howIKnow, editable } from "@/lib/copy";
import { GlassCard, Spinner } from "@/components/ui";

export default function HowIKnowPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ name: string; pct: number }[]>([]);

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
    const { data } = await supabase
      .from("participations")
      .select("core_score, max_core_score, quizzes(creator_id, profiles(name))")
      .eq("participant_id", (profileData as any).id)
      .eq("status", "completed");

    const mapped = (data ?? []).map((r: any) => ({
      name: r.quizzes?.profiles?.name ?? "Someone",
      pct: r.max_core_score ? Math.round((r.core_score / r.max_core_score) * 1000) / 10 : 0,
    }));
    setRows(mapped);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-dscreen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.pct, 0) / rows.length) * 10) / 10 : 0;

  return (
    <main className="min-h-dscreen flex flex-col gap-6 px-5 pb-16 pt-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/dashboard" className="mb-4 flex w-fit items-center gap-1 text-sm text-[var(--color-ink-dim)]">
          <ArrowLeft size={15} /> Back
        </Link>

        {rows.length === 0 ? (
          <GlassCard className="px-5 py-8 text-center text-sm text-[var(--color-ink-dim)]">{editable.noQuizzesAnsweredYet}</GlassCard>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-1">
              <p className="font-display font-semibold text-[var(--color-ink)]">{howIKnow.quizzesAnswered(rows.length)}</p>
              <p className="text-sm text-[var(--color-ink-dim)]">{howIKnow.averageScore(avg)}</p>
            </div>
            <GlassCard className="px-5 py-4">
              <ul className="flex flex-col gap-3">
                {rows.map((r, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-[var(--color-ink)]">{howIKnow.entryLine(r.name, r.pct).split(" — ")[0]}</span>
                    <span className="font-stat text-sm text-[var(--color-ink-dim)]">{r.pct}%</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </>
        )}
      </div>
    </main>
  );
}

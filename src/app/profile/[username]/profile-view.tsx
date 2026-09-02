"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { getRankInfo, getLevel } from "@/lib/ranks";
import { GlassCard, GradientButton, Spinner } from "@/components/ui";
import { BottomNav } from "@/components/nav";

export function ProfileView({ username }: { username: string }) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function load() {
    setLoading(true);
    await ensureAnonymousSession();
    const supabase = createClient();
    const { data } = await supabase.from("creator_rankings").select("*").ilike("username", username).maybeSingle();
    if (data) {
      const { data: quizData } = await supabase.from("quizzes").select("slug").eq("creator_id", (data as any).profile_id).maybeSingle();
      setRow({ ...data, slug: (quizData as any)?.slug });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-dscreen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  if (!row) {
    return (
      <main className="flex min-h-dscreen flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-[var(--color-ink-dim)]">Couldn't find @{username}.</p>
        <BottomNav />
      </main>
    );
  }

  const rankInfo = getRankInfo(row.unique_participants_count);
  const level = getLevel(row.unique_participants_count);

  return (
    <main className="min-h-dscreen flex flex-col items-center gap-6 px-6 pb-24 pt-12">
      <Link href="/rankings" className="mr-auto flex w-fit items-center gap-1 text-sm text-[var(--color-ink-dim)]">
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="gradient-primary flex h-16 w-16 items-center justify-center rounded-full font-display text-2xl font-bold text-white">
          {row.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">{row.name}</h1>
        <p className="text-sm text-[var(--color-ink-faint)]">@{row.username}</p>
      </div>

      <div className="grid w-full max-w-xs grid-cols-2 gap-3">
        <GlassCard glow="gold" className="flex flex-col items-center gap-1 px-4 py-4">
          <span className="font-display text-sm font-semibold text-[var(--color-ink)]">{rankInfo.name}</span>
          <span className="text-xs text-[var(--color-ink-faint)]">Rank #{rankInfo.tierIndex}</span>
        </GlassCard>
        <GlassCard glow="violet" className="flex flex-col items-center gap-1 px-4 py-4">
          <span className="font-stat text-lg font-bold text-[var(--color-ink)]">{level}</span>
          <span className="text-xs text-[var(--color-ink-faint)]">Level</span>
        </GlassCard>
      </div>

      {row.crowns_count > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-[var(--color-gold)]">
          <Crown size={15} /> {row.crowns_count} {row.crowns_count === 1 ? "crown" : "crowns"}
        </div>
      )}

      <Link href={`/q/${row.slug}`} className="w-full max-w-xs">
        <GradientButton pulse>Take {row.name}'s quiz →</GradientButton>
      </Link>

      <BottomNav />
    </main>
  );
}

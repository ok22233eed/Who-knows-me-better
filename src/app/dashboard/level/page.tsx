"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { getLevel } from "@/lib/ranks";
import { levelScreen } from "@/lib/copy";
import { GlassCard, Spinner } from "@/components/ui";
import { NearbyCompetitors } from "@/components/leaderboard";
import { FullLevelPath } from "@/components/progress-paths";

export default function LevelDetailPage() {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState(0);
  const [sameLevel, setSameLevel] = useState<{ rank: number; name: string; isYou?: boolean }[]>([]);

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
    const { data: quizData } = await supabase.from("quizzes").select("unique_participants_count").eq("creator_id", (profileData as any).id).maybeSingle();
    const myFriends = (quizData as any)?.unique_participants_count ?? 0;
    setFriends(myFriends);
    const myLevel = getLevel(myFriends);

    const { data: allRankings } = await supabase.from("creator_rankings").select("*").order("unique_participants_count", { ascending: false });
    const rows = (allRankings ?? []) as any[];
    // "Same level" players = same unique_participants_count + 1 (Level formula)
    const peers = rows.filter((r) => r.unique_participants_count + 1 === myLevel);
    const mineIdx = peers.findIndex((r) => r.profile_id === (profileData as any).id);
    const windowRows = mineIdx >= 0 ? peers.slice(Math.max(0, mineIdx - 2), mineIdx + 3) : peers.slice(0, 5);
    setSameLevel(
      windowRows.map((r, i) => ({
        rank: i + 1,
        name: r.name,
        isYou: r.profile_id === (profileData as any).id,
      }))
    );
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-dscreen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  const level = getLevel(friends);

  return (
    <main className="min-h-dscreen flex flex-col gap-6 px-5 pb-16 pt-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/dashboard" className="mb-4 flex w-fit items-center gap-1 text-sm text-[var(--color-ink-dim)]">
          <ArrowLeft size={15} /> Back
        </Link>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-[var(--color-ink-dim)]">{levelScreen.yourLevel}</p>
          <p className="font-stat text-5xl font-bold text-[var(--color-ink)]">{level}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-dim)]">{levelScreen.seeHowYouRank(level)}</p>
        </div>

        {sameLevel.length > 0 && (
          <div className="mt-6">
            <NearbyCompetitors entries={sameLevel} youIndex={sameLevel.findIndex((n) => n.isYou) + 1} />
          </div>
        )}

        <GlassCard glow="mint" className="mt-6 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">{levelScreen.nextGoalHeading}</p>
          <p className="mt-1 font-display font-semibold text-[var(--color-ink)]">1 more friend → Level {level + 1}</p>
        </GlassCard>

        <div className="mt-8">
          <FullLevelPath currentLevel={level} upTo={Math.max(level + 6, 12)} />
        </div>
      </div>
    </main>
  );
}

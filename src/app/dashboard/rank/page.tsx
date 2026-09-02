"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { getRankInfo } from "@/lib/ranks";
import { rankScreen } from "@/lib/copy";
import { GlassCard, Spinner } from "@/components/ui";
import { NearbyCompetitors } from "@/components/leaderboard";
import { FullRankPath } from "@/components/progress-paths";

export default function RankDetailPage() {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState(0);
  const [nearby, setNearby] = useState<{ rank: number; name: string; isYou?: boolean }[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [aheadPct, setAheadPct] = useState(0);

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
    setFriends((quizData as any)?.unique_participants_count ?? 0);

    const { data: allRankings } = await supabase.from("creator_rankings").select("*").order("popularity_rank", { ascending: true });
    const rows = allRankings ?? [];
    const total = rows.length;
    const mineIdx = rows.findIndex((r: any) => r.profile_id === (profileData as any).id);
    if (mineIdx >= 0) {
      const myRank = (rows[mineIdx] as any).popularity_rank;
      setGlobalRank(myRank);
      setAheadPct(total > 1 ? Math.round(((total - myRank) / (total - 1)) * 100) : 100);
      const windowRows = rows.slice(Math.max(0, mineIdx - 2), mineIdx + 3);
      setNearby(
        windowRows.map((r: any) => ({
          rank: r.popularity_rank,
          name: r.name,
          isYou: r.profile_id === (profileData as any).id,
        }))
      );
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

  const rankInfo = getRankInfo(friends);

  return (
    <main className="min-h-dscreen flex flex-col gap-6 px-5 pb-16 pt-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/dashboard" className="mb-4 flex w-fit items-center gap-1 text-sm text-[var(--color-ink-dim)]">
          <ArrowLeft size={15} /> Back
        </Link>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-[var(--color-ink-dim)]">{rankScreen.yourGlobalRank}</p>
          <p className="font-stat text-5xl font-bold text-[var(--color-ink)]">#{globalRank ?? "—"}</p>
          {globalRank != null && <p className="text-sm text-[var(--color-mint)]">{rankScreen.aheadOf(aheadPct)}</p>}
        </div>

        {nearby.length > 0 && (
          <div className="mt-6">
            <NearbyCompetitors entries={nearby} youIndex={nearby.findIndex((n) => n.isYou) + 1} />
          </div>
        )}

        {rankInfo.nextName && rankInfo.friendsToNext != null && (
          <GlassCard glow="mint" className="mt-6 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">{rankScreen.nextGoalHeading}</p>
            <p className="mt-1 font-display font-semibold text-[var(--color-ink)]">
              {rankInfo.friendsToNext} more {rankInfo.friendsToNext === 1 ? "friend" : "friends"} → {rankInfo.nextName}
            </p>
          </GlassCard>
        )}

        <div className="mt-8">
          <FullRankPath currentFriends={friends} />
        </div>
      </div>
    </main>
  );
}

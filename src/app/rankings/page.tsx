"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { getRankInfo } from "@/lib/ranks";
import { GlassCard, Spinner } from "@/components/ui";
import { BottomNav } from "@/components/nav";
import { cx } from "@/lib/utils";

export default function RankingsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    await ensureAnonymousSession();
    const supabase = createClient();
    const { data: profileData } = await supabase.rpc("get_my_profile");
    setMyId(profileData ? (profileData as any).id : null);
    const { data } = await supabase.from("creator_rankings").select("*").order("popularity_rank", { ascending: true }).limit(100);
    setRows(data ?? []);
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
    <main className="min-h-dscreen flex flex-col gap-5 px-5 pb-28 pt-10">
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-5 text-center font-display text-2xl font-bold text-[var(--color-ink)]">Global Rankings</h1>

        <GlassCard className="px-3 py-3">
          <ul className="flex flex-col gap-1">
            {rows.map((r, i) => {
              const isYou = r.profile_id === myId;
              const rankInfo = getRankInfo(r.unique_participants_count);
              return (
                <motion.li
                  key={r.profile_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                >
                  <Link
                    href={`/profile/${r.username}`}
                    className={cx(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition",
                      isYou ? "gradient-primary text-white" : "hover:bg-white/5"
                    )}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <span className={cx("font-stat w-8 shrink-0 text-sm font-bold", r.popularity_rank <= 3 ? "text-[var(--color-gold)]" : isYou ? "" : "text-[var(--color-ink-faint)]")}>
                        #{r.popularity_rank}
                      </span>
                      <span className="truncate font-medium">{r.name}</span>
                      {r.crowns_count > 0 && <Crown size={12} className="shrink-0 text-[var(--color-gold)]" />}
                    </span>
                    <span className={cx("shrink-0 text-xs", isYou ? "text-white/80" : "text-[var(--color-ink-faint)]")}>{rankInfo.name}</span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </GlassCard>
      </div>
      <BottomNav />
    </main>
  );
}

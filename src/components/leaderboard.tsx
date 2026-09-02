"use client";

import { motion } from "framer-motion";
import { GlassCard } from "./ui";
import { cx } from "@/lib/utils";
import { result, editable } from "@/lib/copy";

export interface SimpleLeaderboardEntry {
  rank: number;
  name: string;
  scorePct?: number | null;
  isYou?: boolean;
}

const medalColor = (rank: number) =>
  rank === 1 ? "text-[var(--color-gold)]" : rank === 2 ? "text-[var(--color-ink-dim)]" : rank === 3 ? "text-[var(--color-flame)]" : "text-[var(--color-ink-faint)]";

export function LeaderboardList({
  title,
  entries,
  yourRank,
  showScores = false,
  limit = 3,
}: {
  title?: string;
  entries: SimpleLeaderboardEntry[];
  yourRank?: number | null;
  showScores?: boolean;
  limit?: number;
}) {
  const top = entries.slice(0, limit);
  const youInTop = yourRank != null && yourRank <= limit;

  if (entries.length === 0) {
    return (
      <GlassCard className="px-5 py-6 text-center text-sm text-[var(--color-ink-dim)]">
        {editable.emptyLeaderboard}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="px-5 py-4">
      {title && <p className="mb-3 font-display text-sm font-semibold text-[var(--color-ink)]">{title}</p>}
      <ul className="flex flex-col gap-2.5">
        {top.map((e, i) => (
          <motion.li
            key={`${e.rank}-${e.name}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className={cx(
              "flex items-center justify-between rounded-xl px-2 py-1.5",
              e.isYou && "bg-white/8"
            )}
          >
            <span className="flex items-center gap-2.5 truncate">
              <span className={cx("font-stat text-sm font-bold", medalColor(e.rank))}>{e.rank}.</span>
              <span className="truncate font-medium text-[var(--color-ink)]">{e.name}</span>
              {e.isYou && <span className="text-xs text-[var(--color-ink-faint)]">(you)</span>}
            </span>
            {showScores && e.scorePct != null && (
              <span className="font-stat shrink-0 text-sm text-[var(--color-ink-dim)]">{e.scorePct}%</span>
            )}
          </motion.li>
        ))}
      </ul>
      {!youInTop && yourRank != null && (
        <p className="mt-3 border-t border-white/10 pt-3 text-sm font-medium text-[var(--color-ink)]">
          {result.yourPosition(yourRank)}
        </p>
      )}
    </GlassCard>
  );
}

// "#25 Aisha / #26 Arjun / #27 Rahul · YOU / #28 Priya / #29 Rohan"
export function NearbyCompetitors({
  entries,
  youIndex,
}: {
  entries: { rank: number; name: string; isYou?: boolean }[];
  youIndex: number;
}) {
  return (
    <GlassCard className="px-5 py-4">
      <ul className="flex flex-col gap-1">
        {entries.map((e, i) => (
          <li
            key={e.rank}
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium",
              e.isYou ? "gradient-primary text-white" : "text-[var(--color-ink-dim)]",
              i === youIndex - 1 && "my-1"
            )}
          >
            <span className="font-stat w-10 shrink-0 text-sm">#{e.rank}</span>
            <span className="truncate">
              {e.name}
              {e.isYou && <span className="ml-1.5 opacity-80">· YOU</span>}
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

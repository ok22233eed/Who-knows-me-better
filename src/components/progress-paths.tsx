"use client";

import { motion } from "framer-motion";
import { GlassCard } from "./ui";
import { cx } from "@/lib/utils";
import { fullRankPath } from "@/lib/ranks";
import { levelScreen } from "@/lib/copy";

export function FullRankPath({ currentFriends }: { currentFriends: number }) {
  const path = fullRankPath();
  return (
    <div className="flex flex-col items-center">
      {path.map((tier, i) => {
        const isCurrent = currentFriends >= tier.minCount && (i === path.length - 1 || currentFriends < path[i + 1].minCount);
        return (
          <div key={tier.name} className="flex w-full flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className={cx(
                "flex w-full max-w-xs items-center justify-between rounded-2xl px-5 py-3.5",
                isCurrent ? "gradient-primary text-white shadow-[var(--shadow-glow-violet)]" : "glass-panel text-[var(--color-ink-dim)]"
              )}
            >
              <span className="font-display font-semibold">{tier.name}</span>
              <span className="font-stat text-sm opacity-80">
                {tier.minCount === 0 ? "0 friends" : `${tier.minCount} ${tier.minCount === 1 ? "friend" : "friends"}`}
              </span>
            </motion.div>
            {i < path.length - 1 && <div className="my-1 h-6 w-px bg-white/15" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}

// Winding level path: alternates left/right per the brief's ↘ ↙ ↘ ↙ sketch.
export function FullLevelPath({ currentLevel, upTo }: { currentLevel: number; upTo?: number }) {
  const max = upTo ?? Math.max(currentLevel + 6, 10);
  const levels = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="flex flex-col items-stretch px-4">
      {levels.map((lvl, i) => {
        const isCurrent = lvl === currentLevel;
        const alignRight = i % 2 === 1;
        return (
          <div key={lvl} className={cx("flex w-full", alignRight ? "justify-end" : "justify-start")}>
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.25, delay: (i % 8) * 0.03 }}
                className={cx(
                  "flex flex-col items-center gap-0.5 rounded-2xl px-5 py-3 text-center",
                  isCurrent ? "gradient-primary text-white shadow-[var(--shadow-glow-violet)]" : "glass-panel text-[var(--color-ink-dim)]"
                )}
              >
                {isCurrent && <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">{levelScreen.youAreHere}</span>}
                <span className="font-display font-semibold">Level {lvl}</span>
                <span className="font-stat text-xs opacity-70">
                  {lvl - 1 === 0 ? "0 friends" : `${lvl - 1} ${lvl - 1 === 1 ? "friend" : "friends"}`}
                </span>
              </motion.div>
              {i < levels.length - 1 && (
                <span className="my-0.5 text-[var(--color-ink-faint)]" aria-hidden>
                  {alignRight ? "↙" : "↘"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

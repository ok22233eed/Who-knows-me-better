"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMe } from "@/lib/use-me";
import { GradientButton, SecondaryButton, Spinner, GlassCard } from "@/components/ui";
import { BottomNav } from "@/components/nav";
import { editable } from "@/lib/copy";

export default function HomePage() {
  const { profile, quiz, loading, hasLiveQuiz } = useMe();

  return (
    <main className="min-h-dscreen flex flex-col items-center justify-center gap-8 px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="gradient-primary flex h-16 w-16 items-center justify-center rounded-3xl shadow-[var(--shadow-glow-violet)]">
          <Sparkles className="text-white" size={28} />
        </div>
        <h1 className="font-display text-3xl font-bold text-[var(--color-ink)]">Friend Quiz</h1>
        <p className="max-w-xs text-[var(--color-ink-dim)]">{editable.homeHint}</p>
      </motion.div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {loading ? (
          <GlassCard className="flex items-center justify-center py-6">
            <Spinner />
          </GlassCard>
        ) : hasLiveQuiz ? (
          <Link href="/dashboard">
            <GradientButton pulse>{editable.homeHeroDashboard}</GradientButton>
          </Link>
        ) : (
          <Link href="/create">
            <GradientButton pulse>{editable.homeHeroCreate}</GradientButton>
          </Link>
        )}

        {!profile && (
          <Link href="/login">
            <SecondaryButton>{editable.alreadyHaveAccount}</SecondaryButton>
          </Link>
        )}

        {profile && quiz && !quiz.is_live && (
          <Link href="/create">
            <SecondaryButton>Finish setting up your quiz</SecondaryButton>
          </Link>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

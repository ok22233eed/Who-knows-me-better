"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, BarChart3, Eye } from "lucide-react";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";
import { getRankInfo, getLevel } from "@/lib/ranks";
import { dashboard, editable } from "@/lib/copy";
import { quizUrl, copyToClipboard } from "@/lib/utils";
import { playTap } from "@/lib/sound";
import { GlassCard, GradientButton, SecondaryButton, MiniProgressDots, Spinner } from "@/components/ui";
import { RecoveryCodeBadge } from "@/components/recovery-code";
import { NotificationPermissionPrompt, AddToHomeScreenPrompt } from "@/components/notification-prompts";
import { ShareCard } from "@/components/share-card";
import { BottomNav } from "@/components/nav";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showHomePrompt, setShowHomePrompt] = useState(false);
  const [firstRunCode, setFirstRunCode] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string | null>(null);

  useEffect(() => {
    load();
    const stored = window.localStorage.getItem("fq_new_recovery_code");
    if (stored) {
      setFirstRunCode(stored);
      setCurrentCode(stored);
      window.localStorage.removeItem("fq_new_recovery_code");
    }
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (!isStandalone && window.localStorage.getItem("fq_has_shared") === "1" && !window.localStorage.getItem("fq_home_dismissed")) {
      setShowHomePrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    await ensureAnonymousSession();
    const supabase = createClient();
    const { data: profileData } = await supabase.rpc("get_my_profile");
    setProfile(profileData ?? null);
    if (profileData) {
      const { data: quizData } = await supabase.from("quizzes").select("*").eq("creator_id", (profileData as any).id).maybeSingle();
      setQuiz(quizData ?? null);
    }
    setLoading(false);
  }

  function markEngaged() {
    window.localStorage.setItem("fq_has_shared", "1");
    if (profile && !profile.notification_permission_asked_at) {
      setShowNotifPrompt(true);
    }
  }

  async function handleCopyLink() {
    if (!quiz) return;
    playTap();
    const ok = await copyToClipboard(quizUrl(quiz.slug));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
    const supabase = createClient();
    void supabase.rpc("log_quiz_event", { p_quiz_id: quiz.id, p_event_type: "share" });
    markEngaged();
  }

  if (loading) {
    return (
      <main className="flex min-h-dscreen items-center justify-center">
        <Spinner size={28} />
      </main>
    );
  }

  if (!profile || !quiz) {
    return (
      <main className="flex min-h-dscreen flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[var(--color-ink-dim)]">You haven't created your quiz yet.</p>
        <Link href="/create">
          <GradientButton className="w-48">Create your quiz →</GradientButton>
        </Link>
        <BottomNav />
      </main>
    );
  }

  const friends = quiz.unique_participants_count as number;
  const rankInfo = getRankInfo(friends);
  const level = getLevel(friends);
  const shareUrl = quizUrl(quiz.slug);

  return (
    <main className="min-h-dscreen flex flex-col gap-5 px-5 pb-28 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        {/* Share panel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard glow="violet" className="flex flex-col items-center gap-3 px-6 py-7 text-center">
            <h1 className="font-display text-xl font-bold text-[var(--color-ink)]">{dashboard.readyHeading}</h1>
            <p className="text-sm text-[var(--color-ink-dim)]">{dashboard.readyBody}</p>
            <div className="mt-1 flex w-full flex-col gap-2.5">
              <SecondaryButton onClick={handleCopyLink}>{copied ? editable.copyLinkDone : dashboard.copyLinkCta}</SecondaryButton>
              <ShareCard
                name={profile.name}
                caption={`Think you know ${profile.name}? Take the quiz.`}
                url={shareUrl}
                fileNamePrefix={`friend-quiz-${quiz.slug}`}
              />
            </div>
          </GlassCard>
        </motion.div>

        {showNotifPrompt && (
          <NotificationPermissionPrompt
            onDismiss={() => setShowNotifPrompt(false)}
            onEnabled={() => setShowNotifPrompt(false)}
          />
        )}
        {showHomePrompt && (
          <AddToHomeScreenPrompt
            onDismiss={() => {
              setShowHomePrompt(false);
              window.localStorage.setItem("fq_home_dismissed", "1");
            }}
          />
        )}

        <RecoveryCodeBadge
          code={currentCode ?? "········"}
          revealedByDefault={!!firstRunCode}
          onRegenerated={(c) => setCurrentCode(c)}
        />

        {/* Rank */}
        <GlassCard className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">{dashboard.yourRank}</p>
          <p className="mt-1 font-display text-lg font-bold text-[var(--color-ink)]">{dashboard.rankLine(rankInfo.tierIndex, rankInfo.name)}</p>
          <div className="mt-3">
            <MiniProgressDots filled={Math.min(rankInfo.tierIndex, 5)} total={5} />
          </div>
          {rankInfo.nextName && rankInfo.friendsToNext != null && (
            <p className="mt-3 text-sm text-[var(--color-ink-dim)]">
              {dashboard.rankPathHint(rankInfo.friendsToNext, rankInfo.tierIndex + 1, rankInfo.nextName)}
            </p>
          )}
          <Link href="/dashboard/rank" className="mt-3 flex items-center gap-1 text-sm font-medium text-[var(--color-violet)]">
            {dashboard.rankPathCta}
          </Link>
        </GlassCard>

        {/* Level */}
        <GlassCard className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">{dashboard.yourLevel}</p>
          <p className="mt-1 font-display text-lg font-bold text-[var(--color-ink)]">{dashboard.levelLine(level)}</p>
          <div className="mt-3">
            <MiniProgressDots filled={Math.min(level, 5)} total={5} />
          </div>
          <p className="mt-3 text-sm text-[var(--color-ink-dim)]">{dashboard.levelPathHint(1, level + 1)}</p>
          <Link href="/dashboard/level" className="mt-3 flex items-center gap-1 text-sm font-medium text-[var(--color-violet)]">
            {dashboard.levelPathCta}
          </Link>
        </GlassCard>

        <p className="text-center text-sm text-[var(--color-ink-dim)]">{dashboard.friendsCount(friends)}</p>

        <div className="flex flex-col gap-3">
          <Link href="/dashboard/how-i-know">
            <GlassCard className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-[var(--color-mint)]" />
                <div>
                  <p className="font-display font-semibold text-[var(--color-ink)]">{dashboard.howIKnowTitle}</p>
                  <p className="text-xs text-[var(--color-ink-dim)]">{dashboard.howIKnowSub}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-ink-faint)]" />
            </GlassCard>
          </Link>
          <Link href="/dashboard/how-they-know-me">
            <GlassCard className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Eye size={18} className="text-[var(--color-gold)]" />
                <div>
                  <p className="font-display font-semibold text-[var(--color-ink)]">{dashboard.howTheyKnowTitle}</p>
                  <p className="text-xs text-[var(--color-ink-dim)]">{dashboard.howTheyKnowSub}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-ink-faint)]" />
            </GlassCard>
          </Link>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}

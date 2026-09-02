"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { cx } from "@/lib/utils";
import { playTap } from "@/lib/sound";

export function GlassCard({
  children,
  className,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "violet" | "gold" | "mint";
}) {
  const glowStyle =
    glow === "gold"
      ? { boxShadow: "var(--shadow-glow-gold)" }
      : glow === "mint"
        ? { boxShadow: "var(--shadow-glow-mint)" }
        : glow === "violet"
          ? { boxShadow: "var(--shadow-glow-violet)" }
          : undefined;
  return (
    <div className={cx("glass-panel", className)} style={glowStyle}>
      {children}
    </div>
  );
}

export function GradientButton({
  children,
  onClick,
  type = "button",
  disabled,
  className,
  pulse = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        playTap();
        onClick?.();
      }}
      whileTap={{ scale: 0.96 }}
      animate={
        pulse && !disabled
          ? { boxShadow: ["0 0 0 0 rgba(124,92,255,0.45)", "0 0 0 14px rgba(124,92,255,0)"] }
          : undefined
      }
      transition={pulse ? { duration: 2.4, repeat: Infinity, ease: "easeOut" } : undefined}
      className={cx(
        "gradient-primary transform-gpu w-full rounded-2xl px-6 py-4 text-center font-display text-base font-semibold text-white",
        "shadow-[var(--shadow-glow-violet)] disabled:opacity-50 disabled:grayscale",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        playTap();
        onClick?.();
      }}
      className={cx(
        "glass-panel transform-gpu w-full rounded-2xl px-5 py-3.5 text-center font-medium text-[var(--color-ink)]",
        "disabled:opacity-50",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

export function IconButton({
  children,
  onClick,
  label,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-dim)] transition hover:bg-white/10 hover:text-[var(--color-ink)]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function AnimatedNumber({
  value,
  suffix = "",
  durationMs = 1100,
  className,
}: {
  value: number;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: durationMs, bounce: 0.15 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return unsub;
  }, [rounded]);

  return (
    <span className={cx("font-stat", className)}>
      {display}
      {suffix}
    </span>
  );
}

// Small horizontal dot path: ●────○────○────○────○
export function MiniProgressDots({ filled, total = 5 }: { filled: number; total?: number }) {
  const clamped = Math.min(Math.max(filled, 0), total);
  return (
    <div className="flex items-center gap-0" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={cx(
              "h-2.5 w-2.5 rounded-full transition-colors",
              i < clamped ? "gradient-primary" : "bg-white/15"
            )}
          />
          {i < total - 1 && (
            <div className={cx("h-[2px] w-6 sm:w-8", i < clamped - 1 ? "bg-[var(--color-violet)]/60" : "bg-white/10")} />
          )}
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({ progress, size = 88 }: { progress: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - Math.min(Math.max(progress, 0), 1) * c;
  return (
    <svg width={size} height={size} className="-rotate-90 transform-gpu">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#ring-gradient)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <defs>
        <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-violet)" />
          <stop offset="55%" stopColor="var(--color-magenta)" />
          <stop offset="100%" stopColor="var(--color-flame)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// The purposeful 3-5s "calculating your score" moment. Real work
// happens in the background while this renders (see quiz-experience.tsx)
// — this component is pure presentation.
export function SuspenseReveal({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % messages.length), 900);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="flex min-h-dscreen flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          className="absolute"
        >
          <ProgressRing progress={0.72} />
        </motion.div>
        <div className="h-6 w-6 rounded-full gradient-primary" />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-sm text-[var(--color-ink-dim)]"
        >
          {messages[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-coral)]/30 bg-[var(--color-coral)]/10 px-4 py-3 text-sm text-[var(--color-coral)]">
      {children}
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      style={{ width: size, height: size }}
      className="rounded-full border-2 border-white/20 border-t-white"
    />
  );
}

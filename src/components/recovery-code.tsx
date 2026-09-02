"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check, KeyRound } from "lucide-react";
import { GlassCard } from "./ui";
import { editable } from "@/lib/copy";
import { copyToClipboard } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function RecoveryCodeBadge({
  code,
  revealedByDefault = false,
  onRegenerated,
}: {
  code: string;
  revealedByDefault?: boolean;
  onRegenerated?: (newCode: string) => void;
}) {
  const [revealed, setRevealed] = useState(revealedByDefault);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  async function handleRegenerate() {
    if (!confirm(editable.recoveryRegenerateConfirm)) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("regenerate_recovery_code");
      if (!error && typeof data === "string") {
        onRegenerated?.(data);
        setRevealed(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard className={revealedByDefault ? "border-[var(--color-gold)]/30 px-5 py-4" : "px-4 py-3"}>
      {revealedByDefault && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-gold)]">
          <KeyRound size={12} /> {editable.recoveryFirstTime}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--color-ink-faint)]">{editable.recoveryLabel}</span>
          <span className="font-stat select-all text-sm tracking-wide text-[var(--color-ink)]">
            {revealed ? code : "•".repeat(Math.min(code.length, 12))}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={revealed ? "Hide code" : "Reveal code"}
            onClick={() => setRevealed((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-dim)] hover:bg-white/10"
          >
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button
            type="button"
            aria-label="Copy code"
            onClick={handleCopy}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-dim)] hover:bg-white/10"
          >
            {copied ? <Check size={15} className="text-[var(--color-mint)]" /> : <Copy size={15} />}
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-[var(--color-ink-faint)]">{editable.recoveryHelp}</p>
        <button
          type="button"
          disabled={busy}
          onClick={handleRegenerate}
          className="shrink-0 text-xs text-[var(--color-ink-faint)] underline decoration-dotted underline-offset-2 hover:text-[var(--color-ink-dim)]"
        >
          {editable.recoveryRegenerate}
        </button>
      </div>
    </GlassCard>
  );
}

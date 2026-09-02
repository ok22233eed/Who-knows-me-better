"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { GlassCard, GradientButton, InlineError } from "@/components/ui";
import { editable } from "@/lib/copy";
import { createClient, ensureAnonymousSession } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await ensureAnonymousSession();
      const supabase = createClient();
      const cleanUsername = username.trim().replace(/^@/, "");
      const { error: rpcError } = await supabase.rpc("claim_existing_profile", {
        p_username: cleanUsername,
        p_recovery_code: code.trim().toUpperCase(),
      });
      if (rpcError) throw rpcError;
      router.push("/dashboard");
    } catch {
      setError(editable.loginError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dscreen flex flex-col items-center justify-center gap-6 px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="gradient-primary flex h-12 w-12 items-center justify-center rounded-2xl">
            <KeyRound size={20} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">{editable.loginHeading}</h1>
          <p className="text-sm text-[var(--color-ink-dim)]">{editable.loginBody}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <GlassCard className="p-0">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={editable.loginUsernamePlaceholder}
              autoCapitalize="none"
              className="w-full bg-transparent px-5 py-4 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none"
            />
          </GlassCard>
          <GlassCard className="p-0">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={editable.loginCodePlaceholder}
              autoCapitalize="characters"
              className="font-stat w-full bg-transparent px-5 py-4 tracking-wider text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none"
            />
          </GlassCard>

          {error && <InlineError>{error}</InlineError>}

          <GradientButton type="submit" disabled={busy || !username.trim() || !code.trim()}>
            {busy ? "…" : editable.loginCta}
          </GradientButton>
        </form>

        <Link href="/create" className="mt-4 block text-center text-sm text-[var(--color-ink-faint)] underline decoration-dotted underline-offset-4">
          {editable.newHereCta}
        </Link>
      </motion.div>
    </main>
  );
}

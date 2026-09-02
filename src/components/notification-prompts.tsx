"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Smartphone } from "lucide-react";
import { GlassCard, GradientButton } from "./ui";
import { dashboard } from "@/lib/copy";
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // RLS scopes this to the caller's own profile row regardless of
    // filter, but the schema doesn't expose an auth-uid column on
    // profiles to filter by client-side, so we rely on that policy.
    const supabase = createClient();
    await supabase.from("profiles").update({
      push_token: JSON.stringify(subscription),
      push_notifications_enabled: true,
      notification_permission_asked_at: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}

export function NotificationPermissionPrompt({
  onDismiss,
  onEnabled,
}: {
  onDismiss: () => void;
  onEnabled: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
        <GlassCard glow="violet" className="relative px-5 py-4">
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-ink-faint)] hover:bg-white/10 hover:text-[var(--color-ink)]"
          >
            <X size={14} />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary">
              <Bell size={16} className="text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-display font-semibold text-[var(--color-ink)]">{dashboard.notifPromptHeading}</p>
              <p className="text-sm text-[var(--color-ink-dim)]">{dashboard.notifPromptBody}</p>
            </div>
          </div>
          <div className="mt-3">
            <GradientButton
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await subscribeToPush();
                setBusy(false);
                if (ok) onEnabled();
                else onDismiss();
              }}
              className="py-3 text-sm"
            >
              {busy ? "…" : dashboard.notifPromptHeading}
            </GradientButton>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}

export function AddToHomeScreenPrompt({ onDismiss }: { onDismiss: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !(window.navigator as any).standalone);
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <GlassCard glow="mint" className="relative px-5 py-4">
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-ink-faint)] hover:bg-white/10 hover:text-[var(--color-ink)]"
        >
          <X size={14} />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-mint)]/20">
            <Smartphone size={16} className="text-[var(--color-mint)]" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-display font-semibold text-[var(--color-ink)]">{dashboard.addHomeHeading}</p>
            <p className="text-sm text-[var(--color-ink-dim)]">
              {isIOS ? "Tap the Share icon, then \u201cAdd to Home Screen.\u201d" : dashboard.addHomeBody}
            </p>
          </div>
        </div>
        {deferredPrompt && !isIOS && (
          <button
            type="button"
            onClick={async () => {
              deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
              onDismiss();
            }}
            className="gradient-primary mt-3 w-full rounded-2xl py-3 text-center text-sm font-semibold text-white"
          >
            Add now
          </button>
        )}
      </GlassCard>
    </motion.div>
  );
}

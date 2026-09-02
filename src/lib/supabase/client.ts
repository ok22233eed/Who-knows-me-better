"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// Every visitor needs a real (anonymous) session before ANY RPC will
// work — start_participation, create_my_profile etc. all check
// auth.uid() is not null. Call this once, high up in the tree, before
// anything else touches Supabase. Safe to call repeatedly: if a
// session already exists it's a no-op.
export async function ensureAnonymousSession(): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    // Most common cause: Anonymous sign-ins are OFF in the Supabase
    // dashboard. See README -> Setup, step 1.
    console.error("Anonymous sign-in failed:", error.message);
    throw error;
  }
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, ensureAnonymousSession } from "./supabase/client";
import type { Profile, Quiz } from "./types";

export function useMe() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureAnonymousSession();
      const supabase = createClient();
      const { data: profileData, error: profileError } = await supabase.rpc("get_my_profile");
      if (profileError) throw profileError;
      const p = (profileData as Profile | null) ?? null;
      setProfile(p);

      if (p) {
        const { data: quizData } = await supabase.from("quizzes").select("*").eq("creator_id", p.id).maybeSingle();
        setQuiz((quizData as Quiz | null) ?? null);
      } else {
        setQuiz(null);
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, quiz, loading, error, refresh, hasProfile: !!profile, hasLiveQuiz: !!quiz?.is_live };
}

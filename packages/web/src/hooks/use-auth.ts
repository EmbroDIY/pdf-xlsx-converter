"use client";

import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

export function useAuth() {
  const supabase: SupabaseClient = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

  const signInWithPassword = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email: string, password: string, fullName?: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

  const signOut = () => supabase.auth.signOut();

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithPassword,
    signUp,
    signOut,
  };
}

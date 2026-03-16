"use client";

import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error("Auth callback error:", error.message);
        router.replace("/login");
      } else {
        router.replace("/convert");
      }
    });
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Completing sign in...</div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}

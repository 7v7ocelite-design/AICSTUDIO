"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";
import { hasPublicSupabase } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const MissingEnvNotice = () => (
  <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
    <section className="panel w-full">
      <h1 className="text-2xl font-semibold">AiC Content Studio</h1>
      <p className="mt-3 text-sm text-rose-300">
        Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them in
        <code className="rounded bg-slate-800 px-1 py-0.5">.env.local</code> to run the app.
      </p>
    </section>
  </main>
);

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasPublicSupabase) {
      setReady(true);
      return;
    }

    const supabase = getBrowserSupabase();
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setReady(true);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!hasPublicSupabase) {
    return <MissingEnvNotice />;
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
        <section className="panel w-full">
          <p className="text-sm text-muted">Loading authentication…</p>
        </section>
      </main>
    );
  }

  const supabase = getBrowserSupabase();

  if (!session?.access_token) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
        <AuthPanel supabase={supabase} />
      </main>
    );
  }

  return <Dashboard accessToken={session.access_token} onSignOut={() => supabase.auth.signOut()} />;
}

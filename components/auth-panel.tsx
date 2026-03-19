"use client";

import { FormEvent, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AuthPanelProps {
  supabase: SupabaseClient;
}

export const AuthPanel = ({ supabase }: AuthPanelProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        setInfo("Signed in successfully.");
        return;
      }

      // Fallback: create operator account if it doesn't exist yet.
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        throw signUpError;
      }

      setInfo("Account created. Check email confirmation settings in Supabase if login is blocked.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to authenticate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold">AiC Content Studio</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in as an operator to launch one-click, fully automated AI video generation.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            placeholder="operator@aicstudio.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            type="password"
            placeholder="••••••••"
          />
        </div>

        <button className="button-primary w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Authenticating..." : "Sign In / Create Account"}
        </button>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-400">{info}</p> : null}
      </form>
    </section>
  );
};

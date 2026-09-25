"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label, Notice } from "@/components/ui";

type Mode = "signin" | "signup" | "magic";

export function LoginForm({
  initialMode,
  next,
  error: initialError,
  googleEnabled,
  githubEnabled,
}: {
  initialMode: "signin" | "signup";
  next: string;
  error?: string;
  googleEnabled: boolean;
  githubEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState("");

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
        if (error) throw error;
        setMessage("Check your inbox for a sign-in link.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo() },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/profile?welcome=1");
          router.refresh();
        } else {
          setMessage("Almost there — confirm your email using the link we just sent.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "github") {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
    if (error) setError(error.message);
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-lg font-semibold">
        {mode === "signup" ? "Create your free account" : mode === "magic" ? "Email me a sign-in link" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "signup" ? "No credit card. You bring your own AI key later." : "Sign in to continue."}
      </p>

      {(googleEnabled || githubEnabled) && (
        <div className="mt-5 grid gap-2">
          {googleEnabled && (
            <Button variant="secondary" type="button" onClick={() => oauth("google")}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.8l4-3.1z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
              </svg>
              Continue with Google
            </Button>
          )}
          {githubEnabled && (
            <Button variant="secondary" type="button" onClick={() => oauth("github")}>
              <GithubIcon size={16} /> Continue with GitHub
            </Button>
          )}
          <div className="my-2 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-4 grid gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== "magic" && (
          <div>
            <Label htmlFor="password" hint={mode === "signup" ? "at least 8 characters" : undefined}>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        {error && <Notice tone="danger">{error}</Notice>}
        {message && <Notice tone="accent">{message}</Notice>}
        <Button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "magic" ? "Send link" : "Sign in"}
        </Button>
      </form>

      <div className="mt-5 grid gap-1.5 text-center text-sm text-muted">
        {mode !== "magic" && (
          <button type="button" className="inline-flex items-center justify-center gap-1.5 hover:text-fg" onClick={() => setMode("magic")}>
            <Mail size={14} /> Use a magic link instead
          </button>
        )}
        {mode === "signup" ? (
          <button type="button" className="hover:text-fg" onClick={() => setMode("signin")}>
            Already have an account? Sign in
          </button>
        ) : (
          <button type="button" className="hover:text-fg" onClick={() => setMode("signup")}>
            New here? Create a free account
          </button>
        )}
      </div>
    </Card>
  );
}

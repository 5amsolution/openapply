"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Mail, MailCheck } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Button, FieldHint, Input, Label, Notice, buttonClass, cn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "magic";

const COPY: Record<Mode, { title: string; sub: string; submit: string }> = {
  signin: { title: "Welcome back", sub: "Sign in to pick up where you left off.", submit: "Sign in" },
  signup: { title: "Create your free account", sub: "No card needed. Free AI included.", submit: "Create account" },
  magic: { title: "Sign in with a link", sub: "We'll email you a sign-in link. No password needed.", submit: "Email me a link" },
};

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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState("");

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const switchTo = (m: Mode) => {
    setMode(m);
    setError("");
    setMessage("");
  };

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
        setMessage("Check your inbox. We sent you a sign-in link.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
        if (error) throw error;
        if (data.session) {
          router.replace("/profile?welcome=1");
          router.refresh();
        } else {
          setMessage("Almost there. Confirm your email using the link we just sent.");
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

  const copy = COPY[mode];

  return (
    <div className="animate-[oa-rise_420ms_var(--ease-out)]">
      <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-fg">{copy.title}</h1>
      <p className="mt-2 text-[15px] text-muted">{copy.sub}</p>

      {mode !== "magic" && (
        <div role="group" aria-label="Sign in or create an account" className="mt-7 grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-2 p-1">
          {(
            [
              ["signin", "Sign in"],
              ["signup", "Create account"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => switchTo(m)}
              className={cn(
                "h-10 rounded-lg text-sm font-semibold transition-colors duration-150",
                mode === m ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {(googleEnabled || githubEnabled) && mode !== "magic" && (
        <div className="mt-6 grid gap-2">
          {googleEnabled && (
            <button type="button" className={buttonClass("secondary", "lg", "w-full")} onClick={() => oauth("google")}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.1z" />
                <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.7 10.7l7.8-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
              </svg>
              Continue with Google
            </button>
          )}
          {githubEnabled && (
            <button type="button" className={buttonClass("secondary", "lg", "w-full")} onClick={() => oauth("github")}>
              <GithubIcon size={18} /> Continue with GitHub
            </button>
          )}
          <div className="my-2 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-subtle">
            <span className="h-px flex-1 bg-border" aria-hidden="true" /> or use email <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
        </div>
      )}

      <form onSubmit={submit} className={cn("grid gap-5", googleEnabled || githubEnabled ? "mt-2" : "mt-7")}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
          />
        </div>
        {mode !== "magic" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="password" className="text-sm font-semibold text-fg">
                Password
              </label>
              {mode === "signin" && (
                <button type="button" className="text-[13px] font-semibold text-primary-text hover:underline" onClick={() => switchTo("magic")}>
                  Forgot it? Get a link
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {mode === "signup" && <FieldHint>Use 8 or more characters. You can also sign in with an email link later.</FieldHint>}
          </div>
        )}

        <Button type="submit" size="lg" loading={busy} className="w-full">
          {busy ? "Please wait…" : copy.submit}
          {!busy && <ArrowRight size={17} aria-hidden="true" />}
        </Button>
      </form>

      <div className="mt-4 grid gap-3" aria-live="polite">
        {error && <Notice tone="danger">{error}</Notice>}
        {message && (
          <Notice tone="success" title={mode === "magic" ? "Link sent" : "Check your email"}>
            {message}
          </Notice>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-muted">
        {mode === "magic" ? (
          <button type="button" className="inline-flex items-center gap-1.5 font-semibold text-primary-text hover:underline" onClick={() => switchTo("signin")}>
            Use my password instead
          </button>
        ) : (
          <button type="button" className="inline-flex items-center gap-1.5 font-semibold text-primary-text hover:underline" onClick={() => switchTo("magic")}>
            {message ? <MailCheck size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />} Email me a sign-in link instead
          </button>
        )}
      </div>

      <p className="mt-8 border-t border-border pt-6 text-center text-[13px] leading-relaxed text-muted">
        Free and open source. We never sell your data.{" "}
        <Link href="/privacy" className="font-semibold text-fg underline underline-offset-2">
          read our privacy notes
        </Link>
        .
      </p>
    </div>
  );
}

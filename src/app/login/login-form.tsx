"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Spinner } from "@/components/progress";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "magic";

const t = (delay: number, d?: number) => ({ "--delay": `${delay}ms`, ...(d ? { "--d": `${d}ms` } : {}) }) as CSSProperties;

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
        setMessage("Check your inbox — we sent you a sign-in link.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
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

  const heading = mode === "signup" ? "Start for free" : mode === "magic" ? "Magic link" : "Welcome Back!";
  const sub =
    mode === "signup" ? (
      <>
        <b>Create an account</b> — no card, free AI included.
      </>
    ) : mode === "magic" ? (
      <>
        <b>No password?</b> We&apos;ll email you a sign-in link.
      </>
    ) : (
      <>
        <b>Log in</b> to continue your job search.
      </>
    );

  return (
    <div className="auth-card-in">
      <h1 className="auth-h1 e" style={t(470, 620)}>
        {heading}
      </h1>
      <p className="auth-sub e" style={t(570, 560)}>
        {sub}
      </p>

      <form onSubmit={submit} className="auth-form">
        <input
          id="email"
          className="auth-field e e-soft"
          style={t(720)}
          type="email"
          required
          autoComplete="email"
          aria-label="Email address"
          placeholder="Eg. johndoe@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "magic" && (
          <input
            id="password"
            className="auth-field e e-soft"
            style={t(790)}
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            aria-label="Password"
            placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <button type="submit" className="auth-primary e" style={t(930, 560)} disabled={busy}>
          {busy && <Spinner />}
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "magic" ? "Send link" : "Login"}
          {!busy && (
            <svg width="13" height="13" viewBox="0 0 22 22" aria-hidden="true">
              <path d="M3 11h15.4M11 3.3l7.7 7.7-7.7 7.7" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>

      {error && <p className="auth-msg err">{error}</p>}
      {message && <p className="auth-msg ok">{message}</p>}

      <div className="auth-divider e e-soft" style={t(1060, 440)}>
        <i /> OR <i />
      </div>

      <div className="e" style={t(1150, 540)}>
        {googleEnabled && (
          <button type="button" className="auth-alt" onClick={() => oauth("google")}>
            <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.1z" />
              <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.7 10.7l7.8-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
            </svg>
            Sign in with Google
          </button>
        )}
        {githubEnabled && (
          <button type="button" className="auth-alt" onClick={() => oauth("github")}>
            <GithubIcon size={19} /> Sign in with GitHub
          </button>
        )}
        {mode !== "magic" ? (
          <button type="button" className="auth-alt" onClick={() => setMode("magic")}>
            <Mail size={18} /> Email me a sign-in link
          </button>
        ) : (
          <button type="button" className="auth-alt" onClick={() => setMode("signin")}>
            Use my password instead
          </button>
        )}
      </div>

      <p className="auth-bottom e e-soft" style={t(1260, 500)}>
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("signin")}>
              Log in
            </button>
          </>
        ) : (
          <>
            Don&#8217;t have an account?{" "}
            <button type="button" onClick={() => setMode("signup")}>
              Start Free
            </button>
          </>
        )}
      </p>
    </div>
  );
}

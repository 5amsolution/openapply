import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import "./login.css";

export const metadata: Metadata = { title: "Sign in" };

const t = (delay: number, d?: number, from?: string) =>
  ({ "--delay": `${delay}ms`, ...(d ? { "--d": `${d}ms` } : {}), ...(from ? { "--from": from } : {}) }) as CSSProperties;

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/dashboard";
  if (user) redirect(next);

  return (
    <div className="auth">
      <section className="auth-panel" aria-hidden="false">
        <div className="auth-logo">
          <Logo />
        </div>
        <div className="auth-art" aria-hidden="true">
          <div className="auth-toast e" style={t(180, 620, "10px")}>
            <svg width="28" height="28" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="12" fill="#0d0d0d" />
              <path d="M12 5.2c.5 3.2 1.6 4.3 4.8 4.8-3.2.5-4.3 1.6-4.8 4.8-.5-3.2-1.6-4.3-4.8-4.8 3.2-.5 4.3-1.6 4.8-4.8Z" fill="#fff" />
            </svg>
            <div>
              <b>3 applications ready!</b>
              <span>Written overnight by Autopilot</span>
            </div>
          </div>
          <div className="auth-card-float e" style={t(300, 700, "12px")}>
            <p className="n">23</p>
            <p className="l">applications written this week</p>
            <div className="auth-bars">
              {[18, 30, 42, 50, 58, 64, 70].map((h, i) => (
                <i key={i} style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>
          <div className="auth-chips e" style={t(420, 620)}>
            {["Remotive", "Greenhouse", "Lever", "Himalayas", "Ashby"].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
        <div className="auth-hero">
          <div className="auth-badge e e-soft" style={t(120, 480)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="#fff" />
            </svg>
            Free for every job seeker
          </div>
          <p className="auth-hl">
            <span className="e-hl" style={{ display: "block", ...t(240) }}>
              Your next job,
            </span>
            <span className="e-hl" style={{ display: "block", ...t(330) }}>
              on autopilot.
            </span>
          </p>
        </div>
      </section>

      <section className="auth-pane">
        <div className="auth-card e" style={t(40, 820, "12px")}>
          <LoginForm
            initialMode={params.mode === "signup" ? "signup" : "signin"}
            next={next}
            error={typeof params.error === "string" ? params.error : undefined}
            googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true"}
            githubEnabled={process.env.NEXT_PUBLIC_GITHUB_AUTH === "true"}
          />
        </div>
      </section>
    </div>
  );
}

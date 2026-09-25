import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Small set of shared primitives. Server-safe (no hooks).

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-[-0.01em] transition duration-200 " +
  "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<Variant, string> = {
  primary: "sheen bg-ink text-ink-fg shadow-[0_6px_16px_rgba(21,32,26,0.16)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(21,32,26,0.22)] active:translate-y-0",
  secondary: "bg-surface shadow-[0_0_0_1.5px_var(--border)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1.5px_var(--border),0_8px_18px_rgba(24,30,45,0.08)] active:translate-y-0",
  ghost: "hover:bg-surface-2 active:scale-95",
  danger: "text-danger shadow-[0_0_0_1.5px_var(--danger-soft)] hover:bg-danger-soft",
};

export function Button({
  variant = "primary",
  className,
  loading,
  disabled,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cn(buttonBase, variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(buttonBase, variants[variant], className)} {...props} />;
}

export function Card({ className, interactive, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return <div className={cn("bento bg-surface", interactive && "lift", className)} {...props} />;
}

type Tint = "lime" | "lavender" | "peach" | "pink" | "cool";

/** Heading row for a card section: coloured icon chip, title, optional action. */
export function SectionTitle({
  icon,
  tint = "lime",
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  tint?: Tint;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && <span className={cn("chip-icon", `pastel-${tint}`)}>{icon}</span>}
        <div>
          <h2 className="font-bold tracking-[-0.02em]">{title}</h2>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-muted/70 " +
  "focus:outline-2 focus:outline-offset-0 focus:outline-accent";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-24 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(field, className)} {...props} />;
}

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
      {hint && <span className="ml-1.5 font-normal text-muted">{hint}</span>}
    </label>
  );
}

type Tone = "neutral" | "accent" | "warn" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const tone: Tone = score >= 80 ? "accent" : score >= 60 ? "info" : score >= 40 ? "warn" : "danger";
  return (
    <Badge tone={tone} title="Fit score">
      {score}% fit
    </Badge>
  );
}

/**
 * Page hero in the landing mosaic's style: pastel gradient panel, bold title
 * whose first word is highlighted, one-line description and actions.
 */
export function PageHeader({
  title,
  description,
  actions,
  tint = "lime",
  eyebrow,
  aside,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  tint?: Tint;
  eyebrow?: ReactNode;
  aside?: ReactNode;
}) {
  const [first, ...rest] = title.split(" ");
  return (
    <header className={cn("bento relative mb-6 overflow-hidden px-6 py-7 md:px-8 md:py-8", `pastel-${tint}`)}>
      <div className="grid-dots pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold text-fg shadow-[0_0_0_1.5px_rgba(255,255,255,0.8)]">
              {eyebrow}
            </p>
          )}
          <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#15201a] md:text-[38px] dark:text-fg">
            <span className="text-[#5f8b3e] dark:text-accent">{first}</span>
            {rest.length ? " " + rest.join(" ") : ""}
          </h1>
          {description && <p className="mt-2 text-[15px] text-[#1e2a1b]/75 dark:text-muted">{description}</p>}
        </div>
        {(actions || aside) && (
          <div className="flex flex-wrap items-center gap-2">
            {aside}
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="chip-icon pastel-lavender h-12 w-12 rounded-2xl" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <p className="font-bold tracking-tight">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </Card>
  );
}

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cn("rounded-2xl px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

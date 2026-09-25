import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Search, Sparkles, XCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";

// Shared, server-safe building blocks (no hooks). Colours come only from the
// tokens in globals.css, so every combination here is readable in both themes.

/** Joins class names; later classes win over earlier ones that set the same thing. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(...classes);
}

/* ------------------------------------------------------------------ tones */

export type Tone = "neutral" | "primary" | "success" | "warn" | "danger" | "info" | "violet" | "pink";

/** Soft background + matching text colour (all pairs are 6.5:1 or better). */
export const SOFT: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary-soft-fg",
  success: "bg-success-soft text-success-soft-fg",
  warn: "bg-warn-soft text-warn-soft-fg",
  danger: "bg-danger-soft text-danger-soft-fg",
  info: "bg-info-soft text-info-soft-fg",
  violet: "bg-violet-soft text-violet-soft-fg",
  pink: "bg-pink-soft text-pink-soft-fg",
};

/** Pipeline stage → colour, used on the board, the dashboard and job cards. */
export const STATUS_TONE: Record<string, Tone> = {
  saved: "neutral",
  ready: "primary",
  applied: "info",
  interviewing: "violet",
  offer: "success",
  rejected: "pink",
  archived: "neutral",
};

export const STATUS_DOT: Record<string, string> = {
  saved: "var(--subtle)",
  ready: "var(--primary)",
  applied: "var(--info)",
  interviewing: "var(--violet)",
  offer: "var(--success)",
  rejected: "var(--danger)",
  archived: "var(--subtle)",
};

/* ---------------------------------------------------------------- buttons */

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "danger-solid";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const BUTTON_BASE =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,translate,scale,opacity,filter] duration-200 ease-out " +
  "active:scale-[0.97] disabled:pointer-events-none";

// Every button answers the pointer: it lifts a little and brightens on hover.
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-primary-fg shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:brightness-[1.08]",
  secondary: "border border-border-strong bg-surface text-fg shadow-xs hover:-translate-y-0.5 hover:border-hover-border hover:bg-surface-2 hover:shadow-md",
  soft: "bg-primary-soft text-primary-soft-fg hover:-translate-y-0.5 hover:bg-primary-soft-hover",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger:
    "border border-border-strong bg-surface text-danger shadow-xs hover:-translate-y-0.5 hover:border-danger hover:bg-danger-soft hover:text-danger-soft-fg",
  "danger-solid": "bg-danger-solid text-danger-solid-fg shadow-sm hover:-translate-y-0.5 hover:opacity-90",
};

// Disabled buttons stay readable (no fading): a quiet grey fill with 5:1+ text.
const BUTTON_DISABLED: Record<ButtonVariant, string> = {
  primary: "bg-surface-3 text-muted shadow-none",
  secondary: "bg-surface-2 text-subtle shadow-none",
  soft: "bg-surface-2 text-subtle",
  ghost: "text-subtle",
  danger: "border-border bg-surface-2 text-subtle shadow-none",
  "danger-solid": "bg-surface-3 text-muted shadow-none",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-11 w-11",
  "icon-sm": "h-9 w-9",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string, disabled?: boolean) {
  return cn(BUTTON_BASE, disabled ? BUTTON_DISABLED[variant] : BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 shrink-0 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading,
  disabled,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className, disabled && !loading)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <SpinnerIcon />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ------------------------------------------------------------------ cards */

export function Card({ className, interactive, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return <div className={cn("rounded-2xl border border-border bg-surface shadow-xs", interactive && "lift", className)} {...props} />;
}

export function IconTile({
  tone = "primary",
  size = "md",
  className,
  children,
}: {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}) {
  const s = size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-xl";
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center", s, SOFT[tone], className)}>
      {children}
    </span>
  );
}

/** Heading row for a card: icon tile, title, one-line hint and an optional action. */
export function SectionTitle({
  icon,
  tone = "primary",
  title,
  hint,
  action,
  id,
  level = 2,
  className,
}: {
  icon?: ReactNode;
  tone?: Tone;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  id?: string;
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconTile tone={tone}>{icon}</IconTile>}
        <div className="min-w-0">
          <Heading id={id} className="text-base font-bold tracking-tight text-fg">
            {title}
          </Heading>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Page title block. */
export function PageHeader({
  icon,
  tone = "primary",
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  icon?: ReactNode;
  tone?: Tone;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 md:mb-8", className)}>
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <IconTile tone={tone} size="lg" className="mt-0.5 hidden shadow-xs sm:inline-flex">
            {icon}
          </IconTile>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-primary-text">{eyebrow}</p>}
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-fg md:text-[30px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ----------------------------------------------------------------- fields */

// Fields sit "inset" (darker than their card in dark mode) with a clearly visible edge.
const FIELD =
  "block w-full rounded-xl border border-border-strong bg-field px-3.5 text-[15px] text-fg shadow-xs outline-none " +
  "transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-hover-border " +
  "focus:border-focus focus:ring-4 focus:ring-ring " +
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(FIELD, "h-11", className)} {...props} />;
}

/** Grows with its content (no tiny scroll boxes), up to most of the screen. */
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD, "field-sizing-content min-h-28 max-h-[70vh] py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, wrapperClassName, ...props }: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select className={cn(FIELD, "h-11 appearance-none pr-10", className)} {...props} />
      <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Label({
  children,
  hint,
  htmlFor,
  className,
}: {
  children: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-semibold text-fg", className)}>
      {children}
      {hint && <span className="ml-1.5 font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function FieldHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 text-[13px] leading-relaxed text-muted", className)}>{children}</p>;
}

/** A checkbox drawn as a switch. Works in plain forms (name/value) and controlled. */
export function Switch({ label, className, ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex items-center gap-2.5 text-sm font-medium text-fg", className)}>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span className="h-6 w-10 rounded-full bg-control-off transition-colors duration-200 peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[transform,background-color] duration-200 ease-out peer-checked:translate-x-4 peer-checked:bg-primary-fg" />
      </span>
      {label}
    </label>
  );
}

/* ----------------------------------------------------------------- badges */

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold", SOFT[tone], className)}
      {...props}
    />
  );
}

export function scoreTone(score: number): Tone {
  return score >= 80 ? "success" : score >= 60 ? "primary" : "neutral";
}

export function ScoreBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score == null) return null;
  return (
    <Badge tone={scoreTone(score)} title="How well this job fits your profile" className={className}>
      {score}% fit
    </Badge>
  );
}

const RING_COLOR: Record<string, string> = {
  success: "var(--success)",
  primary: "var(--primary)",
  neutral: "var(--subtle)",
};

/** Circular fit score that draws itself in. */
export function ScoreRing({
  score,
  size = 72,
  className,
  label = "Fit score",
}: {
  score: number | null | undefined;
  size?: number;
  className?: string;
  label?: string;
}) {
  const stroke = size >= 64 ? 7 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, score ?? 0));
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={score == null ? `No ${label.toLowerCase()} yet` : `${label}: ${score} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {score != null && (
          <circle
            className="score-ring-arc"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={RING_COLOR[scoreTone(score)]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - value / 100)}
            style={{ "--ring-len": `${c}` } as CSSProperties}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-extrabold tabular-nums text-fg" aria-hidden="true">
        <span style={{ fontSize: size * 0.28 }}>{score ?? "?"}</span>
        {score != null && <span className="text-muted" style={{ fontSize: size * 0.15 }}>%</span>}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- avatars */

export function initialsOf(name: string) {
  return (
    name
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-brand inline-flex shrink-0 items-center justify-center rounded-full font-bold text-primary-fg shadow-xs",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialsOf(name)}
    </span>
  );
}

/* --------------------------------------------------------------- feedback */

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center", className)}>
      <IconTile tone="primary" size="lg">
        {icon ?? <Search size={22} />}
      </IconTile>
      <h2 className="mt-4 text-lg font-bold tracking-tight text-fg">{title}</h2>
      {children && <div className="mt-1.5 max-w-md text-[15px] leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

const NOTICE_ICON = {
  neutral: Info,
  primary: Sparkles,
  success: CheckCircle2,
  warn: AlertTriangle,
  danger: XCircle,
  info: Info,
  violet: Sparkles,
  pink: Info,
} satisfies Record<Tone, unknown>;

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = NOTICE_ICON[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn("flex gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed", SOFT[tone], className)}
    >
      <Icon size={18} className="mt-px shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

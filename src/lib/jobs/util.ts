import type { JobInput } from "@/lib/types";

export const USER_AGENT = "5AMApply/1.0 (+https://github.com/MuhammadAbdullah80/openapply; open-source job search)";

export async function fetchJSON<T>(url: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": USER_AGENT, accept: "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return (await res.json()) as T;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  bull: "•",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** HTML job description → readable plain text with paragraph and bullet breaks. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = html;
  // Some feeds double-escape their HTML.
  if (/&lt;\w/.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|li|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return s
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Repairs UTF-8 text that was decoded as Latin-1 somewhere upstream ("MecÃ¡nico"). */
export function fixMojibake(s: string): string {
  if (!/[ÃÂâ][\u0080-ÿ]/.test(s)) return s;
  try {
    const repaired = Buffer.from(s, "latin1").toString("utf8");
    return repaired.includes("�") ? s : repaired;
  } catch {
    return s;
  }
}

export function toISO(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const d = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function num(value: unknown): number | null {
  const n = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Lower-case word tokens used for local keyword filtering. */
export function tokens(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const STOPWORDS = new Set(["and", "or", "the", "a", "an", "in", "of", "for", "to", "with", "job", "jobs", "remote"]);

/** True if every query token appears in the job's title, tags or company (or most appear in the description). */
export function matchesKeywords(job: Pick<JobInput, "title" | "tags" | "company" | "description">, q: string): boolean {
  const qt = tokens(q);
  if (qt.length === 0) return true;
  const head = `${job.title} ${job.tags.join(" ")} ${job.company}`.toLowerCase();
  if (qt.every((t) => head.includes(t))) return true;
  const body = job.description.toLowerCase();
  const hits = qt.filter((t) => head.includes(t) || body.includes(t)).length;
  return head.includes(qt[0]) && hits >= Math.ceil(qt.length * 0.75);
}

export function matchesLocation(job: Pick<JobInput, "location" | "remote">, location: string): boolean {
  const loc = location.trim().toLowerCase();
  if (!loc) return true;
  const jl = job.location.toLowerCase();
  if (!jl) return job.remote;
  return loc
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .some((part) => jl.includes(part)) || /worldwide|anywhere|global/.test(jl);
}

export function isRemoteText(...values: (string | null | undefined)[]): boolean {
  return values.some((v) => !!v && /\bremote\b|work from home|anywhere|worldwide|distributed/i.test(v));
}

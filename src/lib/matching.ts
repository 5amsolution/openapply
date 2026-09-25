import type { Job, Profile } from "@/lib/types";
import { tokens } from "@/lib/jobs/util";

// Free, instant fit estimate used when the user has no AI key yet and as a
// pre-filter so the autopilot only spends tokens on plausible jobs.

export interface KeywordMatch {
  score: number;
  strengths: string[];
  gaps: string[];
  summary: string;
}

export function keywordMatch(profile: Pick<Profile, "skills" | "desired_titles" | "headline" | "remote_preference">, job: Job): KeywordMatch {
  const text = `${job.title}\n${job.tags.join(" ")}\n${job.description}`.toLowerCase();
  const skills = uniq(profile.skills.map((s) => s.trim()).filter(Boolean));

  const matchedSkills = skills.filter((s) => containsTerm(text, s.toLowerCase()));
  const skillRatio = skills.length ? matchedSkills.length / Math.min(skills.length, 15) : 0;

  const titleTargets = [...profile.desired_titles, profile.headline || ""].filter(Boolean);
  const jobTitleTokens = new Set(tokens(job.title));
  const titleScore = titleTargets.reduce((best, t) => {
    const tt = tokens(t);
    if (!tt.length) return best;
    const hit = tt.filter((x) => jobTitleTokens.has(x)).length / tt.length;
    return Math.max(best, hit);
  }, 0);

  let score = Math.round(Math.min(1, skillRatio) * 60 + titleScore * 40);
  if (profile.remote_preference === "remote" && !job.remote) score = Math.round(score * 0.6);
  score = Math.max(0, Math.min(100, score));

  const missing = extractRequirementTerms(text).filter(
    (term) => !skills.some((s) => s.toLowerCase() === term),
  );

  return {
    score,
    strengths: matchedSkills.slice(0, 5).map((s) => `Mentions ${s}`),
    gaps: missing.slice(0, 5).map((t) => `Asks for ${t}`),
    summary:
      skills.length === 0
        ? "Add skills to your profile for a better estimate."
        : `Keyword estimate: ${matchedSkills.length} of your skills appear in this posting.`,
  };
}

function containsTerm(text: string, term: string): boolean {
  if (!term) return false;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text);
}

const COMMON_TECH = [
  "python", "java", "javascript", "typescript", "react", "node", "go", "golang", "rust", "c++", "c#", ".net", "ruby",
  "rails", "php", "kotlin", "swift", "sql", "postgresql", "mysql", "mongodb", "redis", "kafka", "aws", "gcp", "azure",
  "docker", "kubernetes", "terraform", "graphql", "django", "flask", "spring", "vue", "angular", "next.js", "figma",
  "salesforce", "excel", "tableau", "power bi", "machine learning", "pytorch", "tensorflow", "spark", "airflow",
  "snowflake", "dbt", "seo", "hubspot", "jira", "linux",
];

function extractRequirementTerms(text: string): string[] {
  return COMMON_TECH.filter((t) => containsTerm(text, t));
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((v) => {
    const k = v.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

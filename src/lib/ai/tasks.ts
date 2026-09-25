import "server-only";
import { z } from "zod";
import { generateObject, type AIConfig, type AIUsage } from "@/lib/ai/providers";
import type { Job, Profile } from "@/lib/types";

// The three things the AI does for a job seeker: read their resume, judge a
// job against it, and write the application. All prompts insist on honesty —
// the model may reword real experience but must never invent any.

const HONESTY =
  "Never invent employers, titles, dates, degrees, certifications, metrics or skills the candidate does not have. " +
  "You may rephrase and emphasize real experience. If something is missing, leave it out rather than making it up.";

// ---------------------------------------------------------------------------
// 1. Resume → structured profile
// ---------------------------------------------------------------------------

export const ParsedResumeSchema = z.object({
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  headline: z.string().describe("One-line professional headline, e.g. 'Senior Backend Engineer'"),
  summary: z.string().describe("2-4 sentence professional summary in first person, based only on the resume"),
  links: z.object({
    linkedin: z.string(),
    github: z.string(),
    portfolio: z.string(),
  }),
  skills: z.array(z.string()).describe("Distinct hard skills, tools and technologies"),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      location: z.string(),
      start: z.string(),
      end: z.string().describe("'Present' if current"),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      field: z.string(),
      start: z.string(),
      end: z.string(),
    }),
  ),
  desired_titles: z.array(z.string()).describe("3-5 job titles this person is a strong fit for"),
});
export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

export async function parseResume(config: AIConfig, resumeText: string) {
  return generateObject(config, {
    system:
      "You extract structured data from resumes. Use empty strings or empty arrays for anything not present. " +
      HONESTY,
    prompt: `<resume>\n${resumeText.slice(0, 60_000)}\n</resume>\n\nExtract this resume into the schema.`,
    schema: ParsedResumeSchema,
    maxTokens: 8000,
  });
}

// ---------------------------------------------------------------------------
// 2. Job fit score
// ---------------------------------------------------------------------------

export const MatchSchema = z.object({
  score: z.number().int().min(0).max(100).describe("How strong a fit this candidate is, 0-100"),
  summary: z.string().describe("One or two sentences explaining the score"),
  strengths: z.array(z.string()).describe("Up to 5 specific reasons the candidate fits"),
  gaps: z.array(z.string()).describe("Up to 5 specific requirements the candidate appears to lack"),
  dealbreaker: z
    .string()
    .describe("Empty string, or a hard blocker such as location, work authorization, or required clearance"),
});
export type MatchResult = z.infer<typeof MatchSchema>;

export async function scoreMatch(config: AIConfig, profile: Profile, job: Job) {
  return generateObject(config, {
    system:
      "You are a pragmatic recruiter. Score candidate-job fit honestly: 85+ means clearly qualified, " +
      "60-84 means worth applying, below 60 means a stretch. Consider seniority, core skills, domain, " +
      "location/remote constraints and work authorization.",
    prompt: `${candidateBlock(profile)}\n\n${jobBlock(job)}\n\nScore this match.`,
    schema: MatchSchema,
    maxTokens: 2000,
  });
}

// ---------------------------------------------------------------------------
// 3. Application package
// ---------------------------------------------------------------------------

export const ApplicationDraftSchema = z.object({
  cover_letter: z
    .string()
    .describe("Plain-text cover letter, 180-320 words, no placeholders like [Company], signed with the candidate's name"),
  tailored_summary: z.string().describe("A 2-3 sentence resume summary rewritten for this job"),
  tailored_bullets: z
    .array(z.object({ role: z.string(), bullets: z.array(z.string()) }))
    .describe("For the 1-3 most relevant roles, rewritten bullets that emphasize what this job wants"),
  answers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("Answers to likely screening questions for this job"),
});
export type ApplicationDraft = z.infer<typeof ApplicationDraftSchema>;

const COMMON_QUESTIONS = [
  "Why are you interested in this role?",
  "Why do you want to work at this company?",
  "Describe a relevant accomplishment.",
  "What are your salary expectations?",
  "Are you authorized to work in this location? Will you require sponsorship?",
  "When can you start?",
];

export async function draftApplication(
  config: AIConfig,
  profile: Profile,
  job: Job,
  extraQuestions: string[] = [],
) {
  const questions = [...COMMON_QUESTIONS, ...extraQuestions].map((q) => `- ${q}`).join("\n");
  return generateObject(config, {
    system:
      "You write job applications that sound like a real, specific person — direct, warm, no clichés " +
      "('I am writing to express', 'passionate', 'synergy'). Reference concrete details from the job posting " +
      "and the candidate's real experience. Answer screening questions in first person. For salary, " +
      "authorization, sponsorship and start date use the candidate's stated preferences; if unknown, give a " +
      "short, neutral answer the candidate can edit. " +
      HONESTY,
    prompt:
      `${candidateBlock(profile)}\n\n${jobBlock(job)}\n\n` +
      `<screening_questions>\n${questions}\n</screening_questions>\n\n` +
      "Write the application package.",
    schema: ApplicationDraftSchema,
    maxTokens: 8000,
  });
}

// ---------------------------------------------------------------------------
// prompt helpers
// ---------------------------------------------------------------------------

function candidateBlock(p: Profile): string {
  const experience = (p.experience ?? [])
    .map(
      (e) =>
        `- ${e.title} at ${e.company} (${e.start || "?"} – ${e.end || "?"})${e.location ? `, ${e.location}` : ""}\n` +
        (e.bullets ?? []).map((b) => `    • ${b}`).join("\n"),
    )
    .join("\n");
  const education = (p.education ?? [])
    .map((e) => `- ${e.degree} ${e.field}, ${e.school} (${e.end || ""})`)
    .join("\n");
  const answers = Object.entries(p.standard_answers ?? {})
    .map(([q, a]) => `- ${q}: ${a}`)
    .join("\n");

  return [
    "<candidate>",
    `Name: ${p.full_name || ""}`,
    `Headline: ${p.headline || ""}`,
    `Location: ${p.location || ""}`,
    `Work authorization: ${p.work_authorization || "not stated"}; needs sponsorship: ${
      p.needs_sponsorship == null ? "not stated" : p.needs_sponsorship ? "yes" : "no"
    }`,
    `Remote preference: ${p.remote_preference}`,
    `Salary expectation: ${p.salary_expectation || "not stated"}`,
    `Notice period / start date: ${p.notice_period || "not stated"}`,
    `Summary: ${p.summary || ""}`,
    `Skills: ${(p.skills ?? []).join(", ")}`,
    `Experience:\n${experience}`,
    `Education:\n${education}`,
    answers ? `Candidate's own answers to common questions:\n${answers}` : "",
    p.resume_text && !experience ? `Resume text:\n${p.resume_text.slice(0, 20_000)}` : "",
    "</candidate>",
  ]
    .filter(Boolean)
    .join("\n");
}

function jobBlock(j: Job): string {
  const salary =
    j.salary_min || j.salary_max
      ? `${j.salary_min ?? "?"}–${j.salary_max ?? "?"} ${j.salary_currency ?? ""} ${j.salary_period ?? ""}`
      : "not listed";
  return [
    "<job>",
    `Title: ${j.title}`,
    `Company: ${j.company}`,
    `Location: ${j.location || "not listed"}${j.remote ? " (remote)" : ""}`,
    `Type: ${j.employment_type || "not listed"}`,
    `Salary: ${salary}`,
    `Tags: ${(j.tags ?? []).join(", ")}`,
    `Description:\n${j.description.slice(0, 24_000)}`,
    "</job>",
  ].join("\n");
}

export function totalUsage(...usages: AIUsage[]): AIUsage {
  return usages.reduce(
    (acc, u) => ({ inputTokens: acc.inputTokens + u.inputTokens, outputTokens: acc.outputTokens + u.outputTokens }),
    { inputTokens: 0, outputTokens: 0 },
  );
}

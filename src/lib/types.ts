// Row shapes for the tables in supabase/migrations. Keep in sync with the SQL.

export type RemotePreference = "any" | "remote" | "hybrid" | "onsite";

export interface ExperienceItem {
  title: string;
  company: string;
  location?: string;
  start?: string;
  end?: string;
  bullets?: string[];
}

export interface EducationItem {
  school: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  links: { linkedin?: string; github?: string; portfolio?: string; website?: string };
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  work_authorization: string | null;
  needs_sponsorship: boolean | null;
  desired_titles: string[];
  desired_locations: string[];
  remote_preference: RemotePreference;
  salary_expectation: string | null;
  notice_period: string | null;
  standard_answers: Record<string, string>;
  resume_text: string | null;
  resume_path: string | null;
  resume_filename: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  source: string;
  external_id: string;
  title: string;
  company: string;
  company_logo: string | null;
  location: string;
  remote: boolean;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  description: string;
  url: string;
  apply_url: string | null;
  tags: string[];
  posted_at: string | null;
  fetched_at: string;
}

/** A job as it comes out of a source adapter, before it has a database id. */
export type JobInput = Omit<Job, "id" | "fetched_at">;

export const APPLICATION_STATUSES = [
  "saved",
  "ready",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  origin: "manual" | "autopilot";
  rule_id: string | null;
  match_score: number | null;
  match_summary: string | null;
  match_strengths: string[];
  match_gaps: string[];
  cover_letter: string | null;
  tailored_summary: string | null;
  tailored_bullets: { role: string; bullets: string[] }[];
  answers: { question: string; answer: string }[];
  notes: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithJob extends Application {
  job: Job;
}

export interface AutopilotRule {
  id: string;
  user_id: string;
  name: string;
  keywords: string;
  location: string;
  remote_only: boolean;
  sources: string[];
  exclude_keywords: string[];
  min_score: number;
  daily_limit: number;
  active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  user_id: string;
  rule_id: string | null;
  started_at: string;
  finished_at: string | null;
  jobs_found: number;
  jobs_scored: number;
  drafts_created: number;
  error: string | null;
}

export interface AISettingsRow {
  user_id: string;
  provider: string;
  model: string;
  base_url: string | null;
  api_key_enc: string | null;
  api_key_hint: string | null;
  monthly_token_limit: number | null;
  updated_at: string;
}

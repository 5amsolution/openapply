-- OpenApply initial schema
-- Tables: profiles, ai_settings, jobs, applications, autopilot_rules, agent_runs, ai_usage, extension_tokens
-- Storage: private "resumes" bucket, one folder per user id.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per user, the candidate profile the AI writes from
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  location text,
  headline text,
  summary text,
  links jsonb not null default '{}'::jsonb,          -- { linkedin, github, portfolio, website }
  skills text[] not null default '{}',
  experience jsonb not null default '[]'::jsonb,     -- [{ title, company, start, end, location, bullets[] }]
  education jsonb not null default '[]'::jsonb,      -- [{ school, degree, field, start, end }]
  work_authorization text,
  needs_sponsorship boolean,
  desired_titles text[] not null default '{}',
  desired_locations text[] not null default '{}',
  remote_preference text not null default 'any' check (remote_preference in ('any', 'remote', 'hybrid', 'onsite')),
  salary_expectation text,
  notice_period text,
  standard_answers jsonb not null default '{}'::jsonb, -- reusable screening answers keyed by question
  resume_text text,
  resume_path text,
  resume_filename text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: owner can read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: owner can update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: owner can insert" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- ai_settings: the user's own AI provider + encrypted API key.
-- No RLS policies on purpose: only the server (service role) touches this
-- table, so the encrypted key is never readable from the browser.
-- ---------------------------------------------------------------------------
create table public.ai_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('anthropic', 'openai', 'gemini', 'openrouter', 'groq', 'custom')),
  model text not null,
  base_url text,
  api_key_enc text,
  api_key_hint text,
  monthly_token_limit integer,
  updated_at timestamptz not null default now()
);

create trigger ai_settings_touch before update on public.ai_settings
  for each row execute function public.touch_updated_at();

alter table public.ai_settings enable row level security;

-- array_to_string is only STABLE; generated columns need an IMMUTABLE wrapper.
create or replace function public.tags_to_text(tags text[])
returns text
language sql
immutable
parallel safe
as $$ select coalesce(array_to_string(tags, ' '), '') $$;

-- ---------------------------------------------------------------------------
-- jobs: shared cache of postings pulled from public job APIs
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  title text not null,
  company text not null default '',
  company_logo text,
  location text not null default '',
  remote boolean not null default false,
  employment_type text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  salary_period text,
  description text not null default '',
  url text not null,
  apply_url text,
  tags text[] not null default '{}',
  posted_at timestamptz,
  fetched_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(company, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, public.tags_to_text(tags)), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(location, '')), 'C') ||
    setweight(to_tsvector('english'::regconfig, left(coalesce(description, ''), 20000)), 'D')
  ) stored,
  unique (source, external_id)
);

create index jobs_search_idx on public.jobs using gin (search);
create index jobs_posted_idx on public.jobs (posted_at desc nulls last);
create index jobs_title_trgm_idx on public.jobs using gin (title gin_trgm_ops);

alter table public.jobs enable row level security;

create policy "jobs: anyone can read" on public.jobs
  for select using (true);

-- ---------------------------------------------------------------------------
-- autopilot_rules: saved searches the background agent runs for a user
-- ---------------------------------------------------------------------------
create table public.autopilot_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  keywords text not null,
  location text not null default '',
  remote_only boolean not null default false,
  sources text[] not null default '{}',
  exclude_keywords text[] not null default '{}',
  min_score integer not null default 70 check (min_score between 0 and 100),
  daily_limit integer not null default 10 check (daily_limit between 1 and 50),
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index autopilot_rules_user_idx on public.autopilot_rules (user_id);
create index autopilot_rules_active_idx on public.autopilot_rules (active, last_run_at);

create trigger autopilot_rules_touch before update on public.autopilot_rules
  for each row execute function public.touch_updated_at();

alter table public.autopilot_rules enable row level security;

create policy "autopilot_rules: owner all" on public.autopilot_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- applications: one per (user, job) — the pipeline + AI-generated material
-- ---------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  status text not null default 'saved'
    check (status in ('saved', 'ready', 'applied', 'interviewing', 'offer', 'rejected', 'archived')),
  origin text not null default 'manual' check (origin in ('manual', 'autopilot')),
  rule_id uuid references public.autopilot_rules (id) on delete set null,
  match_score integer check (match_score between 0 and 100),
  match_summary text,
  match_strengths text[] not null default '{}',
  match_gaps text[] not null default '{}',
  cover_letter text,
  tailored_summary text,
  tailored_bullets jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,      -- [{ question, answer }]
  notes text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index applications_user_status_idx on public.applications (user_id, status, updated_at desc);

create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

alter table public.applications enable row level security;

create policy "applications: owner all" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- agent_runs: log of autopilot runs, shown on the dashboard
-- ---------------------------------------------------------------------------
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rule_id uuid references public.autopilot_rules (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  jobs_found integer not null default 0,
  jobs_scored integer not null default 0,
  drafts_created integer not null default 0,
  error text
);

create index agent_runs_user_idx on public.agent_runs (user_id, started_at desc);

alter table public.agent_runs enable row level security;

create policy "agent_runs: owner can read" on public.agent_runs
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_usage: token accounting per call so users can see what they spend
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "ai_usage: owner can read" on public.ai_usage
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- extension_tokens: personal tokens for the browser autofill extension.
-- Only a SHA-256 hash is stored; server-only like ai_settings.
-- ---------------------------------------------------------------------------
create table public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Browser extension',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index extension_tokens_user_idx on public.extension_tokens (user_id);

alter table public.extension_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- storage: private resumes bucket, objects live under "<user id>/..."
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
])
on conflict (id) do nothing;

create policy "resumes: owner can read" on storage.objects
  for select using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes: owner can upload" on storage.objects
  for insert with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes: owner can update" on storage.objects
  for update using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "resumes: owner can delete" on storage.objects
  for delete using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

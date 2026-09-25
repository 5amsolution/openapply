-- Per-user keys for metered job sources (JSearch), and private job rows.

-- Users' own API keys for job sources. Server-only: RLS on, no policies.
create table public.source_keys (
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('jsearch')),
  key_enc text not null,
  key_hint text,
  monthly_limit integer not null default 190 check (monthly_limit between 1 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, source)
);

create trigger source_keys_touch before update on public.source_keys
  for each row execute function public.touch_updated_at();

alter table public.source_keys enable row level security;

-- Jobs fetched with someone's personal key belong to them until another user
-- finds the same posting (then the row becomes public). Null = public.
alter table public.jobs
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

create index if not exists jobs_owner_idx on public.jobs (owner_id) where owner_id is not null;

drop policy if exists "jobs: anyone can read" on public.jobs;
create policy "jobs: public or own" on public.jobs
  for select using (owner_id is null or owner_id = auth.uid());

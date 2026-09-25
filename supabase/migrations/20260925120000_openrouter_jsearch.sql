-- OpenRouter OAuth connections + shared cache and quota for metered job APIs (JSearch).

-- How the user's AI key got here: pasted manually, or created by OpenRouter's OAuth flow.
alter table public.ai_settings
  add column if not exists connected_via text not null default 'manual'
  check (connected_via in ('manual', 'oauth'));

-- Shared cache for upstream API responses (server-only: RLS on, no policies).
create table public.api_cache (
  key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null
);

create index api_cache_expires_idx on public.api_cache (expires_at);

alter table public.api_cache enable row level security;

-- Monthly request budget per metered source (server-only).
create table public.api_quota (
  source text not null,
  period text not null,          -- e.g. '2026-09'
  used integer not null default 0,
  primary key (source, period)
);

alter table public.api_quota enable row level security;

-- Atomically spends one unit of budget. Returns false once the limit is reached.
create or replace function public.consume_api_quota(p_source text, p_period text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  spent integer;
begin
  insert into public.api_quota (source, period, used)
  values (p_source, p_period, 1)
  on conflict (source, period) do update
    set used = public.api_quota.used + 1
    where public.api_quota.used < p_limit
  returning used into spent;
  return spent is not null;
end;
$$;

revoke all on function public.consume_api_quota(text, text, integer) from public, anon, authenticated;
grant execute on function public.consume_api_quota(text, text, integer) to service_role;

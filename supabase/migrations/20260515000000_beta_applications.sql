-- Beta program: capture applicant info beyond what auth.users stores.
-- Email/name are required; the rest is best-effort context for triage.

create table public.beta_applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete set null,
  email            text not null,
  name             text not null,
  phone            text,
  line_id          text,
  agency           text,
  monthly_clients  text,   -- free-text bucket ("10-20", "20+", etc.)
  applied_at       timestamptz not null default now()
);

create index beta_applications_email_idx on public.beta_applications (email);

-- Only the service role inserts (via Server Action / admin client).
-- RLS is enabled with no policy so anon clients have zero access.
alter table public.beta_applications enable row level security;

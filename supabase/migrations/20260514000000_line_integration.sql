-- LINE Bot integration: per-user LINE binding + transient multi-turn state.

-- ------------------------------------------------------------------
-- line_bindings: 1:1 between auth.users and a LINE userId.
-- A user can bind / unbind, but at most one LINE account per LeadFlow account.
-- ------------------------------------------------------------------

create table public.line_bindings (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  line_user_id text not null unique,
  bound_at     timestamptz not null default now(),
  unbound_at   timestamptz
);

create index line_bindings_line_user_idx on public.line_bindings (line_user_id);

alter table public.line_bindings enable row level security;

-- The user can see and manage their own binding only.
create policy "line_bindings: agent owns row"
  on public.line_bindings for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------------
-- line_pending_actions: transient state for multi-turn LINE conversations.
-- Keyed on line_user_id (so the webhook can look it up before resolving
-- the auth.users binding). payload is an opaque JSON the handler interprets.
-- expires_at lets us prune stale rows.
-- ------------------------------------------------------------------

create table public.line_pending_actions (
  id           uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  kind         text not null,                                       -- e.g. 'parse_client_confirm'
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '5 minutes')
);

create index line_pending_actions_line_user_idx
  on public.line_pending_actions (line_user_id, expires_at desc);

-- This table is only touched by Server Actions / webhook handlers that
-- already use the service role or scope by line_user_id explicitly.
-- RLS is enabled but no policy is created, so the anon client cannot
-- read or write — only server-side code with the service-role key can.
alter table public.line_pending_actions enable row level security;
